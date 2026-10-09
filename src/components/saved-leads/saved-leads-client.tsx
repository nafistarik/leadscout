"use client";

import Link from "next/link";
import { BookmarkX, Download } from "lucide-react";
import { CompanyTable } from "@/components/companies/company-table";
import { LeadTable } from "@/components/leads/lead-table";
import { AddToListControl } from "@/components/lists/add-to-list-control";
import { DemoBadge } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionHeading } from "@/components/ui/feedback";
import { OsmAttribution } from "@/components/osm-attribution";
import { getLeadById } from "@/data/demo-leads";
import { useSavedLeads } from "@/hooks/use-saved-leads";
import { downloadCsv, exportFilename, rowsToCsv, savedRecordsToRows } from "@/lib/csv";
import { toDemoRecordId } from "@/types/company";
import type { Company } from "@/types/company";

export default function SavedLeadsClient() {
  const {
    records,
    storageAvailable,
    isDemoSaved,
    isCompanySaved,
    toggleDemo,
    toggleCompany,
  } = useSavedLeads();

  const companyRecords = records.filter((record) => record.kind === "osm");
  const demoRecords = records.filter((record) => record.kind === "demo");
  const demoLeads = demoRecords
    .map((record) => (record.kind === "demo" ? getLeadById(record.demoId) : undefined))
    .filter((lead): lead is NonNullable<typeof lead> => lead !== undefined);
  const companies: Company[] = companyRecords.map((record) =>
    record.kind === "osm" ? record.company : (null as never),
  );

  function handleExport() {
    const rows = savedRecordsToRows(records, getLeadById);
    downloadCsv(rowsToCsv(rows), exportFilename());
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="saved-heading">
        <div className="flex flex-wrap items-center gap-2">
          <DemoBadge label="Local browser storage" />
        </div>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="saved-heading" className="text-xl font-bold tracking-tight text-ink">
              Saved Leads
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink2">
              Leads you save are stored only in this browser&apos;s local storage. They do not
              sync across devices, and they are cleared if you reset local data in Settings.
              Demo records and real OpenStreetMap records are kept in separate, clearly labeled
              sections.
            </p>
          </div>
          {records.length > 0 ? (
            <Button variant="secondary" onClick={handleExport}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Export CSV ({records.length})
            </Button>
          ) : null}
        </div>
        {!storageAvailable ? (
          <p
            role="alert"
            suppressHydrationWarning
            className="mt-3 rounded-lg border border-status-warning-line bg-status-warning-bg p-3 text-sm text-status-warning-fg"
          >
            Browser storage is unavailable, so saved leads will not persist after a refresh in this
            session. Saving still works temporarily for the current view.
          </p>
        ) : null}
      </section>

      {records.length === 0 ? (
        <EmptyState
          icon={<BookmarkX className="h-6 w-6" aria-hidden="true" />}
          title="No saved leads yet"
          description="Save promising companies from the Find Companies page — live OpenStreetMap results or demo records. Saved leads reappear here after a page refresh because they are stored locally. When you have saved leads, you can export them as CSV."
          action={
            <Link href="/find-companies">
              <Button>Find Companies</Button>
            </Link>
          }
        />
      ) : (
        <>
          {companies.length > 0 ? (
            <section aria-labelledby="saved-osm-heading">
              <SectionHeading
                title={`${companies.length} saved from OpenStreetMap`}
                description="Real records with source-provided details only. Use the list picker to organize a lead."
                action={<Badge tone="info">Live data</Badge>}
              />
              <h3 id="saved-osm-heading" className="sr-only">
                Saved OpenStreetMap leads
              </h3>
              <CompanyTable
                companies={companies}
                isSaved={isCompanySaved}
                onToggleSaved={toggleCompany}
                extraActions={(company) => (
                  <AddToListControl leadId={company.id} leadName={company.name} />
                )}
                caption="Saved OpenStreetMap leads"
              />
              <div className="mt-3">
                <OsmAttribution />
              </div>
            </section>
          ) : null}

          {demoLeads.length > 0 ? (
            <section aria-labelledby="saved-demo-heading">
              <SectionHeading
                title={`${demoLeads.length} saved demo record${demoLeads.length === 1 ? "" : "s"}`}
                description="Fictional sample records. Select Saved to remove a lead from this list."
                action={<DemoBadge label="Sample records" />}
              />
              <h3 id="saved-demo-heading" className="sr-only">
                Saved demo leads
              </h3>
              <LeadTable
                leads={demoLeads}
                isSaved={isDemoSaved}
                onToggleSaved={toggleDemo}
                extraActions={(lead) => (
                  <AddToListControl leadId={toDemoRecordId(lead.id)} leadName={lead.companyName} />
                )}
                caption="Saved demo leads"
              />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
