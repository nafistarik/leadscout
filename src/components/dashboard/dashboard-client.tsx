"use client";

import Link from "next/link";
import { ArrowRight, Bookmark, Building2, Globe2, ListChecks, Phone, Search } from "lucide-react";
import { CompanyTable } from "@/components/companies/company-table";
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

export default function DashboardClient() {
  const { records, isDemoSaved, toggleDemo, isCompanySaved, toggleCompany } = useSavedLeads();
  const { lists } = useLeadLists();

  const recentLeads = DEMO_LEADS.slice(0, 5);
  const contactAvailable = DEMO_LEADS.filter((lead) => lead.websiteAvailable || lead.phoneAvailable).length;
  const liveSaved = records.filter((record) => record.kind === "osm");
  const livePreview = liveSaved.slice(0, 3).map((record) => (record.kind === "osm" ? record.company : null)).filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <div className="space-y-8">
      {/* A. Welcome */}
      <section aria-labelledby="welcome-heading" className="neu-raised rounded-2xl border border-line-soft bg-raised p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <DemoBadge />
          <Badge tone="info">Live search · OpenStreetMap</Badge>
        </div>
        <h2 id="welcome-heading" className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Find your next web project client
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink2 sm:text-[15px]">
          LeadScout helps freelance web developers discover local businesses that may need a website.
          Search real companies via OpenStreetMap, save promising leads, and organize them into
          lists — or explore the labeled demo dataset.
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
            value={String(records.length)}
            hint="Demo + OpenStreetMap, stored locally"
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
              className="inline-flex items-center gap-1 text-sm font-medium text-accent-ink hover:text-accent-hover"
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
          isSaved={isDemoSaved}
          onToggleSaved={toggleDemo}
          caption="Recent demo leads"
        />
      </section>

      {/* C2. Recently saved live leads (separate, clearly labeled) */}
      <section aria-labelledby="live-saved-heading">
        <SectionHeading
          title="Saved from OpenStreetMap"
          description="Your most recently saved live records — real mapped businesses, not samples."
          action={
            <Link
              href="/saved-leads"
              className="inline-flex items-center gap-1 text-sm font-medium text-accent-ink hover:text-accent-hover"
            >
              View all saved
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          }
        />
        <h3 id="live-saved-heading" className="sr-only">
          Recently saved live leads
        </h3>
        {livePreview.length === 0 ? (
          <Card>
            <CardBody className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-ink">
                <Globe2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-sm text-ink2">
                No live leads saved yet.{" "}
                <Link
                  href="/find-companies"
                  className="font-medium text-accent-ink hover:text-accent-hover"
                >
                  Search OpenStreetMap
                </Link>{" "}
                to find real businesses.
              </p>
            </CardBody>
          </Card>
        ) : (
          <CompanyTable
            companies={livePreview}
            isSaved={isCompanySaved}
            onToggleSaved={toggleCompany}
            caption="Recently saved live leads"
          />
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* D. Recent activity */}
        <section aria-labelledby="activity-heading">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <h3 id="activity-heading" className="text-sm font-semibold text-ink">
                  Recent Activity
                </h3>
                <DemoBadge label="Sample events" />
              </div>
            </CardHeader>
            <CardBody>
              <ul className="space-y-4">
                {SAMPLE_ACTIVITY.map((event) => (
                  <li key={event.id} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium text-ink">{event.title}</p>
                      <p className="mt-0.5 text-[13px] text-ink2">{event.detail}</p>
                      <p className="mt-0.5 text-xs text-ink3">{event.timestamp}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="neu-recessed mt-4 rounded-lg bg-recessed p-3 text-xs leading-relaxed text-ink2">
                These sample events describe demo-mode activity only. Live searches and saves are
                not tracked here.
              </p>
            </CardBody>
          </Card>
        </section>

        {/* E. Quick actions */}
        <section aria-labelledby="quick-actions-heading">
          <Card className="h-full">
            <CardHeader>
              <h3 id="quick-actions-heading" className="text-sm font-semibold text-ink">
                Quick Actions
              </h3>
            </CardHeader>
            <CardBody className="space-y-3">
              <Link
                href="/find-companies"
                className="flex items-center justify-between gap-3 rounded-lg border border-line-soft bg-raised p-4 transition-colors hover:bg-alt"
              >
                <span className="flex items-center gap-3">
                  <span className="neu-raised-sm flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-on-accent">
                    <Search className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">
                      Search live companies
                    </span>
                    <span className="block text-xs text-ink3">
                      Query OpenStreetMap by city, category, and keyword
                    </span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-ink3" aria-hidden="true" />
              </Link>
              <Link
                href="/saved-leads"
                className="flex items-center justify-between gap-3 rounded-lg border border-line-soft bg-raised p-4 transition-colors hover:bg-alt"
              >
                <span className="flex items-center gap-3">
                  <span className="neu-raised-sm flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-app">
                    <Bookmark className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">
                      Review saved leads
                    </span>
                    <span className="block text-xs text-ink3">
                      {records.length} lead{records.length === 1 ? "" : "s"} saved locally
                    </span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-ink3" aria-hidden="true" />
              </Link>
            </CardBody>
          </Card>
        </section>
      </div>
    </div>
  );
}
