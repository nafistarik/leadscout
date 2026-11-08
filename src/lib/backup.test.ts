import { describe, expect, test } from "bun:test";
import { backupFilename, buildBackup, mergeBackup, parseBackup } from "@/lib/backup";
import type { SavedLeadRecord } from "@/types/company";

function lead(id: string): SavedLeadRecord {
  return {
    id,
    savedAt: "2026-11-01T10:00:00.000Z",
    company: {
      id,
      provenance: "overture",
      name: `Lead ${id}`,
      category: "Dental Clinic",
      city: "Dhaka",
      country: "Bangladesh",
      locationLabel: "Dhaka, Bangladesh",
      lat: 23.7,
      lon: 90.4,
      website: null,
      phone: null,
      email: null,
      openingHours: null,
      source: "Overture Maps",
      sourceUrl: null,
      tags: { name: `Lead ${id}` },
    },
  };
}

describe("buildBackup / parseBackup", () => {
  test("a backup round-trips leads and pipeline", () => {
    const text = buildBackup([lead("a")], { a: { status: "replied", notes: "Call Sunday" } }, "2026-11-08T10:00:00.000Z");
    expect(parseBackup(text)).toEqual({ savedLeads: [lead("a")], pipeline: { a: { status: "replied", notes: "Call Sunday" } } });
  });

  test("invalid records inside a real backup are dropped, not trusted", () => {
    const text = JSON.stringify({
      app: "leadscout",
      version: 1,
      savedLeads: [lead("a"), { id: "x" }, "junk"],
      pipeline: { a: { status: "hacked" }, b: { status: "won" } },
    });
    expect(parseBackup(text)).toEqual({ savedLeads: [lead("a")], pipeline: { b: { status: "won" } } });
  });

  test("rejects files that are not LeadScout backups, with a readable reason", () => {
    expect(() => parseBackup("not json")).toThrow("not valid JSON");
    expect(() => parseBackup(JSON.stringify({ records: [] }))).toThrow("not a LeadScout backup");
    expect(() => parseBackup(JSON.stringify({ app: "leadscout", version: 99 }))).toThrow("newer version");
  });
});

describe("mergeBackup", () => {
  const T1 = "2026-11-01T10:00:00.000Z";
  const T2 = "2026-11-05T10:00:00.000Z";

  test("adds new leads and never removes ours", () => {
    const merged = mergeBackup({ savedLeads: [lead("a")], pipeline: {} }, { savedLeads: [lead("b")], pipeline: {} });
    expect(merged.savedLeads.map((record) => record.id)).toEqual(["a", "b"]);
    expect(merged.added).toBe(1);
  });

  test("the more recently changed pipeline entry wins, keeping the higher contact count", () => {
    const merged = mergeBackup(
      { savedLeads: [lead("a")], pipeline: { a: { status: "contacted", statusChangedAt: T1, contactCount: 3 } } },
      { savedLeads: [lead("a")], pipeline: { a: { status: "replied", statusChangedAt: T2, contactCount: 1 } } },
    );
    expect(merged.pipeline.a).toEqual({ status: "replied", statusChangedAt: T2, contactCount: 3 });
    expect(merged.updated).toBe(1);
    expect(merged.added).toBe(0);
  });

  test("an older incoming entry changes nothing", () => {
    const ours = { status: "won" as const, statusChangedAt: T2 };
    const merged = mergeBackup(
      { savedLeads: [lead("a")], pipeline: { a: ours } },
      { savedLeads: [lead("a")], pipeline: { a: { status: "contacted", statusChangedAt: T1 } } },
    );
    expect(merged.pipeline.a).toEqual(ours);
    expect(merged.updated).toBe(0);
  });

  test("pipeline for a lead we never had arrives with that lead", () => {
    const merged = mergeBackup(
      { savedLeads: [], pipeline: {} },
      { savedLeads: [lead("b")], pipeline: { b: { status: "contacted" } } },
    );
    expect(merged.pipeline.b).toEqual({ status: "contacted" });
    expect(merged.added).toBe(1);
  });
});

test("backupFilename uses the local date and time", () => {
  expect(backupFilename(new Date(2026, 10, 8, 14, 30))).toBe("leadscout-backup-20261108-1430.json");
});
