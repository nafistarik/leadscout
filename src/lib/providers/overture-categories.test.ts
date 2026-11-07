import { describe, expect, test } from "bun:test";
import { BUSINESS_CATEGORIES } from "@/data/categories";
import { matchesSelector, OVERTURE_CATEGORY_SELECTORS } from "@/lib/providers/overture-categories";

describe("Overture category selectors", () => {
  test("every displayed category maps to at least one selector", () => {
    for (const category of BUSINESS_CATEGORIES) {
      expect(OVERTURE_CATEGORY_SELECTORS[category.value]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  test("no selector maps a category that is not displayed", () => {
    const displayed = new Set(BUSINESS_CATEGORIES.map((category) => category.value));
    for (const key of Object.keys(OVERTURE_CATEGORY_SELECTORS)) expect(displayed.has(key)).toBe(true);
  });

  test("a selector without fine values takes the whole file", () => {
    expect(matchesSelector({ c: "restaurant", t: "theme_restaurant" }, { c: "restaurant" })).toBe(true);
    expect(matchesSelector({ c: "cafe" }, { c: "restaurant" })).toBe(false);
  });

  test("a selector with fine values takes only those", () => {
    const hairdresser = { c: "personal_or_beauty_service", t: ["hair_salon", "barber"] };
    expect(matchesSelector({ c: "personal_or_beauty_service", t: "barber" }, hairdresser)).toBe(true);
    expect(matchesSelector({ c: "personal_or_beauty_service", t: "nail_salon" }, hairdresser)).toBe(false);
  });

  test("a row whose fine value was dropped matches by its coarse name", () => {
    const travel = { c: "travel_service", t: ["travel_agent", "travel_service"] };
    expect(matchesSelector({ c: "travel_service" }, travel)).toBe(true);
    expect(matchesSelector({ c: "personal_or_beauty_service" }, { c: "personal_or_beauty_service", t: ["barber"] })).toBe(false);
  });
});
