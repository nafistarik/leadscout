import { describeOsmDetails } from "@/lib/osm-details";
import type { Company } from "@/types/company";

/**
 * One-click narrowing of a result list that is already loaded: no new
 * search, so it is instant for prepared cities and live ones alike.
 */
export const QUICK_FILTERS = ["hasPhone", "noWebsite", "hideSaved"] as const;
export type QuickFilter = (typeof QUICK_FILTERS)[number];

export const QUICK_FILTER_LABELS: Record<QuickFilter, string> = {
  hasPhone: "Has phone",
  noWebsite: "No website",
  hideSaved: "Hide saved",
};

/**
 * Keeps the companies that pass every active filter, in their current order.
 * "No website" means no real site listed and none implied by a business
 * email domain, so a likely-website lead is not offered as a sure thing.
 *
 * @param isSaved Whether a company is already in Saved Leads.
 */
export function applyQuickFilters(
  companies: Company[],
  active: ReadonlySet<QuickFilter>,
  isSaved: (companyId: string) => boolean,
): Company[] {
  if (active.size === 0) return companies;
  return companies.filter((company) => {
    const details = describeOsmDetails(company);
    if (active.has("hasPhone") && details.phones.length === 0) return false;
    if (active.has("noWebsite") && (details.websiteKind === "site" || details.likelyWebsite)) return false;
    if (active.has("hideSaved") && isSaved(company.id)) return false;
    return true;
  });
}
