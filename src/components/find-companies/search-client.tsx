"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  MapPin,
  RotateCcw,
  ScanSearch,
  Search,
  SearchX,
  X,
} from "lucide-react";
import { CompanyTable } from "@/components/companies/company-table";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Field, TextInput } from "@/components/ui/field";
import { KeywordChipsInput } from "@/components/ui/keyword-chips-input";
import { Select } from "@/components/ui/select";
import { OsmAttribution } from "@/components/osm-attribution";
import { countrySearchOptions } from "@/data/countries";
import { CATEGORY_OPTIONS, MAX_RESULTS_SELECT_OPTIONS } from "@/data/search-options";
import { useSearchHistory } from "@/hooks/use-search-history";
import { useCompanySearch } from "@/hooks/use-company-search";
import type { SearchError } from "@/hooks/use-company-search";
import { useSavedLeads } from "@/hooks/use-saved-leads";
import { useWebsiteChecks } from "@/hooks/use-website-analysis";
import { describeOsmDetails } from "@/lib/osm-details";
import {
  EMPTY_FILTERS,
  PROVIDER_FILTER_KEYS,
  describeActiveFilters,
  sortByIdOrder,
} from "@/lib/filter-leads";
import type { LeadSearchFilters, SortOrder } from "@/lib/filter-leads";
import { AUTO_RUN_PARAM, filtersToSearchParams, searchParamsToFilters } from "@/lib/search-params";

/** Result sort orders for the shared non-searchable Select. */
const SORT_OPTIONS = [
  { value: "provider", label: "Default order" },
  { value: "name", label: "Name (A–Z)" },
] as const;

