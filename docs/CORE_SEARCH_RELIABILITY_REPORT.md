# Core Search Reliability Report (Zero-Cost Constraint)

Date: 2026-10-10. Scope: search-first live discovery on `/find-companies`
(live mode), OSM-only (Nominatim + Overpass), no paid APIs, no backend.

## What was wrong

1. **Category blind spots** — the live category dropdown and the OSM tag
   mapper disagreed: "Coffee Shop" mapped only to `shop=coffee`
   (near-zero hits in Dhaka) instead of `amenity=cafe`; "Restaurant" was
   missing from the dropdown entirely, so restaurant discovery silently
   returned nothing useful.
2. **Brittle network layer** — a single 30s Overpass timeout with no overall
   deadline; stalled response bodies (headers received, body never finishes)
   could hang a search past every timeout; Kumi endpoint failures surfaced
   as raw `TypeError` (CORS) instead of a retryable provider error.
3. **No search memory** — every search started from a blank form; no recent
   searches, no one-click re-run.

## What changed (frontend only, zero cost)

- `src/lib/providers/osm-tags.ts` — `Coffee Shop` now maps to
  `amenity=cafe`; `Restaurant` maps to `amenity=restaurant` +
  `amenity=fast_food`; generic fallback also covers restaurant/cafe/
  fast_food (still bounded — never a wildcard query). New tests in
  `osm-tags.test.ts` (coffee/cafe distinction, restaurant labels,
  fallback boundedness, dental regression).
- `src/data/search-options.ts` + `src/lib/search-params.ts` — added
  `LIVE_CATEGORIES` (now includes `Coffee Shop`, `Restaurant`); live
  dropdown and URL validation both use it, so shared links with the new
  categories restore correctly.
- `src/lib/providers/index.ts` — overall 60s deadline (`OVERALL_TIMEOUT_MS`)
   over the whole run (geocode + queries) via a linked AbortController.
- `src/lib/providers/http.ts` — new `readJsonBody` with a 15s body guard
  (`BODY_TIMEOUT_MS`); wired into `overpass.ts`/`nominatim.ts` so stalled
  bodies fail fast into the endpoint fallback chain. New `http.test.ts`;
  `resilience.test.ts` abort coverage fixed.
- Search history (criteria only, never results; max 10; newest first):
  `src/lib/search-history.ts` (+ tests), `STORAGE_KEYS.searchHistory`
  (`leadscout.searchHistory.v1`), `src/hooks/use-search-history.ts`,
  `HistoryControls` in `refine-controls.tsx` rendered in both live and
  demo refine sections; both submit paths call `recordSearch`; applying an
  entry re-runs a fresh search (never replays stale results).

## Live verification (dev server :3100, headless Chrome via CDP)

| Scenario | Result |
|---|---|
| All-business, Dhaka | 10 rows |
| Coffee Shop, Dhaka | 10 rows (North End Coffee Roasters, Coffee World, …) |
| Coffee Shop, Malibagh, Dhaka | 10 rows (DUCSU Cafeteria, Apon Coffee Shop, …) |
| Dental Clinic, Dhaka | 10 rows (MARKS Dental College, Faith Dental Care, …) |
| Restaurant, Dhaka | 10 rows (Baton Rouge, Pizza Hut, …) |
| Invalid location (`Xyzzy Nonexistent Place`) | Fast, correct "Place not found" (deterministic, 3/3) |
| No-match keyword | Correct "No mapped businesses found" empty state |
| History | Entry recorded in localStorage; "Recent searches" renders it; Clear works |

Two transient upstream failures were observed and retried successfully
(one `Search failed` on dental, one on restaurant; one earlier dental stall
past 120s). Cause: public Overpass/Nominatim flakiness (504s, slow
endpoints), not app logic — the retryable-error UI + Retry button behaved
as designed each time.

## Known limits (no code can fix these without spending money)

- Public Overpass endpoints are rate-limited and occasionally slow/down;
  searches can take 30–120s in bad windows. The UI now always fails fast
  (≤60s overall) with a retryable error instead of hanging.
- OSM coverage varies by area: results are never exhaustive, and contact
  details appear only when the source data provides them. The UI states
  this next to every result set.
- Test-harness note (not a product issue): the CDP debug browser
  accumulates one tab per script unless `/json/close` is called; ~15 stale
  tabs starved the renderer and made clicks appear "dead". Closing stale
  targets restored normal behavior. Real users are unaffected.

## Gates

`bunx tsc --noEmit` clean · `bunx eslint` clean · `bun test`: 176 pass /
0 fail (22 files) · `bun run build`: 5 static routes OK.
