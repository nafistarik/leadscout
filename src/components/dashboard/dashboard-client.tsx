"use client";

import Link from "next/link";
import { Bookmark, Building2, Globe2, Search } from "lucide-react";
import { RecentSearchesSection } from "@/components/recent-searches/recent-searches-section";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { useSavedLeads } from "@/hooks/use-saved-leads";
import { useSearchHistory } from "@/hooks/use-search-history";
import { summarizeSearchStats } from "@/lib/search-history";

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
          Search real companies via OpenStreetMap, check their websites, and save promising leads.
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
