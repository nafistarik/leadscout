"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Company } from "@/types/company";
import type { LeadSearchFilters } from "@/lib/filter-leads";
import { companyProvider } from "@/lib/providers/index";
import type { ProviderErrorKind, ProviderSearchMeta } from "@/lib/providers/types";
import { ProviderError } from "@/lib/providers/types";

export type SearchStatus = "idle" | "loading" | "success";

export interface SearchError {
  kind: ProviderErrorKind;
  message: string;
  retryable: boolean;
}

export interface CompanySearchState {
  status: SearchStatus;
  companies: Company[];
  meta: ProviderSearchMeta | null;
  error: SearchError | null;
  /** Filters of the last submitted (or in-flight) search, for dirty-checks. */
  submittedFilters: LeadSearchFilters | null;
  search: (filters: LeadSearchFilters) => void;
  retry: () => void;
  reset: () => void;
}

/**
 * Live company search state machine.
 *
 * - Searches run only from explicit submit/retry calls — never during render
 *   and never per keystroke. Submissions are debounced so rapid consecutive
 *   submits collapse into one request.
 * - Each run gets a monotonically increasing request id plus its own
 *   AbortController: stale responses can never overwrite newer results, and
 *   a new search cancels the previous in-flight request.
 * - Aborts on unmount via effect cleanup (no state updates inside effects).
 */
export function useCompanySearch(debounceMs = 300): CompanySearchState {
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [meta, setMeta] = useState<ProviderSearchMeta | null>(null);
  const [error, setError] = useState<SearchError | null>(null);
  const [submittedFilters, setSubmittedFilters] = useState<LeadSearchFilters | null>(null);

  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const lastFiltersRef = useRef<LeadSearchFilters | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const run = useCallback(async (requestId: number, filters: LeadSearchFilters) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    setError(null);
    setSubmittedFilters(filters);

    try {
      const result = await companyProvider.search(filters, { signal: controller.signal });
      if (requestIdRef.current !== requestId) return; // stale: a newer search won
      setCompanies(result.companies);
      setMeta(result.meta);
      setStatus("success");
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      if (controller.signal.aborted) {
        // Aborted because a newer search superseded this one; that search
        // already set loading state. Only fall back to idle when nothing
        // replaced it (e.g. unmount-adjacent abort).
        setStatus((current) => (current === "loading" ? "idle" : current));
        return;
      }
      const providerError =
        err instanceof ProviderError
          ? err
          : new ProviderError("network", "The search failed unexpectedly. Try again.");
      setCompanies([]);
      setMeta(null);
      setError({ kind: providerError.kind, message: providerError.message, retryable: providerError.retryable });
      setStatus("idle");
    }
  }, []);

  // Trailing-edge debounce: rapid consecutive submissions collapse into one
  // provider call. The timer lives in a ref and is only touched from event
  // handlers and effect cleanup — never during render.
  const search = useCallback(
    (filters: LeadSearchFilters) => {
      requestIdRef.current += 1;
      const requestId = requestIdRef.current;
      lastFiltersRef.current = filters;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void run(requestId, filters);
      }, debounceMs);
    },
    [run, debounceMs],
  );

  const retry = useCallback(() => {
    const filters = lastFiltersRef.current;
    if (filters) {
      // Cancel any still-pending debounced submission first: it carries the
      // same filters and would otherwise duplicate this request, then abort it.
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      requestIdRef.current += 1;
      void run(requestIdRef.current, filters);
    }
  }, [run]);

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    abortRef.current?.abort();
    requestIdRef.current += 1;
    setStatus("idle");
    setCompanies([]);
    setMeta(null);
    setError(null);
    setSubmittedFilters(null);
    lastFiltersRef.current = null;
  }, []);

  return { status, companies, meta, error, submittedFilters, search, retry, reset };
}
