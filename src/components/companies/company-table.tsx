"use client";

import { Fragment, useState } from "react";
import { Building2, ChevronDown, MapPin } from "lucide-react";
import {
  ContactList,
  LeadDetailsPanel,
  OpportunityCell,
  WebsiteCheckCell,
} from "@/components/companies/lead-insights";
import { SaveLeadButton } from "@/components/leads/save-lead-button";
import { useWebsiteChecks } from "@/hooks/use-website-analysis";
import type { WebsiteChecks } from "@/hooks/use-website-analysis";
import { computeOpportunity } from "@/lib/opportunity";
import { describeOsmDetails } from "@/lib/osm-details";
import { cn } from "@/lib/storage";
import type { Company } from "@/types/company";

interface CompanyTableProps {
  companies: Company[];
  isSaved: (companyId: string) => boolean;
  onToggleSaved: (company: Company) => void;
  caption?: string;
}

function rowInsights(company: Company, checks: WebsiteChecks) {
  const details = describeOsmDetails(company);
  const site = details.websiteKind === "site" ? company.website : null;
  const state = site ? checks.stateFor(site) : undefined;
  const analysis = state?.status === "done" ? state.analysis : null;
  const opportunity = computeOpportunity(company, details, analysis);
  return { details, site, state, analysis, opportunity };
}

function DetailsToggle({ open, onToggle, name }: { open: boolean; onToggle: () => void; name: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={`${open ? "Hide" : "Show"} details for ${name}`}
      className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-accent-ink underline-offset-2 hover:underline"
    >
      {open ? "Hide details" : "Details"}
      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
    </button>
  );
}

const HEADER_CLASS = "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink3";

/**
 * Responsive pitch-research table for real company records: table on
 * desktop, cards on mobile. Shows the pitch opportunity, every known
 * contact, an on-demand website check, and an expandable details panel.
 */
export function CompanyTable({
  companies,
  isSaved,
  onToggleSaved,
  caption,
}: CompanyTableProps) {
  const checks = useWebsiteChecks();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-line-soft bg-raised md:block">
        <table className="w-full min-w-[880px] border-collapse text-left text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className={cn(HEADER_CLASS, "px-5")}>Company</th>
              <th scope="col" className={HEADER_CLASS}>Opportunity</th>
              <th scope="col" className={HEADER_CLASS}>Contact</th>
              <th scope="col" className={HEADER_CLASS}>Website</th>
              <th scope="col" className={cn(HEADER_CLASS, "text-right")}>Action</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => {
              const saved = isSaved(company.id);
              const open = expanded.has(company.id);
              const { details, site, state, analysis, opportunity } = rowInsights(company, checks);
              return (
                <Fragment key={company.id}>
                  <tr
                    className={cn(
                      "align-top transition-colors hover:bg-recessed",
                      open ? "bg-recessed" : "border-b border-line-soft last:border-0",
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-ink">
                          <Building2 className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-ink">{company.name}</span>
                          <span className="block text-xs text-ink3">{company.category}</span>
                          <span className="mt-1 flex items-start gap-1 text-xs text-ink2">
                            <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-ink3" aria-hidden="true" />
                            <span className="line-clamp-2 max-w-52" title={details.address ?? company.locationLabel}>
                              {details.address ?? company.locationLabel}
                            </span>
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <OpportunityCell opportunity={opportunity} />
                    </td>
                    <td className="max-w-64 px-4 py-3.5">
                      <ContactList company={company} details={details} analysis={analysis} />
                    </td>
                    <td className="px-4 py-3.5">
                      <WebsiteCheckCell
                        company={company}
                        details={details}
                        state={state}
                        onCheck={() => site && checks.check(site)}
                        onRecheck={() => site && checks.recheck(site)}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <SaveLeadButton
                          saved={saved}
                          onToggle={() => onToggleSaved(company)}
                          companyName={company.name}
                        />
                        <DetailsToggle open={open} onToggle={() => toggle(company.id)} name={company.name} />
                      </div>
                    </td>
                  </tr>
                  {open ? (
                    <tr className="border-b border-line-soft bg-recessed last:border-0">
                      <td colSpan={5} className="px-5 pb-5 pt-1">
                        <div className="rounded-lg border border-line-soft bg-raised p-4">
                          <LeadDetailsPanel
                            company={company}
                            details={details}
                            opportunity={opportunity}
                            analysis={analysis}
                          />
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {companies.map((company) => {
          const saved = isSaved(company.id);
          const open = expanded.has(company.id);
          const { details, site, state, analysis, opportunity } = rowInsights(company, checks);
          return (
            <li key={company.id}>
              <div className="rounded-xl border border-line-soft bg-raised p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-ink">
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{company.name}</p>
                    <p className="text-xs text-ink3">
                      {company.category} · {details.address ?? company.locationLabel}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <OpportunityCell opportunity={opportunity} />
                </div>
                <div className="mt-3">
                  <ContactList company={company} details={details} analysis={analysis} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <WebsiteCheckCell
                    company={company}
                    details={details}
                    state={state}
                    onCheck={() => site && checks.check(site)}
                    onRecheck={() => site && checks.recheck(site)}
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <SaveLeadButton
                    saved={saved}
                    onToggle={() => onToggleSaved(company)}
                    companyName={company.name}
                  />
                  <DetailsToggle open={open} onToggle={() => toggle(company.id)} name={company.name} />
                </div>
                {open ? (
                  <div className="mt-4 border-t border-line-soft pt-4">
                    <LeadDetailsPanel company={company} details={details} opportunity={opportunity} analysis={analysis} />
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
