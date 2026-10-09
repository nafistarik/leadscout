import { useCallback, useSyncExternalStore } from "react";
import { readLocalStorage, safeJsonParse, writeLocalStorage } from "@/lib/storage";

const NOTIFY_EVENT = "leadscout:storage";

interface CacheEntry {
  raw: string | null;
  value: unknown;
}

const cache = new Map<string, CacheEntry>();

function readCached<T>(key: string, fallback: T, sanitize: (value: unknown) => T): T {
  const raw = readLocalStorage(key);
  const entry = cache.get(key);
  if (entry && entry.raw === raw) {
    return entry.value as T;
  }
  const value = raw === null ? fallback : sanitize(safeJsonParse<unknown>(raw, fallback));
  cache.set(key, { raw, value });
  return value;
}

export function subscribeToStorage(callback: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const notify = (): void => callback();
  window.addEventListener("storage", notify);
  window.addEventListener(NOTIFY_EVENT, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(NOTIFY_EVENT, notify);
  };
}

function notify(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFY_EVENT));
  }
}

/** Shared storage-event channel so bespoke external stores stay in sync. */
export { notify as notifyStorageChanged };

/**
 * SSR-safe localStorage-backed state.
 *
 * Uses useSyncExternalStore so server rendering (fallback snapshot) and client
 * hydration stay consistent without read-during-effect patterns. Writes update
 * an in-memory cache too, so the UI keeps working for the session even when
 * browser storage is unavailable (e.g. private mode); callers can surface that
 * via `probeStorage()`.
 */
export function useLocalStorageValue<T>(
  key: string,
  fallback: T,
  sanitize: (value: unknown) => T,
): readonly [T, (next: T) => void] {
  const value = useSyncExternalStore(
    subscribeToStorage,
    () => readCached(key, fallback, sanitize),
    () => fallback,
  );

  const setValue = useCallback(
    (next: T) => {
      const serialized = JSON.stringify(next);
      const ok = writeLocalStorage(key, serialized);
      // Keep the in-memory value in sync even if the write failed, so the UI
      // still responds for the current session.
      cache.set(key, { raw: ok ? serialized : readLocalStorage(key), value: next });
      notify();
    },
    [key],
  );

  return [value, setValue] as const;
}

/** Best-effort check for whether localStorage writes work in this session. */
export function probeStorage(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const probeKey = "__leadscout_probe__";
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}
