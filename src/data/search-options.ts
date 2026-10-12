/**
 * Fixed option lists for live company search. Country selection uses the
 * complete ISO dataset (`data/countries.ts`); business categories live in
 * the dedicated dataset (`data/categories.ts`); city stays free text.
 */

export const MAX_RESULTS_OPTIONS = [5, 10, 25, 50] as const;

/** Result-limit options for the shared Select (values stay numeric strings). */
export const MAX_RESULTS_SELECT_OPTIONS: { value: string; label: string }[] =
  MAX_RESULTS_OPTIONS.map((option) => ({ value: String(option), label: `Up to ${option}` }));

// Re-exported so existing validation (`search-params.ts`) and tests keep a
// single import site; the datasets own the source of truth.
export { CATEGORY_OPTIONS, LIVE_CATEGORIES } from "@/data/categories";
