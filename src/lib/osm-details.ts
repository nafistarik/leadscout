import type { Company } from "@/types/company";
import { isPlausibleEmail, normalizeWebsiteUrl } from "@/lib/links";

/**
 * Extra pitch-relevant details read from a record's raw OpenStreetMap tags:
 * full street address, every listed phone/email, social profiles, chain
 * branding, and when a mapper last verified the record. Pure and
 * source-only — values are never invented or guessed.
 */

export type SocialNetwork =
  | "facebook"
  | "instagram"
  | "whatsapp"
  | "linkedin"
  | "x"
  | "youtube"
  | "tiktok"
  | "telegram";

export interface SocialLink {
  network: SocialNetwork;
  url: string;
}

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  x: "X / Twitter",
  youtube: "YouTube",
  tiktok: "TikTok",
  telegram: "Telegram",
};

/** "none" = nothing listed; "social" = only a social/link-in-bio page; "site" = a real website. */
export type WebsiteKind = "none" | "social" | "site";

export interface OsmDetails {
  address: string | null;
  phones: string[];
  emails: string[];
  socials: SocialLink[];
  /** Brand/chain name when OSM marks the place as part of one. */
  brand: string | null;
  cuisine: string | null;
  description: string | null;
  /** Date a mapper last verified the record (check_date / survey:date). */
  lastChecked: string | null;
  websiteKind: WebsiteKind;
}

const SOCIAL_HOSTS: Array<{ pattern: RegExp; network: SocialNetwork }> = [
  { pattern: /(^|\.)(facebook\.com|fb\.com|fb\.me)$/, network: "facebook" },
  { pattern: /(^|\.)instagram\.com$/, network: "instagram" },
  { pattern: /(^|\.)(wa\.me|whatsapp\.com)$/, network: "whatsapp" },
  { pattern: /(^|\.)linkedin\.com$/, network: "linkedin" },
  { pattern: /(^|\.)(twitter\.com|x\.com)$/, network: "x" },
  { pattern: /(^|\.)(youtube\.com|youtu\.be)$/, network: "youtube" },
  { pattern: /(^|\.)tiktok\.com$/, network: "tiktok" },
  { pattern: /(^|\.)(t\.me|telegram\.me)$/, network: "telegram" },
];

/** Link-in-bio hosts: a profile page, not a business website. */
const LINK_PAGE_HOSTS = /(^|\.)(linktr\.ee|bio\.link|beacons\.ai)$/;

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Social network a URL belongs to, or null for any other site. */
export function socialNetworkOf(url: string): SocialNetwork | null {
  const host = hostOf(url);
  if (!host) return null;
  return SOCIAL_HOSTS.find((entry) => entry.pattern.test(host))?.network ?? null;
}

/** True when a website value is really a social profile or link-in-bio page. */
export function isSocialOnlyUrl(url: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  return socialNetworkOf(url) !== null || LINK_PAGE_HOSTS.test(host);
}

/** Splits OSM multi-values ("a;b") and trims, dropping blanks and duplicates. */
function splitValues(...values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) continue;
    for (const part of value.split(";")) {
      const trimmed = part.trim();
      const key = trimmed.toLowerCase().replace(/[\s\-().]/g, "");
      if (trimmed && !seen.has(key)) {
        seen.add(key);
        result.push(trimmed);
      }
    }
  }
  return result;
}

const SOCIAL_TAGS: Array<{ keys: string[]; network: SocialNetwork; base: string | null }> = [
  { keys: ["contact:facebook", "facebook"], network: "facebook", base: "https://www.facebook.com/" },
  { keys: ["contact:instagram", "instagram"], network: "instagram", base: "https://www.instagram.com/" },
  { keys: ["contact:whatsapp", "whatsapp"], network: "whatsapp", base: null },
  { keys: ["contact:linkedin", "linkedin"], network: "linkedin", base: null },
  { keys: ["contact:twitter", "twitter"], network: "x", base: "https://x.com/" },
  { keys: ["contact:youtube", "youtube"], network: "youtube", base: null },
  { keys: ["contact:tiktok", "tiktok"], network: "tiktok", base: "https://www.tiktok.com/@" },
  { keys: ["contact:telegram", "telegram"], network: "telegram", base: "https://t.me/" },
];

/** Turns a social tag value (URL, handle, or WhatsApp number) into a safe URL. */
export function socialUrl(network: SocialNetwork, value: string, base: string | null): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || /^(www\.)?[a-z0-9-]+\.[a-z]{2,}\//i.test(trimmed)) {
    const url = normalizeWebsiteUrl(trimmed);
    return url && socialNetworkOf(url) === network ? url : null;
  }
  if (network === "whatsapp") {
    const digits = trimmed.replace(/\D/g, "");
    return digits.length >= 7 ? `https://wa.me/${digits}` : null;
  }
  const handle = trimmed.replace(/^@/, "");
  if (!base || !/^[\p{L}\p{N}._-]{1,80}$/u.test(handle)) return null;
  return `${base}${encodeURIComponent(handle)}`;
}

function socialsFromTags(tags: Record<string, string>, website: string | null): SocialLink[] {
  const result: SocialLink[] = [];
  const seen = new Set<SocialNetwork>();
  for (const { keys, network, base } of SOCIAL_TAGS) {
    for (const key of keys) {
      const value = tags[key];
      if (!value || seen.has(network)) continue;
      const url = socialUrl(network, value.split(";")[0], base);
      if (url) {
        seen.add(network);
        result.push({ network, url });
      }
    }
  }
  // A website tag that points at a social profile counts as that profile.
  if (website) {
    const network = socialNetworkOf(website);
    if (network && !seen.has(network)) result.push({ network, url: website });
  }
  return result;
}

function buildAddress(tags: Record<string, string>): string | null {
  const full = tags["addr:full"]?.trim();
  if (full) return full;
  const house = [tags["addr:housenumber"], tags["addr:housename"]]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  const street = tags["addr:street"]?.trim() || tags["addr:place"]?.trim();
  const line1 = [house, street].filter(Boolean).join(", ");
  const locality = [tags["addr:suburb"], tags["addr:city"] ?? tags["addr:town"] ?? tags["addr:village"]]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
  const postcode = tags["addr:postcode"]?.trim();
  if (!line1 && !postcode) return null;
  return [line1, [locality, postcode].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null;
}

export function describeOsmDetails(company: Company): OsmDetails {
  const tags = company.tags;
  const website = company.website;
  const phones = splitValues(
    tags.phone,
    tags["contact:phone"],
    tags["contact:mobile"],
    tags["phone:mobile"],
    tags.mobile,
  );
  const emails = splitValues(tags.email, tags["contact:email"]).filter((email) => isPlausibleEmail(email));
  const socials = socialsFromTags(tags, website);
  const brand = tags.brand?.trim() || (tags["brand:wikidata"] ? tags.name?.trim() || null : null);
  const websiteKind: WebsiteKind = website
    ? isSocialOnlyUrl(website)
      ? "social"
      : "site"
    : socials.length > 0
      ? "social"
      : "none";
  return {
    address: buildAddress(tags),
    phones,
    emails,
    socials,
    brand: brand || null,
    cuisine: tags.cuisine ? tags.cuisine.replace(/_/g, " ").replace(/;/g, ", ") : null,
    description: tags.description?.trim() || null,
    lastChecked: tags.check_date?.trim() || tags["survey:date"]?.trim() || tags["check_date:opening_hours"]?.trim() || null,
    websiteKind,
  };
}
