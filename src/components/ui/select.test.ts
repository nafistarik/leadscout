import { describe, expect, test } from "bun:test";
import { bestMatchIndex } from "@/components/ui/select";
import type { SelectOption } from "@/components/ui/select";
import { CATEGORY_OPTIONS } from "@/data/search-options";

/** The options left after typing `query`, in list order, as the Select filters them. */
function filteredFor(query: string): SelectOption[] {
  const needle = query.toLowerCase();
  return CATEGORY_OPTIONS.filter((option) =>
    `${option.label} ${option.group ?? ""} ${option.keywords ?? ""}`.toLowerCase().includes(needle),
  );
}

describe("bestMatchIndex", () => {
  test("a label match beats an earlier keyword match", () => {
    const options = filteredFor("Beauty");
    expect(options[0].label).toBe("Cosmetics Store");
    expect(options[bestMatchIndex(options, "Beauty")].label).toBe("Beauty Salon");
  });

  test("a label that starts with the query beats one that only contains it", () => {
    const options: SelectOption[] = [
      { value: "a", label: "Ice Cream Shop" },
      { value: "b", label: "Cream Parlour" },
    ];
    expect(bestMatchIndex(options, "cream")).toBe(1);
    expect(bestMatchIndex(options, "  CREAM ")).toBe(1);
  });

  test("falls back to the first option when no label matches", () => {
    const options = filteredFor("tea");
    expect(bestMatchIndex([{ value: "x", label: "Cafe", keywords: "tea" }], "tea")).toBe(0);
    expect(options[bestMatchIndex(options, "tea")].label).toBe("Tea Shop");
    expect(bestMatchIndex([], "x")).toBe(0);
    expect(bestMatchIndex(options, "")).toBe(0);
  });
});
