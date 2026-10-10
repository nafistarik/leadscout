import { useCallback } from "react";
import { STORAGE_KEYS } from "@/lib/storage";
import { useLocalStorageValue } from "@/hooks/use-local-storage-value";
import { addHistoryEntry, removeHistoryEntry, sanitizeHistory } from "@/lib/search-history";
import type { HistoryInput, SearchHistoryEntry } from "@/lib/search-history";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `hist-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

/** Recent search inputs (criteria only, never results), newest first. */
export function useSearchHistory() {
  const [history, setHistory] = useLocalStorageValue<SearchHistoryEntry[]>(
    STORAGE_KEYS.searchHistory,
    [],
    sanitizeHistory,
  );

  const recordSearch = useCallback(
    (input: HistoryInput) => {
      setHistory(addHistoryEntry(history, input, createId(), new Date().toISOString()));
    },
    [history, setHistory],
  );

  const removeEntry = useCallback(
    (id: string) => {
      setHistory(removeHistoryEntry(history, id));
    },
    [history, setHistory],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  return { history, recordSearch, removeEntry, clearHistory };
}
