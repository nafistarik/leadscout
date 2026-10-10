import { DEMO_CATEGORIES } from "@/data/demo-leads";

/**
 * Country suggestions for live search. Free text is accepted — this list only
 * seeds the datalist so users get fast, correctly spelled options.
 */export const LIVE_COUNTRY_SUGGESTIONS: string[] = [
  "Germany",
  "United States",
  "United Kingdom",
  "France",
  "Netherlands",
  "Spain",
  "Italy",
  "Austria",
  "Switzerland",
  "Belgium",
  "Poland",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Ireland",
  "Portugal",
  "Czech Republic",
  "Hungary",
  "Greece",
  "Canada",
  "Australia",
  "New Zealand",
  "India",
  "Japan",
  "Brazil",
  "Mexico",
  "South Africa",
  "United Arab Emirates",
  "Singapore",
];

/**
 * Categories offered by live search: every demo category plus live-only
 * categories that have OSM tag mappings but no fictional demo records.
 * Demo mode keeps using DEMO_CATEGORIES so sample data stays fixed.
 */
export const LIVE_ONLY_CATEGORIES: readonly string[] = ["Coffee Shop", "Restaurant"];

export const LIVE_CATEGORIES: string[] = [...DEMO_CATEGORIES, ...LIVE_ONLY_CATEGORIES].sort();
