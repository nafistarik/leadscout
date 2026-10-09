import { describe, expect, test } from "bun:test";
import { sanitizeLists } from "@/hooks/use-lead-lists";
import {
  applyAddToList,
  applyCreateList,
  applyDeleteList,
  applyRemoveFromList,
  applyRenameList,
  validateListName,
} from "@/lib/lead-lists";
import type { LeadList } from "@/types/lead";

function list(overrides: Partial<LeadList> = {}): LeadList {
  return { id: "l1", name: "Alpha", createdAt: "2026-01-01T00:00:00.000Z", leadIds: [], ...overrides };
}

describe("validateListName", () => {
  test("rejects empty and duplicate names (case-insensitive)", () => {
    const lists = [list()];
    expect(validateListName("  ", lists)).toBe("List name cannot be empty.");
    expect(validateListName("alpha", lists)).toBe("A list with this name already exists.");
    expect(validateListName("Beta", lists)).toBeNull();
  });

  test("rename ignores the list being renamed", () => {
    const lists = [list()];
    expect(validateListName("Alpha", lists, "l1")).toBeNull();
    expect(validateListName("Alpha", lists, "l2")).toBe("A list with this name already exists.");
  });
});

describe("applyCreateList / applyRenameList / applyDeleteList", () => {
  test("create trims and starts empty; invalid names fail", () => {
    const created = applyCreateList([list()], "  Beta ", {
      ...list(),
      id: "l2",
      name: "ignored",
      leadIds: ["x"],
    });
    expect("lists" in created && created.lists[1]).toEqual({
      ...list(),
      id: "l2",
      name: "Beta",
      leadIds: [],
    });
    expect(applyCreateList([list()], "alpha", list({ id: "l2" }))).toEqual({
      ok: false,
      error: "A list with this name already exists.",
    });
  });

  test("rename updates only the target; missing ids fail", () => {
    const renamed = applyRenameList([list(), list({ id: "l2", name: "Beta" })], "l2", "Gamma");
    expect("lists" in renamed && renamed.lists[1].name).toBe("Gamma");
    expect(applyRenameList([list()], "missing", "Gamma")).toEqual({
      ok: false,
      error: "That list no longer exists.",
    });
  });

  test("delete removes only the target", () => {
    expect(applyDeleteList([list(), list({ id: "l2" })], "l1")).toHaveLength(1);
    expect(applyDeleteList([list()], "missing")).toHaveLength(1);
  });
});

describe("applyAddToList / applyRemoveFromList", () => {
  test("prevents duplicate membership within the same list", () => {
    const withMember = applyAddToList([list()], "l1", "osm:node/1");
    expect("lists" in withMember && withMember.lists[0].leadIds).toEqual(["osm:node/1"]);
    const dup = applyAddToList(
      "lists" in withMember ? withMember.lists : [],
      "l1",
      "osm:node/1",
    );
    expect(dup).toEqual({ ok: false, error: "Already in “Alpha”." });
  });

  test("same lead may belong to different lists", () => {
    const lists = [list(), list({ id: "l2", name: "Beta" })];
    const first = applyAddToList(lists, "l1", "osm:node/1");
    const second = applyAddToList("lists" in first ? first.lists : [], "l2", "osm:node/1");
    expect("lists" in second && second.lists[1].leadIds).toEqual(["osm:node/1"]);
  });

  test("validates missing lists and invalid references", () => {
    expect(applyAddToList([list()], "missing", "osm:node/1")).toEqual({
      ok: false,
      error: "That list no longer exists.",
    });
    expect(applyAddToList([list()], "l1", "")).toEqual({
      ok: false,
      error: "Invalid lead reference.",
    });
  });

  test("removal only affects the target list and is idempotent", () => {
    const lists = [list({ leadIds: ["a", "b"] }), list({ id: "l2", leadIds: ["a"] })];
    const removed = applyRemoveFromList(lists, "l1", "a");
    expect(removed[0].leadIds).toEqual(["b"]);
    expect(removed[1].leadIds).toEqual(["a"]);
    expect(applyRemoveFromList(removed, "l1", "a")[0].leadIds).toEqual(["b"]);
  });
});

describe("sanitizeLists", () => {
  test("drops malformed lists and dedupes member ids", () => {
    const cleaned = sanitizeLists([
      { id: "l1", name: "A", leadIds: ["a", "a", "b", 42, null] },
      { id: 7, name: "Bad", leadIds: [] },
      null,
    ]);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].leadIds).toEqual(["a", "b"]);
  });

  test("rejects non-arrays and fills missing timestamps", () => {
    expect(sanitizeLists(null)).toEqual([]);
    expect(sanitizeLists("junk")).toEqual([]);
    const cleaned = sanitizeLists([{ id: "l1", name: "A", leadIds: [] }]);
    expect(typeof cleaned[0].createdAt).toBe("string");
  });
});
