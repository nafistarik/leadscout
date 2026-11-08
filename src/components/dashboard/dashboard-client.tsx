"use client";

import Link from "next/link";
import { Bookmark, Building2, CalendarClock, Search } from "lucide-react";
import { RecentSearchesSection } from "@/components/recent-searches/recent-searches-section";
import { STATUS_FILTER_PARAM } from "@/components/saved-leads/saved-leads-section";
import { buttonClassName } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { useLeadPipeline } from "@/hooks/use-lead-pipeline";
import { useSavedLeads } from "@/hooks/use-saved-leads";
import { useSearchHistory } from "@/hooks/use-search-history";
import { LEAD_STATUS_LABELS, LEAD_STATUSES, pipelineRates } from "@/lib/lead-pipeline";
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
  const rates = pipelineRates(records.map((record) => statusOf(record.id)));

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
            <p className="mt-3 text-xs text-ink3">
              {rates.reached === 0
                ? "Reply and win rates appear once you contact a lead."
                : `Of ${rates.reached} contacted: ${rates.replyRate}% replied · ${rates.winRate}% won`}
            </p>
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

const STEPS = [
  { title: "1. Find", text: "Pick a city and a business type. Ready cities answer in about two seconds." },
  { title: "2. Pick", text: "Leads without a website, but with a phone or email, come first. Save the good ones." },
  { title: "3. Contact", text: "Send the ready-made message on WhatsApp or email, then track replies and follow-ups." },
];

const FIRST_SEARCHES = [
  { label: "Restaurants in Dhaka", href: "/find-companies?city=Dhaka&category=Restaurant&run=1" },
  { label: "Beauty salons in Dhaka", href: "/find-companies?city=Dhaka&category=Beauty+Salon&run=1" },
  { label: "Dentists in London", href: "/find-companies?city=London&category=Dental+Clinic&run=1" },
  { label: "Cafes in Dubai", href: "/find-companies?city=Dubai&category=Coffee+Shop&run=1" },
];

/**
 * Shown instead of the all-zero statistics until the first search: how the
 * app works in three steps and one-click example searches.
 */
function GettingStarted() {
  return (
    <section aria-labelledby="start-heading" className="space-y-4">
      <h3 id="start-heading" className="text-base font-semibold tracking-tight text-ink">
        How it works
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {STEPS.map((step) => (
          <Card key={step.title}>
            <CardBody>
              <p className="text-sm font-semibold text-ink">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink2">{step.text}</p>
            </CardBody>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink2">Try one:</span>
        {FIRST_SEARCHES.map((search) => (
          <Link
            key={search.href}
            href={search.href}
            className="rounded-md border border-line-soft bg-raised px-2.5 py-1 text-xs font-medium text-ink2 hover:text-ink"
          >
            {search.label}
          </Link>
        ))}
      </div>
    </section>
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
          Find businesses that need a website
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink2 sm:text-[15px]">
          Search any city for local businesses with no website or a weak one, send them a ready-made
          message on WhatsApp or email, and track who replied. Free map data from Overture Maps and
          OpenStreetMap.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/find-companies" className={buttonClassName()}>
            <Search className="h-4 w-4" aria-hidden="true" />
            Find Companies
          </Link>
          <Link href="/saved-leads" className={buttonClassName("secondary")}>
            <Bookmark className="h-4 w-4" aria-hidden="true" />
            Saved Leads
          </Link>
        </div>
      </section>

      <PipelineSection />

      {stats.totalSearches === 0 && records.length === 0 ? (
        <GettingStarted />
      ) : (
        <section aria-labelledby="metrics-heading">
        <h3 id="metrics-heading" className="mb-4 text-base font-semibold tracking-tight text-ink">
          Overview
        </h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <MetricCard
            label="Searches"
            value={String(stats.totalSearches)}
            hint="Searches that returned results"
            icon={<Search className="h-4 w-4" aria-hidden="true" />}
          />
          <MetricCard
            label="Businesses found"
            value={String(stats.totalResults)}
            hint="Across all your searches"
            icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
          />
          <MetricCard
            label="Saved leads"
            value={String(records.length)}
            hint="Kept in this browser"
            icon={<Bookmark className="h-4 w-4" aria-hidden="true" />}
          />
        </div>
      </section>
      )}

      <RecentSearchesSection />
    </div>
  );
}
