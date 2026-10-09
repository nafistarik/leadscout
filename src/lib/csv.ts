import type { DemoLead } from "@/types/lead";
import type { Company, SavedLeadRecord } from "@/types/company";
import { normalizeWebsiteUrl } from "@/lib/links";

/**
 * CSV export for saved leads. Client-side only: builds a UTF-8 string
 * (with BOM for spreadsheet apps), escapes per RFC 4180, guards against
 * spreadsheet formula injection from untrusted source data, and downloads
 * via a temporary object URL that is revoked afterwards.
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

function companyToRow(company: Company, savedAt: string): CsvRow {
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
  };
}

function demoToRow(demo: DemoLead, savedAt: string): CsvRow {
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
  };
}

export function savedRecordsToRows(
  records: SavedLeadRecord[],
  demoById: (demoId: string) => DemoLead | undefined,
): CsvRow[] {
  const rows: CsvRow[] = [];
  for (const record of records) {
    if (record.kind === "osm") {
      rows.push(companyToRow(record.company, record.savedAt));
    } else {
      const demo = demoById(record.demoId);
      if (demo) rows.push(demoToRow(demo, record.savedAt));
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
