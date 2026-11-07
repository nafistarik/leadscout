import { isPlausibleEmail } from "@/lib/links";
import type { OsmDetails } from "@/lib/osm-details";
import type { WebsiteAnalysis } from "@/lib/website-analysis";
import type { Company } from "@/types/company";

/**
 * First-contact pitch message for a lead, built only from what LeadScout
 * actually found (no website, a social page only, or website-check issues).
 * The user reviews and edits it before anything is sent; sending happens in
 * their own WhatsApp or mail app, never from here.
 */

export type PitchLanguage = "bn" | "en";

export interface PitchSignature {
  name: string;
  /** Portfolio or website link; empty when not set. */
  link: string;
}

export interface Pitch {
  subject: string;
  body: string;
}

const MAX_SIGNATURE_NAME = 80;
const MAX_SIGNATURE_LINK = 200;
const MAX_ISSUES_MENTIONED = 3;
const NAME_PLACEHOLDER = { en: "[Your name]", bn: "[আপনার নাম]" } as const;

/**
 * Validates a stored signature; a link must be http(s) or it is dropped,
 * so a pasted `javascript:` value never reaches a message.
 */
export function sanitizeSignature(value: unknown): PitchSignature {
  const item = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const name = typeof item.name === "string" ? item.name.trim().slice(0, MAX_SIGNATURE_NAME) : "";
  const rawLink = typeof item.link === "string" ? item.link.trim().slice(0, MAX_SIGNATURE_LINK) : "";
  const link = /^https?:\/\/\S+$/i.test(rawLink) ? rawLink : "";
  return { name, link };
}

/** Bangla for leads in Bangladesh, English everywhere else. */
export function pitchLanguageFor(company: Company, phones: string[]): PitchLanguage {
  const country = (company.country ?? "").trim().toLowerCase();
  if (["bangladesh", "bd", "বাংলাদেশ"].includes(country)) return "bn";
  // Live OSM results often lack a country tag; a +880 number settles it.
  if (!country && phones.some((phone) => phone.replace(/[^+\d]/g, "").startsWith("+880"))) return "bn";
  return "en";
}

/** Website-check findings phrased for a client, keyed by issue key. */
function issuePhrase(key: string, analysis: WebsiteAnalysis, language: PitchLanguage): string | null {
  const year = analysis.copyrightYear;
  const phrases: Record<string, { en: string; bn: string }> = {
    unreachable: { en: "the website does not open", bn: "ওয়েবসাইটটি খুলছে না" },
    "error-page": { en: "the website shows an error page", bn: "ওয়েবসাইটে একটা error পেজ আসছে" },
    parked: { en: "the website looks parked or under construction", bn: "ওয়েবসাইটটি parked বা under construction দেখাচ্ছে" },
    "no-https": { en: "browsers mark it as “Not secure”", bn: "ব্রাউজার এটাকে “Not secure” দেখাচ্ছে" },
    "not-mobile": {
      en: "it isn't built for phones, where most customers look",
      bn: "মোবাইলে ঠিকমতো দেখায় না, অথচ বেশিরভাগ কাস্টমার মোবাইল থেকেই দেখেন",
    },
    "stale-copyright": {
      en: `it looks like it hasn't been updated since ${year}`,
      bn: `${year} সালের পর আপডেট হয়নি বলে মনে হচ্ছে`,
    },
    legacy: { en: "it runs on dated technology", bn: "পুরনো প্রযুক্তিতে চলছে" },
    "free-builder": { en: "it's on a free site builder", bn: "একটা ফ্রি সাইট বিল্ডারে বানানো" },
    "no-description": { en: "it's hard to find on Google", bn: "Google-এ খুঁজে পাওয়া কঠিন" },
    "no-title": { en: "it's hard to find on Google", bn: "Google-এ খুঁজে পাওয়া কঠিন" },
    thin: { en: "the homepage has very little information", bn: "হোমপেজে তথ্য খুবই কম" },
  };
  const phrase = phrases[key.startsWith("legacy:") ? "legacy" : key];
  return phrase ? phrase[language] : null;
}

