import type { Company, SavedLeadRecord } from "@/types/company";
import { normalizeWebsiteUrl } from "@/lib/links";
import { computeOpportunity } from "@/lib/opportunity";
import { describeOsmDetails, SOCIAL_LABELS } from "@/lib/osm-details";
import { VERDICT_LABELS, websiteVerdict } from "@/lib/website-analysis";
import type { WebsiteAnalysis } from "@/lib/website-analysis";

/**
 * CSV export for the saved-leads collection. Client-side only: builds a
 * UTF-8 string (with BOM for spreadsheet apps), escapes per RFC 4180, guards
 * against spreadsheet formula injection from untrusted source data, and
 * downloads via a temporary object URL that is revoked afterwards. Nothing
 * is ever sent to an external service.
 */

export const CSV_COLUMNS = [
  "Name",
  "Category",
  "City",
  "Country",
  "Website",
  "Phone",
  "Email",
  "Opening hours",
  "Latitude",
  "Longitude",
  "Source",
  "Source URL",
  "Saved at",
  "Pitch opportunity",
  "Opportunity reasons",
  "Address",
  "All phones",
  "All emails",
  "Social profiles",
  "Website status",
  "Website issues",
  "HTTPS",
  "Mobile friendly",
  "Copyright year",
  "Site platform",
  "Emails on website",
  "Phones on website",
  "Socials on website",
  "Website checked at",
] as const;

export interface CsvRow {
  name: string;
  category: string;
  city: string;
  country: string;
  website: string;
  phone: string;
  email: string;
  openingHours: string;
  latitude: string;
  longitude: string;
  source: string;
  sourceUrl: string;
  savedAt: string;
  pitchOpportunity: string;
  opportunityReasons: string;
  address: string;
  allPhones: string;
  allEmails: string;
  socialProfiles: string;
  websiteStatus: string;
  websiteIssues: string;
  https: string;
  mobileFriendly: string;
  copyrightYear: string;
  sitePlatform: string;
  websiteEmails: string;
  websitePhones: string;
  websiteSocials: string;
  websiteCheckedAt: string;
}

function yesNo(value: boolean | null): string {
  return value === null ? "" : value ? "yes" : "no";
}

export function companyToRow(
  company: Company,
  savedAt: string,
  analysis: WebsiteAnalysis | null = null,
): CsvRow {
  const details = describeOsmDetails(company);
  const opportunity = computeOpportunity(company, details, analysis);
  const socials = (links: { network: keyof typeof SOCIAL_LABELS; url: string }[]): string =>
    links.map((link) => `${SOCIAL_LABELS[link.network]}: ${link.url}`).join("; ");
  return {
    name: company.name,
    category: company.category,
    city: company.city ?? "",
    country: company.country ?? "",
    website: normalizeWebsiteUrl(company.website) ?? "",
    phone: company.phone ?? "",
    email: company.email ?? "",
    openingHours: company.openingHours ?? "",
    latitude: company.lat !== null ? String(company.lat) : "",
    longitude: company.lon !== null ? String(company.lon) : "",
    source: company.source,
    sourceUrl: company.sourceUrl ?? "",
    savedAt,
    pitchOpportunity: `${opportunity.level} — ${opportunity.label}`,
    opportunityReasons: opportunity.reasons.join(" | "),
    address: details.address ?? "",
    allPhones: details.phones.join("; "),
    allEmails: details.emails.join("; "),
    socialProfiles: socials(details.socials),
    websiteStatus: analysis ? VERDICT_LABELS[websiteVerdict(analysis)] : details.websiteKind === "site" ? "not checked" : "",
    websiteIssues: analysis ? analysis.issues.map((issue) => issue.label).join(" | ") : "",
    https: analysis ? (analysis.https === "unknown" ? "" : analysis.https) : "",
    mobileFriendly: analysis ? yesNo(analysis.mobileFriendly) : "",
    copyrightYear: analysis?.copyrightYear ? String(analysis.copyrightYear) : "",
    sitePlatform: analysis?.platform ?? "",
    websiteEmails: analysis ? analysis.emails.join("; ") : "",
    websitePhones: analysis ? analysis.phones.join("; ") : "",
    websiteSocials: analysis ? socials(analysis.socials) : "",
    websiteCheckedAt: analysis?.analyzedAt ?? "",
  };
}

export function savedRecordsToRows(
  records: SavedLeadRecord[],
  getAnalysis?: (company: Company) => WebsiteAnalysis | null,
): CsvRow[] {
  return records.map((record) =>
    companyToRow(record.company, record.savedAt, getAnalysis?.(record.company) ?? null),
  );
}

const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

function guardFormula(value: string): string {
  // Prefix untrusted values that spreadsheet apps would interpret as formulas.
  if (FORMULA_TRIGGER.test(value)) return `'${value}`;
  return value;
}

function escapeField(value: string): string {
  const guarded = guardFormula(value);
  if (/[",\r\n]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}

export function rowsToCsv(rows: CsvRow[]): string {
  const lines = [CSV_COLUMNS.map(escapeField).join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.name,
        row.category,
        row.city,
        row.country,
        row.website,
        row.phone,
        row.email,
        row.openingHours,
        row.latitude,
        row.longitude,
        row.source,
        row.sourceUrl,
        row.savedAt,
        row.pitchOpportunity,
        row.opportunityReasons,
        row.address,
        row.allPhones,
        row.allEmails,
        row.socialProfiles,
        row.websiteStatus,
        row.websiteIssues,
        row.https,
        row.mobileFriendly,
        row.copyrightYear,
        row.sitePlatform,
        row.websiteEmails,
        row.websitePhones,
        row.websiteSocials,
        row.websiteCheckedAt,
      ]
        .map(escapeField)
        .join(","),
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function exportFilename(now: Date = new Date()): string {
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `leadscout-leads-${stamp}.csv`;
}

/** Triggers a client-side download; revokes the object URL afterwards. */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
