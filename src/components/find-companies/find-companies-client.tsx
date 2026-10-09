"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Database, FlaskConical, Globe2, RotateCcw, Search, SearchX } from "lucide-react";
import { LiveSearchSection } from "@/components/find-companies/live-search-section";
import { LeadTable } from "@/components/leads/lead-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Field, SelectInput, TextInput } from "@/components/ui/field";
import { OsmAttribution } from "@/components/osm-attribution";
import { DEMO_CATEGORIES, DEMO_CITIES, DEMO_COUNTRIES, DEMO_LEADS, MAX_RESULTS_OPTIONS } from "@/data/demo-leads";
import { useSavedLeads } from "@/hooks/use-saved-leads";
import { EMPTY_FILTERS, describeActiveFilters, filterDemoLeads } from "@/lib/filter-leads";
import type { LeadSearchFilters } from "@/lib/filter-leads";
import { cn } from "@/lib/storage";

type SourceMode = "live" | "demo";

function ModeToggle({ mode, onChange }: { mode: SourceMode; onChange: (mode: SourceMode) => void }) {
  const options: Array<{ value: SourceMode; label: string; icon: typeof Globe2; hint: string }> = [
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
  const searchParams = useSearchParams();
  const { isDemoSaved, toggleDemo } = useSavedLeads();
  const [mode, setMode] = useState<SourceMode>("live");

  // Demo-mode form state (unchanged Part 1 behavior).
  const keywordParam = (searchParams.get("keyword") ?? "").trim();
  const [filters, setFilters] = useState<LeadSearchFilters>(() => ({
    ...EMPTY_FILTERS,
    keyword: keywordParam,
  }));
  const [submitted, setSubmitted] = useState<LeadSearchFilters | null>(() =>
    keywordParam ? { ...EMPTY_FILTERS, keyword: keywordParam } : null,
  );
  const [appliedParam, setAppliedParam] = useState(keywordParam);
  if (appliedParam !== keywordParam) {
    setAppliedParam(keywordParam);
    setFilters((current) => ({ ...current, keyword: keywordParam }));
    setSubmitted(keywordParam ? { ...EMPTY_FILTERS, keyword: keywordParam } : null);
  }

  const results = useMemo(
    () => (submitted ? filterDemoLeads(DEMO_LEADS, submitted) : null),
    [submitted],
  );

  const activeDescriptions = submitted ? describeActiveFilters(submitted) : [];

  function update<K extends keyof LeadSearchFilters>(key: K, value: LeadSearchFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted({ ...filters });
  }

  function handleReset() {
    setFilters(EMPTY_FILTERS);
    setSubmitted(null);
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
        <LiveSearchSection initialKeyword={keywordParam} />
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
            ) : results.length === 0 ? (
              <EmptyState
                icon={<SearchX className="h-6 w-6" aria-hidden="true" />}
                title="No sample records match"
                description={
                  activeDescriptions.length > 0
                    ? `No demo companies match ${activeDescriptions.join(" · ")}. Try broadening the filters or selecting Reset.`
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
                      {results.length} sample result{results.length === 1 ? "" : "s"}
                    </strong>
                    {activeDescriptions.length > 0 ? (
                      <span className="text-ink3"> · {activeDescriptions.join(" · ")}</span>
                    ) : (
                      <span className="text-ink3"> · all demo records</span>
                    )}
                  </p>
                  <Badge tone="demo">Sample results — not verified</Badge>
                </div>
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
