import { useCallback, useState } from "react";
import { DEMO_LEADS } from "@/data/demo-leads";
import { STORAGE_KEYS } from "@/lib/storage";
import { probeStorage, useLocalStorageValue } from "@/hooks/use-local-storage-value";

function sanitizeIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const valid = new Set(DEMO_LEADS.map((lead) => lead.id));
  return ids.filter((id): id is string => typeof id === "string" && valid.has(id));
}

/**
 * Saved-lead state persisted to localStorage.
 * SSR-safe: backed by useSyncExternalStore, so the server snapshot (empty)
 * hydrates cleanly and the client value syncs immediately after.
 */
export function useSavedLeads() {
  const [savedIds, setSavedIds] = useLocalStorageValue<string[]>(
    STORAGE_KEYS.savedLeads,
    [],
    sanitizeIds,
  );
  const [storageAvailable] = useState(probeStorage);

  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds]);

  const toggleSaved = useCallback(
    (id: string) => {
      const next = isSaved(id) ? savedIds.filter((saved) => saved !== id) : [...savedIds, id];
      setSavedIds(next);
    },
    [isSaved, savedIds, setSavedIds],
  );

  const removeSaved = useCallback(
    (id: string) => {
      setSavedIds(savedIds.filter((saved) => saved !== id));
    },
    [savedIds, setSavedIds],
  );

  return { savedIds, storageAvailable, isSaved, toggleSaved, removeSaved };
}
