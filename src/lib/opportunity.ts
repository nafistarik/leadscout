import type { Company } from "@/types/company";
import type { OsmDetails } from "@/lib/osm-details";
import type { WebsiteAnalysis } from "@/lib/website-analysis";
import { websiteVerdict } from "@/lib/website-analysis";

/**
 * Web-design pitch opportunity for a business, from observable signals only:
 * - no website / only a social page → high;
 * - a checked website that is down, parked, or dated → high or medium;
 * - a modern website or a chain brand → low;
 * - an unchecked website → unknown until the site is analyzed.
 * Reasons always say where each signal came from; OSM gaps are flagged as
 * "not listed", never as proof a business has no website.
 */

export type OpportunityLevel = "high" | "medium" | "unknown" | "low";

export interface Opportunity {
  level: OpportunityLevel;
  label: string;
  reasons: string[];
  /** Sort key: lower is a better pitch target (level, then how reachable). */
  rank: number;
  /** True when at least one way to reach the business is known. */
  contactable: boolean;
}

export const OPPORTUNITY_LEVEL_LABELS: Record<OpportunityLevel, string> = {
  high: "High",
  medium: "Medium",
  unknown: "Unchecked",
  low: "Low",
};

const LEVEL_RANK: Record<OpportunityLevel, number> = { high: 0, medium: 1, unknown: 2, low: 3 };

/**
 * How directly the business can be reached, best first. A phone (call or
 * WhatsApp) gets an answer fastest, email next; a Facebook page alone means
 * messaging a page that is often unattended.
 */
const CONTACT_TIERS = 5;
function contactTier(hasPhone: boolean, hasEmail: boolean, hasSocial: boolean): number {
  if (hasPhone && hasEmail) return 0;
  if (hasPhone) return 1;
  if (hasEmail) return 2;
  if (hasSocial) return 3;
  return 4;
}

export function computeOpportunity(
  company: Company,
  details: OsmDetails,
  analysis: WebsiteAnalysis | null,
): Opportunity {
  const hasPhone = details.phones.length > 0 || (analysis?.phones.length ?? 0) > 0;
  const hasEmail = details.emails.length > 0 || (analysis?.emails.length ?? 0) > 0;
  const hasSocial = details.socials.length > 0;
  const contactable = hasPhone || hasEmail || hasSocial;
  const reasons: string[] = [];
  let level: OpportunityLevel;
  let label: string;

  if (details.brand) {
    level = "low";
    label = "Chain / brand";
    reasons.push(`Tagged as part of the “${details.brand}” brand — usually has a central website.`);
  } else if (details.websiteKind !== "site" && details.likelyWebsite) {
    // Map data often lists only a Facebook page while the business email
    // (hello@their-domain) shows a real site exists; pitching "you have no
    // website" to them would be wrong.
    level = "unknown";
    label = "Website likely";
    const domain = details.likelyWebsite.replace(/^https:\/\//, "");
    reasons.push(`No website listed, but their email uses ${domain} — they most likely have a site there. Open it before pitching.`);
  } else if (details.websiteKind === "none") {
    level = "high";
    label = "No website";
    reasons.push("No website listed in the map data — confirm with a quick web search.");
  } else if (details.websiteKind === "social") {
    level = "high";
    label = "Social page only";
    const networks = details.socials.map((social) => social.network).join(", ");
    reasons.push(
      company.website
        ? "The listed “website” is a social profile, not a real site."
        : `Only social profiles listed (${networks}), no website.`,
    );
  } else if (!analysis) {
    level = "unknown";
    label = "Website not checked";
    reasons.push("Has a website — check it to see whether it is dated or broken.");
  } else {
    const verdict = websiteVerdict(analysis);
    const majors = analysis.issues.filter((issue) => issue.severity === "major").map((issue) => issue.label);
    const minors = analysis.issues.filter((issue) => issue.severity === "minor").map((issue) => issue.label);
    if (verdict === "down") {
      level = "high";
      label = analysis.status === "parked" ? "Parked website" : "Website down";
      reasons.push(analysis.error ?? "The website could not be loaded.");
    } else if (verdict === "outdated") {
      level = "high";
      label = "Outdated website";
      reasons.push(...majors, ...minors);
    } else if (verdict === "needs-work") {
      level = "medium";
      label = "Website needs work";
      reasons.push(...majors, ...minors);
    } else {
      level = "low";
      label = "Modern website";
      reasons.push("The homepage passed the basic checks (HTTPS, mobile, recent).", ...minors);
    }
  }

  if (!contactable) reasons.push("No phone, email, or social contact known yet.");
  return {
    level,
    label,
    reasons,
    // Level first; within a level, the easier-to-reach business first.
    rank: LEVEL_RANK[level] * CONTACT_TIERS + contactTier(hasPhone, hasEmail, hasSocial),
    contactable,
  };
}
