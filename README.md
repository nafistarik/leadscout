# LeadScout

LeadScout is a frontend-only web app that helps freelance web developers discover potential business clients. Search real businesses through Overture Maps and OpenStreetMap data, inspect their contact details, check their websites, and save promising leads.

There is no backend, no database, no account system, and no paid API. All user data stays in the browser's local storage on the current device. Prepared city data is a set of static files on a public Hugging Face dataset.

## Technology stack

- **Framework/language:** Next.js 16 (App Router) + React 19 + TypeScript (strict)
- **Styling/UI:** Tailwind CSS v4 with a centralized Neumorphic design-token system (`src/app/globals.css`), Lucide icons
- **State/persistence:** React client state + versioned `localStorage` envelopes (no sync across devices)
- **Search providers:** prepared Overture Maps places on Hugging Face (21 cities) + Nominatim (geocoding) and Overpass API (OpenStreetMap business data) for every other city
- **Data pipeline (laptop only):** DuckDB (`@duckdb/node-api`) and `@huggingface/hub`, both dev dependencies
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

The application uses **no environment variables** — nothing to configure on Vercel. Provider endpoints are public, keyless URLs compiled into `src/lib/providers/`.

Only the data upload script needs one: `HF_TOKEN` in `.env.local` (git-ignored by `.env*`), a fine-grained Hugging Face token with write access to the `nafistarik/leadscout-places` dataset only. Never commit it and never give it a `NEXT_PUBLIC_` prefix.

## Application structure

Three primary pages with a sidebar (plus mobile drawer) and a header carrying the logo and a light/dark theme switch:

| Route | Purpose |
| --- | --- |
| `/` | Dashboard: introduction, your pipeline (follow-ups due, leads by status), four genuine statistics, Recent Searches |
| `/find-companies` | Company search (prepared Overture data or live OpenStreetMap), results table, website checks, saving |
| `/saved-leads` | All saved real businesses with the lead pipeline (status, notes, follow-ups, pitch message), contacts, website checks, CSV export, plus Recent Searches |

Header, main content, and footer share one container (`CONTAINER_CLASS`) so their edges align on every page. The sidebar holds the three destinations plus a Clear-local-data action anchored at the bottom; the header carries the logo and a compact theme switch (track + thumb, no text labels).

There is no Lists or Settings page and no demo data.

## Lead pipeline (Saved Leads)

A personal tracker: LeadScout cannot see your WhatsApp or inbox, so every change is an explicit user action (`src/lib/lead-pipeline.ts`).

- **Status** per lead: New → Contacted → Replied → Proposal sent → Won / Lost, or Not a fit. Lost takes an optional reason (no budget, not interested, never replied, already has a website, other). A filter row above the table counts each status.
- **Notes and follow-up date** in the lead's details panel. Once the date arrives, an open lead shows “Follow-up due” and appears under that filter; Won, Lost and Not a fit never do.
- **Pitch message** (`src/lib/pitch.ts`) built only from what was found: no website, a social page only, or the top website-check issues. Bangla for Bangladeshi leads, English otherwise, switchable and editable. Your name and portfolio link are entered once. WhatsApp (`wa.me`, needs an international number; Bangladeshi `01…` mobiles are converted), Email (`mailto:`) and Copy open your own app; afterwards LeadScout asks “Did you send it?” and only then counts the contact and moves a New lead to Contacted.

## Search workflow

- **Prepared cities** (suggested in the city field; list in `scripts/overture/cities.ts`) are searched from pre-extracted Overture Maps places: the app loads `manifest.json` once per session, then only the gzipped file(s) of the chosen category for that city (largest ~2 MB), filters by category and keyword in the browser, and ranks the best pitch first (no website but reachable). Typical search: ~2 s. Category mapping lives in `src/lib/providers/overture-categories.ts`; “All businesses” searches 10 common client types and says so. If the files cannot be loaded, the search falls back to live OpenStreetMap with a note.
- **Live search** (every other city) resolves the entered city/country to a bounding box via Nominatim, then queries the Overpass API, trying public instances strictly in sequence (`overpass.private.coffee`, `overpass-api.de`, `overpass.kumi.systems`; at most 4 attempts within a 25 s budget; a 429 stops Overpass immediately). `overpass-api.de` blocks requests from `*.vercel.app`/`*.netlify.app` pages (HTTP 406), so it is skipped there. If every Overpass attempt fails, the search falls back to Nominatim's category search (`q=[amenity=cafe]` in the bounded area; ≤3 requests throttled to 1/s, ≤40 places each, no generic shop/office/craft coverage) and the results show a coverage note. Results are normalized, deduplicated, and capped (`maxResults`, server fetch capped at 100).
- **Results table:** every result shows a *pitch opportunity* (High: no website, social page only, or a down/outdated site; Medium: site needs work; Low: modern site or a chain brand), all contacts from OSM tags (website, phones, emails, social profiles, address), and an expandable details panel with Google Maps / Google / Facebook research links plus full record and website-check details.
- **Website checks** run only on request ("Check site" per row / "Check N websites" bulk): each homepage is loaded through the free, keyless Jina Reader (`r.jina.ai`, ~20 requests/min, one at a time; the site address is shared with Jina AI) and analyzed for HTTPS, a responsive viewport, the latest copyright year, platform/CMS version, dated tech, parked/error pages, and missing SEO basics. Emails, phones, and social links found on the site are added to the contact list (tagged "site"). Results are cached in `localStorage` for 14 days and included in the saved-leads CSV export. Signals are heuristics, not proof.
- Results can be sorted by default provider order or name (A–Z), applied locally.
- **Recent Searches** (on Dashboard and Saved Leads) share one local history. Clicking an entry navigates to Find Companies with a `run=1` URL parameter, which restores the criteria and triggers exactly one live search, then strips the flag so refreshes never re-run.
- Searches share results through a 10-minute in-memory cache (50-entry cap) keyed by normalized provider parameters; simultaneous identical searches share one in-flight request. Aborted requests settle silently; failures never poison the cache.
- Location searches require a city/region; areas over 50,000 km² are refused with guidance to narrow the area.
- Attribution: © OpenStreetMap contributors and © Overture Maps Foundation, linked in the footer, per provider policy. The prepared data is CDLA-Permissive-2.0.

