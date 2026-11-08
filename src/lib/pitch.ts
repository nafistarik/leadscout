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
  // Their own email domain means a site most likely exists: never claim they have none.
  if (details.websiteKind !== "site" && details.likelyWebsite) {
    return language === "bn"
      ? "আপনাদের অনলাইন উপস্থিতি দেখলাম, আর আপনাদের ওয়েবসাইটকে আরও কাস্টমার আনার মতো করে তোলার কিছু আইডিয়া আছে।"
      : "I had a look at your online presence and have a few ideas to help your website bring in more customers.";
  }
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
 * The name to address a business by: map listings often carry SEO tails
 * ("Smile Dental - Dental Implants | Cosmetic Dentist"), so only the part
 * before the first " - ", " | ", " – ", " — " or ": " is used.
 */
export function shortBusinessName(name: string): string {
  const short = name.split(/\s+[-–—|]\s+|\s*\|\s*|:\s+/)[0].trim();
  return short.length >= 2 ? short : name.trim();
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
  const name = shortBusinessName(company.name);
  if (language === "bn") {
    return {
      subject: `${name}-এর জন্য একটি ওয়েবসাইট`,
      body: [
        `হ্যালো ${name},`,
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
    subject: `A website for ${name}`,
    body: [
      `Hi ${name} team,`,
      "",
      `I came across ${name} online. ${finding}`,
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
 * A short second message for a lead that has not answered the first one.
 * Most replies come after a follow-up, so it stays brief and easy to answer.
 */
export function buildFollowUp(company: Company, signature: PitchSignature, language: PitchLanguage): Pitch {
  const sender = signature.name || NAME_PLACEHOLDER[language];
  const closing = [sender, signature.link].filter(Boolean).join("\n");
  const name = shortBusinessName(company.name);
  if (language === "bn") {
    return {
      subject: `${name}-এর ওয়েবসাইট নিয়ে`,
      body: [
        `হ্যালো ${name},`,
        "",
        "কিছুদিন আগে আপনাদের ওয়েবসাইট নিয়ে একটা মেসেজ দিয়েছিলাম, হয়তো চোখ এড়িয়ে গেছে।",
        "আগ্রহ থাকলে আপনাদের জন্য একটা ফ্রি ডেমো ডিজাইন বানিয়ে দেখাতে পারি, কোনো বাধ্যবাধকতা ছাড়াই।",
        "",
        "শুধু “হ্যাঁ” লিখলেই হবে, আর এখন দরকার না থাকলে “না” লিখলেও আর বিরক্ত করব না।",
        "",
        "ধন্যবাদ,",
        closing,
      ].join("\n"),
    };
  }
  return {
    subject: `Following up: a website for ${name}`,
    body: [
      `Hi ${name} team,`,
      "",
      "I sent you a note about your website a few days ago and wanted to make sure it didn't get lost.",
      "If it's useful, I can put together a free mock-up for you, with no obligation.",
      "",
      "A quick “yes” is all I need, and if now isn't the right time, just say so and I won't follow up again.",
      "",
      "Best regards,",
      closing,
    ].join("\n"),
  };
}

/**
 * Mobile number prefixes for the prepared cities' countries. WhatsApp only
 * runs on mobiles, and a landline (+44 20…, +880 2…) would open a dead
 * chat. Countries not listed (and +1, where mobiles and landlines share
 * prefixes) are allowed through.
 */
const MOBILE_PREFIXES: Array<[countryCode: string, mobile: RegExp]> = [
  ["880", /^8801[3-9]/],
  ["44", /^447/],
  ["971", /^9715/],
  ["60", /^601/],
  ["61", /^614/],
];

function isLikelyMobile(digits: string): boolean {
  const rule = MOBILE_PREFIXES.find(([countryCode]) => digits.startsWith(countryCode));
  return !rule || rule[1].test(digits);
}

/**
 * A wa.me link that opens WhatsApp with the message ready to send.
 *
 * @returns null when the number has no country code and is not a
 *   Bangladeshi local mobile number (01XXXXXXXXX), since wa.me needs the
 *   full international number, or when it is a known landline.
 */
export function whatsappLink(phone: string, text: string): string | null {
  const dialable = phone.replace(/[^+\d]/g, "");
  let digits: string;
  if (dialable.startsWith("+")) digits = dialable.slice(1);
  else if (dialable.startsWith("00")) digits = dialable.slice(2);
  else if (/^01\d{9}$/.test(dialable)) digits = `88${dialable}`;
  else return null;
  if (!/^\d{8,15}$/.test(digits) || !isLikelyMobile(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** A mailto: link with subject and body filled in, or null for an implausible address. */
export function mailtoLink(email: string, pitch: Pitch): string | null {
  if (!isPlausibleEmail(email)) return null;
  return `mailto:${email.trim()}?subject=${encodeURIComponent(pitch.subject)}&body=${encodeURIComponent(pitch.body)}`;
}
