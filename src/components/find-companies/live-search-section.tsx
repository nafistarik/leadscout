"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ChevronDown,
  Download,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  SearchX,
  SlidersHorizontal,
} from "lucide-react";
import { CompanyTable } from "@/components/companies/company-table";
import { ResearchActions } from "@/components/companies/research-actions";
import { ScoreLegend } from "@/components/companies/score-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import {
  ActiveFilterChips,
  AvailabilityCheckbox,
  HistoryControls,
  PresetControls,
  SORT_LABELS,
  SortSelect,
} from "@/components/find-companies/refine-controls";
import type { FilterChip } from "@/components/find-companies/refine-controls";
import { OsmAttribution } from "@/components/osm-attribution";
import { MAX_RESULTS_OPTIONS } from "@/data/demo-leads";
import { LIVE_CATEGORIES, LIVE_COUNTRY_SUGGESTIONS } from "@/data/search-options";
import { useSearchHistory } from "@/hooks/use-search-history";
import type { SearchHistoryEntry } from "@/lib/search-history";
import { useCompanySearch } from "@/hooks/use-company-search";
import type { SearchError } from "@/hooks/use-company-search";
import { useSavedLeads } from "@/hooks/use-saved-leads";
import {
  EMPTY_FILTERS,
  PROVIDER_FILTER_KEYS,
  applyAvailabilityFilters,
  applyMinScoreFilter,
  describeActiveFilters,
  hasLocalFilters,
  infoCompleteness,
  sortByIdOrder,
} from "@/lib/filter-leads";
import type { LeadSearchFilters, SortOrder } from "@/lib/filter-leads";
import { tagsForCategory } from "@/lib/providers/osm-tags";
import { formatAreaKm2 } from "@/lib/providers/geo";
import { companyToRow, downloadCsv, exportFilename, rowsToCsv } from "@/lib/csv";
import { hasTagCity, scoreCompany } from "@/lib/scoring";
import {
  filtersToSearchParams,
  restoredSearchKey,
  searchParamsToFilters,
  writtenUrlKey,
} from "@/lib/search-params";
import type { SearchMode } from "@/lib/search-params";

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
        {error.kind === "location-not-found" || error.kind === "area-too-large" ? (
          <p className="mt-2 max-w-md text-[13px] text-ink3">
            {error.kind === "area-too-large"
              ? "Narrow the search to a city, town, or district and run the search again."
              : "Adjust the city spelling — or try a nearby larger city — and search again."}
          </p>
        ) : null}
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
        <p className="mt-1 text-center text-xs text-ink3">
          Resolving the area, then querying mapped businesses. Public services can take a while.
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

