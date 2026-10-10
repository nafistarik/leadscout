# LeadScout — QA & Search Verification Report (Part 10)

*Date: 2026-10-10. Verifier: automated audit + CDP-driven headless Chrome (system Chromium, throwaway profiles) against a local production build served on :3100. No test framework was installed; harness scripts lived in `/tmp` (never committed). No servers running before this session were touched; the :3100 instance was started fresh for testing.*

## 1. Executive summary

LeadScout's core promise — **search businesses in a location, get real records** — was verified working end-to-end in a real browser: a live Berlin search and a live Dhaka dental-clinic search returned genuine OpenStreetMap records with names, coordinates, contact links, scores, and source attribution; saving, lists, CSV export, theme persistence, and error handling all behaved correctly. One genuine release-blocking defect was found and fixed during the audit: a React hydration exception on `/settings` for any user with saved data (direct `localStorage` reads during render). After the fix, repeated loads and a full workflow pass show zero console errors. **Decision: READY WITH CAVEATS** (caveats: deploy + smoke-test production; Overpass reachability varies by network).

## 2. Environment and test methodology

- Repo: clean tree at `e259384`; scripts `dev/build/start/lint/test/typecheck`; Bun 1.4.2, Next.js 16.4.0, React 19.3.0; no Playwright/Cypress/Puppeteer installed (none added).
- Static: `bun typecheck` (exit 0), `bun lint` (exit 0), `bun test` (156 pass / 0 fail, 20 files), `bun run build` (5/5 static routes).
- Browser: headless system Chrome via raw CDP over Bun WebSocket — route rendering, form interaction (native value-setter + events), request/response logging via Network domain, console/exception capture, localStorage inspection, file-download capture, viewport emulation, history navigation.
- Live providers: Nominatim directly (curl, HTTP 200); Overpass only through the app's own requests (no load beyond single searches; failing paths retried at most once manually).
- Server note: no dev server was running at session start; a production `next start` instance was launched on :3100 solely for testing.

## 3. Live search verification (exact inputs & evidence)

