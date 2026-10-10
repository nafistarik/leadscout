# LeadScout

LeadScout is a frontend-only web app that helps freelance web developers discover potential business clients. Search real businesses through OpenStreetMap data, or explore a built-in labeled demo dataset. Save promising leads, organize them into lists, track research with statuses and notes, and export everything as CSV.

There is no backend, no database, no account system, and no paid API. All user data stays in the browser's local storage on the current device.

## Technology stack

- **Framework/language:** Next.js 16 (App Router) + React 19 + TypeScript (strict)
- **Styling/UI:** Tailwind CSS v4 with a centralized Neumorphic design-token system (`src/app/globals.css`), Lucide icons
- **State/persistence:** React client state + versioned `localStorage` envelopes (no sync across devices)
- **Search providers:** Nominatim (geocoding) + Overpass API (OpenStreetMap business data); deterministic local filtering for demo data
- **Testing:** `bun test` (22 suites, 181 tests; pure unit/integration tests, no browser harness)

## Requirements and setup

- Runtime: [Bun](https://bun.sh/) 1.4.x (see `packageManager` in `package.json`; Node 22 also works for `next` commands)
- Package manager: **Bun** — the lockfile is `bun.lock`; do not mix in npm/yarn/pnpm installs

```bash
bun install     # install dependencies
bun dev         # start the development server (http://localhost:3000)
bun typecheck   # TypeScript check (tsc --noEmit)
bun lint        # lint (eslint)
bun test        # run the test suite
bun run build   # production build
```

Only the scripts listed under `"scripts"` in `package.json` exist: `dev`, `build`, `start`, `lint`, `test`, `typecheck`.

## Environment variables

None. The application uses **no environment variables** — there is no `.env` file and none is needed. Provider endpoints are public, keyless URLs compiled into `src/lib/providers/`. Do not add secrets to the repository; nothing in the app can consume them.

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Dashboard: demo metrics, recent demo leads, saved live leads, sample activity |
| `/find-companies` | Company discovery — Live OpenStreetMap search and Demo dataset modes, filters, sorting, saved search setups, result export |
| `/saved-leads` | Saved demo + live records, status filter, research panels, CSV export |
| `/lists` | Named lead lists with member management (local only, plus one read-only sample list) |
| `/settings` | Theme preference, data-source info, local-data reset |

## Search workflow

- **Demo mode** filters the built-in 12-record fictional dataset locally. No network requests are made. Every demo record, metric, and activity item is badged as sample data.
- **Live mode** resolves the entered city/country to a bounding box via Nominatim, then queries the Overpass API, trying public instances strictly in sequence (`overpass.private.coffee`, `overpass-api.de`, `overpass.kumi.systems`; at most 4 attempts within a 25 s budget; a 429 stops Overpass immediately). `overpass-api.de` blocks requests from `*.vercel.app`/`*.netlify.app` pages (HTTP 406), so it is skipped there. If every Overpass attempt fails, the search falls back to Nominatim's category search (`q=[amenity=cafe]` in the bounded area; ≤3 requests throttled to 1/s, ≤40 places each, no generic shop/office/craft coverage) and the results show a coverage note. Results are normalized, deduplicated, and capped (`maxResults`, server fetch capped at 100).
- **Pitch research table:** every live result shows a *pitch opportunity* (High: no website, social page only, or a down/outdated site; Medium: site needs work; Low: modern site or a chain brand), all contacts from OSM tags (every phone, email, social profile, full address), and an expandable details panel with Google Maps / Google / Facebook research links. *Pitch focus* filters (Hot leads, No website, Social only, Site has issues, Not checked) and a "Best pitch opportunity first" sort apply locally.
- **Website checks** run only on request ("Check site" / "Check N websites"): each homepage is loaded through the free, keyless Jina Reader (`r.jina.ai`, ~20 requests/min, one at a time; the site address is shared with Jina AI) and analyzed for HTTPS, a responsive viewport, the latest copyright year, platform/CMS version, dated tech (old WordPress/jQuery, Flash, obsolete tags), parked/error pages, and missing SEO basics. Emails, phones, and social links found on the site are added to the contact list (tagged "site"). Results are cached in `localStorage` for 14 days and included in CSV exports. Signals are heuristics, not proof.
- Refine panel filters (website/phone/email/opening-hours presence, minimum fit score) and sorting apply **client-side to fetched results only** — they never trigger new requests. A "Narrowed locally" indicator and "Showing N of M" counts make this explicit; result sets are never claimed to be exhaustive.
- Searches share results through a 10-minute in-memory cache (50-entry cap) keyed by normalized provider parameters; simultaneous identical searches share one in-flight request. Aborted requests settle silently; failures never poison the cache.
- Location searches require a city/region; areas over 50,000 km² are refused with guidance to narrow the area.
- Attribution: © OpenStreetMap contributors, linked wherever live data appears, per provider policy.

## Data persistence

Stored in `localStorage` under versioned `leadscout.*` keys (see `STORAGE_KEYS` in `src/lib/storage.ts`):

- Saved leads (v2 envelope; legacy v1 id arrays migrate automatically)
- Lead lists, search presets, per-lead workflow metadata (status, notes, next action, follow-up date, last-reviewed timestamp)
- Theme preference and a 30-day/50-entry Nominatim geocode cache

All data is **browser-local**: it does not sync across devices and is lost if browser storage is cleared. Corrupt entries are dropped by validation rather than crashing pages. Cross-tab updates propagate through storage events. Unsaving a lead keeps its research notes/status (restored on re-save); Settings → Reset local data clears everything after confirmation.

## Scoring and qualification

- **Fit score (0–100, heuristic only):** website 30, phone 20, category match 15, email 15, opening hours 10, city-from-tags 10. Bands: 70+ Strong info, 40+ Partial info, below Basic listing. It measures mapped-data completeness — **not** revenue, intent, or likelihood to convert.
- **Qualification checklist** reports each signal as Present/Unknown; "Unknown" explicitly means unmapped/unlisted, never evidence against the business.
- **Lead status** (Unreviewed/Researching/Qualified/Not a fit/Ready for outreach) is assigned only by the user, never inferred.

## Export

CSV (UTF-8 with BOM, RFC 4180 quoting, formula-injection guard, temporary download URLs revoked after use):

- **Saved-leads page:** all saved leads — identity, contacts, coordinates, source, saved-at, fit score, available details, status, next action, follow-up, and notes columns. Filename: `leadscout-leads-YYYYMMDD-HHmm.csv`.
- **Find Companies:** exactly the currently displayed filtered results (live or demo) — same columns, blank saved-at; live exports include fit scores. Filename: `leadscout-search-YYYYMMDD-HHmm.csv`.
- Missing values export as blank fields. Nothing is ever sent to an external service.

## Troubleshooting

- **Build fails:** run `bun install` first (Bun-only lockfile), then `bun typecheck` for the exact error.
- **Saved leads/lists disappeared:** browser storage was cleared, a different browser/profile is in use, or private mode is blocking writes (the app shows a warning banner in that case).
- **Live search fails:** public Overpass/Nominatim instances rate-limit and have outages. Wait a minute and use Retry; narrow to a smaller city on timeouts; check the error kind shown (rate-limit vs timeout vs place-not-found). Demo mode always works offline.
- **Stale UI after another tab changed data:** the app syncs over storage events; a refresh reconciles any missed update.
- **Hydration warnings in dev:** storage-backed components render server-safe fallbacks; warnings about `localStorage` during prerender indicate a genuine bug — report it.

## Known limitations

- Live Overpass requests have **not been verified from every network** (sandboxed CI environments block `overpass-api.de`); Nominatim resolution is verified. Live search depends on public-service availability and community mapping coverage, which varies widely by area. One full live search (Berlin bakeries → 10 deduplicated results with scores, attribution, save, and snapshot persistence) was verified in-browser when the sandbox path was reachable.
- No automated browser (E2E) tests are committed — interaction behavior is covered by unit/integration tests plus CDP-driven browser verification runs (see release checklist).
- Follow-up "due" states evaluate at render time (no background timers by design).
- Large result sets are capped for public-API friendliness; exports cover displayed results, not unbounded queries.
- With browser storage fully disabled, a storage warning renders client-only; the app degrades gracefully but React may log a hydration notice in development (production behavior unaffected; verified the main settings counts path is hydration-clean).

## Release checklist

- [x] `bun typecheck` — passing (strict, zero errors)
- [x] `bun lint` — passing (zero errors/warnings)
- [x] `bun test` — 156 pass / 0 fail across 20 files
- [x] `bun run build` — succeeds, all 5 routes prerender static
- [x] Browser pass via CDP-driven headless Chrome against the dev server: all 5 routes render with zero app console errors; demo search → save → reload persistence → saved-leads display; list create + add-to-list membership; saved CSV download verified byte-level (header, BOM, saved record); theme toggle persists; live error states with retry; 390px viewport with zero horizontal overflow; back-button restores mode/form/results
- [x] Live provider check: Nominatim verified (HTTP 200); full Overpass searches verified live in-browser (Berlin bakeries → 10 deduplicated results; Dhaka dental clinics → 10 real records with names/coords/phones, OSM links, scores, live save + snapshot persistence + scoped CSV export). Sandbox egress is intermittent (406 stalls/timeouts) — the app surfaces typed errors with retry in all observed cases
- [x] Acceptance re-verification (current build): settings hydration defect fixed and confirmed clean across repeated loads; unsave removes rows; list add/rename-entry/membership verified; back-button restores mode/form/results; invalid location yields fast, correct "Place not found" with no retry trap
- [ ] Owner deploys: `bun install && bun run build` on Vercel (no env vars to configure), then smoke-tests the deployed URL
