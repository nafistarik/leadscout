import { afterEach, describe, expect, test } from "bun:test";
import { buildCompanySummary, buildContactText, copyText } from "@/lib/clipboard";
import type { Company } from "@/types/company";

function company(overrides: Partial<Company> = {}): Company {
  return {
    id: "osm:node/1",
    provenance: "osm",
    name: "Acme Bakery",
    category: "Bakery",
    city: "Berlin",
    country: "Germany",
    locationLabel: "Berlin, Germany",
    lat: 52.5,
    lon: 13.4,
    website: "https://a.example",
    phone: "+49 30 1",
    email: null,
    openingHours: null,
    source: "OpenStreetMap",
    sourceUrl: "https://www.openstreetmap.org/node/1",
    tags: {},
    ...overrides,
  };
}

type MutableGlobals = Record<string, unknown>;
const globals = globalThis as MutableGlobals;
const savedNavigator = globals.navigator;
const savedDocument = globals.document;

afterEach(() => {
  globals.navigator = savedNavigator;
  globals.document = savedDocument;
});

describe("buildCompanySummary", () => {
  test("includes all fields with explicit missing markers", () => {
    const summary = buildCompanySummary(company());
    expect(summary).toContain("Acme Bakery — Bakery");
    expect(summary).toContain("Berlin, Germany");
    expect(summary).toContain("Website: https://a.example");
    expect(summary).toContain("Email: Not available");
    expect(summary).toContain("Source: OpenStreetMap (https://www.openstreetmap.org/node/1)");
    expect(summary).not.toContain("Your research");
  });

  test("appends user workflow in a separated section without mixing sources", () => {
    const summary = buildCompanySummary(company(), {
      status: "qualified",
      notes: "Called once, asked to email.",
      nextAction: "email",
      followUpDate: "2026-11-01",
    });
    expect(summary).toContain("Your research (local notes, not source data):");
    expect(summary).toContain("Status: Qualified");
    expect(summary).toContain("Next action: Email");
    expect(summary).toContain("Follow up: 2026-11-01");
    expect(summary).toContain("Notes: Called once, asked to email.");
    // Source section stays intact and separate.
    expect(summary.indexOf("Source:")).toBeLessThan(summary.indexOf("Your research"));
  });

  test("omits the research section when no workflow exists", () => {
    expect(buildCompanySummary(company(), {})).not.toContain("Your research");
  });
});

describe("buildContactText", () => {
  test("lists present contacts only, null when none", () => {
    const text = buildContactText(company());
    expect(text).toContain("Website: https://a.example");
    expect(text).toContain("Phone: +49 30 1");
    expect(text).not.toContain("Email");
    expect(buildContactText(company({ website: null, phone: null, email: null }))).toBeNull();
  });
});

describe("copyText", () => {
  test("reports success through the Clipboard API", async () => {
    let written = "";
    globals.navigator = { clipboard: { writeText: async (text: string) => { written = text; } } };
    const result = await copyText("hello");
    expect(result).toEqual({ ok: true });
    expect(written).toBe("hello");
  });

  test("reports failure when the API rejects and no fallback exists", async () => {
    globals.navigator = {
      clipboard: {
        writeText: () => Promise.reject(new Error("denied")),
      },
    };
    globals.document = undefined;
    const result = await copyText("hello");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Copy failed");
  });

  test("reports failure when no clipboard is available", async () => {
    globals.navigator = undefined;
    globals.document = undefined;
    const result = await copyText("hello");
    expect(result.ok).toBe(false);
  });
});