## Prepared city data

Overture Maps publishes all of its places as public Parquet files on S3. `scripts/overture/` turns them into small per-city files:

| Step | Command | What it does |
| --- | --- | --- |
| Extract | `bun scripts/overture/extract.ts [city ids…]` | DuckDB reads only each city's bounding box from Overture (no full download), keeps named, open, non-chain businesses with confidence ≥ 0.7, drops non-business places (parks, worship, government…), writes `scripts/overture/out/<release>/<city>/<category>.json.gz` plus `manifest.json`. All 21 cities: ~6 min. |
| Upload | `bun scripts/overture/upload.ts` | Uploads that folder and a root `manifest.json` to the Hugging Face dataset in one commit. Needs `HF_TOKEN`. |

The output folder is git-ignored. To refresh data, set the new Overture release in `scripts/overture/cities.ts` (`OVERTURE_RELEASE`), run both steps, and the app picks it up from the root manifest without a redeploy. To add a city, add it to `PREPARED_CITIES` with a `[west, south, east, north]` box, then extract that id and upload.

## Data persistence

Stored in `localStorage` under versioned `leadscout.*` keys (see `STORAGE_KEYS` in `src/lib/storage.ts`):

- Saved real-company snapshots (v2 envelope; legacy non-company records are dropped by validation)
- Lead pipeline per saved lead (status, lost reason, notes, follow-up date, contact count), kept apart from the snapshots so unsaving and re-saving keeps the history
- Your pitch signature (name and portfolio link)
- Recent search criteria plus lightweight result statistics (result counts and website ids only, never full result sets) — the single source of truth for both Recent Searches and the Dashboard statistics
- Website-check cache (14 days) and Nominatim geocode cache
- Theme preference

All data is **browser-local**: it does not sync across devices and is lost if browser storage is cleared. Corrupt entries are dropped by validation rather than crashing pages. Cross-tab updates propagate through storage events. The sidebar's Clear-local-data action clears saved leads with their pipeline, recent searches, and search statistics after confirmation; theme preference, pitch signature and caches are kept.

## Dashboard statistics

Once a lead is saved, **Your pipeline** sits above the statistics: follow-ups due today (the first five by name) and a count per status. Each links to Saved Leads with that filter applied (`/saved-leads?status=due`, `?status=contacted`, …).

Search statistics are derived locally from recorded successful searches (see `summarizeSearchStats` in `src/lib/search-history.ts`):

- **Total Searches** — successfully recorded live searches (failures never count).
- **Businesses Found** — cumulative results returned across recorded searches.
- **Businesses with Websites** — unique businesses listing a website (deduplicated by business id across searches).
- **Saved Leads** — current saved real-business count, synced with saved-lead storage.

Searches recorded before statistics existed load as zero — history is never invented. Counts grow as you search.

## Export

Single CSV export for the saved-leads collection (UTF-8 with BOM, RFC 4180 quoting, formula-injection guard, temporary download URLs revoked after use): identity, contacts, coordinates, source, saved-at, pipeline (status, lost reason, follow-up date, times contacted, last contacted at, notes), pitch opportunity, address, and website-check columns. Filename: `leadscout-leads-YYYYMMDD-HHmm.csv`. Missing values export as blank fields. Nothing is ever sent to an external service.

## Troubleshooting

- **Build fails:** run `bun install` first (Bun-only lockfile), then `bun typecheck` for the exact error.
- **Saved leads disappeared:** browser storage was cleared, a different browser/profile is in use, or private mode is blocking writes (the app shows a warning banner in that case).
- **Live search fails:** public Overpass/Nominatim instances rate-limit and have outages. Wait a minute and use Retry; narrow to a smaller city on timeouts; check the error kind shown (rate-limit vs timeout vs place-not-found).
- **Stale UI after another tab changed data:** the app syncs over storage events; a refresh reconciles any missed update.
- **Hydration warnings in dev:** storage-backed components render server-safe fallbacks; warnings about `localStorage` during prerender indicate a genuine bug — report it.

## Known limitations

- Prepared cities use rectangular boxes, not real city borders: most Bangladesh boxes are ~35 km squares around the centre (Dhaka, Gazipur and Narayanganj are hand-set to share edges without overlapping), and London's box reaches into Surrey. Overture data has some address-like names and closed places it does not mark as closed; most Meta-sourced places list a Facebook page, so they show as “Social page only”.
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
