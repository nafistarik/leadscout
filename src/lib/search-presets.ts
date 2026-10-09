import { STORAGE_KEYS } from "@/lib/storage";
import type { LeadSearchFilters } from "@/lib/filter-leads";
import type { SearchMode } from "@/lib/search-params";

/**
 * Optional named search presets: non-sensitive search criteria saved locally
 * so repeated discovery runs take one click to set up. Applying a preset
 * fills the form only — the user still submits explicitly, so presets never
 * trigger provider requests on their own.
 */

export interface SearchPreset {
  id: string;
  name: string;
  mode: SearchMode;
  filters: LeadSearchFilters;
  createdAt: string;
}

export const MAX_PRESETS = 20;

function isFiltersShape(value: unknown): value is LeadSearchFilters {
  if (typeof value !== "object" || value === null) return false;
  const f = value as Record<string, unknown>;
  return (
    typeof f.country === "string" &&
    typeof f.city === "string" &&
    typeof f.category === "string" &&
    typeof f.keyword === "string" &&
    typeof f.maxResults === "number" &&
    typeof f.hasWebsite === "boolean" &&
    typeof f.hasPhone === "boolean" &&
    typeof f.hasEmail === "boolean" &&
    typeof f.hasOpeningHours === "boolean" &&
    typeof f.minScore === "number" &&
    typeof f.sort === "string"
  );
}

export function sanitizePresets(value: unknown): SearchPreset[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: SearchPreset[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue;
    const item = entry as Record<string, unknown>;
    if (typeof item.id !== "string" || !item.id || seen.has(item.id)) continue;
    if (typeof item.name !== "string" || !item.name.trim()) continue;
    if (item.mode !== "live" && item.mode !== "demo") continue;
    if (!isFiltersShape(item.filters)) continue;
    seen.add(item.id);
    result.push({
      id: item.id,
      name: item.name.trim().slice(0, 60),
      mode: item.mode,
      filters: item.filters,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
    });
  }
  return result.slice(0, MAX_PRESETS);
}

export function createPreset(
  presets: SearchPreset[],
  name: string,
  mode: SearchMode,
  filters: LeadSearchFilters,
  id: string,
): { presets: SearchPreset[] } | { ok: false; error: string } {
  const trimmed = name.trim().slice(0, 60);
  if (!trimmed) return { ok: false, error: "Preset name cannot be empty." };
  if (presets.some((preset) => preset.name.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, error: "A preset with this name already exists." };
  }
  if (presets.length >= MAX_PRESETS) {
    return { ok: false, error: `Preset limit reached (${MAX_PRESETS}). Delete one first.` };
  }
  return {
    presets: [
      ...presets,
      { id, name: trimmed, mode, filters: { ...filters }, createdAt: new Date().toISOString() },
    ],
  };
}

export function deletePreset(presets: SearchPreset[], id: string): SearchPreset[] {
  return presets.filter((preset) => preset.id !== id);
}

export function presetStorageKey(): string {
  return STORAGE_KEYS.searchPresets;
}
