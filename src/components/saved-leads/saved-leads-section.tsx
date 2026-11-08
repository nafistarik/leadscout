"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookmarkX, Download } from "lucide-react";
import { CompanyTable } from "@/components/companies/company-table";
import { LeadNotesEditor } from "@/components/saved-leads/lead-notes-editor";
import { LeadPitchPanel } from "@/components/saved-leads/lead-pitch-panel";
import { LeadStatusControl } from "@/components/saved-leads/lead-status-control";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { useLeadPipeline } from "@/hooks/use-lead-pipeline";
import { useSavedLeads } from "@/hooks/use-saved-leads";
import { useWebsiteChecks } from "@/hooks/use-website-analysis";
import { downloadCsv, exportFilename, rowsToCsv, savedRecordsToRows } from "@/lib/csv";
import { LEAD_STATUS_LABELS, LEAD_STATUSES } from "@/lib/lead-pipeline";
import type { LeadStatus } from "@/lib/lead-pipeline";
import { cn } from "@/lib/storage";

type StatusFilter = LeadStatus | "all" | "due";

/** Query parameter the Dashboard links with, e.g. /saved-leads?status=due. */
export const STATUS_FILTER_PARAM = "status";

/** A filter from the URL, or "all" for anything missing or unknown. */
export function parseStatusFilter(value: string | null): StatusFilter {
  if (value === "due") return "due";
  return LEAD_STATUSES.find((status) => status === value) ?? "all";
}

/**
 * One-row status filter with a count per status; statuses with no leads
 * are hidden so the row stays short, except the one currently selected.
 * "Follow-up due" cuts across statuses, so it sits right after "All".
 */
function StatusFilterBar({
  value,
  counts,
  total,
  due,
  onChange,
}: {
  value: StatusFilter;
  counts: Record<LeadStatus, number>;
  total: number;
  due: number;
  onChange: (next: StatusFilter) => void;
}) {
  const options: { value: StatusFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: total },
    ...(due > 0 || value === "due" ? [{ value: "due" as const, label: "Follow-up due", count: due }] : []),
    ...LEAD_STATUSES.filter((status) => counts[status] > 0 || status === value).map((status) => ({
      value: status,
      label: LEAD_STATUS_LABELS[status],
      count: counts[status],
    })),
  ];
  return (
    <div role="group" aria-label="Filter saved leads by status" className="flex flex-wrap items-center gap-1.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
              active ? "border-transparent bg-accent text-on-accent" : "border-line-soft bg-raised text-ink2 hover:text-ink",
            )}
          >
            {option.label}
            <span className={cn("tabular-nums", active ? "opacity-90" : "text-ink3")}>{option.count}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * In-page saved-leads collection: real company snapshots with the same
 * contact details and website-check functionality as search results.
 */
export function SavedLeadsSection() {
  const { records, storageAvailable, isCompanySaved, toggleCompany } = useSavedLeads();
  const checks = useWebsiteChecks();
  const { entryFor, statusOf, setStatus, updateDetails, markContacted, followUpDue } = useLeadPipeline();
  const searchParams = useSearchParams();
  // The URL only picks the starting filter; clicks after that stay on the page.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
    parseStatusFilter(searchParams.get(STATUS_FILTER_PARAM)),
  );

  const counts = Object.fromEntries(LEAD_STATUSES.map((status) => [status, 0])) as Record<LeadStatus, number>;
  for (const record of records) counts[statusOf(record.id)] += 1;
  const dueCount = records.filter((record) => followUpDue(record.id)).length;
  const companies = records
    .filter((record) =>
      statusFilter === "all"
        ? true
        : statusFilter === "due"
          ? followUpDue(record.id)
          : statusOf(record.id) === statusFilter,
    )
    .map((record) => record.company);

  function handleExport() {
    const rows = savedRecordsToRows(records, (company) => checks.analysisFor(company.website), entryFor);
    downloadCsv(rowsToCsv(rows), exportFilename(new Date()));
  }

  return (
    <section aria-labelledby="saved-leads-heading" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="saved-leads-heading" className="text-base font-semibold tracking-tight text-ink">
            Saved leads ({records.length})
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-ink2">
            Promising businesses you saved. They stay in this browser after a refresh.
          </p>
        </div>
        {records.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={handleExport}
            title="Download all saved leads as CSV"
            aria-label={`Export all ${records.length} saved leads as CSV`}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export saved ({records.length})
          </Button>
        ) : null}
      </div>

      {!storageAvailable ? (
        <p
          role="alert"
          suppressHydrationWarning
          className="rounded-lg border border-status-warning-line bg-status-warning-bg p-3 text-sm text-status-warning-fg"
        >
          Browser storage is unavailable, so saved leads will not persist after a refresh in this
          session. Saving still works temporarily for the current view.
        </p>
      ) : null}

      {records.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center px-6 py-10 text-center">
            <div className="neu-recessed mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-recessed text-ink2">
              <BookmarkX className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-ink">No saved leads yet</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-ink2">
              Save promising companies from the search results above — they will appear here.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          <StatusFilterBar
            value={statusFilter}
            counts={counts}
            total={records.length}
            due={dueCount}
            onChange={setStatusFilter}
          />
          {companies.length === 0 ? (
            <p className="text-sm text-ink2">
              {statusFilter === "due"
                ? "No follow-ups are due right now."
                : `No saved leads are ${statusFilter === "all" ? "here" : `marked “${LEAD_STATUS_LABELS[statusFilter]}”`} right now.`}
            </p>
          ) : (
            <CompanyTable
              companies={companies}
              isSaved={isCompanySaved}
              onToggleSaved={toggleCompany}
              caption="Saved leads"
              renderLeadActions={(company, layout) => (
                <LeadStatusControl
                  idPrefix={`${layout}-${company.id}`}
                  companyName={company.name}
                  entry={entryFor(company.id)}
                  followUpDue={followUpDue(company.id)}
                  onChange={(status, lostReason) => setStatus(company.id, status, lostReason)}
                />
              )}
              renderLeadDetails={(company, layout) => (
                <>
                  <LeadPitchPanel
                    idPrefix={`${layout}-${company.id}`}
                    company={company}
                    onContacted={() => markContacted(company.id)}
                  />
                  <LeadNotesEditor
                    idPrefix={`${layout}-${company.id}`}
                    entry={entryFor(company.id)}
                    onChange={(patch) => updateDetails(company.id, patch)}
                  />
                </>
              )}
            />
          )}
        </div>
      )}
    </section>
  );
}

