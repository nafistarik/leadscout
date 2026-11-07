import { describe, expect, test } from "bun:test";
import {
  effectiveStatus,
  isFollowUpDue,
  isValidDateString,
  localDateString,
  MAX_NOTES_LENGTH,
  recordContact,
  sanitizePipelineMap,
  setLeadStatus,
  updateLeadDetails,
} from "@/lib/lead-pipeline";

const T1 = "2026-11-08T10:00:00.000Z";
const T2 = "2026-11-09T10:00:00.000Z";

describe("sanitizePipelineMap", () => {
  test("keeps valid fields and drops everything malformed", () => {
    const map = sanitizePipelineMap({
      a: {
        status: "lost",
        lostReason: "no-budget",
        notes: "  Owner asked for a quote  ",
        followUpDate: "2026-11-20",
        contactCount: 2,
        lastContactedAt: T1,
        statusChangedAt: T2,
      },
      b: { status: "hacked", lostReason: "no-budget", followUpDate: "2026-02-30", contactCount: -1, lastContactedAt: "yesterday" },
      c: "not an object",
      "": { status: "won" },
    });
    expect(map).toEqual({
      a: {
        status: "lost",
        lostReason: "no-budget",
        notes: "Owner asked for a quote",
        followUpDate: "2026-11-20",
        contactCount: 2,
        lastContactedAt: T1,
        statusChangedAt: T2,
      },
    });
  });

  test("a lost reason without the lost status is dropped, and 'new' is stored as absence", () => {
    expect(sanitizePipelineMap({ a: { status: "replied", lostReason: "other" }, b: { status: "new" } })).toEqual({
      a: { status: "replied" },
    });
  });

  test("non-object input becomes an empty map", () => {
    for (const value of [null, undefined, [], "x", 3]) expect(sanitizePipelineMap(value)).toEqual({});
  });
});

describe("setLeadStatus", () => {
  test("stamps the change time and keeps notes", () => {
    const map = setLeadStatus({ a: { notes: "Call after 5pm" } }, "a", "contacted", T1);
    expect(map.a).toEqual({ notes: "Call after 5pm", status: "contacted", statusChangedAt: T1 });
  });

  test("a lost reason is kept only with the lost status", () => {
    const lost = setLeadStatus({}, "a", "lost", T1, "has-website");
    expect(lost.a).toEqual({ status: "lost", lostReason: "has-website", statusChangedAt: T1 });
    expect(setLeadStatus(lost, "a", "replied", T2).a).toEqual({ status: "replied", statusChangedAt: T2 });
  });

  test("choosing the current status again changes nothing", () => {
    const map = setLeadStatus({}, "a", "replied", T1);
    expect(setLeadStatus(map, "a", "replied", T2)).toBe(map);
  });

  test("moving back to new with nothing else removes the entry", () => {
    expect(setLeadStatus(setLeadStatus({}, "a", "contacted", T1), "a", "new", T2).a).toEqual({ statusChangedAt: T2 });
    expect(effectiveStatus(undefined)).toBe("new");
  });
});

describe("recordContact", () => {
  test("counts each confirmed message and moves a new lead to contacted", () => {
    const once = recordContact({}, "a", T1);
    expect(once.a).toEqual({ contactCount: 1, lastContactedAt: T1, status: "contacted", statusChangedAt: T1 });
    expect(recordContact(once, "a", T2).a).toEqual({
      contactCount: 2,
      lastContactedAt: T2,
      status: "contacted",
      statusChangedAt: T1,
    });
  });

  test("a lead further along keeps its status", () => {
    const replied = setLeadStatus({}, "a", "replied", T1);
    expect(recordContact(replied, "a", T2).a?.status).toBe("replied");
  });
});

describe("updateLeadDetails", () => {
  test("sets, trims, caps and clears notes", () => {
    const map = updateLeadDetails({}, "a", { notes: `  ${"x".repeat(MAX_NOTES_LENGTH + 50)}  ` });
    expect(map.a?.notes).toHaveLength(MAX_NOTES_LENGTH);
    expect(updateLeadDetails(map, "a", { notes: "   " }).a).toBeUndefined();
  });

  test("sets and clears the follow-up date, ignoring an invalid one", () => {
    const map = updateLeadDetails({}, "a", { followUpDate: "2026-11-20" });
    expect(map.a?.followUpDate).toBe("2026-11-20");
    expect(updateLeadDetails(map, "a", { followUpDate: "20/11/2026" }).a?.followUpDate).toBe("2026-11-20");
    expect(updateLeadDetails(map, "a", { followUpDate: "" }).a).toBeUndefined();
  });
});

describe("isFollowUpDue", () => {
  test("due on and after the date while the lead is open", () => {
    const entry = { status: "contacted" as const, followUpDate: "2026-11-10" };
    expect(isFollowUpDue(entry, "2026-11-09")).toBe(false);
    expect(isFollowUpDue(entry, "2026-11-10")).toBe(true);
    expect(isFollowUpDue(entry, "2026-12-01")).toBe(true);
    expect(isFollowUpDue({ followUpDate: "2026-11-10" }, "2026-11-10")).toBe(true);
  });

  test("never due without a date or once the lead is closed", () => {
    expect(isFollowUpDue(undefined, "2026-11-10")).toBe(false);
    expect(isFollowUpDue({ status: "contacted" }, "2026-11-10")).toBe(false);
    for (const status of ["won", "lost", "not-a-fit"] as const) {
      expect(isFollowUpDue({ status, followUpDate: "2026-11-01" }, "2026-11-10")).toBe(false);
    }
  });
});

describe("dates", () => {
  test("isValidDateString rejects impossible and badly formatted dates", () => {
    expect(isValidDateString("2028-02-29")).toBe(true);
    expect(isValidDateString("2026-02-29")).toBe(false);
    expect(isValidDateString("2026-13-01")).toBe(false);
    expect(isValidDateString("2026-1-01")).toBe(false);
  });

  test("localDateString pads month and day from the local calendar", () => {
    expect(localDateString(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});
