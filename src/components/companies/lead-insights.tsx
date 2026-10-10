"use client";

import type { ReactNode } from "react";
import {
  CircleCheck,
  CircleX,
  ExternalLink,
  Flame,
  Globe,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  ScanSearch,
  Search,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CheckState } from "@/hooks/use-website-analysis";
import { isPlausibleEmail, phoneHref, websiteDisplayLabel } from "@/lib/links";
import type { Opportunity } from "@/lib/opportunity";
import { OPPORTUNITY_LEVEL_LABELS } from "@/lib/opportunity";
import type { OsmDetails, SocialLink } from "@/lib/osm-details";
import { SOCIAL_LABELS } from "@/lib/osm-details";
import type { WebsiteAnalysis } from "@/lib/website-analysis";
import { VERDICT_LABELS, websiteVerdict } from "@/lib/website-analysis";
import type { Company } from "@/types/company";

/* ------------------------------------------------------------------ */
/* Research links (plain links — nothing is fetched)                   */
/* ------------------------------------------------------------------ */

export function researchLinks(company: Company): { label: string; href: string }[] {
  const place = [company.name, company.city ?? company.locationLabel].filter(Boolean).join(" ");
  return [
    {
      label: "Google Maps",
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`,
    },
    { label: "Google search", href: `https://www.google.com/search?q=${encodeURIComponent(`"${company.name}" ${company.city ?? ""}`.trim())}` },
    { label: "Facebook search", href: `https://www.facebook.com/search/pages/?q=${encodeURIComponent(place)}` },
  ];
}

function ExternalTextLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-xs text-accent-ink underline-offset-2 hover:underline ${className ?? ""}`}
    >
      {children}
      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Opportunity                                                         */
/* ------------------------------------------------------------------ */

export function OpportunityBadge({ opportunity }: { opportunity: Opportunity }) {
  const tone =
    opportunity.level === "high" ? "success" : opportunity.level === "medium" ? "warning" : opportunity.level === "unknown" ? "info" : "neutral";
  const Icon = opportunity.level === "high" ? Flame : opportunity.level === "medium" ? Wrench : opportunity.level === "unknown" ? ScanSearch : null;
  return (
    <Badge tone={tone} title={opportunity.reasons.join("\n")}>
      {Icon ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
      {OPPORTUNITY_LEVEL_LABELS[opportunity.level]}
    </Badge>
  );
}

export function OpportunityCell({ opportunity }: { opportunity: Opportunity }) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <OpportunityBadge opportunity={opportunity} />
        <span className="text-[13px] font-medium text-ink">{opportunity.label}</span>
      </div>
      <p className="line-clamp-2 max-w-56 text-xs text-ink3" title={opportunity.reasons.join("\n")}>
        {opportunity.reasons[0]}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Contacts                                                            */
/* ------------------------------------------------------------------ */

function SocialChip({ link, fromSite }: { link: SocialLink; fromSite?: boolean }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${link.url}${fromSite ? " (found on the website)" : ""}`}
      className="neu-recessed inline-flex items-center gap-1 rounded-md border border-line-soft bg-recessed px-1.5 py-0.5 text-[11px] font-medium text-ink2 hover:text-ink"
    >
      {link.network === "whatsapp" ? <MessageCircle className="h-3 w-3" aria-hidden="true" /> : null}
      {SOCIAL_LABELS[link.network]}
      {fromSite ? <span className="text-ink3">· site</span> : null}
    </a>
  );
}

function FromSiteTag() {
  return (
    <span className="ml-1 rounded bg-status-info-bg px-1 text-[10px] font-medium text-status-info-fg" title="Found on the business website, not in OpenStreetMap">
      site
    </span>
  );
}

function digitsOf(value: string): string {
  return value.replace(/\D/g, "").slice(-9);
}

/**
 * Every known way to reach the business: OpenStreetMap values first, then
 * extra details discovered on its website (tagged "site").
 */