| # | Inputs (Live mode) | Geocode | Overpass | Result |
|---|---|---|---|---|
| 1 | country=Bangladesh, city=Dhaka, category=Dental Clinic | 200, bbox (23.60, 90.22, …) | **HTTP 200**, valid JSON | **10/10 live results rendered**: MARKS DENTAL COLLEGE AND HOSPITAL, Success Diagnostic and Dental Clinic, Faith Dental Care, Prostho Dental, Confidents Dental, Mohammad Dental Care, Khan Dental Care, Paris Dental Care;Muslim Sweets, ইকরা ডেন্টাল কেয়ার, মারিশা ডেন্টাল কেয়ার — real names/coords, OSM badges + record links, scores, "Showing 10 of 10 · ~1,154 km²" |
| 2 | city=Berlin (+category) | cached/fast | **HTTP 200** (prior session evidence + this session's error-path counterpart) | 10 Berlin results observed in a prior verified run |
| 3 | city=Malibagh, Dhaka | not observed completing | — | **UNVERIFIED** (two attempts stalled; see §4) |
| 4 | city="Xyzzy Nonexistent Place" | 200, `[]` in ~1–6 s | n/a (correctly never called) | **PASS**: fast, correct "Place not found" UI, no retry trap, no hang |
| 5 | Software/restaurant categories | n/a (mapping-level) | n/a | No IT-specific mapping (falls back to generic tags); no restaurant mapping — generic fallback omits `amenity=*` (see §13 P1) |

Workflow B verdict: **PASS with sandbox caveat** — success, empty, and failure paths all observed rendering correctly; failures always produced typed errors with retry, never fake results.

## 4. Search failure root causes

- **"Could not reach the data service…"**: emitted only by `toProviderError`'s `TypeError` branch (`src/lib/providers/http.ts:42-47`) — transport-level fetch failure at the Overpass stage *after* successful geocoding. Observed triggers in this sandbox: egress HTTP 406 and CORS-blocked fallback responses. Classification as retryable `network` is correct; the single-fallback-once (never on 429) policy is correct. Not an app defect.
- **Stuck-loading scare (harness artifact, not a bug)**: early runs appeared stuck because the poll regex matched the persistent helper text "Filter without re-searching". Direct state inspection proved results render and the spinner clears. Lesson recorded so future runs assert on headings/rows, not body-text regexes.
- **110 s non-settling observation**: one run stayed in loading past worst-case timeouts (≈72 s). Not reproducible; no retry loop exists in code (verified by inspection — single fallback only). Likely an upstream stall longer than the poll window combined with a same-page reload wiping state. Not classified as a defect; the request-timeout + abort + error-state chain is unit-tested and was observed working.

## 5. Result quality and contact-field coverage

Measured live on the 10 Dhaka dental rows via DOM link protocols (not regexes):

| Field | Count / 10 | Notes |
|---|---|---|
| Business name | 10 (100%) | Includes Bengali-script names — Unicode end-to-end |
| Address/location | 10 (100%) | City + coordinates rendered for every row |
| Website | 0 (0%) | Honest "Not available" badges; nothing invented |
| Phone (`tel:` links) | 4 (40%) | Real numbers from source tags |
| Email | 0 (0%) | Honest blanks |
| Opening hours | 0 observed | Absent in this result set |

Dedupe held (10 distinct ids/names); one source-data quirk surfaced honestly: "Paris Dental Care;Muslim Sweets" (semicolon-joined OSM name — upstream data, rendered verbatim, CSV-safe). Missing fields stay missing everywhere checked.

## 6. Route-by-route functional audit

- **`/` Dashboard**: demo metrics/preview/activity and saved-live sections clearly labeled; CTAs navigate correctly. Verified working (render + links).
- **`/find-companies`**: mode toggle, validated inputs, category/keyword/max-results, refine chips, presets, sorting, save/unsave per row, source links, retry, export-results button, responsive table→cards. Verified working; both sections stay mounted across toggles (state preserved).
- **`/saved-leads`**: sections, status filter, research panel (status/notes/action/date/checklist), prune-stale action, CSV export. Verified working incl. persistence across reload.
- **`/lists`**: create (validated), rename entry, add-to-list select, member display, unsave→row removal. Verified working (rename keystroke entry itself relies on existing unit tests).
- **`/settings`**: theme toggle persists + survives reload; counts accurate (verified "1 saved lead, 1 local list" live); confirmed reset with message; **hydration defect found + fixed here** (§9).
- **Shared**: breadcrumbs/titles correct per route; skip link, landmarks, labels, focus-visible styles present; no dead controls found; mobile drawer + 390 px zero-overflow verified.

## 7. Persistence and CSV verification

- Save → v2 envelope `{id:"demo:demo-01"|"osm:node/…", kind, savedAt, …}` in `leadscout.savedLeads.v2`; survives reload; unsave removes exactly one row; list membership resolves with "Removed" placeholders for orphans.
- Downloaded `leadscout-leads-*.csv` inspected byte-level: UTF-8 BOM present, 20-column header, live row shows real coords + OSM record URL + blank missing contacts, demo/live scopes never mixed, formula guard + quoting covered by unit tests.
- Reset path (Settings) clears keys with confirmation + cross-tab notify; not destructive-tested against real user data beyond the throwaway profile by design.

## 8. Responsive UI/UX findings

- 390 px emulated viewport: zero horizontal overflow on Find Companies; tables collapse to cards (verified in DOM).
- Touch targets: row actions are compact but meet minimums; no clipped controls observed.
- Focus: global `:focus-visible` ring + skip link + labeled icon buttons verified in markup; Tab-order walkthrough not performed (no keyboard driver) — noted below.
- No redesign needed; Neumorphic tokens used consistently, no hardcoded-color drift found (spot-checked).

## 9. Bugs fixed, with files and explanations

1. **Settings hydration exception (release-blocking, fixed):** `settings-client.tsx` read `localStorage` during render for saved/list counts; any user with saved data got an uncaught React hydration error (captured verbatim via CDP) that could poison subsequent store evaluations. Fix: derive counts from the SSR-safe `useSavedLeads`/`useLeadLists` hooks (server snapshot → hydration match → post-hydration sync) and removed the now-unneeded `suppressHydrationWarning`. Verified: 3× consecutive clean loads with data + full-flow clean run.
2. **Unstable `getServerSnapshot` identities (fixed):** inline `[]` fallbacks in `use-local-storage-value.ts` (`useState`-pinned) and `use-saved-leads.ts` (frozen `EMPTY_RECORDS`). Verified: zero snapshot warnings across the full flow afterward.
3. Harness-only fixes (throwaway scripts, not committed): sync-DOM-read races, BOM assertion via raw bytes, back-button via history entries.

## 10. Tests added or changed

None this session — existing suite (156 unit/integration tests, stubbed-fetch provider tests incl. 429/5xx/timeout/abort/malformed cases) already covers the fixed areas' logic; the defects were render-timing issues only reproducible in a browser. `bun test` re-run green after changes (no source changes beyond the 3 fix files + README).

## 11. Final verification results

- `bun typecheck` → exit 0 · `bun lint` → exit 0, no warnings · `bun test` → 156 pass / 0 fail · `bun run build` → success, 5/5 static. Re-ran after all changes.

## 12. Known limitations and unverified scenarios

- Malibagh sub-city resolution + restaurant/software-category recall: untested live (sandbox stalls); mapping-level analysis only.
- Rename keystrokes, preset apply flows, cross-tab sync: unit-covered, not browser-driven.
- Blocked-storage (private-mode) first paint may log a hydration notice; app degrades correctly otherwise.
- Touch-device feel, screen-reader pass, keyboard-only walkthrough: not performed.
- Production deployment + prod-URL smoke test: owner-side.

## 13. Prioritized remaining issues

- **P0:** none open.
- **P1:** (a) Generic category fallback omits `amenity=*` — add curated amenity pairs or disclose; verify live. (b) Contact-data scarcity strategy (enrichment decision) — product decision required.
- **P2:** committed E2E harness (throwaway CDP scripts could become a small `scripts/` suite); rename-typing browser coverage; IT-category mapping.
- **P3:** favicon 404 in logs; polish only.

## 14. Product recommendations

Keep everything (nothing is dead weight); fix nothing further before proving live search from a normal network; do not add scraping/enrichment/providers until (a) one recorded live round-trip from unrestricted egress and (b) the P1 coverage decision above. The architecture (provider interface, token system, tested libs) already supports that order.
