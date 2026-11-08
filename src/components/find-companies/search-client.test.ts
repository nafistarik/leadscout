import { describe, expect, test } from "bun:test";
import { isLiveCity } from "@/components/find-companies/search-client";

describe("isLiveCity", () => {
  test("prepared cities and their usual spellings are not live", () => {
    expect(isLiveCity({ city: "Dhaka", country: "" })).toBe(false);
    expect(isLiveCity({ city: "chittagong", country: "Bangladesh" })).toBe(false);
    expect(isLiveCity({ city: "NYC", country: "" })).toBe(false);
  });

  test("any other city, or a prepared name in another country, is live", () => {
    expect(isLiveCity({ city: "Berlin", country: "" })).toBe(true);
    expect(isLiveCity({ city: "London", country: "Canada" })).toBe(true);
  });

  test("an empty city is not a live search yet", () => {
    expect(isLiveCity({ city: "   ", country: "" })).toBe(false);
  });
});