export function ContactList({
  company,
  details,
  analysis,
}: {
  company: Company;
  details: OsmDetails;
  analysis: WebsiteAnalysis | null;
}) {
  const phoneDigits = new Set(details.phones.map(digitsOf));
  const sitePhones = (analysis?.phones ?? []).filter((phone) => !phoneDigits.has(digitsOf(phone)));
  const knownEmails = new Set(details.emails.map((email) => email.toLowerCase()));
  const siteEmails = (analysis?.emails ?? []).filter((email) => !knownEmails.has(email));
  const knownNetworks = new Set(details.socials.map((social) => social.network));
  const siteSocials = (analysis?.socials ?? []).filter((social) => !knownNetworks.has(social.network));
  const website = details.websiteKind === "site" ? company.website : null;

  const phones = [...details.phones.map((p) => ({ value: p, site: false })), ...sitePhones.map((p) => ({ value: p, site: true }))];
  const emails = [...details.emails.map((e) => ({ value: e, site: false })), ...siteEmails.map((e) => ({ value: e, site: true }))];
  const socials = [...details.socials.map((s) => ({ link: s, site: false })), ...siteSocials.map((s) => ({ link: s, site: true }))];

  if (!website && phones.length === 0 && emails.length === 0 && socials.length === 0) {
    return <p className="text-xs text-ink3">No contact details listed — use the research links.</p>;
  }

  return (
    <ul className="space-y-1 text-[13px]">
      {website ? (
        <li className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 shrink-0 text-ink3" aria-hidden="true" />
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            title={website}
            className="truncate font-medium text-accent-ink underline-offset-2 hover:underline"
          >
            {websiteDisplayLabel(website)}
          </a>
        </li>
      ) : null}
      {phones.map(({ value, site }) => {
        const href = phoneHref(value);
        return (
          <li key={`p-${value}`} className="flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0 text-ink3" aria-hidden="true" />
            {href ? (
              <a href={href} className="text-ink2 hover:text-ink">
                {value}
              </a>
            ) : (
              <span className="text-ink2">{value}</span>
            )}
            {site ? <FromSiteTag /> : null}
          </li>
        );
      })}
      {emails.map(({ value, site }) => (
        <li key={`e-${value}`} className="flex min-w-0 items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 shrink-0 text-ink3" aria-hidden="true" />
          {isPlausibleEmail(value) ? (
            <a href={`mailto:${value}`} className="break-all text-ink2 hover:text-ink">
              {value}
            </a>
          ) : (
            <span className="break-all text-ink2">{value}</span>
          )}
          {site ? <FromSiteTag /> : null}
        </li>
      ))}
      {socials.length > 0 ? (
        <li className="flex flex-wrap gap-1 pt-0.5">
          {socials.map(({ link, site }) => (
            <SocialChip key={`${link.network}-${link.url}`} link={link} fromSite={site} />
          ))}
        </li>
      ) : null}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Website check                                                       */
/* ------------------------------------------------------------------ */

function Check({ ok, label, title }: { ok: boolean | null; label: string; title?: string }) {
  if (ok === null) return null;
  const Icon = ok ? CircleCheck : CircleX;
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${ok ? "text-status-success-fg" : "text-status-warning-fg"}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}

function verdictTone(analysis: WebsiteAnalysis): "success" | "warning" | "neutral" {
  const verdict = websiteVerdict(analysis);
  if (verdict === "modern") return "neutral";
  if (verdict === "needs-work") return "warning";
  return "success"; // down / outdated = strong pitch
}

export function WebsiteCheckCell({
  company,
  details,
  state,
  onCheck,
  onRecheck,
}: {
  company: Company;
  details: OsmDetails;
  state: CheckState | undefined;
  onCheck: () => void;
  onRecheck: () => void;
}) {
  if (details.websiteKind !== "site") {
    const [maps, search] = researchLinks(company);
    return (
      <div className="space-y-1">
        <p className="text-xs text-ink3">
          {details.websiteKind === "none" ? "No website listed" : "Social page only — no site to check"}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink3">
          Verify:
          <ExternalTextLink href={search.href}>Google</ExternalTextLink>
          <ExternalTextLink href={maps.href}>Maps</ExternalTextLink>
        </p>
      </div>
    );
  }
  if (!state) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={onCheck} aria-label={`Check the website of ${company.name}`}>
        <ScanSearch className="h-3.5 w-3.5" aria-hidden="true" />
        Check site
      </Button>
    );
  }
  if (state.status === "queued" || state.status === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ink3" role="status">
        <Loader2 className={`h-3.5 w-3.5 ${state.status === "running" ? "animate-spin" : ""}`} aria-hidden="true" />
        {state.status === "running" ? "Checking…" : "Queued"}
      </span>
    );
  }
  if (state.status === "error") {
    return (
      <div className="space-y-1">
        <p className="max-w-48 text-xs text-status-warning-fg">{state.message}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onRecheck}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </Button>
      </div>
    );
  }
  const analysis = state.analysis;
  return (
    <div className="space-y-1.5">
      <Badge tone={verdictTone(analysis)} title={analysis.issues.map((issue) => issue.label).join("\n") || "No issues found"}>
        {VERDICT_LABELS[websiteVerdict(analysis)]}
      </Badge>
      {analysis.status === "ok" ? (
        <div className="flex max-w-52 flex-wrap gap-x-2 gap-y-0.5">
          <Check ok={analysis.https === "unknown" ? null : analysis.https === "yes"} label="HTTPS" title="Whether the https:// address loads" />
          <Check ok={analysis.mobileFriendly} label="Mobile" title="Responsive viewport declared" />
          {analysis.copyrightYear ? (
            <span className="text-[11px] text-ink3" title="Latest copyright year on the homepage">
              © {analysis.copyrightYear}
            </span>
          ) : null}
          {analysis.platform ? <span className="text-[11px] text-ink3">{analysis.platform}</span> : null}
        </div>
      ) : (
        <p className="max-w-48 text-xs text-ink3">{analysis.error}</p>
      )}
      <button
        type="button"
        onClick={onRecheck}
        className="cursor-pointer text-[11px] text-ink3 underline-offset-2 hover:text-ink hover:underline"
        title={`Checked ${analysis.analyzedAt.slice(0, 10)}`}
      >
        Recheck
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Expanded details                                                    */
/* ------------------------------------------------------------------ */

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 py-0.5">
      <dt className="text-xs text-ink3">{label}</dt>
      <dd className="min-w-0 break-words text-xs text-ink2">{children}</dd>
    </div>
  );
}

