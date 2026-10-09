import { useCallback } from "react";
import { STORAGE_KEYS } from "@/lib/storage";
import { useLocalStorageValue } from "@/hooks/use-local-storage-value";
import { createPreset, deletePreset, sanitizePresets } from "@/lib/search-presets";
import type { SearchPreset } from "@/lib/search-presets";
import type { LeadSearchFilters } from "@/lib/filter-leads";
import type { SearchMode } from "@/lib/search-params";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `preset-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

/** Named search presets persisted locally (criteria only, never results). */
export function useSearchPresets() {
  const [presets, setPresets] = useLocalStorageValue<SearchPreset[]>(
    STORAGE_KEYS.searchPresets,
    [],
    sanitizePresets,
  );

  const savePreset = useCallback(
    (name: string, mode: SearchMode, filters: LeadSearchFilters): { ok: boolean; error?: string } => {
      const result = createPreset(presets, name, mode, filters, createId());
      if (!("presets" in result)) return result;
      setPresets(result.presets);
      return { ok: true };
    },
    [presets, setPresets],
  );

  const removePreset = useCallback(
    (id: string) => {
      setPresets(deletePreset(presets, id));
    },
    [presets, setPresets],
  );

  return { presets, savePreset, removePreset };
}
