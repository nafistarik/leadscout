export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Storage keys used by the app. All local-only; there is no backend. */
export const STORAGE_KEYS = {
  /** Versioned envelope of saved real-company snapshots. */
  savedLeadsV2: "leadscout.savedLeads.v2",
  theme: "leadscout.theme.v1",
  /** Nominatim geocode cache (query key -> area + timestamp). */
  geocodeCache: "leadscout.geocodeCache.v1",
  /** Search history: recent submitted search criteria only (no results). */
  searchHistory: "leadscout.searchHistory.v1",
  /** Website check results keyed by normalized site address. */
  websiteAnalysis: "leadscout.websiteAnalysis.v1",
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
