import { useCallback } from "react";
import { STORAGE_KEYS } from "@/lib/storage";
import { useLocalStorageValue } from "@/hooks/use-local-storage-value";
import {
  applyAddToList,
  applyCreateList,
  applyDeleteList,
  applyRemoveFromList,
  applyRenameList,
} from "@/lib/lead-lists";
import type { ListActionResult } from "@/lib/lead-lists";
import type { LeadList } from "@/types/lead";

export type { ListActionResult };

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

function failed(result: { lists: LeadList[] } | ListActionResult): result is ListActionResult {
  return (result as ListActionResult).ok === false;
}

/**
 * Local-only lead lists, persisted to localStorage.
 * SSR-safe via useSyncExternalStore (see useLocalStorageValue).
 * Membership rules live in pure helpers (see lib/lead-lists.ts).
 */
export function useLeadLists() {
  const [lists, setLists] = useLocalStorageValue<LeadList[]>(
    STORAGE_KEYS.lists,
    [],
    sanitizeLists,
  );

  const createList = useCallback(
    (name: string): ListActionResult => {
      const result = applyCreateList(
        lists,
        name,
        { id: createId(), name, createdAt: new Date().toISOString(), leadIds: [] },
      );
      if (failed(result)) return result;
      setLists(result.lists);
      return { ok: true };
    },
    [lists, setLists],
  );

  const renameList = useCallback(
    (id: string, name: string): ListActionResult => {
      const result = applyRenameList(lists, id, name);
      if (failed(result)) return result;
      setLists(result.lists);
      return { ok: true };
    },
    [lists, setLists],
  );

  const deleteList = useCallback(
    (id: string) => {
      setLists(applyDeleteList(lists, id));
    },
    [lists, setLists],
  );

  const addToList = useCallback(
    (listId: string, leadId: string): ListActionResult => {
      const result = applyAddToList(lists, listId, leadId);
      if (failed(result)) return result;
      setLists(result.lists);
      return { ok: true };
    },
    [lists, setLists],
  );

  const removeFromList = useCallback(
    (listId: string, leadId: string) => {
      setLists(applyRemoveFromList(lists, listId, leadId));
    },
    [lists, setLists],
  );

  const listsContaining = useCallback(
    (leadId: string): LeadList[] => lists.filter((list) => list.leadIds.includes(leadId)),
    [lists],
  );

  return { lists, createList, renameList, deleteList, addToList, removeFromList, listsContaining };
}
