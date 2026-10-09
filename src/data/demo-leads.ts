import type { ActivityEvent, DemoLead, LeadList } from "@/types/lead";

/**
 * Centralized demo dataset for Part 1.
 *
 * Every record is fictional and explicitly labeled as demo/sample data in the UI.
 * No contact details (emails, phone numbers, URLs) are included — only
 * availability flags, so the UI can never present fabricated contact info
 * as verified data.
 */
export const DEMO_LEADS: DemoLead[] = [
  { id: "demo-01", companyName: "Harbor & Pine Bakery", category: "Bakery", city: "Hamburg", country: "Germany", websiteAvailable: false, phoneAvailable: true },
  { id: "demo-02", companyName: "Nordlicht Dental Studio", category: "Dental Clinic", city: "Berlin", country: "Germany", websiteAvailable: true, phoneAvailable: false },
  { id: "demo-03", companyName: "Cedar Line Bicycle Co.", category: "Bicycle Shop", city: "Austin", country: "United States", websiteAvailable: true, phoneAvailable: true },
  { id: "demo-04", companyName: "Juniper Cowork Collective", category: "Coworking Space", city: "London", country: "United Kingdom", websiteAvailable: true, phoneAvailable: false },
  { id: "demo-05", companyName: "Marigold & Stem Florist", category: "Florist", city: "Munich", country: "Germany", websiteAvailable: false, phoneAvailable: false },
  { id: "demo-06", companyName: "Copper Mug Roasters", category: "Coffee Roaster", city: "Portland", country: "United States", websiteAvailable: true, phoneAvailable: true },
  { id: "demo-07", companyName: "Stillwater Yoga Studio", category: "Yoga Studio", city: "Bristol", country: "United Kingdom", websiteAvailable: false, phoneAvailable: true },
  { id: "demo-08", companyName: "Foxglove Books", category: "Bookstore", city: "Edinburgh", country: "United Kingdom", websiteAvailable: true, phoneAvailable: false },
  { id: "demo-09", companyName: "Alder & Oak Landscaping", category: "Landscaping", city: "Denver", country: "United States", websiteAvailable: false, phoneAvailable: true },
  { id: "demo-10", companyName: "Beacon Hill Plumbing", category: "Plumber", city: "Boston", country: "United States", websiteAvailable: false, phoneAvailable: false },
  { id: "demo-11", companyName: "Lindenhof Physiotherapy", category: "Physiotherapy", city: "Cologne", country: "Germany", websiteAvailable: true, phoneAvailable: true },
  { id: "demo-12", companyName: "Wren & Willow Interiors", category: "Interior Design", city: "Manchester", country: "United Kingdom", websiteAvailable: true, phoneAvailable: false },
];

export const DEMO_COUNTRIES: string[] = Array.from(
  new Set(DEMO_LEADS.map((lead) => lead.country)),
).sort();

export const DEMO_CATEGORIES: string[] = Array.from(
  new Set(DEMO_LEADS.map((lead) => lead.category)),
).sort();

export const DEMO_CITIES: string[] = Array.from(
  new Set(DEMO_LEADS.map((lead) => lead.city)),
).sort();

export function getLeadById(id: string): DemoLead | undefined {
  return DEMO_LEADS.find((lead) => lead.id === id);
}

export const SAMPLE_LIST: LeadList = {
  id: "sample-list-berlin-cafes",
  name: "Sample: Berlin service businesses",
  createdAt: "2026-01-15T10:00:00.000Z",
  leadIds: ["demo-02", "demo-01"],
  isSample: true,
};

export const SAMPLE_ACTIVITY: ActivityEvent[] = [
  {
    id: "sample-activity-1",
    title: "Sample event: demo lead saved",
    detail: "In the live product, saving a lead will appear here.",
    timestamp: "Sample timestamp",
  },
  {
    id: "sample-activity-2",
    title: "Sample event: demo list created",
    detail: "In the live product, list activity will appear here.",
    timestamp: "Sample timestamp",
  },
  {
    id: "sample-activity-3",
    title: "Sample event: demo search run",
    detail: "In the live product, recent searches will appear here.",
    timestamp: "Sample timestamp",
  },
];

export const MAX_RESULTS_OPTIONS = [5, 10, 25, 50] as const;
