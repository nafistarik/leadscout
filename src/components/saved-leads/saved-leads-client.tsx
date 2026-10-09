"use client";

import Link from "next/link";
import { BookmarkX } from "lucide-react";
import { LeadTable } from "@/components/leads/lead-table";
import { DemoBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionHeading } from "@/components/ui/feedback";
import { getLeadById } from "@/data/demo-leads";
import { useSavedLeads } from "@/hooks/use-saved-leads";

export default function SavedLeadsClient() {
  const { savedIds, storageAvailable, isSaved, toggleSaved } = useSavedLeads();

  const savedLeads = savedIds
    .map((id) => getLeadById(id))
    .filter((lead): lead is NonNullable<typeof lead> => lead !== undefined);

  return (
    <div className="space-y-6">
      <section aria-labelledby="saved-heading">
        <div className="flex flex-wrap items-center gap-2">
          <DemoBadge label="Locally saved demo records" />
        </div>
        <h2 id="saved-heading" className="mt-2 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Saved Leads
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Leads you save are stored only in this browser&apos;s local storage. They are demo records,
          they do not sync across devices, and they are cleared if you reset local data in Settings.
        </p>
        {!storageAvailable ? (
          <p
            role="alert"
            suppressHydrationWarning
            className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
          >
            Browser storage is unavailable, so saved leads will not persist after a refresh in this
            session. Saving still works temporarily for the current view.
          </p>
        ) : null}
      </section>

      {savedLeads.length === 0 ? (
        <EmptyState
          icon={<BookmarkX className="h-6 w-6" aria-hidden="true" />}
          title="No saved leads yet"
          description="Save promising demo companies from the dashboard or Find Companies page. Saved leads reappear here after a page refresh because they are stored locally."
          action={
            <Link href="/find-companies">
              <Button>Find Companies</Button>
            </Link>
          }
        />
      ) : (
        <section aria-labelledby="saved-list-heading">
          <SectionHeading
            title={`${savedLeads.length} saved lead${savedLeads.length === 1 ? "" : "s"}`}
            description="Select Unsave/Saved to remove a lead from this list."
          />
          <h3 id="saved-list-heading" className="sr-only">
            Saved demo leads
          </h3>
          <LeadTable
            leads={savedLeads}
            isSaved={isSaved}
            onToggleSaved={toggleSaved}
            caption="Saved demo leads"
          />
        </section>
      )}
    </div>
  );
}
