import { describe, expect, test } from "bun:test";
import { EMPTY_FILTERS } from "@/lib/filter-leads";
import { MAX_PRESETS, createPreset, deletePreset, sanitizePresets } from "@/lib/search-presets";

function preset(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    name: "Berlin bakeries",
    mode: "live",
    filters: { ...EMPTY_FILTERS },
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("sanitizePresets", () => {
  test("keeps valid presets and drops malformed ones", () => {
    const cleaned = sanitizePresets([
      preset(),
      { ...preset(), id: "p1" },
      { ...preset(), id: "p2", name: "  " },
      { ...preset(), id: "p3", mode: "other" },
      { ...preset(), id: "p4", filters: { nope: true } },
      null,
    ]);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].id).toBe("p1");
  });

  test("trims names and caps the list", () => {
    const many = Array.from({ length: MAX_PRESETS + 5 }, (_, i) =>
      preset({ id: `p${i}`, name: `  Preset ${i}  ` }),
    );
    const cleaned = sanitizePresets(many);
    expect(cleaned).toHaveLength(MAX_PRESETS);
    expect(cleaned[0].name).toBe("Preset 0");
  });
});

describe("createPreset / deletePreset", () => {
  test("validates names and duplicates, snapshots filters", () => {
    const filters = { ...EMPTY_FILTERS, city: "Berlin" };
    const created = createPreset([], "  Morning run ", "live", filters, "p1");
    expect("presets" in created && created.presets[0].name).toBe("Morning run");
    expect("presets" in created && created.presets[0].filters.city).toBe("Berlin");
    const dup = createPreset("presets" in created ? created.presets : [], "morning RUN", "live", filters, "p2");
    expect(dup).toEqual({ ok: false, error: "A preset with this name already exists." });
    expect(createPreset([], "  ", "live", filters, "p3")).toEqual({
      ok: false,
      error: "Preset name cannot be empty.",
    });
  });

  test("enforces the preset cap", () => {
    const full = Array.from({ length: MAX_PRESETS }, (_, i) =>
      preset({ id: `p${i}`, name: `P${i}` }),
    ).map((p) => ({ ...p, mode: "live" as const, filters: { ...EMPTY_FILTERS } }));
    expect(createPreset(full, "One more", "live", EMPTY_FILTERS, "px")).toEqual({
      ok: false,
      error: `Preset limit reached (${MAX_PRESETS}). Delete one first.`,
    });
  });

  test("delete removes only the target", () => {
    const lists = [preset({ id: "a" }), preset({ id: "b" })].map((p) => ({
      ...p,
      mode: "live" as const,
      filters: { ...EMPTY_FILTERS },
    }));
    expect(deletePreset(lists, "a").map((p) => p.id)).toEqual(["b"]);
  });
});
