export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Storage keys used by the prototype. Centralized so Part 2 can migrate them. */
export const STORAGE_KEYS = {
  /** Part 1: array of demo ids (string[]). Kept for migration; v2 is canonical. */
  savedLeads: "leadscout.savedLeadIds.v1",
  /** Part 2: versioned envelope of saved-lead records (demo + real). */
  savedLeadsV2: "leadscout.savedLeads.v2",
  lists: "leadscout.lists.v1",
  theme: "leadscout.theme.v1",
  /** Nominatim geocode cache (query key -> area + timestamp). */
  geocodeCache: "leadscout.geocodeCache.v1",
  /** Part 4: named search presets (non-sensitive criteria only). */
  searchPresets: "leadscout.searchPresets.v1",
  /** Part 7: user-assigned workflow metadata keyed by saved-lead record id. */
  leadWorkflow: "leadscout.leadWorkflow.v1",
} as const;

export function readLocalStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalStorage(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeLocalStorage(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