export function LeadDetailsPanel({
  company,
  details,
  opportunity,
  analysis,
}: {
  company: Company;
  details: OsmDetails;
  opportunity: Opportunity;
  analysis: WebsiteAnalysis | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <section>
        <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink3">Why pitch</h4>
        <div className="mb-2 flex items-center gap-1.5">
          <OpportunityBadge opportunity={opportunity} />
          <span className="text-[13px] font-medium text-ink">{opportunity.label}</span>
        </div>
        <ul className="list-disc space-y-1 pl-4 text-xs text-ink2">
          {opportunity.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {researchLinks(company).map((link) => (
            <ExternalTextLink key={link.label} href={link.href}>
              {link.label === "Google Maps" ? <MapPin className="h-3 w-3" aria-hidden="true" /> : <Search className="h-3 w-3" aria-hidden="true" />}
              {link.label}
            </ExternalTextLink>
          ))}
        </div>
      </section>

      <section>
        <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink3">Business (OpenStreetMap)</h4>
        <dl>
          <DetailRow label="Address">{details.address ?? "Not listed"}</DetailRow>
          <DetailRow label="Category">{company.category}</DetailRow>
          {details.cuisine ? <DetailRow label="Cuisine">{details.cuisine}</DetailRow> : null}
          <DetailRow label="Opening hours">{company.openingHours ?? "Not listed"}</DetailRow>
          {details.description ? <DetailRow label="Description">{details.description}</DetailRow> : null}
          {details.brand ? <DetailRow label="Brand / chain">{details.brand}</DetailRow> : null}
          <DetailRow label="Last verified">{details.lastChecked ?? "Unknown"}</DetailRow>
          {company.lat !== null && company.lon !== null ? (
            <DetailRow label="Coordinates">
              {company.lat.toFixed(5)}, {company.lon.toFixed(5)}
            </DetailRow>
          ) : null}
          {company.sourceUrl ? (
            <DetailRow label="Source">
              <ExternalTextLink href={company.sourceUrl}>OpenStreetMap record</ExternalTextLink>
            </DetailRow>
          ) : null}
        </dl>
      </section>

      <section>
        <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink3">Website check</h4>
        {analysis ? (
          <dl>
            <DetailRow label="Verdict">{VERDICT_LABELS[websiteVerdict(analysis)]}</DetailRow>
            <DetailRow label="Checked">
              {analysis.analyzedAt.slice(0, 10)} · {analysis.url}
            </DetailRow>
            {analysis.title ? <DetailRow label="Title">{analysis.title}</DetailRow> : null}
            {analysis.description ? <DetailRow label="Description">{analysis.description}</DetailRow> : null}
            {analysis.platform ? <DetailRow label="Platform">{analysis.platform}</DetailRow> : null}
            {analysis.status === "ok" ? (
              <>
                <DetailRow label="HTTPS">{analysis.https === "yes" ? "https:// loads" : "https:// does not load"}</DetailRow>
                <DetailRow label="Mobile">{analysis.mobileFriendly ? "Responsive viewport" : "No responsive viewport"}</DetailRow>
                <DetailRow label="Copyright">{analysis.copyrightYear ?? "Not found"}</DetailRow>
              </>
            ) : null}
            <DetailRow label="Issues">
              {analysis.issues.length === 0 ? (
                "None found by the basic checks"
              ) : (
                <ul className="space-y-0.5">
                  {analysis.issues.map((issue) => (
                    <li key={issue.key}>
                      <span className={issue.severity === "major" ? "font-medium text-status-warning-fg" : ""}>
                        {issue.severity === "major" ? "● " : "○ "}
                        {issue.label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </DetailRow>
          </dl>
        ) : (
          <p className="text-xs text-ink3">
            {details.websiteKind === "site"
              ? "Not checked yet. Use “Check site” to load the homepage and look for dated or broken signs."
              : "No website to check."}
          </p>
        )}
      </section>
    </div>
  );
}
