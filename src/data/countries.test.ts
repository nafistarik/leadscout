import { describe, expect, test } from "bun:test";
import { COUNTRIES, isKnownCountryName } from "@/data/countries";

describe("COUNTRIES", () => {
  test("covers the full ISO 3166-1 list plus Hong Kong", () => {
    expect(COUNTRIES).toHaveLength(249);
  });

  test("codes are unique, well-formed alpha-2 values", () => {
    const codes = COUNTRIES.map((country) => country.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });

  test("names are unique and non-empty", () => {
    const names = COUNTRIES.map((country) => country.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      expect(name.trim().length).toBeGreaterThan(0);
    }
  });

  test("is sorted alphabetically by name", () => {
    for (let index = 1; index < COUNTRIES.length; index += 1) {
      const ordered = COUNTRIES[index - 1].name.localeCompare(COUNTRIES[index].name, "en") <= 0;
      expect(ordered).toBe(true);
    }
  });

  test("resolves the countries the provider flow relies on", () => {
    const byCode = new Map(COUNTRIES.map((country) => [country.code, country.name]));
    expect(byCode.get("DE")).toBe("Germany");
    expect(byCode.get("US")).toBe("United States");
    expect(byCode.get("GB")).toBe("United Kingdom");
    expect(byCode.get("CV")).toBe("Cape Verde");
    expect(byCode.get("HK")).toBe("Hong Kong");
  });
});

describe("isKnownCountryName", () => {
  test("accepts listed names regardless of casing or padding", () => {
    expect(isKnownCountryName("Germany")).toBe(true);
    expect(isKnownCountryName("  germany ")).toBe(true);
    expect(isKnownCountryName("UNITED STATES")).toBe(true);
  });

  test("rejects arbitrary text and blanks", () => {
    expect(isKnownCountryName("Atlantis")).toBe(false);
    expect(isKnownCountryName("Germ")).toBe(false);
    expect(isKnownCountryName("")).toBe(false);
    expect(isKnownCountryName("   ")).toBe(false);
  });
});
