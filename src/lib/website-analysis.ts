import type { SocialLink } from "@/lib/osm-details";
import { socialNetworkOf } from "@/lib/osm-details";
import { isPlausibleEmail } from "@/lib/links";

/**
 * Pure website-quality analysis for pitching: given a page's HTML, report
 * observable signals that a site is missing, broken, or dated, plus contact
 * details published on it. Every signal comes from the page itself and is
 * labeled as a heuristic — e.g. a stale copyright year suggests, but does
 * not prove, that a site is unmaintained.
 */

export type WebsiteStatus = "ok" | "unreachable" | "error-page" | "parked";
export type IssueSeverity = "major" | "minor";

export interface WebsiteIssue {
  key: string;
  label: string;
  severity: IssueSeverity;
}

export interface WebsiteAnalysis {
  /** The URL that was analyzed (https variant when it loaded). */
  url: string;
  analyzedAt: string;
  status: WebsiteStatus;
  httpStatus: number | null;
  /** "unknown" when the site could not be loaded at all. */
  https: "yes" | "no" | "unknown";
  /** Whether the page declares a responsive viewport; null when not loaded. */
  mobileFriendly: boolean | null;
  copyrightYear: number | null;
  title: string | null;
  description: string | null;
  /** CMS / site builder with version when detectable, e.g. "WordPress 4.9". */
  platform: string | null;
  /** Concrete dated-technology findings, e.g. "jQuery 1.8.3". */
  legacySignals: string[];
  emails: string[];
  phones: string[];
  socials: SocialLink[];
  /** Approximate visible text length. */
  textLength: number;
  issues: WebsiteIssue[];
  /** Human-readable reason when status is not "ok". */
  error: string | null;
}

export type WebsiteVerdict = "down" | "outdated" | "needs-work" | "modern";

export const VERDICT_LABELS: Record<WebsiteVerdict, string> = {
  down: "Down / parked",
  outdated: "Outdated",
  "needs-work": "Needs work",
  modern: "Looks modern",
};

const MAX_ITEMS = 5;

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&copy;|&#169;|&#xa9;/gi, "©");
}

