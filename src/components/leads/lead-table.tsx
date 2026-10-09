"use client";

import type { ReactNode } from "react";
import { Building2 } from "lucide-react";
import { AvailabilityBadge, DataStatusBadge } from "@/components/leads/lead-badges";
import { SaveLeadButton } from "@/components/leads/save-lead-button";
import { Card } from "@/components/ui/card";
import type { DemoLead } from "@/types/lead";

interface LeadTableProps {
  leads: DemoLead[];
  isSaved: (id: string) => boolean;
  onToggleSaved: (id: string) => void;
  /** Extra per-row actions (e.g. add-to-list on the Saved Leads page). */
  extraActions?: (lead: DemoLead) => ReactNode;
  caption?: string;
}

/**
 * Responsive lead display: table on desktop, cards on mobile.
 * Marked up with semantic table elements for accessibility.
 */
export function LeadTable({ leads, isSaved, onToggleSaved, extraActions, caption }: LeadTableProps) {
  return (
    <div>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-line-soft bg-raised md:block">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink3">
                Company
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink3">
                Industry
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink3">
                Location
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink3">
                Website
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink3">
                Phone
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink3">
                Data status
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink3">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const saved = isSaved(lead.id);
              return (
                <tr
                  key={lead.id}
                  className="border-b border-line-soft transition-colors last:border-0 hover:bg-recessed"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-ink">
                        <Building2 className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="font-medium text-ink">{lead.companyName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-ink2">{lead.category}</td>
                  <td className="px-4 py-3.5 text-ink2">
                    {lead.city}, {lead.country}
                  </td>
                  <td className="px-4 py-3.5">
                    <AvailabilityBadge available={lead.websiteAvailable} kind="Website" />
                  </td>
                  <td className="px-4 py-3.5">
                    <AvailabilityBadge available={lead.phoneAvailable} kind="Phone" />
                  </td>
                  <td className="px-4 py-3.5">
                    <DataStatusBadge lead={lead} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex flex-col items-end gap-2">
                      <SaveLeadButton saved={saved} onToggle={() => onToggleSaved(lead.id)} companyName={lead.companyName} />
                      {extraActions ? extraActions(lead) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {leads.map((lead) => {
          const saved = isSaved(lead.id);
          return (
            <li key={lead.id}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-ink">
                      <Building2 className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-medium text-ink">{lead.companyName}</p>
                      <p className="text-xs text-ink3">
                        {lead.category} · {lead.city}, {lead.country}
                      </p>
                    </div>
                  </div>
                  <DataStatusBadge lead={lead} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <AvailabilityBadge available={lead.websiteAvailable} kind="Website" />
                  <AvailabilityBadge available={lead.phoneAvailable} kind="Phone" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <SaveLeadButton saved={saved} onToggle={() => onToggleSaved(lead.id)} companyName={lead.companyName} />
                  {extraActions ? extraActions(lead) : null}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
