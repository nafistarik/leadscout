# LeadScout

LeadScout is a frontend-only web app that helps freelance web developers discover potential business clients. Search real businesses through OpenStreetMap data, inspect their contact details, check their websites, and save promising leads.

There is no backend, no database, no account system, and no paid API. All user data stays in the browser's local storage on the current device.

## Technology stack

- **Framework/language:** Next.js 16 (App Router) + React 19 + TypeScript (strict)
- **Styling/UI:** Tailwind CSS v4 with a centralized Neumorphic design-token system (`src/app/globals.css`), Lucide icons
- **State/persistence:** React client state + versioned `localStorage` envelopes (no sync across devices)
- **Search providers:** Nominatim (geocoding) + Overpass API (OpenStreetMap business data)
- **Testing:** `bun test` (pure unit/integration tests, no browser harness)

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

## Application structure

Three primary pages with a sidebar (plus mobile drawer) and a header carrying the logo and a light/dark theme switch:

| Route | Purpose |
| --- | --- |
| `/` | Dashboard: introduction, four genuine statistics, Recent Searches |
| `/find-companies` | Live OpenStreetMap company search, results table, website checks, saving |
| `/saved-leads` | All saved real businesses with contacts, website checks, CSV export, plus Recent Searches |

Header, main content, and footer share one container (`CONTAINER_CLASS`) so their edges align on every page. The sidebar holds the three destinations plus a Clear-local-data action anchored at the bottom; the header carries the logo and a compact theme switch (track + thumb, no text labels).

There is no Lists or Settings page, no demo data, and no CRM workflow.

## Search workflow

- **Live search** resolves the entered city/country to a bounding box via Nominatim, then queries the Overpass API, trying public instances strictly in sequence (`overpass.private.coffee`, `overpass-api.de`, `overpass.kumi.systems`; at most 4 attempts within a 25 s budget; a 429 stops Overpass immediately). `overpass-api.de` blocks requests from `*.vercel.app`/`*.netlify.app` pages (HTTP 406), so it is skipped there. If every Overpass attempt fails, the search falls back to Nominatim's category search (`q=[amenity=cafe]` in the bounded area; ≤3 requests throttled to 1/s, ≤40 places each, no generic shop/office/craft coverage) and the results show a coverage note. Results are normalized, deduplicated, and capped (`maxResults`, server fetch capped at 100).
- **Results table:** every result shows a *pitch opportunity* (High: no website, social page only, or a down/outdated site; Medium: site needs work; Low: modern site or a chain brand), all contacts from OSM tags (website, phones, emails, social profiles, address), and an expandable details panel with Google Maps / Google / Facebook research links plus full record and website-check details.
- **Website checks** run only on request ("Check site" per row / "Check N websites" bulk): each homepage is loaded through the free, keyless Jina Reader (`r.jina.ai`, ~20 requests/min, one at a time; the site address is shared with Jina AI) and analyzed for HTTPS, a responsive viewport, the latest copyright year, platform/CMS version, dated tech, parked/error pages, and missing SEO basics. Emails, phones, and social links found on the site are added to the contact list (tagged "site"). Results are cached in `localStorage` for 14 days and included in the saved-leads CSV export. Signals are heuristics, not proof.
- Results can be sorted by default provider order or name (A–Z), applied locally.
- **Recent Searches** (on Dashboard and Saved Leads) share one local history. Clicking an entry navigates to Find Companies with a `run=1` URL parameter, which restores the criteria and triggers exactly one live search, then strips the flag so refreshes never re-run.
- Searches share results through a 10-minute in-memory cache (50-entry cap) keyed by normalized provider parameters; simultaneous identical searches share one in-flight request. Aborted requests settle silently; failures never poison the cache.
- Location searches require a city/region; areas over 50,000 km² are refused with guidance to narrow the area.
- Attribution: © OpenStreetMap contributors, linked in the footer and under results, per provider policy.

## Data persistence

Stored in `localStorage` under versioned `leadscout.*` keys (see `STORAGE_KEYS` in `src/lib/storage.ts`):

- Saved real-company snapshots (v2 envelope; legacy non-company records are dropped by validation)
- Recent search criteria plus lightweight result statistics (result counts and website ids only, never full result sets) — the single source of truth for both Recent Searches and the Dashboard statistics
- Website-check cache (14 days) and Nominatim geocode cache
- Theme preference

All data is **browser-local**: it does not sync across devices and is lost if browser storage is cleared. Corrupt entries are dropped by validation rather than crashing pages. Cross-tab updates propagate through storage events. The sidebar's Clear-local-data action clears saved leads, recent searches, and search statistics after confirmation; theme preference and caches are kept.

## Dashboard statistics

Derived locally from recorded successful searches (see `summarizeSearchStats` in `src/lib/search-history.ts`):

- **Total Searches** — successfully recorded live searches (failures never count).
- **Businesses Found** — cumulative results returned across recorded searches.
- **Businesses with Websites** — unique businesses listing a website (deduplicated by business id across searches).
- **Saved Leads** — current saved real-business count, synced with saved-lead storage.

Searches recorded before statistics existed load as zero — history is never invented. Counts grow as you search.

## Export

Single CSV export for the saved-leads collection (UTF-8 with BOM, RFC 4180 quoting, formula-injection guard, temporary download URLs revoked after use): identity, contacts, coordinates, source, saved-at, pitch opportunity, address, and website-check columns. Filename: `leadscout-leads-YYYYMMDD-HHmm.csv`. Missing values export as blank fields. Nothing is ever sent to an external service.

## Troubleshooting

- **Build fails:** run `bun install` first (Bun-only lockfile), then `bun typecheck` for the exact error.
- **Saved leads disappeared:** browser storage was cleared, a different browser/profile is in use, or private mode is blocking writes (the app shows a warning banner in that case).
- **Live search fails:** public Overpass/Nominatim instances rate-limit and have outages. Wait a minute and use Retry; narrow to a smaller city on timeouts; check the error kind shown (rate-limit vs timeout vs place-not-found).
- **Stale UI after another tab changed data:** the app syncs over storage events; a refresh reconciles any missed update.
- **Hydration warnings in dev:** storage-backed components render server-safe fallbacks; warnings about `localStorage` during prerender indicate a genuine bug — report it.

## Known limitations

- Live Overpass requests have **not been verified from every network** (sandboxed CI environments block `overpass-api.de`); Nominatim resolution is verified. Live search depends on public-service availability and community mapping coverage, which varies widely by area.
- No automated browser (E2E) tests are committed — interaction behavior is covered by unit/integration tests.
- Large result sets are capped for public-API friendliness.
- With browser storage fully disabled, a storage warning renders client-only; the app degrades gracefully but React may log a hydration notice in development (production behavior unaffected).

## Release checklist

- [ ] `bun typecheck` — passing (strict, zero errors)
- [ ] `bun lint` — passing (zero errors/warnings)
- [ ] `bun test` — passing
- [ ] `bun run build` — succeeds, all three routes prerender static
- [ ] Owner deploys: `bun install && bun run build` on Vercel (no env vars to configure), then smoke-tests the deployed URL