function ErrorState({ error, onRetry }: { error: SearchError; onRetry: () => void }) {
  const Icon = error.kind === "location-not-found" ? MapPin : AlertTriangle;
  const title =
    error.kind === "location-not-found"
      ? "Place not found"
      : error.kind === "area-too-large"
        ? "Area too large"
        : error.kind === "rate-limit"
          ? "Service is busy"
          : error.kind === "timeout"
            ? "Search timed out"
            : error.kind === "unavailable"
              ? "Data service unavailable"
              : "Search failed";
  return (
    <Card>
      <CardBody className="flex flex-col items-center px-6 py-12 text-center">
        <div className="neu-recessed mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-recessed text-status-warning-fg">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink2">
          {error.message}
        </p>
        {error.retryable ? (
          <div className="mt-6">
            <Button onClick={onRetry}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Retry search
            </Button>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function LoadingState() {
  return (
    <Card aria-busy="true" aria-live="polite">
      <CardBody className="px-6 py-8">
        <p className="flex items-center justify-center gap-2 text-sm font-medium text-ink2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Searching OpenStreetMap…
        </p>
        <div className="mt-6 space-y-3" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <div key={index} className="neu-recessed h-14 animate-pulse rounded-lg bg-recessed" />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

export function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isCompanySaved, toggleCompany } = useSavedLeads();
  const { recordSearch } = useSearchHistory();
  const { status, companies, meta, error, submittedFilters, search, retry, reset } =
    useCompanySearch();
  const checks = useWebsiteChecks();

  // Shared links restore the form; manual visits and plain links never
  // auto-run. A `run=1` parameter (set when picking a recent search from
  // another page) restores the form and triggers exactly one search.
  const [filters, setFilters] = useState<LeadSearchFilters>(() => searchParamsToFilters(searchParams));
  const [sort, setSort] = useState<SortOrder>("provider");
  const autoRunFired = useRef(false);

  useEffect(() => {
    if (autoRunFired.current || searchParams.get(AUTO_RUN_PARAM) !== "1") return;
    autoRunFired.current = true;
    const snapshot = searchParamsToFilters(searchParams);
    setFilters(snapshot);
    // Strip the run flag so refreshes and re-renders never re-trigger.
    const clean = filtersToSearchParams(snapshot).toString();
    router.replace(clean ? `/find-companies?${clean}` : "/find-companies", { scroll: false });
    search(snapshot);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only auto-run
  }, []);

  function update<K extends keyof LeadSearchFilters>(key: K, value: LeadSearchFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitFilters({ ...filters });
  }

  function submitFilters(snapshot: LeadSearchFilters) {
    const query = filtersToSearchParams(snapshot).toString();
    router.replace(query ? `/find-companies?${query}` : "/find-companies", { scroll: false });
    search(snapshot);
  }

  function handleReset() {
    setFilters({ ...EMPTY_FILTERS });
    setSort("provider");
    reset();
    router.replace("/find-companies", { scroll: false });
  }

  // Record successful searches (criteria + result stats) for Recent Searches
  // and the Dashboard. Failures are never recorded. Consecutive duplicates
  // are skipped by the history store (double submits, retries, re-renders).
  useEffect(() => {
    if (status !== "success" || !meta || !submittedFilters) return;
    recordSearch({
      country: submittedFilters.country,
      city: submittedFilters.city,
      category: submittedFilters.category,
      keyword: submittedFilters.keyword,
      maxResults: submittedFilters.maxResults,
      resultCount: companies.length,
      websiteIds: companies.filter((company) => company.website).map((company) => company.id),
    });
  }, [status, meta, submittedFilters, companies, recordSearch]);

  const activeDescriptions = submittedFilters ? describeActiveFilters(submittedFilters) : [];
  const isDirty =
    submittedFilters !== null &&
    PROVIDER_FILTER_KEYS.some((key) => filters[key] !== submittedFilters[key]);

  const names = useMemo(
    () =>
      new Map(
        companies.map((company) => [
          company.id,
          { name: company.name, category: company.category },
        ]),
      ),
    [companies],
  );
  // Static ISO list: built once, filtered per keystroke inside the control.
  const countryOptions = useMemo(() => countrySearchOptions(), []);
  const displayed = useMemo(
    () => sortByIdOrder(companies, names, sort),
    [companies, names, sort],
  );

  const uncheckedSites = useMemo(
    () =>
      displayed
        .map((company) => {
          const details = describeOsmDetails(company);
          return details.websiteKind === "site" ? company.website : null;
        })
        .filter((site): site is string => site !== null && !checks.stateFor(site)),
    [displayed, checks],
  );
  const busy = checks.pending > 0;
  const paused = checks.pausedUntil > 0;

  return (
    <div className="space-y-8">
      <section aria-labelledby="search-heading" className="space-y-6">
        <h2 id="search-heading" className="sr-only">
          Search companies
        </h2>
        <Card>
          <CardBody>
            {/* Top-aligned cells: every cell lays out label first, then its
              control, so inputs and the action buttons share one baseline
              even when hints or keyword chips change a cell's height. */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Country (optional)" htmlFor="search-country" hint="Narrows the place lookup. Type to search all countries.">
                <Select
                  id="search-country"
                  value={filters.country}
                  options={countryOptions}
                  onChange={(next) => update("country", next)}
                  placeholder="e.g. Germany"
                  allowClear
                  clearLabel="Clear country"
                  emptyText="No countries match your search"
                />
              </Field>

              <Field label="City or region" htmlFor="search-city" hint="Required — bounds the search area.">
                <TextInput
                  id="search-city"
                  type="text"
                  value={filters.city}
                  onChange={(event) => update("city", event.target.value)}
                  placeholder="e.g. Berlin"
                  autoComplete="address-level2"
                  required
                  aria-required="true"
                />
              </Field>

              <Field label="Business category" htmlFor="search-category" hint="Only categories mapped by OpenStreetMap are listed.">
                <Select
                  id="search-category"
                  value={filters.category}
                  options={CATEGORY_OPTIONS}
                  onChange={(next) => update("category", next)}
                  placeholder="Search categories…"
                  emptyText="No categories match your search"
                />
              </Field>

              <Field label="Keywords (optional)" htmlFor="search-keyword" hint="Press Enter or comma to add each keyword.">
                <KeywordChipsInput
                  id="search-keyword"
                  value={filters.keyword}
                  onChange={(next) => update("keyword", next)}
                  placeholder="e.g. bakery, dental"
                />
              </Field>

              <Field label="Maximum results" htmlFor="search-max">
                <Select
                  id="search-max"
                  value={String(filters.maxResults)}
                  options={MAX_RESULTS_SELECT_OPTIONS}
                  onChange={(next) => update("maxResults", Number(next))}
                  searchable={false}
                />
              </Field>

              {/* Action cell: the invisible label spacer mirrors Field
                labels so the buttons align with the inputs, not with the
                bottom of taller cells. No margin hacks, no fixed heights. */}
              <div className="flex flex-col md:col-span-2 xl:col-span-1">
                <span aria-hidden="true" className="mb-1.5 block select-none text-[13px] font-medium invisible">
                  Search actions
                </span>
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1" disabled={status === "loading"}>
                    {status === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Search className="h-4 w-4" aria-hidden="true" />
                    )}
                    Search Companies
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Reset
                  </Button>
                </div>
              </div>
            </form>
          </CardBody>
        </Card>

        <div aria-live="polite">
          {status === "loading" ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={retry} />
          ) : status === "success" && meta ? (
            companies.length === 0 ? (
              <EmptyState
                icon={<SearchX className="h-6 w-6" aria-hidden="true" />}
                title={`No mapped businesses found in ${meta.areaLabel}`}
                description={
                  activeDescriptions.length > 0
                    ? `OpenStreetMap has no matching businesses for ${activeDescriptions.join(" · ")} in this area. Try a larger city, a broader category, or fewer keywords.`
                    : "OpenStreetMap has no matching businesses in this area. Try a larger city or a broader category."
                }
                action={
                  <Button variant="secondary" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Reset filters
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-ink2">
                    <strong className="font-semibold text-ink">
                      {displayed.length} live result{displayed.length === 1 ? "" : "s"}
                    </strong>
                    <span className="text-ink3"> · {meta.areaLabel}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor="results-sort" className="sr-only">
                      Sort results
                    </label>
                    <Select
                      id="results-sort"
                      value={sort}
                      options={[...SORT_OPTIONS]}
                      onChange={(next) => setSort(next as SortOrder)}
                      searchable={false}
                      size="sm"
                    />
                    {busy ? (
                      <>
                        <span className="inline-flex items-center gap-1.5 text-xs text-ink2" role="status">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          {paused ? "Paused for the rate limit…" : "Checking websites…"} {checks.pending} left
                        </span>
                        <Button type="button" variant="ghost" size="sm" onClick={checks.cancel}>
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={uncheckedSites.length === 0}
                        onClick={() => checks.checkMany(uncheckedSites)}
                        title="Load each listed homepage and look for dated or broken signs (one at a time)"
                      >
                        <ScanSearch className="h-3.5 w-3.5" aria-hidden="true" />
                        {uncheckedSites.length === 0
                          ? "All shown websites checked"
                          : `Check ${uncheckedSites.length} website${uncheckedSites.length === 1 ? "" : "s"}`}
                      </Button>
                    )}
                  </div>
                </div>
                {isDirty ? (
                  <p role="status" className="neu-recessed rounded-lg bg-recessed p-3 text-[13px] text-status-info-fg">
                    Search criteria changed since these results were fetched — select Search Companies to
                    refresh.
                  </p>
                ) : null}
                {meta.truncated ? (
                  <p className="text-xs leading-relaxed text-ink3">
                    Server limit reached — more businesses may exist in this area.
                  </p>
                ) : null}
                {meta.coverageNote ? (
                  <p className="text-xs leading-relaxed text-status-warning-fg">{meta.coverageNote}</p>
                ) : null}
                {checks.notice ? <p className="text-xs text-status-warning-fg">{checks.notice}</p> : null}
                <CompanyTable
                  companies={displayed}
                  isSaved={isCompanySaved}
                  onToggleSaved={toggleCompany}
                  caption="Live company search results from OpenStreetMap"
                />
                <OsmAttribution />
              </div>
            )
          ) : (
            <EmptyState
              icon={<MapPin className="h-6 w-6" aria-hidden="true" />}
              title="Search live business data"
              description="Enter a city or region, optionally narrow by country, category, or keyword, then select Search Companies."
              action={null}
            />
          )}
        </div>
      </section>
    </div>
  );
}
