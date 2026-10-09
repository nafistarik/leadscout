import { describe, expect, test } from "bun:test";
import {
  applyWorkflowPatch,
  buildQualificationChecklist,
  effectiveStatus,
  isOverdue,
  isValidDateString,
  removeWorkflowField,
  sanitizeWorkflowMap,
  signalsFromCompany,
  signalsFromDemoLead,
  todayLocalYmd,
} from "@/lib/workflow";

describe("sanitizeWorkflowMap", () => {
  test("keeps valid entries and drops malformed ones", () => {
    const cleaned = sanitizeWorkflowMap({
      "osm:node/1": {
        status: "qualified",
        notes: "  Good fit  ",
        nextAction: "email",
        followUpDate: "2026-11-01",
        lastReviewedAt: "2026-10-09T00:00:00.000Z",
      },
      "demo:demo-01": { status: "bogus", notes: "   ", nextAction: "none" },
      "demo:demo-02": { status: "researching", followUpDate: "2026-02-30" },
      "": { status: "qualified" },
      broken: null,
    });
    expect(Object.keys(cleaned).sort()).toEqual(["demo:demo-02", "osm:node/1"]);
    expect(cleaned["osm:node/1"]).toEqual({
      status: "qualified",
      notes: "Good fit",
      nextAction: "email",
      followUpDate: "2026-11-01",
      lastReviewedAt: "2026-10-09T00:00:00.000Z",
    });
    // Invalid status dropped, empty notes dropped, impossible date dropped,
    // but the valid remainder of the entry survives.
    expect(cleaned["demo:demo-02"]).toEqual({ status: "researching" });
  });

  test("rejects non-objects and trims overlong notes", () => {
    expect(sanitizeWorkflowMap(null)).toEqual({});
    expect(sanitizeWorkflowMap([])).toEqual({});
    const cleaned = sanitizeWorkflowMap({
      x: { notes: `  ${"n".repeat(5000)}  ` },
    });
    expect(cleaned.x.notes).toHaveLength(2000);
  });
});

describe("effectiveStatus", () => {
  test("defaults to unreviewed when never assigned", () => {
    expect(effectiveStatus(undefined)).toBe("unreviewed");
    expect(effectiveStatus({})).toBe("unreviewed");
    expect(effectiveStatus({ status: "qualified" })).toBe("qualified");
  });
});

describe("isValidDateString", () => {
  test("accepts real calendar dates only", () => {
    expect(isValidDateString("2026-11-01")).toBe(true);
    expect(isValidDateString("2024-02-29")).toBe(true);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("2026-13-01")).toBe(false);
    expect(isValidDateString("11/01/2026")).toBe(false);
    expect(isValidDateString("")).toBe(false);
    expect(isValidDateString("2026-1-1")).toBe(false);
  });
});

describe("isOverdue", () => {
  test("past dates are overdue, today and future are not, missing never is", () => {
    expect(isOverdue("2026-10-01", "2026-10-09")).toBe(true);
    expect(isOverdue("2026-10-09", "2026-10-09")).toBe(false);
    expect(isOverdue("2026-10-10", "2026-10-09")).toBe(false);
    expect(isOverdue(undefined, "2026-10-09")).toBe(false);
    expect(isOverdue("not-a-date", "2026-10-09")).toBe(false);
    expect(isOverdue("2026-10-01", "garbage")).toBe(false);
  });
});

describe("todayLocalYmd", () => {
  test("formats local dates as YYYY-MM-DD", () => {
    expect(todayLocalYmd(new Date(2026, 9, 9, 23, 59))).toBe("2026-10-09");
    expect(todayLocalYmd(new Date(2026, 0, 5, 1, 2))).toBe("2026-01-05");
  });
});

describe("applyWorkflowPatch / removeWorkflowField", () => {
  test("patches merge per record without touching others", () => {
    const base = {
      a: { status: "researching" as const, notes: "keep" },
      b: { status: "qualified" as const },
    };
    const patched = applyWorkflowPatch(base, "a", { status: "qualified" as const });
    expect(patched?.a).toEqual({ status: "qualified", notes: "keep" });
    expect(patched?.b).toBe(base.b);
    // Empty patches and ids are no-ops.
    expect(applyWorkflowPatch(base, "a", {})).toBeNull();
    expect(applyWorkflowPatch(base, "", { status: "qualified" as const })).toBeNull();
  });

  test("removal drops empty entries and keeps the rest intact", () => {
    const base = {
      a: { status: "researching" as const, notes: "keep" },
      b: { notes: "solo" },
    };
    const removed = removeWorkflowField(base, "a", "notes");
    expect(removed?.a).toEqual({ status: "researching" });
    expect(removed?.b).toBe(base.b);
    const emptied = removeWorkflowField(base, "b", "notes");
    expect(emptied && "b" in emptied).toBe(false);
    expect(emptied?.a).toBe(base.a);
    // Unknown records or keys are no-ops.
    expect(removeWorkflowField(base, "missing", "notes")).toBeNull();
    expect(removeWorkflowField(base, "a", "followUpDate" as never)).toBeNull();
  });
});
describe("signals + qualification checklist", () => {
  test("derives signals from company records without invention", () => {
    const signals = signalsFromCompany({
      id: "osm:node/1",
      provenance: "osm",
      name: "Acme",
      category: "Bakery",
      city: null,
      country: null,
      locationLabel: "Unknown",
      lat: null,
      lon: null,
      website: "https://a.example",
      phone: null,
      email: null,
      openingHours: null,
      source: "OpenStreetMap",
      sourceUrl: null,
      tags: {},
    });
    expect(signals).toEqual({
      website: true,
      phone: false,
      email: false,
      openingHours: false,
      coordinates: false,
      categoryKnown: true,
    });
  });

  test("demo signals mark unsupported fields unknown, never present", () => {
    const signals = signalsFromDemoLead({
      id: "demo-01",
      companyName: "Sample",
      category: "Bakery",
      city: "Berlin",
      country: "Germany",
      websiteAvailable: true,
      phoneAvailable: false,
    });
    expect(signals.email).toBe(false);
    expect(signals.openingHours).toBe(false);
    expect(signals.coordinates).toBe(false);
    expect(signals.website).toBe(true);
  });

  test("checklist reports match vs unknown, never failure", () => {
    const rows = buildQualificationChecklist({
      website: true,
      phone: false,
      email: false,
      openingHours: false,
      coordinates: true,
      categoryKnown: true,
    });
    expect(rows).toHaveLength(6);
    const byCriterion = Object.fromEntries(rows.map((row) => [row.criterion, row]));
    expect(byCriterion["Website listed"].result).toBe("match");
    expect(byCriterion["Phone listed"].result).toBe("unknown");
    expect(byCriterion["Phone listed"].detail).toContain("unlisted");
    // No row frames absence as unsuitability.
    for (const row of rows) {
      expect(["match", "unknown"]).toContain(row.result);
      expect(row.detail.toLowerCase()).not.toContain("bad");
      expect(row.detail.toLowerCase()).not.toContain("poor");
    }
  });
});
