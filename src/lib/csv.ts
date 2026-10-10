import type { DemoLead } from "@/types/lead";
import type { Company, SavedLeadRecord } from "@/types/company";
import { LEAD_STATUS_LABELS, NEXT_ACTION_LABELS } from "@/types/workflow";
import type { LeadWorkflow } from "@/types/workflow";
import { describeCompleteness, presentDetailsLabel } from "@/lib/completeness";
import { normalizeWebsiteUrl } from "@/lib/links";
import { computeOpportunity } from "@/lib/opportunity";
import { describeOsmDetails, SOCIAL_LABELS } from "@/lib/osm-details";
import { VERDICT_LABELS, websiteVerdict } from "@/lib/website-analysis";
import type { WebsiteAnalysis } from "@/lib/website-analysis";

/**
 * CSV export for saved leads and filtered search results. Client-side only:
 * builds a UTF-8 string (with BOM for spreadsheet apps), escapes per
 * RFC 4180, guards against spreadsheet formula injection from untrusted
 * source data, and downloads via a temporary object URL that is revoked
 * afterwards. Nothing is ever sent to an external service.
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
  "Fit score",
  "Available details",
  "Status",
  "Next action",
  "Follow up",
  "Notes",
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
  /** Heuristic fit score when computed in a search context, else blank. */
  fitScore: string;
  /** Present-field names (e.g. "website; phone"), else blank. */
  availableDetails: string;
  /** User-assigned workflow metadata; blank when never assigned. */
  status: string;
  nextAction: string;
  followUp: string;
  notes: string;
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

/** Pitch columns: blank for demo rows and for anything not known. */
type PitchColumns = Pick<
  CsvRow,
  | "pitchOpportunity"
  | "opportunityReasons"
  | "address"
  | "allPhones"
  | "allEmails"
  | "socialProfiles"
  | "websiteStatus"
  | "websiteIssues"
  | "https"
  | "mobileFriendly"
  | "copyrightYear"
  | "sitePlatform"
  | "websiteEmails"
  | "websitePhones"
  | "websiteSocials"
  | "websiteCheckedAt"
>;

export const BLANK_PITCH_COLUMNS: PitchColumns = {
  pitchOpportunity: "",
  opportunityReasons: "",
  address: "",
  allPhones: "",
  allEmails: "",
  socialProfiles: "",
  websiteStatus: "",
  websiteIssues: "",
  https: "",
  mobileFriendly: "",
  copyrightYear: "",
  sitePlatform: "",
  websiteEmails: "",
  websitePhones: "",
  websiteSocials: "",
  websiteCheckedAt: "",
};

function yesNo(value: boolean | null): string {
  return value === null ? "" : value ? "yes" : "no";
}

function pitchColumns(company: Company, analysis: WebsiteAnalysis | null): PitchColumns {
  const details = describeOsmDetails(company);
  const opportunity = computeOpportunity(company, details, analysis);
  const socials = (links: { network: keyof typeof SOCIAL_LABELS; url: string }[]): string =>
    links.map((link) => `${SOCIAL_LABELS[link.network]}: ${link.url}`).join("; ");
  return {
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

/** User workflow columns, shared by company and demo rows. */
function workflowColumns(workflow?: LeadWorkflow): Pick<CsvRow, "status" | "nextAction" | "followUp" | "notes"> {
  return {
    status: workflow?.status ? LEAD_STATUS_LABELS[workflow.status] : "",
    nextAction:
      workflow?.nextAction && workflow.nextAction !== "none"
        ? NEXT_ACTION_LABELS[workflow.nextAction]
        : "",
    followUp: workflow?.followUpDate ?? "",
    notes: workflow?.notes ?? "",
  };
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

export function companyToRow(
  company: Company,
  savedAt: string,
  fitScore: number | null = null,
  workflow?: LeadWorkflow,
  analysis: WebsiteAnalysis | null = null,
): CsvRow {
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
    fitScore: fitScore === null ? "" : String(fitScore),
    availableDetails: presentDetailsLabel(describeCompleteness(company)),
    ...workflowColumns(workflow),
    ...pitchColumns(company, analysis),
  };
}

export function demoToRow(demo: DemoLead, savedAt: string, workflow?: LeadWorkflow): CsvRow {
  const details: string[] = [];
  if (demo.websiteAvailable) details.push("website");
  if (demo.phoneAvailable) details.push("phone");
  return {
    name: demo.companyName,
    category: demo.category,
    city: demo.city,
    country: demo.country,
    website: "",
    phone: "",
    email: "",
    openingHours: "",
    latitude: "",
    longitude: "",
    source: "Demo (sample)",
    sourceUrl: "",
    savedAt,
    fitScore: "",
    availableDetails: details.join("; "),
    ...workflowColumns(workflow),
    ...BLANK_PITCH_COLUMNS,
  };
}

export function savedRecordsToRows(
  records: SavedLeadRecord[],
  demoById: (demoId: string) => DemoLead | undefined,
  getWorkflow?: (recordId: string) => LeadWorkflow | undefined,
  getAnalysis?: (company: Company) => WebsiteAnalysis | null,
): CsvRow[] {
  const rows: CsvRow[] = [];
  for (const record of records) {
    const workflow = getWorkflow?.(record.id);
    if (record.kind === "osm") {
      rows.push(
        companyToRow(record.company, record.savedAt, null, workflow, getAnalysis?.(record.company) ?? null),
      );
    } else {
      const demo = demoById(record.demoId);
      if (demo) rows.push(demoToRow(demo, record.savedAt, workflow));
    }
  }
  return rows;
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
        row.fitScore,
        row.availableDetails,
        row.status,
        row.nextAction,
        row.followUp,
        row.notes,
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

export type ExportScope = "leads" | "search";

export function exportFilename(now: Date = new Date(), scope: ExportScope = "leads"): string {
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return scope === "search" ? `leadscout-search-${stamp}.csv` : `leadscout-leads-${stamp}.csv`;
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
