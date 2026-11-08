import { describe, expect, test } from "bun:test";
import {
  companyToRow,
  exportFilename,
  rowsToCsv,
  savedRecordsToRows,
} from "@/lib/csv";
import type { Company, SavedLeadRecord } from "@/types/company";

function company(overrides: Partial<Company> = {}): Company {
  return {
    id: "osm:node/1",
    provenance: "osm",
    name: "Acme",
    category: "Bakery",
    city: "Berlin",
    country: "Germany",
    locationLabel: "Berlin, Germany",
    lat: 52.5,
    lon: 13.4,
    website: null,
    phone: null,
    email: null,
    openingHours: null,
    source: "OpenStreetMap",
    sourceUrl: "https://www.openstreetmap.org/node/1",
    tags: {},
    ...overrides,
  };
}

function record(overrides: Partial<SavedLeadRecord> = {}): SavedLeadRecord {
  return {
    id: "osm:node/1",
    savedAt: "2026-01-01",
    company: company(),
    ...overrides,
  };
}

describe("rowsToCsv", () => {
  test("starts with a UTF-8 BOM and a header row", () => {
    const csv = rowsToCsv([]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("Name,Category,City");
  });

  test("escapes quotes, commas, and line breaks", () => {
    const csv = rowsToCsv([companyToRow(company({ name: 'Say "hi", Bob\nJr' }), "")]);
    expect(csv).toContain('"Say ""hi"", Bob\nJr"');
    expect(csv).toContain("Bakery");
  });

  test("neutralizes spreadsheet formula injection", () => {
    const csv = rowsToCsv([
      companyToRow(company({ name: "=HYPERLINK(\"evil\")", category: "+123", city: "-5", country: "@x" }), ""),
    ]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+123");
    expect(csv).toContain("'-5");
    expect(csv).toContain("'@x");
  });

  test("leaves safe values untouched", () => {
    const csv = rowsToCsv([
      companyToRow(company({ name: "Plain Bakery", website: "https://example.com" }), ""),
    ]);
    expect(csv).toContain("Plain Bakery,Bakery,Berlin,Germany,https://example.com");
  });
});

describe("savedRecordsToRows", () => {
  test("maps company snapshots with blank fallbacks", () => {
    const rows = savedRecordsToRows([record()]);
    expect(rows).toHaveLength(1);
    expect(rows[0].website).toBe("");
    expect(rows[0].source).toBe("OpenStreetMap");
  });

  test("includes pitch opportunity and website analysis when available", () => {
    const rows = savedRecordsToRows([record({ company: company({ website: null }) })]);
    expect(rows[0].pitchOpportunity).toContain("high");
  });

  test("exports the pipeline: labelled status, lost reason, follow-up, contacts, notes", () => {
    const rows = savedRecordsToRows([record()], undefined, () => ({
      status: "lost",
      lostReason: "no-budget",
      followUpDate: "2026-11-20",
      contactCount: 2,
      lastContactedAt: "2026-11-08T10:00:00.000Z",
      notes: "Asked for a quote",
    }));
    const { status, lostReason, followUpDate, timesContacted, lastContactedAt, notes } = rows[0];
    expect({ status, lostReason, followUpDate, timesContacted, lastContactedAt, notes }).toEqual({
      status: "Lost",
      lostReason: "No budget",
      followUpDate: "2026-11-20",
      timesContacted: "2",
      lastContactedAt: "2026-11-08T10:00:00.000Z",
      notes: "Asked for a quote",
    });
  });

  test("a lead with no pipeline history exports as New with blank pipeline fields", () => {
    const row = savedRecordsToRows([record()], undefined, () => undefined)[0];
    expect([row.status, row.lostReason, row.followUpDate, row.timesContacted, row.notes]).toEqual(["New", "", "", "", ""]);
  });

  test("pipeline columns sit after Saved at, and a formula-like note is neutralized", () => {
    const csv = rowsToCsv(savedRecordsToRows([record()], undefined, () => ({ notes: "=1+1" })));
    expect(csv).toContain("Saved at,Status,Lost reason,Follow-up date,Times contacted,Last contacted at,Notes,Pitch opportunity");
    expect(csv).toContain(",New,,,,,'=1+1,");
  });
});

describe("exportFilename", () => {
  test("produces a filesystem-safe timestamped name", () => {
    const name = exportFilename(new Date(2026, 9, 9, 23, 15));
    expect(name).toBe("leadscout-leads-20261009-2315.csv");
  });
});

describe("companyToRow", () => {
  test("maps contact fields honestly with blank fallbacks", () => {
    const row = companyToRow(
      company({ website: "https://a.example", phone: "123" }),
      "2026-01-01",
    );
    expect(row.website).toBe("https://a.example");
    expect(row.phone).toBe("123");
    expect(row.email).toBe("");
    expect(row.savedAt).toBe("2026-01-01");
  });

  test("preserves Bengali and other Unicode names byte-for-byte", () => {
    const name = "ঢাকা বেকারি হাউস";
    const csv = rowsToCsv([companyToRow(company({ name }), "")]);
    expect(csv).toContain(name);
  });

  test("columns keep a stable order", () => {
    const csv = rowsToCsv([]);
    const header = csv.trim();
    expect(header.startsWith("Name,Category,City")).toBe(true);
    expect(header).toContain(
      "Saved at,Status,Lost reason,Follow-up date,Times contacted,Last contacted at,Notes,Pitch opportunity,Opportunity reasons,",
    );
    expect(header.endsWith("Emails on website,Phones on website,Socials on website,Website checked at")).toBe(true);
  });
});
