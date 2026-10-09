"use client";

import { Building2 } from "lucide-react";
import { AvailabilityBadge, DataStatusBadge } from "@/components/leads/lead-badges";
import { SaveLeadButton } from "@/components/leads/save-lead-button";
import { Card } from "@/components/ui/card";
import type { DemoLead } from "@/types/lead";

interface LeadTableProps {
  leads: DemoLead[];
  isSaved: (id: string) => boolean;
  onToggleSaved: (id: string) => void;
  caption?: string;
}

/**
 * Responsive lead display: table on desktop, cards on mobile.
 * Marked up with semantic table elements for accessibility.
 */
export function LeadTable({ leads, isSaved, onToggleSaved, caption }: LeadTableProps) {
  return (
    <div>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white md:block dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Company
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Industry
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Location
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Website
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Phone
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Data status
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
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
                  className="border-b border-zinc-100 transition-colors last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        <Building2 className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">{lead.companyName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-zinc-700 dark:text-zinc-300">{lead.category}</td>
                  <td className="px-4 py-3.5 text-zinc-700 dark:text-zinc-300">
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
                    <SaveLeadButton saved={saved} onToggle={() => onToggleSaved(lead.id)} companyName={lead.companyName} />
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
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      <Building2 className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">{lead.companyName}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
                <div className="mt-4">
                  <SaveLeadButton saved={saved} onToggle={() => onToggleSaved(lead.id)} companyName={lead.companyName} />
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
