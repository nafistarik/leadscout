import { useCallback } from "react";
import { STORAGE_KEYS } from "@/lib/storage";
import { useLocalStorageValue } from "@/hooks/use-local-storage-value";
import type { LeadList } from "@/types/lead";

function sanitizeLists(value: unknown): LeadList[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is LeadList =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as LeadList).id === "string" &&
        typeof (item as LeadList).name === "string" &&
        Array.isArray((item as LeadList).leadIds),
    )
    .map((item) => ({
      id: item.id,
      name: item.name,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
      leadIds: item.leadIds.filter((id): id is string => typeof id === "string"),
    }));
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `list-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export interface ListActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Local-only lead lists, persisted to localStorage.
 * SSR-safe via useSyncExternalStore (see useLocalStorageValue).
 */
export function useLeadLists() {
  const [lists, setLists] = useLocalStorageValue<LeadList[]>(
    STORAGE_KEYS.lists,
    [],
    sanitizeLists,
  );

  const createList = useCallback(
    (name: string): ListActionResult => {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: "List name cannot be empty." };
      const duplicate = lists.some((list) => list.name.toLowerCase() === trimmed.toLowerCase());
      if (duplicate) return { ok: false, error: "A list with this name already exists." };
      const next: LeadList = {
        id: createId(),
        name: trimmed,
        createdAt: new Date().toISOString(),
        leadIds: [],
      };
      setLists([...lists, next]);
      return { ok: true };
    },
    [lists, setLists],
  );

  const renameList = useCallback(
    (id: string, name: string): ListActionResult => {
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, error: "List name cannot be empty." };
      const duplicate = lists.some(
        (list) => list.id !== id && list.name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (duplicate) return { ok: false, error: "A list with this name already exists." };
      setLists(lists.map((list) => (list.id === id ? { ...list, name: trimmed } : list)));
      return { ok: true };
    },
    [lists, setLists],
  );

  const deleteList = useCallback(
    (id: string) => {
      setLists(lists.filter((list) => list.id !== id));
    },
    [lists, setLists],
  );

  return { lists, createList, renameList, deleteList };
}