function visibleText(html: string): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function metaContent(html: string, name: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const key = /\b(?:name|property)\s*=\s*["']?([^"'\s>]+)/i.exec(tag)?.[1]?.toLowerCase();
    if (key !== name) continue;
    const content = /\bcontent\s*=\s*(["'])([\s\S]*?)\1/i.exec(tag)?.[2];
    if (content !== undefined) return decodeEntities(content).trim() || null;
  }
  return null;
}

function titleOf(html: string): string | null {
  const raw = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  const title = raw ? decodeEntities(raw).replace(/\s+/g, " ").trim() : "";
  return title || null;
}

function hrefs(html: string): string[] {
  const result: string[] = [];
  const pattern = /\bhref\s*=\s*(["'])([\s\S]*?)\1/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) result.push(decodeEntities(match[2]).trim());
  return result;
}

/** Most recent plausible year next to a copyright marker, or null. */
export function findCopyrightYear(text: string, now: Date): number | null {
  const maxYear = now.getFullYear() + 1;
  let best: number | null = null;
  const pattern = /(?:©|\(c\)|copyright)[^.|\n]{0,40}?((?:19|20)\d{2})(?:\s*[-–—]\s*((?:19|20)\d{2}))?/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    for (const candidate of [match[1], match[2]]) {
      const year = candidate ? Number(candidate) : NaN;
      if (year >= 1995 && year <= maxYear && (best === null || year > best)) best = year;
    }
  }
  return best;
}

function versionBelow(version: string, major: number): boolean {
  const first = Number(version.split(".")[0]);
  return Number.isFinite(first) && first < major;
}

interface PlatformInfo {
  platform: string | null;
  legacy: string[];
  freeBuilder: boolean;
}

function detectPlatform(html: string): PlatformInfo {
  const generator = metaContent(html, "generator");
  const legacy: string[] = [];
  let platform: string | null = null;
  let freeBuilder = false;

  const gen = generator ?? "";
  const wpVersion = /wordpress\s+(\d+(?:\.\d+)*)/i.exec(gen)?.[1];
  if (wpVersion || /wp-content\/|wp-includes\//i.test(html)) {
    platform = wpVersion ? `WordPress ${wpVersion}` : "WordPress";
    if (wpVersion && versionBelow(wpVersion, 5)) legacy.push(`WordPress ${wpVersion} (pre-2018)`);
  } else if (/joomla/i.test(gen)) {
    const version = /joomla!?\s*(\d+(?:\.\d+)*)/i.exec(gen)?.[1];
    platform = version ? `Joomla ${version}` : "Joomla";
    if (version && versionBelow(version, 4)) legacy.push(`Joomla ${version}`);
  } else if (/drupal/i.test(gen)) {
    const version = /drupal\s*(\d+)/i.exec(gen)?.[1];
    platform = version ? `Drupal ${version}` : "Drupal";
    if (version && versionBelow(version, 8)) legacy.push(`Drupal ${version}`);
  } else if (/wix\.com|wixstatic\.com/i.test(gen + html)) {
    platform = "Wix";
    freeBuilder = /\.wixsite\.com/i.test(html);
  } else if (/squarespace/i.test(gen + html)) {
    platform = "Squarespace";
  } else if (/cdn\.shopify\.com/i.test(html)) {
    platform = "Shopify";
  } else if (/blogger|blogspot\.com/i.test(gen + html)) {
    platform = "Blogger";
    freeBuilder = true;
  } else if (/sites\.google\.com/i.test(html)) {
    platform = "Google Sites";
    freeBuilder = true;
  } else if (/weebly/i.test(gen + html)) {
    platform = "Weebly";
    freeBuilder = true;
  } else if (/webflow/i.test(gen + html)) {
    platform = "Webflow";
  } else if (/frontpage|dreamweaver|microsoft word/i.test(gen)) {
    platform = generator;
    legacy.push(`Built with ${generator}`);
  } else if (generator) {
    platform = generator.slice(0, 40);
  }

  const jquery =
    /jquery[.-]?(\d+\.\d+(?:\.\d+)?)(?:\.min)?\.js/i.exec(html)?.[1] ??
    /jquery(?:\.min)?\.js\?ver=(\d+\.\d+(?:\.\d+)?)/i.exec(html)?.[1];
  if (jquery && versionBelow(jquery, 2)) legacy.push(`jQuery ${jquery}`);
  if (/\.swf\b|application\/x-shockwave-flash/i.test(html)) legacy.push("Flash content");
  const oldTags = ["font", "center", "marquee", "frameset", "blink"].filter((tag) =>
    new RegExp(`<${tag}\\b`, "i").test(html),
  );
  if (oldTags.length > 0) legacy.push(`Obsolete HTML tags (${oldTags.map((t) => `<${t}>`).join(", ")})`);

  return { platform, legacy, freeBuilder };
}

const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const IGNORED_EMAIL = /\.(png|jpe?g|gif|webp|svg)$|@(example|sentry|wixpress|domain)\.|^(name|your|email)@/i;

function findEmails(html: string, text: string): string[] {
  const found = new Set<string>();
  for (const href of hrefs(html)) {
    if (/^mailto:/i.test(href)) {
      const address = decodeURIComponent(href.slice(7).split("?")[0]).trim().toLowerCase();
      if (isPlausibleEmail(address) && !IGNORED_EMAIL.test(address)) found.add(address);
    }
  }
  for (const match of text.match(EMAIL_PATTERN) ?? []) {
    const address = match.toLowerCase();
    if (isPlausibleEmail(address) && !IGNORED_EMAIL.test(address)) found.add(address);
  }
  return [...found].slice(0, MAX_ITEMS);
}

function findPhones(html: string): string[] {
  const found = new Map<string, string>();
  for (const href of hrefs(html)) {
    if (!/^tel:/i.test(href)) continue;
    const raw = decodeURIComponent(href.slice(4)).trim();
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 6 && !found.has(digits)) found.set(digits, raw);
  }
  return [...found.values()].slice(0, MAX_ITEMS);
}

const SHARE_LINK = /sharer|\/share|intent\/|\/plugins\/|\/tr\?|\/dialog\/|\/hashtag\//i;

function findSocials(html: string): SocialLink[] {
  const result: SocialLink[] = [];
  const seen = new Set<string>();
  for (const href of hrefs(html)) {
    if (!/^https?:\/\//i.test(href) || SHARE_LINK.test(href)) continue;
    const network = socialNetworkOf(href);
    if (!network || seen.has(network)) continue;
    let path = "";
    try {
      path = new URL(href).pathname;
    } catch {
      continue;
    }
    // Skip bare network homepages (theme defaults like "facebook.com/").
    if (network !== "whatsapp" && path.replace(/\//g, "") === "") continue;
    seen.add(network);
    result.push({ network, url: href });
  }
  return result;
}

const PARKED_PATTERN =
  /domain (?:name )?(?:is )?(?:for sale|parked)|buy this domain|this domain (?:may be|is) for sale|under construction|coming soon|website (?:is )?(?:currently )?(?:under maintenance|being built)|account (?:has been )?suspended|default (?:web )?page|it works!|index of \//i;

export interface AnalyzeInput {
  html: string;
  /** URL the reader actually loaded. */
  url: string;
  httpStatus: number | null;
  now: Date;
}

/** Analyzes successfully fetched HTML. Pure; see `unreachableAnalysis` for failures. */
export function analyzeHtml({ html, url, httpStatus, now }: AnalyzeInput): WebsiteAnalysis {
  const text = visibleText(html);
  const title = titleOf(html);
  const description = metaContent(html, "description") ?? metaContent(html, "og:description");
  const viewport = metaContent(html, "viewport");
  const mobileFriendly = viewport !== null && /width\s*=\s*device-width|initial-scale/i.test(viewport);
  const copyrightYear = findCopyrightYear(text, now);
  const { platform, legacy, freeBuilder } = detectPlatform(html);
  const https = url.toLowerCase().startsWith("https://") ? "yes" : "no";

  const issues: WebsiteIssue[] = [];
  let status: WebsiteStatus = "ok";
  let error: string | null = null;
  if (httpStatus !== null && httpStatus >= 400) {
    status = "error-page";
    error = `The site answered with an error page (HTTP ${httpStatus}).`;
    issues.push({ key: "error-page", label: `Site returns an error (HTTP ${httpStatus})`, severity: "major" });
  } else if (PARKED_PATTERN.test(text.slice(0, 4000)) && text.length < 2500) {
    status = "parked";
    error = "The page looks parked, suspended, or under construction.";
    issues.push({ key: "parked", label: "Parked / under-construction page", severity: "major" });
  }
  if (https === "no") issues.push({ key: "no-https", label: "No HTTPS (browsers show “Not secure”)", severity: "major" });
  if (!mobileFriendly) issues.push({ key: "not-mobile", label: "Not mobile-friendly (no responsive viewport)", severity: "major" });
  if (copyrightYear !== null && copyrightYear <= now.getFullYear() - 2) {
    issues.push({ key: "stale-copyright", label: `Copyright © ${copyrightYear} — likely not updated since`, severity: "major" });
  }
  for (const signal of legacy) {
    const major = !/^jQuery/.test(signal);
    issues.push({ key: `legacy:${signal}`, label: `Dated tech: ${signal}`, severity: major ? "major" : "minor" });
  }
  if (freeBuilder && platform) issues.push({ key: "free-builder", label: `Free site builder (${platform})`, severity: "minor" });
  if (!title) issues.push({ key: "no-title", label: "Missing page title", severity: "minor" });
  if (!description) issues.push({ key: "no-description", label: "No meta description (weak in Google results)", severity: "minor" });
  if (status === "ok" && text.length < 400) issues.push({ key: "thin", label: "Very little content on the homepage", severity: "minor" });

  return {
    url,
    analyzedAt: now.toISOString(),
    status,
    httpStatus,
    https,
    mobileFriendly,
    copyrightYear,
    title,
    description,
    platform,
    legacySignals: legacy,
    emails: findEmails(html, text),
    phones: findPhones(html),
    socials: findSocials(html),
    textLength: text.length,
    issues,
    error,
  };
}

/** Analysis record for a site that could not be loaded at all. */
export function unreachableAnalysis(url: string, reason: string, now: Date): WebsiteAnalysis {
  return {
    url,
    analyzedAt: now.toISOString(),
    status: "unreachable",
    httpStatus: null,
    https: "unknown",
    mobileFriendly: null,
    copyrightYear: null,
    title: null,
    description: null,
    platform: null,
    legacySignals: [],
    emails: [],
    phones: [],
    socials: [],
    textLength: 0,
    issues: [{ key: "unreachable", label: reason, severity: "major" }],
    error: reason,
  };
}

/** Overall pitch-oriented verdict from the analysis issues. */
export function websiteVerdict(analysis: WebsiteAnalysis): WebsiteVerdict {
  if (analysis.status !== "ok") return "down";
  const major = analysis.issues.filter((issue) => issue.severity === "major").length;
  const minor = analysis.issues.length - major;
  if (major >= 2 || (major === 1 && minor >= 2)) return "outdated";
  if (major === 1 || minor >= 2) return "needs-work";
  return "modern";
}
