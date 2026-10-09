"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  SearchX,
  SlidersHorizontal,
} from "lucide-react";
import { CompanyTable } from "@/components/companies/company-table";
import { ScoreLegend } from "@/components/companies/score-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { OsmAttribution } from "@/components/osm-attribution";
import { DEMO_CATEGORIES, MAX_RESULTS_OPTIONS } from "@/data/demo-leads";
import { LIVE_COUNTRY_SUGGESTIONS } from "@/data/search-options";
import { useCompanySearch } from "@/hooks/use-company-search";
import type { SearchError } from "@/hooks/use-company-search";
import { useSavedLeads } from "@/hooks/use-saved-leads";
import { EMPTY_FILTERS, describeActiveFilters } from "@/lib/filter-leads";
import type { LeadSearchFilters } from "@/lib/filter-leads";
import { tagsForCategory } from "@/lib/providers/osm-tags";
import { formatAreaKm2 } from "@/lib/providers/geo";
import { hasTagCity, scoreCompany } from "@/lib/scoring";

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

export function LiveSearchSection({ initialKeyword }: { initialKeyword: string }) {
  const { isCompanySaved, toggleCompany } = useSavedLeads();
  const { status, companies, meta, error, submittedFilters, search, retry, reset } =
    useCompanySearch();

  const [filters, setFilters] = useState<LeadSearchFilters>(() => ({
    ...EMPTY_FILTERS,
    country: "",
    keyword: initialKeyword,
  }));
  const [showScores, setShowScores] = useState(true);

  // Keep the keyword in sync when arriving via global search (?keyword=…).
  const [appliedKeyword, setAppliedKeyword] = useState(initialKeyword);
  if (appliedKeyword !== initialKeyword) {
    setAppliedKeyword(initialKeyword);
    setFilters((current) => ({ ...current, keyword: initialKeyword }));
  }

  function update<K extends keyof LeadSearchFilters>(key: K, value: LeadSearchFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    search({ ...filters });
  }

  function handleReset() {
    setFilters({ ...EMPTY_FILTERS, country: "" });
    reset();
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
  const isDirty =
    submittedFilters !== null &&
    JSON.stringify({ ...filters }) !== JSON.stringify({ ...submittedFilters });

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
                {DEMO_CATEGORIES.map((category) => (
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
                onChange={(event) => setShowScores(event.target.checked)}
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
                    {companies.length} live result{companies.length === 1 ? "" : "s"}
                  </strong>
                  <span className="text-ink3">
                    {" "}· {meta.areaLabel}
                    {formatAreaKm2(meta.areaKm2) ? ` · ~${formatAreaKm2(meta.areaKm2)}` : ""}
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {showScores ? <ScoreLegend /> : null}
                  <Badge tone="info">Live · OpenStreetMap</Badge>
                </div>
              </div>
              {isDirty ? (
                <p role="status" className="neu-recessed rounded-lg bg-recessed p-3 text-[13px] text-status-info-fg">
                  Filters changed since these results were fetched — select Search Companies to
                  refresh.
                </p>
              ) : null}
              <CompanyTable
                companies={companies}
                isSaved={isCompanySaved}
                onToggleSaved={toggleCompany}
                getScore={showScores && scores ? (company) => scores.get(company.id) ?? { score: 0, maxScore: 100, reasons: [] } : undefined}
                caption="Live company search results from OpenStreetMap"
              />
              <div className="space-y-1">
                <p className="text-xs leading-relaxed text-ink3">
                  Showing up to {submittedFilters?.maxResults ?? companies.length} results
                  {meta.truncated ? " (server limit reached — more businesses may exist)" : ""}.
                  This list is not exhaustive: it reflects only businesses mapped in OpenStreetMap.
                  Contact details appear only when the source data provides them.
                </p>
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
