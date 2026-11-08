import { describe, expect, test } from "bun:test";
import { parseStatusFilter } from "@/components/saved-leads/saved-leads-section";

describe("parseStatusFilter", () => {
  test("accepts the follow-up filter and every pipeline status", () => {
    expect(parseStatusFilter("due")).toBe("due");
    expect(parseStatusFilter("proposal-sent")).toBe("proposal-sent");
    expect(parseStatusFilter("not-a-fit")).toBe("not-a-fit");
  });

  test("anything missing or unknown shows all leads", () => {
    for (const value of [null, "", "all", "Won", "deleted", "<script>"]) expect(parseStatusFilter(value)).toBe("all");
  });
});
