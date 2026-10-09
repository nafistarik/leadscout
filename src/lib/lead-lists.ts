import type { LeadList } from "@/types/lead";

export interface ListActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Pure list-membership operations. The `useLeadLists` hook delegates to
 * these so the invariants (validation, no duplicate membership, safe
 * removal) are unit-testable without React.
 */

/** Returns an error message, or null when the name is acceptable. */
export function validateListName(
  name: string,
  lists: LeadList[],
  excludeId?: string,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "List name cannot be empty.";
  const duplicate = lists.some(
    (list) =>
      (excludeId === undefined || list.id !== excludeId) &&
      list.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (duplicate) return "A list with this name already exists.";
  return null;
}

export function applyCreateList(
  lists: LeadList[],
  name: string,
  created: LeadList,
): { lists: LeadList[] } | ListActionResult {
  const error = validateListName(name, lists);
  if (error) return { ok: false, error };
  return { lists: [...lists, { ...created, name: name.trim(), leadIds: [] }] };
}

export function applyRenameList(
  lists: LeadList[],
  id: string,
  name: string,
): { lists: LeadList[] } | ListActionResult {
  const error = validateListName(name, lists, id);
  if (error) return { ok: false, error };
  if (!lists.some((list) => list.id === id)) {
    return { ok: false, error: "That list no longer exists." };
  }
  return {
    lists: lists.map((list) => (list.id === id ? { ...list, name: name.trim() } : list)),
  };
}

export function applyDeleteList(lists: LeadList[], id: string): LeadList[] {
  return lists.filter((list) => list.id !== id);
}

export function applyAddToList(
  lists: LeadList[],
  listId: string,
  leadId: string,
): { lists: LeadList[] } | ListActionResult {
  const list = lists.find((item) => item.id === listId);
  if (!list) return { ok: false, error: "That list no longer exists." };
  if (!leadId) return { ok: false, error: "Invalid lead reference." };
  if (list.leadIds.includes(leadId)) {
    return { ok: false, error: `Already in “${list.name}”.` };
  }
  return {
    lists: lists.map((item) =>
      item.id === listId ? { ...item, leadIds: [...item.leadIds, leadId] } : item,
    ),
  };
}

export function applyRemoveFromList(
  lists: LeadList[],
  listId: string,
  leadId: string,
): LeadList[] {
  return lists.map((item) =>
    item.id === listId
      ? { ...item, leadIds: item.leadIds.filter((id) => id !== leadId) }
      : item,
  );
}
