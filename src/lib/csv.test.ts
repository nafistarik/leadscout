import { describe, expect, test } from "bun:test";
import {
  exportFilename,
  rowsToCsv,
  savedRecordsToRows,
} from "@/lib/csv";
import type { Company } from "@/types/company";

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

describe("rowsToCsv", () => {
  test("starts with a UTF-8 BOM and a header row", () => {
    const csv = rowsToCsv([]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("Name,Category,City");
  });

  test("escapes quotes, commas, and line breaks", () => {
    const csv = rowsToCsv([
      {
        name: 'Say "hi", Bob\nJr',
        category: "Café",
        city: "",
        country: "",
        website: "",
        phone: "",
        email: "",
        openingHours: "",
        latitude: "",
        longitude: "",
        source: "OpenStreetMap",
        sourceUrl: "",
        savedAt: "",
      },
    ]);
    expect(csv).toContain('"Say ""hi"", Bob\nJr"');
    expect(csv).toContain("Café");
  });

  test("neutralizes spreadsheet formula injection", () => {
    const csv = rowsToCsv([
      {
        name: "=HYPERLINK(\"evil\")",
        category: "+123",
        city: "-5",
        country: "@x",
        website: "",
        phone: "",
        email: "",
        openingHours: "",
        latitude: "",
        longitude: "",
        source: "",
        sourceUrl: "",
        savedAt: "",
      },
    ]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+123");
    expect(csv).toContain("'-5");
    expect(csv).toContain("'@x");
  });

  test("leaves safe values untouched", () => {
    const csv = rowsToCsv([
      {
        name: "Plain Bakery",
        category: "Bakery",
        city: "Berlin",
        country: "Germany",
        website: "https://example.com",
        phone: "",
        email: "",
        openingHours: "",
        latitude: "52.5",
        longitude: "13.4",
        source: "OpenStreetMap",
        sourceUrl: "",
        savedAt: "",
      },
    ]);
    expect(csv).toContain("Plain Bakery,Bakery,Berlin,Germany,https://example.com");
  });
});

describe("savedRecordsToRows", () => {
  test("maps company snapshots with blank fallbacks", () => {
    const rows = savedRecordsToRows(
      [{ id: "osm:node/1", kind: "osm", savedAt: "2026-01-01", company: company() }],
      () => undefined,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].website).toBe("");
    expect(rows[0].source).toBe("OpenStreetMap");
  });

  test("labels demo records as samples with blank contact fields", () => {
    const rows = savedRecordsToRows(
      [{ id: "demo:demo-01", kind: "demo", savedAt: "2026-01-01", demoId: "demo-01" }],
      (demoId) =>
        demoId === "demo-01"
          ? {
              id: "demo-01",
              companyName: "Sample Co",
              category: "Bakery",
              city: "Berlin",
              country: "Germany",
              websiteAvailable: true,
              phoneAvailable: false,
            }
          : undefined,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe("Demo (sample)");
    expect(rows[0].website).toBe("");
  });

  test("skips demo references that no longer resolve", () => {
    const rows = savedRecordsToRows(
      [{ id: "demo:ghost", kind: "demo", savedAt: "2026-01-01", demoId: "ghost" }],
      () => undefined,
    );
    expect(rows).toHaveLength(0);
  });
});

describe("exportFilename", () => {
  test("produces a filesystem-safe timestamped name", () => {
    const name = exportFilename(new Date(2026, 9, 9, 23, 15));
    expect(name).toBe("leadscout-leads-20261009-2315.csv");
  });
});
