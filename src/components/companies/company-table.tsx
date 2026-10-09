"use client";

import type { ReactNode } from "react";
import { Building2, ExternalLink } from "lucide-react";
import { ScoreBadge } from "@/components/companies/score-badge";
import { CompletenessMeter } from "@/components/companies/completeness-meter";
import { SaveLeadButton } from "@/components/leads/save-lead-button";
import { Badge } from "@/components/ui/badge";
import { OsmSourceBadge } from "@/components/osm-attribution";
import { isPlausibleEmail, normalizeWebsiteUrl, phoneHref, websiteDisplayLabel } from "@/lib/links";
import type { LeadScore } from "@/lib/scoring";
import type { Company } from "@/types/company";

interface CompanyTableProps {
  companies: Company[];
  isSaved: (companyId: string) => boolean;
  onToggleSaved: (company: Company) => void;
  /** When provided, a Fit column with heuristic scores is shown. */
  getScore?: (company: Company) => LeadScore;
  /** Extra per-row actions (e.g. add-to-list on the Saved Leads page). */
  extraActions?: (company: Company) => ReactNode;
  caption?: string;
}

function ContactCell({ company }: { company: Company }) {
  const hasAny = company.website || company.phone || company.email;
  if (!hasAny) {
    return (
      <>
        <Badge tone="neutral">Not available</Badge>
        <CompletenessMeter company={company} />
      </>
    );
  }
  const safeWebsite = normalizeWebsiteUrl(company.website);
  const telHref = phoneHref(company.phone);
  const emailOk = isPlausibleEmail(company.email);
  return (
    <>
    <ul className="space-y-1 text-[13px]">
      {company.website ? (
        <li>
          {safeWebsite ? (
            <a
              href={safeWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-44 items-center gap-1 font-medium text-accent-ink underline-offset-2 hover:underline"
              title={company.website}
            >
              <span className="truncate">{websiteDisplayLabel(safeWebsite)}</span>
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
            </a>
          ) : (
            // Unsafe protocol: show as inert text, never as a link.
            <span className="break-all text-ink2">{company.website}</span>
          )}
        </li>
      ) : null}
      {company.phone ? (
        <li>
          {telHref ? (
            <a href={telHref} className="text-ink2">
              {company.phone}
            </a>
          ) : (
            <span className="text-ink2">{company.phone}</span>
          )}
        </li>
      ) : null}
      {company.email ? (
        <li>
          {emailOk ? (
            <a
              href={`mailto:${company.email.trim()}`}
              className="break-all text-ink2"
            >
              {company.email}
            </a>
          ) : (
            <span className="break-all text-ink2">{company.email}</span>
          )}
        </li>
      ) : null}
    </ul>
    <CompletenessMeter company={company} />
    </>
  );
}

function SourceCell({ company }: { company: Company }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <OsmSourceBadge />
      {company.sourceUrl ? (
        <a
          href={company.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${company.name} on OpenStreetMap (opens in a new tab)`}
          className="inline-flex items-center gap-1 text-xs text-ink3 hover:text-accent-hover"
        >
          View record
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      ) : null}
    </div>
  );
}

/**
 * Responsive display for real company records: table on desktop, cards on
 * mobile. Only source-provided values are shown; missing fields render as
 * "Not available" and are never invented.
 */
export function CompanyTable({
  companies,
  isSaved,
  onToggleSaved,
  getScore,
  extraActions,
  caption,
}: CompanyTableProps) {
  return (
    <div>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-line-soft bg-raised md:block">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink3">
                Company
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink3">
                Location
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink3">
                Contact (source-provided)
              </th>
              <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink3">
                Source
              </th>
              {getScore ? (
                <th scope="col" className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink3">
                  Fit
                </th>
              ) : null}
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink3">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => {
              const saved = isSaved(company.id);
              return (
                <tr
                  key={company.id}
                  className="border-b border-line-soft align-top transition-colors last:border-0 hover:bg-recessed"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-ink">
                        <Building2 className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block font-medium text-ink">
                          {company.name}
                        </span>
                        <span className="block text-xs text-ink3">
                          {company.category}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-ink2">
                    <span className="block">{company.locationLabel}</span>
                    {company.lat !== null && company.lon !== null ? (
                      <span className="block text-xs text-ink3">
                        {company.lat.toFixed(4)}, {company.lon.toFixed(4)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3.5">
                    <ContactCell company={company} />
                  </td>
                  <td className="px-4 py-3.5">
                    <SourceCell company={company} />
                  </td>
                  {getScore ? (
                    <td className="px-4 py-3.5">
                      <ScoreBadge score={getScore(company)} />
                    </td>
                  ) : null}
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex flex-col items-end gap-2">
                      <SaveLeadButton
                        saved={saved}
                        onToggle={() => onToggleSaved(company)}
                        companyName={company.name}
                      />
                      {extraActions ? extraActions(company) : null}
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
        {companies.map((company) => {
          const saved = isSaved(company.id);
          return (
            <li key={company.id}>
              <div className="rounded-xl border border-line-soft bg-raised p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-ink">
                      <Building2 className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-medium text-ink">{company.name}</p>
                      <p className="text-xs text-ink3">
                        {company.category} · {company.locationLabel}
                      </p>
                    </div>
                  </div>
                  <OsmSourceBadge />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <ContactCell company={company} />
                  {getScore ? <ScoreBadge score={getScore(company)} /> : null}
                </div>
                {company.sourceUrl ? (
                  <a
                    href={company.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-ink3 hover:text-accent-hover"
                  >
                    View record on OpenStreetMap
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <SaveLeadButton
                    saved={saved}
                    onToggle={() => onToggleSaved(company)}
                    companyName={company.name}
                  />
                  {extraActions ? extraActions(company) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