export function LiveSearchSection({
  onApplyPreset,
}: {
  onApplyPreset: (mode: SearchMode, filters: LeadSearchFilters) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isCompanySaved, toggleCompany } = useSavedLeads();
  const { recordSearch } = useSearchHistory();
  const { status, companies, meta, error, submittedFilters, search, retry, reset } =
    useCompanySearch();

  // Restore shareable URL state on mount; adopt later navigations (back button,
  // shared links) without ever auto-fetching — live searches run on submit only.
  const restored = searchParamsToFilters(searchParams);
  const restoredKey = restoredSearchKey(restored);
  const [filters, setFilters] = useState<LeadSearchFilters>(() => ({
    ...(restored.mode === "live" ? restored.filters : { ...EMPTY_FILTERS, country: "" }),
  }));
  const [appliedKey, setAppliedKey] = useState(restoredKey);
  // Keys of URLs this section wrote itself: landing navigations that match
  // are acknowledged, never adopted, so post-submit keystrokes survive.
  const [writtenKey, setWrittenKey] = useState<string | null>(null);
  if (appliedKey !== restoredKey) {
    if (writtenKey !== null && writtenKey === restoredKey) {
      setWrittenKey(null);
      setAppliedKey(restoredKey);
    } else {
      setAppliedKey(restoredKey);
      if (restored.mode === "live") {
        const next = { ...restored.filters };
        if (JSON.stringify(next) !== JSON.stringify(filters)) setFilters(next);
      }
    }
  }
  const [showScores, setShowScores] = useState(true);

  function update<K extends keyof LeadSearchFilters>(key: K, value: LeadSearchFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitLiveFilters({ ...filters });
  }

  function submitLiveFilters(snapshot: LeadSearchFilters) {
    recordSearch({
      mode: "live",
      country: snapshot.country,
      city: snapshot.city,
      category: snapshot.category,
      keyword: snapshot.keyword,
      maxResults: snapshot.maxResults,
    });
    router.replace(`/find-companies?${filtersToSearchParams("live", snapshot).toString()}`, {
      scroll: false,
    });
    setWrittenKey(writtenUrlKey(filtersToSearchParams("live", snapshot)));
    search(snapshot);
  }

  function applyHistory(entry: SearchHistoryEntry) {
    const next: LeadSearchFilters = {
      ...filters,
      country: entry.country,
      city: entry.city,
      category: LIVE_CATEGORIES.includes(entry.category) ? entry.category : "all",
      keyword: entry.keyword,
      maxResults: (MAX_RESULTS_OPTIONS as readonly number[]).includes(entry.maxResults)
        ? entry.maxResults
        : EMPTY_FILTERS.maxResults,
    };
    setFilters(next);
    submitLiveFilters(next);
  }

  function handleReset() {
    setFilters({ ...EMPTY_FILTERS, country: "" });
    reset();
    router.replace("/find-companies", { scroll: false });
    setWrittenKey(writtenUrlKey(new URLSearchParams()));
  }

  function handleScoresToggle(visible: boolean) {
    setShowScores(visible);
    if (!visible && filters.sort === "score") {
      setFilters((current) => ({ ...current, sort: "provider" }));
    }
  }

  const scores = useMemo(() => {
    if (!submittedFilters) return null;
    const matchLabels =
      submittedFilters.category === "all"
        ? []
        : tagsForCategory(submittedFilters.category).map((pair) => pair.label);
    return new Map(
      companies.map((company) => [
        company.id,
        scoreCompany(company, {
          categoryMatch: matchLabels.includes(company.category),
          cityFromTags: hasTagCity(company),
        }),
      ]),
    );
  }, [companies, submittedFilters]);

  const activeDescriptions = submittedFilters ? describeActiveFilters(submittedFilters) : [];
  // Provider-side dirty check only: local refinements apply instantly and
  // never require a re-search.
  const isDirty =
    submittedFilters !== null &&
    PROVIDER_FILTER_KEYS.some((key) => filters[key] !== submittedFilters[key]);

  // Client-side refinement of the fetched set — no network involved.
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
  const infoById = useMemo(
    () =>
      new Map(companies.map((company) => [company.id, infoCompleteness(company)])),
    [companies],
  );
  const displayed = useMemo(() => {
    const narrowed = applyAvailabilityFilters(companies, filters);
    const scored = applyMinScoreFilter(narrowed, filters.minScore, (item) =>
      scores?.get(item.id)?.score ?? null,
    );
    return sortByIdOrder(scored, names, filters.sort, {
      keyword: submittedFilters?.keyword ?? "",
      scoreOf: (id) => scores?.get(id)?.score ?? null,
      infoOf: (id) => infoById.get(id) ?? 0,
    });
  }, [companies, filters, infoById, names, scores, submittedFilters]);

  const localActive = hasLocalFilters(filters);
  const chips: FilterChip[] = [];
  if (filters.hasWebsite) chips.push({ key: "hasWebsite", label: "Website available" });
  if (filters.hasPhone) chips.push({ key: "hasPhone", label: "Phone available" });
  if (filters.hasEmail) chips.push({ key: "hasEmail", label: "Email available" });
  if (filters.hasOpeningHours) chips.push({ key: "hasOpeningHours", label: "Opening hours listed" });
  if (filters.minScore > 0) chips.push({ key: "minScore", label: `Score ${filters.minScore}+` });
  if (filters.sort !== "provider") chips.push({ key: "sort", label: `Sort: ${SORT_LABELS[filters.sort]}` });

  function clearLocalFilter(key: string) {
    if (key === "sort") update("sort", "provider");
    else if (key === "minScore") update("minScore", 0);
    else update(key as "hasWebsite" | "hasPhone" | "hasEmail" | "hasOpeningHours", false);
  }

  function clearAllLocal() {
    setFilters((current) => ({
      ...current,
      hasWebsite: false,
      hasPhone: false,
      hasEmail: false,
      hasOpeningHours: false,
      minScore: 0,
      sort: "provider",
    }));
  }

  function handleExportResults() {
    const rows = displayed.map((company) =>
      companyToRow(company, "", scores?.get(company.id)?.score ?? null),
    );
    downloadCsv(rowsToCsv(rows), exportFilename(new Date(), "search"));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Country (optional)" htmlFor="live-country" hint="Narrows the place lookup.">
              <TextInput
                id="live-country"
                type="text"
                value={filters.country}
                onChange={(event) => update("country", event.target.value)}
                placeholder="e.g. Germany"
                list="live-country-options"
                autoComplete="off"
              />
              <datalist id="live-country-options">
                {LIVE_COUNTRY_SUGGESTIONS.map((country) => (
                  <option key={country} value={country} />
                ))}
              </datalist>
            </Field>

            <Field label="City or region" htmlFor="live-city" hint="Required — bounds the live search area.">
              <TextInput
                id="live-city"
                type="text"
                value={filters.city}
                onChange={(event) => update("city", event.target.value)}
                placeholder="e.g. Berlin"
                autoComplete="off"
                required
                aria-required="true"
              />
            </Field>

            <Field label="Business category" htmlFor="live-category">
              <SelectInput
                id="live-category"
                value={filters.category}
                onChange={(event) => update("category", event.target.value)}
              >
                <option value="all">All businesses</option>
                {LIVE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="Keyword (optional)" htmlFor="live-keyword" hint="Matches business names in the area.">
              <TextInput
                id="live-keyword"
                type="text"
                value={filters.keyword}
                onChange={(event) => update("keyword", event.target.value)}
                placeholder="e.g. bakery, dental"
                autoComplete="off"
              />
            </Field>

            <Field label="Maximum results" htmlFor="live-max">
              <SelectInput
                id="live-max"
                value={String(filters.maxResults)}
                onChange={(event) => update("maxResults", Number(event.target.value))}
              >
                {MAX_RESULTS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    Up to {option}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <div className="flex items-end gap-3 md:col-span-2 xl:col-span-1">
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
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line-soft pt-4">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink2">
              <input
                type="checkbox"
                checked={showScores}
                onChange={(event) => handleScoresToggle(event.target.checked)}
                className="h-4 w-4 rounded accent-(--accent)"
              />
              Show heuristic fit scores
            </label>
            <span className="inline-flex items-center gap-1.5 text-xs text-ink3">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              Categories map to OpenStreetMap tags; some are broader approximations.
            </span>
          </div>
        </CardBody>
      </Card>

      <details className="neu-raised rounded-xl border border-line-soft bg-raised">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            <SlidersHorizontal className="h-4 w-4 text-ink3" aria-hidden="true" />
            Refine results
            {localActive ? (
              <Badge tone="info">Refined</Badge>
            ) : (
              <span className="text-xs font-normal text-ink3">Filter without re-searching</span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-ink3 transition-transform [[open]_&]:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-5 border-t border-line-soft px-5 py-4">
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-ink2">
              Only show businesses with…
            </legend>
            <p className="mb-2 text-xs text-ink3">
              Based on actual source data — nothing inferred. Applies instantly, no new request.
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <AvailabilityCheckbox id="live-f-web" checked={filters.hasWebsite} onChange={(v) => update("hasWebsite", v)} label="Website" />
              <AvailabilityCheckbox id="live-f-phone" checked={filters.hasPhone} onChange={(v) => update("hasPhone", v)} label="Phone" />
              <AvailabilityCheckbox id="live-f-email" checked={filters.hasEmail} onChange={(v) => update("hasEmail", v)} label="Email" />
              <AvailabilityCheckbox id="live-f-hours" checked={filters.hasOpeningHours} onChange={(v) => update("hasOpeningHours", v)} label="Opening hours" />
            </div>
          </fieldset>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="live-min-score" className="mb-1.5 block text-[13px] font-medium text-ink2">
                Minimum fit score
              </label>
              <select
                id="live-min-score"
                value={String(filters.minScore)}
                onChange={(event) => update("minScore", Number(event.target.value))}
                className="neu-recessed h-10 w-full cursor-pointer rounded-lg border border-line-soft bg-recessed px-3 text-sm text-ink"
              >
                <option value="0">Off</option>
                <option value="40">Partial info or better (40+)</option>
                <option value="70">Strong info only (70+)</option>
              </select>
            </div>
            <SortSelect
              id="live-sort"
              value={filters.sort}
              onChange={(sort: SortOrder) => update("sort", sort)}
              includeScore={showScores}
              scoreDisabledReason="Enable fit scores above to sort by score."
            />
          </div>
          <div className="border-t border-line-soft pt-4">
            <PresetControls
              mode="live"
              filters={filters}
              onApply={(presetMode, presetFilters) => {
                // Same-mode presets fill this form directly (no fetch until
                // submit); cross-mode presets are routed through the parent.
                if (presetMode === "live") {
                  setFilters({ ...presetFilters });
                  setWrittenKey(writtenUrlKey(
                    filtersToSearchParams("live", presetFilters),
                  ));
                }
                onApplyPreset(presetMode, presetFilters);
              }}
            />
            <HistoryControls mode="live" onApply={applyHistory} />
          </div>
        </div>
      </details>

      <section aria-labelledby="live-results-heading" aria-live="polite">
        <h2 id="live-results-heading" className="sr-only">
          Live search results
        </h2>

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
                  ? `OpenStreetMap has no matching “name”-carrying businesses for ${activeDescriptions.join(" · ")} in this area. Coverage depends on community mapping and varies widely — try a larger city, a broader category, or fewer keywords.`
                  : "OpenStreetMap has no matching businesses in this area. Coverage depends on community mapping — try a larger city or a broader category."
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
                    Showing {displayed.length} of {companies.length} live result{companies.length === 1 ? "" : "s"}
                  </strong>
                  <span className="text-ink3">
                    {" "}· {meta.areaLabel}
                    {formatAreaKm2(meta.areaKm2) ? ` · ~${formatAreaKm2(meta.areaKm2)}` : ""}
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {localActive ? (
                    <Badge tone="neutral" title="Provider results narrowed on this device — no new request was sent.">
                      Narrowed locally
                    </Badge>
                  ) : null}
                  {showScores ? <ScoreLegend /> : null}
                  <Badge tone="info">Live · OpenStreetMap</Badge>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleExportResults}
                    title="Download exactly these filtered results as CSV — no new request"
                    aria-label={`Export ${displayed.length} filtered live results as CSV`}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Export ({displayed.length})
                  </Button>
                </div>
              </div>
              <ActiveFilterChips chips={chips} onRemove={clearLocalFilter} onClearAll={clearAllLocal} />
              {isDirty ? (
                <p role="status" className="neu-recessed rounded-lg bg-recessed p-3 text-[13px] text-status-info-fg">
                  Search criteria changed since these results were fetched — select Search Companies to
                  refresh.
                </p>
              ) : null}
              {displayed.length === 0 ? (
                <EmptyState
                  icon={<SearchX className="h-6 w-6" aria-hidden="true" />}
                  title="Local refinements hide all results"
                  description="The provider returned businesses, but the active refinements filter every one of them out. Remove a refinement above — no new request is needed."
                  action={
                    <Button variant="secondary" onClick={clearAllLocal}>
                      Clear refinements
                    </Button>
                  }
                />
              ) : (
                <CompanyTable
                  companies={displayed}
                  isSaved={isCompanySaved}
                  onToggleSaved={toggleCompany}
                  getScore={showScores && scores ? (company) => scores.get(company.id) ?? { score: 0, maxScore: 100, reasons: [] } : undefined}
                  extraActions={(company) => <ResearchActions company={company} />}
                  caption="Live company search results from OpenStreetMap"
                />
              )}
              <div className="space-y-1">
                <p className="text-xs leading-relaxed text-ink3">
                  Showing up to {submittedFilters?.maxResults ?? companies.length} results
                  {meta.truncated ? " (server limit reached — more businesses may exist)" : ""}.
                  This list is not exhaustive: it reflects only businesses mapped in OpenStreetMap.
                  Contact details appear only when the source data provides them.
                </p>
                {meta.coverageNote ? (
                  <p className="text-xs leading-relaxed text-status-warning-fg">{meta.coverageNote}</p>
                ) : null}
                <OsmAttribution />
              </div>
            </div>
          )
        ) : (
          <EmptyState
            icon={<MapPin className="h-6 w-6" aria-hidden="true" />}
            title="Search live business data"
            description="Enter a city or region, optionally narrow by country, category, or keyword, then select Search Companies. Results come from OpenStreetMap via the Overpass API — coverage depends on what the community has mapped, so results are never exhaustive."
            action={null}
          />
        )}
      </section>
    </div>
  );
}
