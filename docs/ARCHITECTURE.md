# LeadScout Architecture

Concise map of the codebase. See `README.md` for product behavior; this file is for maintainers changing code.

## Directories

- `src/app/` — App Router routes (`/`, `/find-companies`, `/saved-leads`, `/lists`, `/settings`), root layout (metadata, theme pre-hydration script, app shell), `loading.tsx` / `error.tsx` / `not-found.tsx`, `globals.css` (Tailwind v4 + centralized Neumorphic design tokens, light/dark via `.dark` on `<html>`)
- `src/components/layout/` — `AppShell` (sidebar + mobile drawer + header + footer), `Sidebar`, `Header` (titles, global search → `?keyword=`, theme toggle)
- `src/components/ui/` — shared primitives: `Button`, `Card`, `Badge`, `Field`/`TextInput`/`SelectInput`/`TextArea`, `EmptyState`/`SectionHeading`
- `src/components/leads/` — demo `LeadTable`, save button, availability badges
- `src/components/companies/` — live `CompanyTable`, `ScoreBadge`, `CompletenessMeter`, `ResearchActions` (clipboard copy)
- `src/components/find-companies/` — `FindCompaniesClient` (mode toggle, demo form, URL sync), `LiveSearchSection` (live form, refine panel, results), `refine-controls` (chips, sort, presets UI)
- `src/components/saved-leads/`, `src/components/lists/`, `src/components/settings/`, `src/components/dashboard/`, `src/components/workflow/` — one client component per route/feature area
- `src/lib/providers/` — `types` (provider interface + `ProviderError` kinds), `nominatim` (geocoding + persistent cache), `overpass` (query builder, fetch, normalize, dedupe), `osm-tags` (category mapping), `geo` (bbox area guard), `cache` (TTL + in-flight dedupe), `http` (timeout fetch, error mapping), `index` (orchestrator: geocode → guard → fetch → dedupe → slice → cache)
- `src/lib/` — `filter-leads` (demo filtering + client-side refine/sort utils), `search-params` (URL ↔ filters, validated), `search-presets`, `saved-leads` (records, migration), `lead-lists` (membership rules), `lead-workflow` + `use-lead-workflow` helpers, `scoring` (heuristic fit score), `completeness`, `csv` (RFC 4180 export), `links` (safe URL/phone/email handling), `clipboard`, `storage` (keys + safe accessors)
- `src/hooks/` — `use-company-search` (debounced submit, AbortController per run, request-id staleness guard), `use-saved-leads` (v2 store + v1 migration), `use-lead-lists`, `use-lead-workflow`, `use-search-presets`, `use-local-storage-value` (SSR-safe external store + cross-tab sync), `use-theme`
- `src/data/` — `demo-leads` (12 fictional records + sample list/activity), `search-options` (country suggestions)
- `src/types/` — `company` (normalized `Company`, saved records, id namespaces), `lead` (demo + lists), `workflow` (status/notes/actions), `bun-test.d.ts` (test-runner shim)
- Tests live next to sources as `*.test.ts` and run with `bun test`

## Company data types and normalization

- `Company` carries only source-provided values; missing data is `null`, never invented. Stable ids look like `osm:node/123`; demo ids live in the separate `demo:*` namespace.
- `normalizeElement` (overpass.ts) validates element type/id, requires a name, resolves node vs way/relation-center coordinates, extracts website/phone/email/opening-hours from tags (validated in `links.ts`), and keeps raw tags for scoring/debugging.
- `dedupeCompanies` drops same-id and same-name+rounded-coordinate doubles but keeps distinct same-name businesses apart.

## Provider and search orchestration

1. Submit (explicit only, debounced) → 2. Nominatim resolves city/country to a bbox (persistent cache, ≤1 req/s by construction) → 3. bbox over 50,000 km² is refused → 4. Deterministic Overpass QL from allowlisted tags + sanitized keyword → primary endpoint, one fallback on transport errors only (never on 429) → 5. validate → normalize → dedupe → slice to `maxResults` → 6. cache 10 min / 50 entries keyed by normalized provider params.
- Client-side refinements (availability, score, sort) and demo-mode filtering never touch the network.
- Errors are typed (`needs-location`, `location-not-found`, `area-too-large`, `timeout`, `rate-limit`, `network`, `bad-response`) with per-kind UI and manual retry only.

## Caching and request lifecycle

- In-memory result cache (TTL + cap) and in-flight dedupe in `providers/`; failures/aborts are never cached.
- `use-company-search` cancels the previous request per submission, ignores stale responses by request id, and cleans up timers/controllers on unmount/reset.
- URL state (`mode`, filters, sort) round-trips through validated parsers; components track self-written navigations so back-button/shared links restore without loops or clobbered keystrokes.

## Saved-lead and list persistence

- `savedLeads.v2` envelope holds demo references + full OSM snapshots; v1 id arrays migrate once. Malformed records are dropped, never crash.
- Lists store record ids (both namespaces + legacy raw ids resolve); orphaned ids render as "Removed" instead of breaking.
- Workflow metadata (status/notes/next action/follow-up/reviewed-at) lives under its own keyed map, so company and workflow edits never clobber each other; cross-tab edits merge per record.
- Settings reset removes all app keys and notifies subscribers; theme is preserved separately.

## Theme handling

Blocking inline script in `layout.tsx` sets `.dark` before hydration (no flash); `use-theme` subscribes via `MutationObserver` + storage events. All color/shadow/spacing comes from CSS variables in `globals.css`; components must not hardcode palette values.

## Testing structure

`bun test` discovers `*.test.ts` (see `src/types/bun-test.d.ts` for the type shim). Tests target pure, deterministic units: normalization, dedupe, query building, filters/sorting, URL parsing, storage sanitize/migration, CSV escaping + formula guard, scoring, links, clipboard (stubbed globals), and provider orchestration with stubbed `fetch`. No network, no browser harness — live-provider and interaction checks remain manual (see README checklist).

## How to safely extend the app

- New data source: implement `CompanyProvider` in `src/lib/providers/` and normalize to `Company`; the UI needs no rewrite.
- New filter: extend `LeadSearchFilters`; decide provider-side (cache key, network) vs client-side (instant, "Narrowed locally") and test both paths.
- New persisted state: add a versioned key to `STORAGE_KEYS`, a sanitize function, and reuse `useLocalStorageValue`; never write secrets or credentials.
- New CSV columns: append to `CSV_COLUMNS` + `CsvRow` + row builders, keep RFC 4180 escaping and the formula guard.
