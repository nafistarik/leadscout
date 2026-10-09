import { describe, expect, test } from "bun:test";
import { bboxAreaKm2, formatAreaKm2, MAX_SEARCH_AREA_KM2 } from "@/lib/providers/geo";

describe("bboxAreaKm2", () => {
  test("approximates a city bbox (Berlin ≈ 1,700 km²)", () => {
    const area = bboxAreaKm2({ south: 52.3382448, west: 13.088345, north: 52.6755087, east: 13.7611609 });
    expect(area).not.toBeNull();
    expect(area as number).toBeGreaterThan(1000);
    expect(area as number).toBeLessThan(3000);
  });

  test("large countries exceed the documented limit", () => {
    // Germany approx bbox.
    const germany = bboxAreaKm2({ south: 47.27, west: 5.87, north: 55.06, east: 15.04 });
    expect(germany as number).toBeGreaterThan(MAX_SEARCH_AREA_KM2);
  });

  test("rejects invalid and antimeridian-crossing bounds", () => {
    expect(bboxAreaKm2({ south: 60, west: 1, north: 50, east: 2 })).toBeNull();
    expect(bboxAreaKm2({ south: 1, west: 178, north: 2, east: -178 })).toBeNull();
    expect(bboxAreaKm2({ south: NaN, west: 1, north: 2, east: 3 })).toBeNull();
    expect(bboxAreaKm2({ south: -91, west: 1, north: 2, east: 3 })).toBeNull();
    expect(bboxAreaKm2({ south: 1, west: 1, north: 1, east: 2 })).toBeNull();
  });
});

describe("formatAreaKm2", () => {
  test("formats with thousands separators", () => {
    expect(formatAreaKm2(1697.4)).toBe("1,697 km²");
    expect(formatAreaKm2(50000)).toBe("50,000 km²");
  });

  test("rejects invalid input", () => {
    expect(formatAreaKm2(null)).toBeNull();
    expect(formatAreaKm2(NaN)).toBeNull();
    expect(formatAreaKm2(-5)).toBeNull();
  });
});
