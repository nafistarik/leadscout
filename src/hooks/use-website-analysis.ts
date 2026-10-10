"use client";

import { useMemo, useSyncExternalStore } from "react";
import { normalizeWebsiteUrl } from "@/lib/links";
import { checkWebsite, ReaderError } from "@/lib/providers/website-reader";
import { STORAGE_KEYS, readLocalStorage, safeJsonParse, writeLocalStorage } from "@/lib/storage";
import type { WebsiteAnalysis } from "@/lib/website-analysis";

/**
 * App-wide website-check store. Checks run strictly one at a time from an
 * explicit user action (never automatically), finished results persist in
 * localStorage for 14 days, and a reader rate limit pauses the queue for a
 * minute instead of failing every remaining site.
 *
 * Persisted results load on first subscribe (after hydration), so server
 * and first client render agree.
 */

export type CheckState =
  | { status: "queued" }
  | { status: "running" }
  | { status: "done"; analysis: WebsiteAnalysis }
  | { status: "error"; message: string };

const TTL_MS = 14 * 24 * 60 * 60 * 1000;
const CACHE_LIMIT = 300;
const RATE_LIMIT_PAUSE_MS = 60_000;

const states = new Map<string, CheckState>();
const queue: Array<{ key: string; url: string }> = [];
const listeners = new Set<() => void>();
let version = 0;
let loaded = false;
let running = false;
let controller: AbortController | null = null;
let pausedUntil = 0;
let notice: string | null = null;

/** Cache key shared by http/https and trailing-slash variants of a site. */
export function siteKey(rawUrl: string | null | undefined): string | null {
  const url = normalizeWebsiteUrl(rawUrl);
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.hostname.toLowerCase().replace(/^www\./, "")}${path}${parsed.search}`;
  } catch {
    return null;
  }
}

function emit(): void {
  version += 1;
  for (const listener of listeners) listener();
}

function isAnalysis(value: unknown): value is WebsiteAnalysis {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<WebsiteAnalysis>;
  return (
    typeof item.url === "string" &&
    typeof item.analyzedAt === "string" &&
    typeof item.status === "string" &&
    Array.isArray(item.issues) &&
    Array.isArray(item.emails) &&
    Array.isArray(item.phones) &&
    Array.isArray(item.socials)
  );
}

function loadPersisted(): void {
  if (loaded) return;
  loaded = true;
  const parsed = safeJsonParse<unknown>(readLocalStorage(STORAGE_KEYS.websiteAnalysis), {});
  if (typeof parsed !== "object" || parsed === null) return;
  const now = Date.now();
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!isAnalysis(value)) continue;
    const age = now - Date.parse(value.analyzedAt);
    if (Number.isFinite(age) && age < TTL_MS && !states.has(key)) {
      states.set(key, { status: "done", analysis: value });
    }
  }
}

function persist(): void {
  const done: Array<[string, WebsiteAnalysis]> = [];
  for (const [key, state] of states) {
    if (state.status === "done") done.push([key, state.analysis]);
  }
  done.sort((a, b) => a[1].analyzedAt.localeCompare(b[1].analyzedAt));
  writeLocalStorage(STORAGE_KEYS.websiteAnalysis, JSON.stringify(Object.fromEntries(done.slice(-CACHE_LIMIT))));
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

async function drain(): Promise<void> {
  if (running) return;
  running = true;
  controller = new AbortController();
  const signal = controller.signal;
  try {
    while (queue.length > 0 && !signal.aborted) {
      const next = queue[0];
      states.set(next.key, { status: "running" });
      emit();
      try {
        const analysis = await checkWebsite(next.url, signal);
        queue.shift();
        states.set(next.key, { status: "done", analysis });
        notice = null;
        persist();
      } catch (error) {
        if (signal.aborted) break;
        if (error instanceof ReaderError && error.rateLimited) {
          // Keep the site at the head of the queue and wait out the limit.
          states.set(next.key, { status: "queued" });
          pausedUntil = Date.now() + RATE_LIMIT_PAUSE_MS;
          notice = error.message;
          emit();
          await sleep(RATE_LIMIT_PAUSE_MS, signal);
          pausedUntil = 0;
          continue;
        }
        queue.shift();
        const message = error instanceof Error ? error.message : "The website check failed.";
        states.set(next.key, { status: "error", message });
        notice = message;
      }
      emit();
    }
  } finally {
    running = false;
    controller = null;
    pausedUntil = 0;
    emit();
  }
}

function enqueue(urls: Array<string | null | undefined>, force: boolean): void {
  loadPersisted();
  let added = false;
  for (const url of urls) {
    const key = siteKey(url);
    if (!key || !url) continue;
    const state = states.get(key);
    if (state && (state.status === "queued" || state.status === "running")) continue;
    if (state?.status === "done" && !force) continue;
    states.set(key, { status: "queued" });
    queue.push({ key, url });
    added = true;
  }
  if (added) {
    emit();
    void drain();
  }
}

function cancelAll(): void {
  for (const item of queue) {
    if (states.get(item.key)?.status !== "done") states.delete(item.key);
  }
  queue.length = 0;
  controller?.abort();
  notice = null;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!loaded) {
    loadPersisted();
    // Defer so the first post-hydration render picks up persisted results.
    queueMicrotask(emit);
  }
  return () => listeners.delete(listener);
}

const getVersion = (): number => version;
const getServerVersion = (): number => 0;

export interface WebsiteChecks {
  stateFor: (url: string | null | undefined) => CheckState | undefined;
  analysisFor: (url: string | null | undefined) => WebsiteAnalysis | null;
  check: (url: string) => void;
  recheck: (url: string) => void;
  checkMany: (urls: Array<string | null | undefined>) => void;
  cancel: () => void;
  /** Sites waiting or in progress. */
  pending: number;
  /** Epoch ms until which the queue is paused for a rate limit (0 = not paused). */
  pausedUntil: number;
  /** Latest reader-level message (rate limit / outage), if any. */
  notice: string | null;
}

export function useWebsiteChecks(): WebsiteChecks {
  const snapshot = useSyncExternalStore(subscribe, getVersion, getServerVersion);
  return useMemo(() => {
    void snapshot;
    const stateFor = (url: string | null | undefined): CheckState | undefined => {
      const key = siteKey(url);
      return key ? states.get(key) : undefined;
    };
    return {
      stateFor,
      analysisFor: (url) => {
        const state = stateFor(url);
        return state?.status === "done" ? state.analysis : null;
      },
      check: (url) => enqueue([url], false),
      recheck: (url) => enqueue([url], true),
      checkMany: (urls) => enqueue(urls, false),
      cancel: cancelAll,
      pending: queue.length,
      pausedUntil,
      notice,
    };
  }, [snapshot]);
}
