"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Database, Download, FlaskConical, Globe2, RotateCcw, Search, SearchX, SlidersHorizontal } from "lucide-react";
import { LiveSearchSection } from "@/components/find-companies/live-search-section";
import {
  ActiveFilterChips,
  AvailabilityCheckbox,
  PresetControls,
  SORT_LABELS,
  SortSelect,
} from "@/components/find-companies/refine-controls";
import type { FilterChip } from "@/components/find-companies/refine-controls";
import { LeadTable } from "@/components/leads/lead-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { OsmAttribution } from "@/components/osm-attribution";
import { DEMO_CATEGORIES, DEMO_CITIES, DEMO_COUNTRIES, DEMO_LEADS, MAX_RESULTS_OPTIONS } from "@/data/demo-leads";
import { demoToRow, downloadCsv, exportFilename, rowsToCsv } from "@/lib/csv";
import { useSavedLeads } from "@/hooks/use-saved-leads";
import {
  EMPTY_FILTERS,
  applyDemoAvailabilityFilters,
  demoInfoCompleteness,
  describeActiveFilters,
  filterDemoLeads,
  hasActiveProviderCriteria,
  hasLocalFilters,
  sortByIdOrder,
} from "@/lib/filter-leads";
import type { LeadSearchFilters, SortOrder } from "@/lib/filter-leads";
import {
  filtersToSearchParams,
  restoredSearchKey,
  searchParamsToFilters,
} from "@/lib/search-params";
import type { SearchMode } from "@/lib/search-params";
import { cn } from "@/lib/storage";

