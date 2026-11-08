import { describe, expect, test } from "bun:test";
import { applyQuickFilters } from "@/lib/quick-filters";
import type { QuickFilter } from "@/lib/quick-filters";
import type { Company } from "@/types/company";

function company(id: string, website: string | null, tags: Record<string, string>): Company {
  return {
    id,
    provenance: "overture",
    name: id,
    category: "Dental Clinic",
    city: "Dhaka",
    country: "Bangladesh",
    locationLabel: "Dhaka, Bangladesh",
    lat: null,
    lon: null,
    website,
    phone: tags.phone ?? null,
    email: tags.email ?? null,
    openingHours: null,
    source: "Overture Maps",
    sourceUrl: null,
    tags: { name: id, ...(website ? { website } : {}), ...tags },
  };
}

const LEADS = [
  company("phone-no-site", null, { phone: "+8801711000000" }),
  company("site", "https://site.example", { phone: "+8801711000001" }),
  company("email-domain", null, { email: "hi@their-shop.com" }),
  company("nothing", null, {}),
];
const ids = (list: Company[]) => list.map((lead) => lead.id);
const none = () => false;

describe("applyQuickFilters", () => {
  test("no active filter returns the list untouched", () => {
    expect(applyQuickFilters(LEADS, new Set(), none)).toBe(LEADS);
  });

  test("has phone", () => {
    expect(ids(applyQuickFilters(LEADS, new Set<QuickFilter>(["hasPhone"]), none))).toEqual(["phone-no-site", "site"]);
  });

  test("no website excludes listed sites and sites implied by a business email", () => {
    expect(ids(applyQuickFilters(LEADS, new Set<QuickFilter>(["noWebsite"]), none))).toEqual(["phone-no-site", "nothing"]);
  });

  test("hide saved, combined with other filters", () => {
    const saved = (id: string) => id === "phone-no-site";
    expect(ids(applyQuickFilters(LEADS, new Set<QuickFilter>(["hideSaved"]), saved))).toEqual(["site", "email-domain", "nothing"]);
    expect(ids(applyQuickFilters(LEADS, new Set<QuickFilter>(["hasPhone", "hideSaved"]), saved))).toEqual(["site"]);
  });
});
