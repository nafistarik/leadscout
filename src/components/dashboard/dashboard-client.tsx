"use client";

import Link from "next/link";
import { Bookmark, Building2, CalendarClock, Globe2, Search } from "lucide-react";
import { RecentSearchesSection } from "@/components/recent-searches/recent-searches-section";
import { STATUS_FILTER_PARAM } from "@/components/saved-leads/saved-leads-section";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { useLeadPipeline } from "@/hooks/use-lead-pipeline";
import { useSavedLeads } from "@/hooks/use-saved-leads";
import { useSearchHistory } from "@/hooks/use-search-history";
import { LEAD_STATUS_LABELS, LEAD_STATUSES } from "@/lib/lead-pipeline";
import { summarizeSearchStats } from "@/lib/search-history";

/** How many due leads are named on the Dashboard before "and N more". */
const DUE_PREVIEW = 5;

function savedLeadsHref(filter: string): string {
  return `/saved-leads?${new URLSearchParams({ [STATUS_FILTER_PARAM]: filter })}`;
}

/**
 * Today's work: follow-ups that are due and how many leads sit in each
 * status, each linking to Saved Leads with that filter applied. Hidden until
 * at least one lead is saved.
 */
function PipelineSection() {
  const { records } = useSavedLeads();
  const { statusOf, followUpDue, entryFor } = useLeadPipeline();
  if (records.length === 0) return null;

  const due = records.filter((record) => followUpDue(record.id));
  const counts = LEAD_STATUSES.map((status) => ({
    status,
    count: records.filter((record) => statusOf(record.id) === status).length,
  })).filter((entry) => entry.count > 0);

  return (
    <section aria-labelledby="pipeline-heading">
      <h3 id="pipeline-heading" className="mb-4 text-base font-semibold tracking-tight text-ink">
        Your pipeline
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-ink2">Follow-ups due</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-status-warning-bg text-status-warning-fg">
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{due.length}</p>
            {due.length === 0 ? (
              <p className="mt-1 text-xs text-ink3">Nothing due today. Set a follow-up date in a lead&apos;s details.</p>
            ) : (
              <>
                <ul className="mt-2 space-y-1 text-sm text-ink2">
                  {due.slice(0, DUE_PREVIEW).map((record) => (
                    <li key={record.id} className="flex justify-between gap-3">
                      <span className="truncate">{record.company.name}</span>
                      <span className="shrink-0 text-xs text-ink3">{entryFor(record.id)?.followUpDate}</span>
                    </li>
                  ))}
                </ul>
                {due.length > DUE_PREVIEW ? (
                  <p className="mt-1 text-xs text-ink3">and {due.length - DUE_PREVIEW} more</p>
                ) : null}
                <Link
                  href={savedLeadsHref("due")}
                  className="mt-3 inline-block text-xs font-medium text-accent-ink underline-offset-2 hover:underline"
                >
                  Open follow-ups
                </Link>
              </>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-[13px] font-medium text-ink2">Saved leads by status</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {counts.map(({ status, count }) => (
                <li key={status}>
                  <Link
                    href={savedLeadsHref(status)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-line-soft bg-raised px-2.5 py-1 text-xs font-medium text-ink2 hover:text-ink"
                  >
                    {LEAD_STATUS_LABELS[status]}
                    <span className="tabular-nums text-ink3">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-ink2">{label}</p>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent-ink">
            {icon}
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{value}</p>
        <p className="mt-1 text-xs text-ink3">{hint}</p>
      </CardBody>
    </Card>
  );
}

export function DashboardClient() {
  const { records } = useSavedLeads();
  const { history } = useSearchHistory();
  const stats = summarizeSearchStats(history);

  return (
    <div className="space-y-8">
      <section aria-labelledby="welcome-heading" className="neu-raised rounded-2xl border border-line-soft bg-raised p-6 sm:p-8">
        <h2 id="welcome-heading" className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Find your next web project client
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink2 sm:text-[15px]">
          LeadScout helps freelance web developers discover local businesses that may need a website.
          Search real companies via Overture Maps and OpenStreetMap, check their websites, and save promising leads.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/find-companies">
            <Button>
              <Search className="h-4 w-4" aria-hidden="true" />
              Find Companies
            </Button>
          </Link>
          <Link href="/saved-leads">
            <Button variant="secondary">
              <Bookmark className="h-4 w-4" aria-hidden="true" />
              View Saved Leads
            </Button>
          </Link>
        </div>
      </section>

      <PipelineSection />

      <section aria-labelledby="metrics-heading">
        <h3 id="metrics-heading" className="mb-4 text-base font-semibold tracking-tight text-ink">
          Overview
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Searches"
            value={String(stats.totalSearches)}
            hint="Successful live searches recorded"
            icon={<Search className="h-4 w-4" aria-hidden="true" />}
          />
          <MetricCard
            label="Businesses Found"
            value={String(stats.totalResults)}
            hint="Cumulative results across recorded searches"
            icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
          />
          <MetricCard
            label="Businesses with Websites"
            value={String(stats.uniqueWebsites)}
            hint="Unique businesses listing a website"
            icon={<Globe2 className="h-4 w-4" aria-hidden="true" />}
          />
          <MetricCard
            label="Saved Leads"
            value={String(records.length)}
            hint="Real businesses saved in this browser"
            icon={<Bookmark className="h-4 w-4" aria-hidden="true" />}
          />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink3">
          Statistics are tracked locally from your successful searches — failed searches are never
          counted, and counts grow as you search.
        </p>
      </section>

      <RecentSearchesSection />
    </div>
  );
}
