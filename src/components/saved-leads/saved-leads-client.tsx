"use client";

import Link from "next/link";
import { useState } from "react";
import { BookmarkX, Download } from "lucide-react";
import { CompanyTable } from "@/components/companies/company-table";
import { ResearchActions } from "@/components/companies/research-actions";
import { LeadTable } from "@/components/leads/lead-table";
import { AddToListControl } from "@/components/lists/add-to-list-control";
import { DemoBadge } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionHeading } from "@/components/ui/feedback";
import { OsmAttribution } from "@/components/osm-attribution";
import { LeadWorkflowPanel } from "@/components/workflow/lead-workflow-panel";
import { getLeadById } from "@/data/demo-leads";
import { useLeadWorkflow } from "@/hooks/use-lead-workflow";
import { useSavedLeads } from "@/hooks/use-saved-leads";
import { downloadCsv, exportFilename, rowsToCsv, savedRecordsToRows } from "@/lib/csv";
import { effectiveStatus, signalsFromCompany, signalsFromDemoLead } from "@/lib/workflow";
import { LEAD_STATUS_LABELS, LEAD_STATUSES } from "@/types/workflow";
import type { LeadStatus } from "@/types/workflow";
import { toDemoRecordId } from "@/types/company";
import type { Company } from "@/types/company";

type StatusFilter = LeadStatus | "all";

export default function SavedLeadsClient() {
  const {
    records,
    storageAvailable,
    isDemoSaved,
    isCompanySaved,
    toggleDemo,
    toggleCompany,
    removeSaved,
  } = useSavedLeads();

  const { getWorkflow } = useLeadWorkflow();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const matchesStatusFilter = (recordId: string): boolean =>
    statusFilter === "all" || effectiveStatus(getWorkflow(recordId)) === statusFilter;

  const visibleCompanyRecords = records.filter(
    (record) => record.kind === "osm" && matchesStatusFilter(record.id),
  );
  const visibleDemoRecords = records.filter(
    (record) =>
      record.kind === "demo" &&
      matchesStatusFilter(record.id) &&
      getLeadById(record.demoId) !== undefined,
  );
  const companies: Company[] = visibleCompanyRecords.map((record) =>
    record.kind === "osm" ? record.company : (null as never),
  );
  const demoLeads = visibleDemoRecords
    .map((record) => (record.kind === "demo" ? getLeadById(record.demoId) : undefined))
    .filter((lead): lead is NonNullable<typeof lead> => lead !== undefined);
  // References that no longer resolve (e.g. demo ids from an older dataset):
  // surfaced explicitly instead of silently dropped from counts. Status
  // filtering only hides rows; it never counts them as stale.
  const displayedCount = companies.length + demoLeads.length;
  const resolvableCount = records.filter(
    (record) =>
      record.kind === "osm" ||
      (record.kind === "demo" && getLeadById(record.demoId) !== undefined),
  ).length;
  const staleCount = records.length - resolvableCount;

  function handlePruneStale() {
    for (const record of records) {
      if (record.kind === "demo" && !getLeadById(record.demoId)) {
        removeSaved(record.id);
      }
    }
  }

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
          {displayedCount > 0 ? (
            <Button
              variant="secondary"
              onClick={handleExport}
              title="Download all saved leads (demo + OpenStreetMap) as CSV"
              aria-label={`Export all ${displayedCount} saved leads as CSV`}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export saved ({displayedCount})
            </Button>
          ) : null}
        </div>
        {staleCount > 0 ? (
          <div className="mt-3 rounded-lg border border-status-warning-line bg-status-warning-bg p-3">
            <p role="status" className="text-sm text-status-warning-fg">
              {staleCount} saved reference{staleCount === 1 ? "" : "s"} no longer {staleCount === 1 ? "resolves" : "resolve"} to a known record and {staleCount === 1 ? "is" : "are"} hidden.
            </p>
            <div className="mt-2">
              <Button variant="secondary" size="sm" onClick={handlePruneStale}>
                Remove unresolvable {staleCount === 1 ? "reference" : "references"}
              </Button>
            </div>
          </div>
        ) : null}
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

      {displayedCount === 0 ? (
        <EmptyState
          icon={<BookmarkX className="h-6 w-6" aria-hidden="true" />}
          title={
            records.length === 0
              ? "No saved leads yet"
              : statusFilter !== "all" && resolvableCount > 0
                ? `No leads marked “${LEAD_STATUS_LABELS[statusFilter]}”`
                : "Saved leads can't be shown"
          }
          description={
            records.length === 0
              ? "Save promising companies from the Find Companies page — live OpenStreetMap results or demo records. Saved leads reappear here after a page refresh because they are stored locally. When you have saved leads, you can export them as CSV."
              : statusFilter !== "all" && resolvableCount > 0
                ? "No saved leads currently carry this status. Clear the status filter or assign the status from a lead's research panel."
                : "Your saved references no longer resolve to known records (for example, after a dataset change). You can remove them with the button above."
          }
          action={
            statusFilter !== "all" && resolvableCount > 0 ? (
              <Button variant="secondary" onClick={() => setStatusFilter("all")}>
                Clear status filter
              </Button>
            ) : (
              <Link href="/find-companies">
                <Button>Find Companies</Button>
              </Link>
            )
          }
        />
      ) : (
        <>
          <section aria-label="Filter saved leads">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <label htmlFor="saved-status-filter" className="text-[13px] font-medium text-ink2">
                Show leads with status
              </label>
              <select
                id="saved-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="neu-recessed h-9 cursor-pointer rounded-lg border border-line-soft bg-recessed px-2 text-[13px] text-ink"
              >
                <option value="all">All statuses</option>
                {LEAD_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {LEAD_STATUS_LABELS[option]}
                  </option>
                ))}
              </select>
              {statusFilter !== "all" ? (
                <span className="text-xs text-ink3">
                  Showing {displayedCount} of {resolvableCount} saved{" "}
                  {resolvableCount === 1 ? "lead" : "leads"}
                </span>
              ) : null}
            </div>
          </section>
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
                  <div className="flex flex-col items-end gap-2">
                    <AddToListControl leadId={company.id} leadName={company.name} />
                    <ResearchActions company={company} workflow={getWorkflow(company.id)} />
                    <LeadWorkflowPanel
                      recordId={company.id}
                      leadName={company.name}
                      signals={signalsFromCompany(company)}
                    />
                  </div>
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
                  <div className="flex flex-col items-end gap-2">
                    <AddToListControl leadId={toDemoRecordId(lead.id)} leadName={lead.companyName} />
                    <LeadWorkflowPanel
                      recordId={toDemoRecordId(lead.id)}
                      leadName={lead.companyName}
                      signals={signalsFromDemoLead(lead)}
                    />
                  </div>
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
