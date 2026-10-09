"use client";

import Link from "next/link";
import { ArrowRight, Bookmark, Building2, ListChecks, Phone, Search } from "lucide-react";
import { LeadTable } from "@/components/leads/lead-table";
import { Badge, DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/feedback";
import { DEMO_LEADS, SAMPLE_ACTIVITY } from "@/data/demo-leads";
import { useLeadLists } from "@/hooks/use-lead-lists";
import { useSavedLeads } from "@/hooks/use-saved-leads";

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
          <p className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400">{label}</p>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {icon}
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{value}</p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      </CardBody>
    </Card>
  );
}

export default function DashboardClient() {
  const { savedIds, isSaved, toggleSaved } = useSavedLeads();
  const { lists } = useLeadLists();

  const recentLeads = DEMO_LEADS.slice(0, 5);
  const contactAvailable = DEMO_LEADS.filter((lead) => lead.websiteAvailable || lead.phoneAvailable).length;

  return (
    <div className="space-y-8">
      {/* A. Welcome */}
      <section aria-labelledby="welcome-heading" className="rounded-xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-2">
          <DemoBadge />
          <Badge tone="neutral">Part 1 · UI foundation</Badge>
        </div>
        <h2 id="welcome-heading" className="mt-3 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          Find your next web project client
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-[15px] dark:text-zinc-400">
          LeadScout helps freelance web developers discover local businesses that may need a website.
          Browse demo companies, save promising leads, and organize them into lists. Live
          public-data search arrives in Part 2.
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

      {/* B. Overview metrics */}
      <section aria-labelledby="metrics-heading">
        <SectionHeading
          title="Overview"
          description="Demo metrics computed from the local sample dataset — not live results."
          action={<DemoBadge label="Demo metrics" />}
        />
        <h3 id="metrics-heading" className="sr-only">
          Overview metrics
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Companies Found"
            value={String(DEMO_LEADS.length)}
            hint="Records in the sample dataset"
            icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
          />
          <MetricCard
            label="Saved Leads"
            value={String(savedIds.length)}
            hint="Stored locally in your browser"
            icon={<Bookmark className="h-4 w-4" aria-hidden="true" />}
          />
          <MetricCard
            label="Contact Details Available"
            value={String(contactAvailable)}
            hint="Sample records with a listed website or phone"
            icon={<Phone className="h-4 w-4" aria-hidden="true" />}
          />
          <MetricCard
            label="Lists Created"
            value={String(lists.length)}
            hint="Local-only lists in this browser"
            icon={<ListChecks className="h-4 w-4" aria-hidden="true" />}
          />
        </div>
      </section>

      {/* C. Recent leads */}
      <section aria-labelledby="recent-leads-heading">
        <SectionHeading
          title="Recent Leads"
          description="A preview of the sample dataset. Availability flags only — no verified contact details."
          action={
            <Link
              href="/find-companies"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-blue-300 dark:hover:text-blue-200"
            >
              Open Find Companies
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          }
        />
        <h3 id="recent-leads-heading" className="sr-only">
          Recent demo leads
        </h3>
        <LeadTable
          leads={recentLeads}
          isSaved={isSaved}
          onToggleSaved={toggleSaved}
          caption="Recent demo leads"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* D. Recent activity */}
        <section aria-labelledby="activity-heading">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <h3 id="activity-heading" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Recent Activity
                </h3>
                <DemoBadge label="Sample events" />
              </div>
            </CardHeader>
            <CardBody>
              <ul className="space-y-4">
                {SAMPLE_ACTIVITY.map((event) => (
                  <li key={event.id} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600 dark:bg-blue-400" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{event.title}</p>
                      <p className="mt-0.5 text-[13px] text-zinc-600 dark:text-zinc-400">{event.detail}</p>
                      <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{event.timestamp}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400">
                No background jobs or real searches have occurred. These placeholders describe what
                activity will look like once live search is connected.
              </p>
            </CardBody>
          </Card>
        </section>

        {/* E. Quick actions */}
        <section aria-labelledby="quick-actions-heading">
          <Card className="h-full">
            <CardHeader>
              <h3 id="quick-actions-heading" className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                Quick Actions
              </h3>
            </CardHeader>
            <CardBody className="space-y-3">
              <Link
                href="/find-companies"
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-blue-300 hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-zinc-700 dark:hover:border-blue-700 dark:hover:bg-blue-950/40"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white dark:bg-blue-500 dark:text-zinc-950">
                    <Search className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      Search demo companies
                    </span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                      Filter the sample dataset by location and industry
                    </span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
              </Link>
              <Link
                href="/saved-leads"
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-blue-300 hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-zinc-700 dark:hover:border-blue-700 dark:hover:bg-blue-950/40"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                    <Bookmark className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      Review saved leads
                    </span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                      {savedIds.length} lead{savedIds.length === 1 ? "" : "s"} saved locally
                    </span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden="true" />
              </Link>
            </CardBody>
          </Card>
        </section>
      </div>
    </div>
  );
}