/** The sentence that says why this business is worth a website. */
function findingSentence(details: OsmDetails, analysis: WebsiteAnalysis | null, language: PitchLanguage): string {
  if (details.websiteKind === "none") {
    return language === "bn"
      ? "দেখলাম আপনাদের কোনো ওয়েবসাইট নেই, ফলে Google-এ খুঁজে নতুন কাস্টমাররা সহজে আপনাদের তথ্য পান না।"
      : "I noticed you don't have a website yet, so customers searching on Google can't easily find your details.";
  }
  if (details.websiteKind === "social") {
    return language === "bn"
      ? "দেখলাম আপনারা শুধু Facebook/সোশ্যাল পেজ দিয়ে চালাচ্ছেন। Google-এ খুঁজলে নতুন কাস্টমাররা আপনাদের সার্ভিস, দাম বা সময়সূচি সহজে পান না।"
      : "I noticed you rely on a social media page instead of a website, so new customers searching on Google can't easily see your services, prices or hours.";
  }
  const majorFirst = [...(analysis?.issues ?? [])].sort(
    (a, b) => Number(b.severity === "major") - Number(a.severity === "major"),
  );
  const phrases = [
    ...new Set(
      majorFirst.flatMap((issue) => {
        const phrase = analysis ? issuePhrase(issue.key, analysis, language) : null;
        return phrase ? [phrase] : [];
      }),
    ),
  ].slice(0, MAX_ISSUES_MENTIONED);
  if (phrases.length > 0) {
    return language === "bn"
      ? `আপনাদের ওয়েবসাইটটা একটু দেখলাম, কয়েকটা জিনিস চোখে পড়ল: ${phrases.join("; ")}।`
      : `I had a quick look at your website and noticed a few things that may be costing you customers: ${phrases.join("; ")}.`;
  }
  return language === "bn"
    ? "আপনাদের ওয়েবসাইটটা দেখলাম, এটাকে আরও কাস্টমার আনার মতো করে তোলার কিছু আইডিয়া আছে।"
    : "I had a look at your website and have a few ideas to help it bring in more customers.";
}

/**
 * Builds the pitch for one lead.
 *
 * @param analysis The website check, when one was run.
 * @returns Subject (for email) and body; the body ends with the signature,
 *   or a placeholder when no name is saved yet.
 */
export function buildPitch(
  company: Company,
  details: OsmDetails,
  analysis: WebsiteAnalysis | null,
  signature: PitchSignature,
  language: PitchLanguage,
): Pitch {
  const sender = signature.name || NAME_PLACEHOLDER[language];
  const closing = [sender, signature.link].filter(Boolean).join("\n");
  const finding = findingSentence(details, analysis, language);
  if (language === "bn") {
    return {
      subject: `${company.name}-এর জন্য একটি ওয়েবসাইট`,
      body: [
        `হ্যালো ${company.name},`,
        "",
        `অনলাইনে আপনাদের খোঁজ পেলাম। ${finding}`,
        "",
        "আমি ছোট ব্যবসার জন্য দ্রুত ও মোবাইল-ফ্রেন্ডলি ওয়েবসাইট বানাই। চাইলে আপনাদের জন্য একটা ফ্রি ডেমো ডিজাইন দেখাতে পারি।",
        "",
        "এই সপ্তাহে কি একটু কথা বলা যাবে?",
        "",
        "ধন্যবাদ,",
        closing,
      ].join("\n"),
    };
  }
  return {
    subject: `A website for ${company.name}`,
    body: [
      `Hi ${company.name} team,`,
      "",
      `I came across ${company.name} online. ${finding}`,
      "",
      "I build fast, mobile-friendly websites for small businesses, and I'd be happy to show you a free mock-up of what yours could look like.",
      "",
      "Would you be open to a quick chat this week?",
      "",
      "Best regards,",
      closing,
    ].join("\n"),
  };
}

/**
 * A wa.me link that opens WhatsApp with the message ready to send.
 *
 * @returns null when the number has no country code and is not a
 *   Bangladeshi local mobile number (01XXXXXXXXX), since wa.me needs the
 *   full international number.
 */
export function whatsappLink(phone: string, text: string): string | null {
  const dialable = phone.replace(/[^+\d]/g, "");
  let digits: string;
  if (dialable.startsWith("+")) digits = dialable.slice(1);
  else if (dialable.startsWith("00")) digits = dialable.slice(2);
  else if (/^01\d{9}$/.test(dialable)) digits = `88${dialable}`;
  else return null;
  if (!/^\d{8,15}$/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** A mailto: link with subject and body filled in, or null for an implausible address. */
export function mailtoLink(email: string, pitch: Pitch): string | null {
  if (!isPlausibleEmail(email)) return null;
  return `mailto:${email.trim()}?subject=${encodeURIComponent(pitch.subject)}&body=${encodeURIComponent(pitch.body)}`;
}
