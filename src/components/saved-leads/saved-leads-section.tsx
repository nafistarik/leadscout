"use client";

import { BookmarkX, Download } from "lucide-react";
import { CompanyTable } from "@/components/companies/company-table";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { useSavedLeads } from "@/hooks/use-saved-leads";
import { useWebsiteChecks } from "@/hooks/use-website-analysis";
import { downloadCsv, exportFilename, rowsToCsv, savedRecordsToRows } from "@/lib/csv";

/**
 * In-page saved-leads collection: real company snapshots with the same
 * contact details and website-check functionality as search results.
 */
export function SavedLeadsSection() {
  const { records, storageAvailable, isCompanySaved, toggleCompany } = useSavedLeads();
  const checks = useWebsiteChecks();

  const companies = records.map((record) => record.company);

  function handleExport() {
    const rows = savedRecordsToRows(records, (company) => checks.analysisFor(company.website));
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
        <CompanyTable
          companies={companies}
          isSaved={isCompanySaved}
          onToggleSaved={toggleCompany}
          caption="Saved leads"
        />
      )}
    </section>
  );
}