function ModeToggle({ mode, onChange }: { mode: SearchMode; onChange: (mode: SearchMode) => void }) {
  const options: Array<{ value: SearchMode; label: string; icon: typeof Globe2; hint: string }> = [
    { value: "live", label: "Live search", icon: Globe2, hint: "OpenStreetMap" },
    { value: "demo", label: "Demo data", icon: FlaskConical, hint: "Sample records" },
  ];
  return (
    <div
      role="group"
      aria-label="Result source"
      className="neu-recessed inline-flex rounded-xl border border-line-soft bg-recessed p-1"
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = mode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                active
                  ? "neu-raised-sm border border-line-soft bg-raised text-accent-ink"
                  : "text-ink2 hover:text-ink",
              )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {option.label}
            <span className={cn("hidden text-xs font-normal sm:inline", active ? "text-ink3" : "text-ink3")}>
              · {option.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function FindCompaniesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDemoSaved, toggleDemo } = useSavedLeads();

  // Shareable URL state: restore mode + full form on mount and on later
  // navigations (back button, shared links). Demo submissions may auto-run
  // (local dataset, no network); live searches always run on submit only,
  // so restoring a URL never triggers a provider request by itself.
  const restored = searchParamsToFilters(searchParams);
  const restoredKey = restoredSearchKey(restored);
  const [mode, setMode] = useState<SearchMode>(restored.mode);
  const [appliedKey, setAppliedKey] = useState(restoredKey);

  // Demo-mode form state (Part 1 behavior, extended with local refinements).
  // Demo records carry no email/opening-hours data and no scores, so those
  // options are normalized off here; website/phone/sort restore from the URL.
  const [filters, setFilters] = useState<LeadSearchFilters>(() => ({
    ...(restored.mode === "demo" ? restored.filters : EMPTY_FILTERS),
    hasEmail: false,
    hasOpeningHours: false,
    minScore: 0,
    sort: restored.mode === "demo" && restored.filters.sort !== "score" ? restored.filters.sort : "provider",
  }));
  const [submitted, setSubmitted] = useState<LeadSearchFilters | null>(() =>
    restored.mode === "demo" && hasActiveProviderCriteria(restored.filters)
      ? {
          ...restored.filters,
          hasEmail: false,
          hasOpeningHours: false,
          minScore: 0,
          sort: restored.filters.sort === "score" ? "provider" : restored.filters.sort,
        }
      : null,
  );
  if (appliedKey !== restoredKey) {
    setAppliedKey(restoredKey);
    setMode(restored.mode);
    if (restored.mode === "demo") {
      const next: LeadSearchFilters = {
        ...restored.filters,
        hasEmail: false,
        hasOpeningHours: false,
        minScore: 0,
        sort: restored.filters.sort === "score" ? "provider" : restored.filters.sort,
      };
      if (JSON.stringify(next) !== JSON.stringify(filters)) setFilters(next);
      // Adopt restored submissions (e.g. shared links, back button) without
      // refetching: demo filtering is synchronous and deterministic.
      if (hasActiveProviderCriteria(restored.filters)) {
        if (JSON.stringify(next) !== JSON.stringify(submitted)) setSubmitted(next);
      } else if (submitted !== null) {
        setSubmitted(null);
      }
    }
  }

  // Provider-side results, then instant client-side refinement (no network).
  const providerResults = useMemo(
    () => (submitted ? filterDemoLeads(DEMO_LEADS, submitted) : null),
    [submitted],
  );
  const demoNames = useMemo(
    () =>
      new Map(
        (providerResults ?? []).map((lead) => [
          lead.id,
          { name: lead.companyName, category: lead.category },
        ]),
      ),
    [providerResults],
  );
  const demoInfo = useMemo(
    () => new Map((providerResults ?? []).map((lead) => [lead.id, demoInfoCompleteness(lead)])),
    [providerResults],
  );
  const results = useMemo(() => {
    if (!providerResults) return null;
    const narrowed = applyDemoAvailabilityFilters(providerResults, filters);
    return sortByIdOrder(narrowed, demoNames, filters.sort === "score" ? "provider" : filters.sort, {
      keyword: submitted?.keyword ?? "",
      scoreOf: () => null,
      infoOf: (id) => demoInfo.get(id) ?? 0,
    });
  }, [providerResults, filters, demoNames, demoInfo, submitted]);

  const activeDescriptions = submitted ? describeActiveFilters(submitted) : [];
  // Demo records carry no scores, so minScore stays off here by construction.
  const localActive = submitted !== null && hasLocalFilters(filters);
  const chips: FilterChip[] = [];
  if (submitted && filters.hasWebsite) chips.push({ key: "hasWebsite", label: "Website available" });
  if (submitted && filters.hasPhone) chips.push({ key: "hasPhone", label: "Phone available" });
  if (submitted && filters.sort !== "provider") chips.push({ key: "sort", label: `Sort: ${SORT_LABELS[filters.sort]}` });

  function clearLocalFilter(key: string) {
    if (key === "sort") update("sort", "provider");
    else update(key as "hasWebsite" | "hasPhone", false);
  }

  function clearAllLocal() {
    setFilters((current) => ({ ...current, hasWebsite: false, hasPhone: false, sort: "provider" }));
  }

  function update<K extends keyof LeadSearchFilters>(key: K, value: LeadSearchFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const snapshot = { ...filters };
    router.replace(`/find-companies?${filtersToSearchParams("demo", snapshot).toString()}`, {
      scroll: false,
    });
    setSubmitted(snapshot);
  }

  function handleReset() {
    setFilters(EMPTY_FILTERS);
    setSubmitted(null);
    router.replace("/find-companies", { scroll: false });
  }

  function handleExportDemo() {
    if (!results) return;
    const rows = results.map((lead) => demoToRow(lead, ""));
    downloadCsv(rowsToCsv(rows), exportFilename(new Date(), "search"));
  }

  /**
   * Applies a saved setup. Writes the shareable URL, switches mode when
   * needed, and fills the demo form directly; the live form is filled by
   * LiveSearchSection (mounted with the fresh URL). Never auto-fetches.
   */
  function applyPreset(presetMode: SearchMode, presetFilters: LeadSearchFilters) {
    router.replace(
      `/find-companies?${filtersToSearchParams(presetMode, presetFilters).toString()}`,
      { scroll: false },
    );
    if (presetMode !== mode) setMode(presetMode);
    if (presetMode === "demo") {
      const next: LeadSearchFilters = {
        ...presetFilters,
        hasEmail: false,
        hasOpeningHours: false,
        minScore: 0,
        sort: presetFilters.sort === "score" ? "provider" : presetFilters.sort,
      };
      setFilters(next);
      setSubmitted(hasActiveProviderCriteria(presetFilters) ? next : null);
    }
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="search-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="search-heading" className="text-xl font-bold tracking-tight text-ink">
            Find Companies
          </h2>
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
        {mode === "live" ? (
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink2">
            Discover real businesses from{" "}
            <strong className="font-semibold text-ink">OpenStreetMap</strong>{" "}
            via the public Overpass API. Enter a city to bound the search — results show only
            details the source data actually provides, and coverage varies by area.
          </p>
        ) : (
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink2">
            This form filters the local sample dataset — it does not contact any business-data
            service. Every record below is fictional and labeled as a sample.
          </p>
        )}
      </section>

      {mode === "live" ? (
        <LiveSearchSection onApplyPreset={applyPreset} />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardBody>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Country" htmlFor="fc-country">
                  <SelectInput
                    id="fc-country"
                    value={filters.country}
                    onChange={(event) => update("country", event.target.value)}
                  >
                    <option value="all">All countries</option>
                    {DEMO_COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </SelectInput>
                </Field>

                <Field label="City or region" htmlFor="fc-city" hint="Matches sample cities containing your text.">
                  <TextInput
                    id="fc-city"
                    type="text"
                    value={filters.city}
                    onChange={(event) => update("city", event.target.value)}
                    placeholder="e.g. Berlin"
                    list="fc-city-options"
                    autoComplete="off"
                  />
                  <datalist id="fc-city-options">
                    {DEMO_CITIES.map((city) => (
                      <option key={city} value={city} />
                    ))}
                  </datalist>
                </Field>

                <Field label="Business category" htmlFor="fc-category">
                  <SelectInput
                    id="fc-category"
                    value={filters.category}
                    onChange={(event) => update("category", event.target.value)}
                  >
                    <option value="all">All categories</option>
                    {DEMO_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </SelectInput>
                </Field>

                <Field label="Keyword (optional)" htmlFor="fc-keyword" hint="Searches name, category, city, and country.">
                  <TextInput
                    id="fc-keyword"
                    type="text"
                    value={filters.keyword}
                    onChange={(event) => update("keyword", event.target.value)}
                    placeholder="e.g. bakery, yoga, roaster"
                    autoComplete="off"
                  />
                </Field>

                <Field label="Maximum results" htmlFor="fc-max">
                  <SelectInput
                    id="fc-max"
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
                  <Button type="submit" className="flex-1">
                    <Search className="h-4 w-4" aria-hidden="true" />
                    Search Companies
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Reset
                  </Button>
                </div>
              </form>
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
                  Only show records with…
                </legend>
                <p className="mb-2 text-xs text-ink3">
                  Based on the sample availability flags. Applies instantly.
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <AvailabilityCheckbox id="demo-f-web" checked={filters.hasWebsite} onChange={(v) => update("hasWebsite", v)} label="Website listed" />
                  <AvailabilityCheckbox id="demo-f-phone" checked={filters.hasPhone} onChange={(v) => update("hasPhone", v)} label="Phone listed" />
                </div>
              </fieldset>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SortSelect
                  id="demo-sort"
                  value={filters.sort}
                  onChange={(sort: SortOrder) => update("sort", sort)}
                  includeScore={false}
                />
                <div className="flex items-end">
                  <p className="text-xs leading-relaxed text-ink3">
                    Email, opening-hours, and score options need real source data, so they stay
                    off in demo mode.
                  </p>
                </div>
              </div>
              <div className="border-t border-line-soft pt-4">
                <PresetControls mode="demo" filters={filters} onApply={applyPreset} />
              </div>
            </div>
          </details>

          <section aria-labelledby="results-heading" aria-live="polite">
            <h2 id="results-heading" className="sr-only">
              Demo search results
            </h2>

            {results === null ? (
              <EmptyState
                icon={<Database className="h-6 w-6" aria-hidden="true" />}
                title="Run a search to see demo companies"
                description="Choose a country, city, or category — or leave everything broad — then select Search Companies. Results are filtered deterministically from the 12-record sample dataset."
                action={null}
              />
            ) : (providerResults ?? []).length === 0 ? (
              <EmptyState
                icon={<SearchX className="h-6 w-6" aria-hidden="true" />}
                title="No sample records match"
                description={
                  activeDescriptions.length > 0
                    ? `No demo companies match ${activeDescriptions.join(" · ")}. Try broadening the search filters or selecting Reset.`
                    : "No demo companies match these filters. Try broadening the filters or selecting Reset."
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
                      Showing {results.length} of {(providerResults ?? []).length} sample result{(providerResults ?? []).length === 1 ? "" : "s"}
                    </strong>
                    {activeDescriptions.length > 0 ? (
                      <span className="text-ink3"> · {activeDescriptions.join(" · ")}</span>
                    ) : (
                      <span className="text-ink3"> · all demo records</span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {localActive ? (
                      <Badge tone="neutral" title="Sample results narrowed on this device — the dataset itself is unchanged.">
                        Narrowed locally
                      </Badge>
                    ) : null}
                    <Badge tone="demo">Sample results — not verified</Badge>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleExportDemo}
                      title="Download exactly these filtered sample records as CSV"
                      aria-label={`Export ${results.length} filtered sample records as CSV`}
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      Export ({results.length})
                    </Button>
                  </div>
                </div>
                <ActiveFilterChips chips={chips} onRemove={clearLocalFilter} onClearAll={clearAllLocal} />
                {results.length === 0 ? (
                  <EmptyState
                    icon={<SearchX className="h-6 w-6" aria-hidden="true" />}
                    title="Local refinements hide all records"
                    description="Matching sample records exist, but the active refinements filter every one of them out. Remove a refinement above — no new search is needed."
                    action={
                      <Button variant="secondary" onClick={clearAllLocal}>
                        Clear refinements
                      </Button>
                    }
                  />
                ) : (
                  <>
                    <LeadTable
                      leads={results}
                      isSaved={isDemoSaved}
                      onToggleSaved={toggleDemo}
                      caption="Demo company search results"
                    />
                    <p className="text-xs leading-relaxed text-ink3">
                      Availability flags indicate whether a sample record pretends a website or phone listing
                      exists. They are not verified contact details, and no emails, phone numbers, or URLs
                      are shown.
                    </p>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {mode === "live" ? (
        <div className="rounded-xl border border-line-soft bg-raised p-4">
          <OsmAttribution />
        </div>
      ) : null}
    </div>
  );
}
