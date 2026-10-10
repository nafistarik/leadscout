# LeadScout — Project Feature Inventory

> Audit of the actual repository (`nafistarik/leadscout`) on 2026-10-10.
> Scope: UI & feature inventory only. Search reliability is out of scope.
> Nothing was removed, refactored, or deleted for this document.
> Goal used for the "initial assessment" column: a simple personal tool to find
> companies to pitch website work to (1-month landing pages, 2-month complex
> projects). No CRM needed. Assessments are initial, not final decisions.

**Data-source legend used below**

- `live` — real businesses from OpenStreetMap via public Overpass API + Nominatim
  place lookup, orchestrated in `src/lib/providers/index.ts`. In-memory result
  cache (10 min, 50 entries) + in-flight dedupe. No backend, no API keys.
- `localStorage` — persists only in this browser. Keys in `src/lib/storage.ts`:
  `savedLeads.v2`, `lists.v1`, `theme.v1`, `geocodeCache.v1`,
  `searchPresets.v1`, `leadWorkflow.v1`, `searchHistory.v1`,
  `websiteAnalysis.v1` (+ legacy `savedLeadIds.v1` migrated once).
- `demo/mock` — built-in fictional 12-record dataset (`src/data/demo-leads.ts`),
  sample list, sample activity events. Badged everywhere. No network.
- `derived` — computed in the browser from live data (scores, opportunity,
  completeness, website check via Jina Reader, cached 14 days).
- `url` — shareable URL params (`?mode=live|demo&country&city&category&keyword&maxResults…`,
  see `src/lib/search-params.ts`).

**Stack:** Next.js 16.4 + React 19.3, Tailwind 4, `lucide-react` icons only.
No database, no auth, no server actions for data. All saves are local.

---

## 1. Global shell & navigation (all routes)

Layout: `src/app/layout.tsx`, `src/components/layout/app-shell.tsx`,
`sidebar.tsx`, `header.tsx`, `globals.css`, `hooks/use-theme.tsx`.

### 1.1 Sidebar navigation (5 routes)

- **What:** Fixed desktop sidebar + mobile drawer (`dialog`, Escape to close).
  Items: Dashboard `/`, Find Companies `/find-companies`, Saved Leads
  `/saved-leads`, Lists `/lists`, Settings `/settings`. Active item highlighted.
  Footer note: "Local-first app — saves stay in this browser."
- **Data:** none (static labels + `NAV_ITEMS`).
- **Assessment:** essential (basic navigation).
- **Files:** `components/layout/sidebar.tsx`, `app-shell.tsx`.

### 1.2 Header (title, breadcrumb, theme, account placeholder)

- **What:** Sticky header. Per-route title + `Home / …` trail, theme toggle
  (Sun/Moon), user avatar icon (decorative: "Local prototype — no account"),
  `DemoBadge`. Mobile hamburger opens drawer; mobile gets a second search row.
- **Data:** theme in `localStorage (theme.v1)` + blocking inline script in
  `layout.tsx` to avoid flash. No account data exists.
- **Assessment:** essential (title/nav); avatar icon is **optional** decoration.
- **Files:** `components/layout/header.tsx`, `hooks/use-theme.tsx`, `app/layout.tsx`.

### 1.3 Header global search

- **What:** Small `Search companies…` input (desktop + mobile). Submit jumps to
  `/find-companies?keyword=…`. No inline results.
- **Data:** `url` only; the Find Companies page restores the keyword.
- **Assessment:** optional (convenience shortcut; duplicates the Find Companies form).
- **Files:** `components/layout/header.tsx`.

### 1.4 App-wide supporting pages

- **What:** `loading.tsx` ("Loading…"), `error.tsx` ("Something went wrong" +
  Try again / Go to Dashboard), `not-found.tsx` ("Page not found" + Go to
  Dashboard), skip-to-content link, footer OSM disclaimer on every page.
- **Data:** none.
- **Assessment:** essential (standard scaffolding; footer attribution is legally
  expected for OSM).
- **Files:** `src/app/loading.tsx`, `error.tsx`, `not-found.tsx`, `app-shell.tsx`.

---

## 2. Dashboard `/` — `components/dashboard/dashboard-client.tsx`

Demo-heavy overview page. All metrics below are computed from the fictional
dataset except the live-saved preview.

### 2.1 Welcome hero

- **What:** "Find your next web project client" + explainer + two CTA buttons:
  Find Companies, View Saved Leads. Badges: Demo + Live search.
- **Data:** static text.
- **Assessment:** optional (landing hero; nav already covers both destinations).
- **Files:** `dashboard-client.tsx`.

### 2.2 Overview metric cards (4)

- **What:** Companies Found (= 12, dataset size), Saved Leads (count of
  `savedLeads.v2` records), Contact Details Available (demo records with
  website/phone flag), Lists Created (count of `lists.v1`).
- **Data:** `demo/mock` + `localStorage`.
- **Assessment:** optional — demo metrics, not progress toward paid work.
- **Files:** `dashboard-client.tsx`, `data/demo-leads.ts`.

### 2.3 Recent Leads preview (demo table, 5 rows)

- **What:** First 5 `DEMO_LEADS` in a `LeadTable` (company, industry, location,
  website/phone availability flags, Sample-record badge, Save button). Link:
  "Open Find Companies".
- **Data:** `demo/mock` (flags only — no real URLs, phones, or emails).
- **Assessment:** duplicated (same table as Find Companies demo results, §3.9).
- **Files:** `dashboard-client.tsx`, `components/leads/lead-table.tsx`.

### 2.4 Saved from OpenStreetMap preview (up to 3 rows)

- **What:** Most recent `kind: "osm"` saved records in a `CompanyTable`. Empty
  state links to live search. Link: "View all saved".
- **Data:** `localStorage (savedLeads.v2)` snapshots of live companies.
- **Assessment:** duplicated (same data as Saved Leads page, §4.3, sliced to 3).
- **Files:** `dashboard-client.tsx`, `components/companies/company-table.tsx`.

### 2.5 Recent Activity card (sample events)

- **What:** 3 hard-coded `SAMPLE_ACTIVITY` items (saved / list / search) with
  "Sample timestamp". Disclaimer: "demo-mode activity only".
- **Data:** `demo/mock` static list.
- **Assessment:** optional — placeholder with no live tracking behind it.
- **Files:** `dashboard-client.tsx`, `data/demo-leads.ts`.

### 2.6 Quick Actions card (2 links)

- **What:** Two large link-cards: "Search live companies" and "Review saved
  leads (N saved locally)".
- **Data:** saved-lead count from `localStorage`.
- **Assessment:** duplicated (repeats sidebar + hero CTAs).
- **Files:** `dashboard-client.tsx`.

---

## 3. Find Companies `/find-companies` — search (core page)

Shell: `find-companies-client.tsx` (mode toggle + demo section).
Live section: `live-search-section.tsx`. Shared controls: `refine-controls.tsx`,
`pitch-toolbar.tsx`. Results show what the source actually provides; missing
fields render as "Not listed", never invented.

Business fields a **live result** can display (`types/company.ts`,
`lib/osm-details.ts`): name, category label derived from OSM tags, city,
country, `locationLabel` ("City, Country"), street address (from tags),
lat/lon coordinates, website / phone / email / opening hours (only if mapped),
social profiles (FB/IG/WhatsApp/LinkedIn/X/YouTube/TikTok/Telegram),
brand/chain, cuisine, description, last-verified date (`check_date`), source
name + deep link (`sourceUrl`), raw `tags` (for scoring/debugging).

Business fields a **demo result** displays: companyName, category, city,
country, `websiteAvailable` / `phoneAvailable` boolean flags only. No URLs,
numbers, or emails exist in demo data by design.

### 3.1 Mode toggle (Live search | Demo data) + shareable URL

- **What:** Segmented toggle preserving both modes' state (inactive section is
  `hidden`, stays mounted). Mode + all filters sync to the URL
  (`filtersToSearchParams`); back button / shared links restore the form but
  never auto-fetch live results.
- **Data:** `url`.
- **Assessment:** unclear — useful for sharing, but keeping two full search
  systems doubles every downstream feature (forms, refine, tables, export).
- **Files:** `find-companies-client.tsx`, `lib/search-params.ts`.

### 3.2 Live search form (5 inputs + Search + Reset)

- **What:** Country (optional free text + 30-country datalist), City/region
  (**required**, bounds the search), Business category (select, ~14 incl.
  2 live-only), Keyword (optional, matches names), Maximum results (5/10/25/50).
  Submit runs the provider search; Reset clears form + results + URL.
- **Data:** `live` (Nominatim geocode → Overpass query; Nominatim POI fallback
  with coverage note). Country/city also feed the area-size guard ("area too
  large" error for broad regions).
- **Assessment:** essential — this is the core workflow (city + category +
  keyword → companies).
- **Files:** `live-search-section.tsx`, `hooks/use-company-search.ts`,
  `lib/providers/*`, `data/search-options.ts`.

### 3.3 "Show heuristic fit scores" checkbox

- **What:** Toggles score badges + score sort. Turning it off while sorting by
  score resets sort to default.
- **Data:** `derived` (`lib/scoring.ts`: website 30, phone 20, category-match
  15, email 15, opening hours 10, city-from-tags 10; max 100).
- **Assessment:** optional (display switch for §3.10).
- **Files:** `live-search-section.tsx`.

### 3.4 Refine-results panel (live, collapsible `<details>`)

- **What:** "Filter without re-searching" — instant client-side narrowing:
  4 availability checkboxes (website / phone / email / opening hours), Minimum
  fit score (Off / 40+ / 70+), Sort select (§3.8), Saved setups (§3.16),
  Recent searches (§3.17). "Refined" badge when active.
- **Data:** filters the already-fetched set; no network.
- **Assessment:** optional — handy, but 4 checkboxes + score + 6 sorts + presets
  + history is a lot for "find companies without websites."
- **Files:** `live-search-section.tsx`, `refine-controls.tsx`, `lib/filter-leads.ts`.

### 3.5 Active filter chips + Clear all

- **What:** Removable chips for each active local refinement
  (e.g. "Website available", "Score 70+", "Sort: …") + Clear-all link.
- **Data:** local filter state only.
- **Assessment:** optional (companion to §3.4).
- **Files:** `refine-controls.tsx` (`ActiveFilterChips`).

### 3.6 Search lifecycle states

- **What:** Idle prompt ("Search live business data"), loading skeleton
  (spinner + 3 pulsing rows), typed errors with Retry (place-not-found,
  area-too-large, rate-limit, timeout, unavailable), zero-result empty state,
  "Showing X of Y · Area · ~km²" count, "Narrowed locally" badge, server-limit
  ("more businesses may exist") + Nominatim `coverageNote`, "criteria changed —
  refresh" dirty notice.
- **Data:** `live` meta (`areaLabel`, `areaKm2`, `truncated`, `providerId`).
- **Assessment:** essential (feedback for a network search); keep even in a
  minimal version.
- **Files:** `live-search-section.tsx`, `hooks/use-company-search.ts`.

### 3.7 Pitch-focus toolbar + bulk website check ("Check N websites")

- **What:** Quick-filter tabs with counts: All / Hot leads / No website /
  Social only / Site has issues / Not checked. One button queues homepage
  checks for all unchecked sites (one at a time, ~20/min via Jina Reader,
  Cancel + rate-limit pause). Results cached 14 days. Explainer footnote.
- **Data:** `derived` (`lib/opportunity.ts`, `lib/website-analysis.ts`,
  `websiteAnalysis.v1`). Jina Reader receives each site address.
- **Assessment:** optional — the most "sales-tool" part of the app; Hot/No-website
  tabs overlap the §3.4 checkboxes.
- **Files:** `pitch-toolbar.tsx`, `lib/opportunity.ts`, `hooks/use-website-analysis.ts`.

### 3.8 Sort control (up to 6 orders)

- **What:** Default order / Best keyword match / Name A–Z / Most complete info /
  Highest fit score / Best pitch opportunity. Demo offers a subset (no score).
- **Data:** `derived` sorting of fetched rows.
- **Assessment:** optional — 6 orders is generous; Default + Name would cover
  the simple workflow.
- **Files:** `refine-controls.tsx` (`SortSelect`, `SORT_LABELS`).

### 3.9 Demo search section (parallel system: form + refine + results)

- **What:** Separate form (Country **select** of 3, City free text + datalist of
  12, Category select of 12, Keyword, Max results, Search/Reset), demo-only
  refine (website/phone checkboxes + sort, no email/hours/score by design),
  result count ("Showing X of Y sample results"), Export (§3.15), `LeadTable`
  with availability flags, "Remove refinement" empty states.
- **Data:** `demo/mock` only (`filterDemoLeads`, deterministic, synchronous).
- **Assessment:** duplicated — a full second search stack over 12 fictional rows;
  top removal candidate if live search is kept.
- **Files:** `find-companies-client.tsx`, `lib/filter-leads.ts`, `data/demo-leads.ts`.

### 3.10 Per-row result tables (desktop table + mobile cards)

- **What:** Two responsive layouts of the same data. Live rows
  (`CompanyTable`): Company (name/category/address) | Pitch opportunity (§3.11)
  | Contact (§3.12) + completeness (§3.13) | Website check (§3.14) | Action
  (Save §3.15 + Details toggle §3.16). Demo rows (`LeadTable`): Company |
  Industry | Location | Website flag | Phone flag | Sample badge | Save.
- **Data:** `live` snapshots / `demo` flags.
- **Assessment:** essential (the list itself); the 5-column live row is the
  densest UI in the app (see §§3.11–3.16 for separable pieces).
- **Files:** `components/companies/company-table.tsx`, `components/leads/lead-table.tsx`.

### 3.11 Fit-score badge + legend

- **What:** Expandable `70/100 · Strong info` badge with point breakdown
  ("Heuristic fit score — not a prediction"). Legend chip: "Heuristic scores ·
  info only".
- **Data:** `derived` (`lib/scoring.ts`, `scoreBand`: 70+ Strong / 40+ Partial /
  else Basic).
- **Assessment:** optional — describes mapped detail, not buyer intent.
- **Files:** `components/companies/score-badge.tsx`.

### 3.12 Pitch-opportunity badge + cell

- **What:** High / Medium / Unchecked / Low badge + one-line reason
  (e.g. "No website", "Chain / brand", "Down / outdated site"). Tooltip lists
  all reasons. Drives Pitch-focus tabs and opportunity sort.
- **Data:** `derived` (`lib/opportunity.ts`; brand → Low, no-website/social/
  broken-site → High/Medium, unchecked site → Unknown).
- **Assessment:** optional — overlaps scores (§3.11) and completeness (§3.13);
  three heuristics on the same signals.
- **Files:** `components/companies/lead-insights.tsx` (`OpportunityCell/Badge`).

### 3.13 Contact list per row

- **What:** Clickable website (label truncated), `tel:` phones, `mailto:` emails
  (plausibility-checked), social chips; extras found on the business homepage
  tagged "site". Falls back to "No contact details listed — use the research
  links."
- **Data:** `live` OSM values first + `derived` site-discovered extras.
- **Assessment:** essential (need a way to reach the business).
- **Files:** `lead-insights.tsx` (`ContactList`), `lib/links.ts`, `lib/osm-details.ts`.

### 3.14 Completeness meter ("3 of 6 details present")

- **What:** One-line count of mapped fields (website/phone/email/hours/
  coordinates/address) with tooltip breakdown. Category excluded (always present).
- **Data:** `derived` (`lib/completeness.ts`).
- **Assessment:** optional — third overlapping heuristic alongside score and
  opportunity.
- **Files:** `components/companies/completeness-meter.tsx`.

### 3.15 Website check per row (Check site / verdict / Recheck)

- **What:** "Check site" button loads the homepage through Jina Reader; states:
  Queued / Checking / Down-parked / Outdated / Needs work / Looks modern +
  HTTPS, Mobile, © year, platform chips + Recheck link. No-website/social rows
  show "Verify: Google / Maps" links instead. Errors show Retry.
- **Data:** `derived`, cached 14 days in `websiteAnalysis.v1`.
- **Assessment:** optional — the heaviest per-row feature (network + cache +
  verdict logic); valuable for pitching but not for *finding* companies.
- **Files:** `lead-insights.tsx` (`WebsiteCheckCell`), `hooks/use-website-analysis.ts`,
  `lib/website-analysis.ts`, `lib/providers/website-reader.ts`.

### 3.16 Expandable Details panel (Why pitch / Business / Website check)

- **What:** Per-row "Details" toggle revealing 3 columns: pitch reasons +
  Google Maps/Google/Facebook research links; full OSM record (address,
  cuisine, hours, description, brand, last-verified, coordinates, source link);
  full website analysis (verdict, title, description, platform, HTTPS, mobile,
  copyright, issue list).
- **Data:** `live` + `derived`.
- **Assessment:** optional — research links are handy; the 3-column dump is CRM-grade depth.
- **Files:** `lead-insights.tsx` (`LeadDetailsPanel`, `researchLinks`).

### 3.17 Copy Summary / Copy Contact buttons

- **What:** "Summary" copies name/category/location/contacts/source (+ your
  workflow notes in a separated section); "Contact" copies website/phone/email
  or disables when none exist. Honest success/failure toast text.
- **Data:** row data + `leadWorkflow.v1` notes if present.
- **Assessment:** optional (clipboard convenience; Contact disabled-state logic
  is the only subtle part).
- **Files:** `components/companies/research-actions.tsx`, `lib/clipboard.ts`.

### 3.18 Save / Saved toggle per row

- **What:** Bookmark button persisting the lead (live snapshot or demo
  reference). Appears in every table + dashboard previews.
- **Data:** `localStorage (savedLeads.v2)`.
- **Assessment:** essential — the bridge from search to shortlist.
- **Files:** `components/leads/save-lead-button.tsx`, `hooks/use-saved-leads.ts`.

### 3.19 CSV export (filtered results)

- **What:** "Export (N)" downloads exactly the currently displayed rows
  (35-column schema: contacts, score, opportunity, website verdict, workflow
  status/notes…). Separate buttons for live results, demo results, and all
  saved leads. BOM + formula-injection guard, object-URL download.
- **Data:** in-memory rows → `.csv` file. Nothing uploaded.
- **Assessment:** essential (the simplest "take my shortlist with me" feature).
- **Files:** `lib/csv.ts` (`CSV_COLUMNS`, `companyToRow/demoToRow/savedRecordsToRows`).

### 3.20 Saved setups ("Search presets")

- **What:** Name + save the current filter set (both modes); apply fills the
  form (user still submits); delete per preset; 20-preset cap. "Applied … —
  review and submit" feedback.
- **Data:** `localStorage (searchPresets.v1)`, criteria only, never results.
- **Assessment:** optional (power-user convenience).
- **Files:** `refine-controls.tsx` (`PresetControls`), `hooks/use-search-presets.ts`,
  `lib/search-presets.ts`.

### 3.21 Recent searches history

- **What:** Last 10 submitted searches per mode (newest first). Click re-runs
  immediately (results are never stored); per-entry remove; Clear-all with
  "Clear all? Yes / Keep" confirm. Hidden when empty.
- **Data:** `localStorage (searchHistory.v1)`, inputs only.
- **Assessment:** optional — overlaps presets (§3.20); auto re-run on click is
  easy to trigger accidentally.
- **Files:** `refine-controls.tsx` (`HistoryControls`), `hooks/use-search-history.ts`,
  `lib/search-history.ts`.

---

## 4. Saved Leads `/saved-leads` — `saved-leads-client.tsx`

Shortlist page. Demo and live records kept in visibly separate sections.

### 4.1 Header + Export saved + storage warnings

- **What:** "Stored only in this browser" explainer, Export-saved (N) button,
  stale-reference banner + prune button, storage-unavailable warning.
- **Data:** `localStorage (savedLeads.v2)`; stale = demo ids no longer in the
  12-record dataset.
- **Assessment:** essential (export + honesty about local-only storage).
  Stale-prune is an edge case of the demo dataset.
- **Files:** `saved-leads-client.tsx`, `lib/csv.ts`, `lib/saved-leads.ts`.

### 4.2 Status filter ("Show leads with status")

- **What:** Dropdown (All + 5 workflow statuses) narrowing both sections;
  "Showing X of Y" count; empty state ("No leads marked …" + Clear filter).
- **Data:** `leadWorkflow.v1` via `effectiveStatus` (absent = Unreviewed).
- **Assessment:** optional — only meaningful with the workflow system (§6).
- **Files:** `saved-leads-client.tsx`, `lib/workflow.ts`.

### 4.3 Saved live section (CompanyTable + per-row CRM controls)

- **What:** All `kind: "osm"` records with full row features (§§3.10–3.18) plus,
  per row: Add-to-list picker (§5.2), Copy buttons (§3.17), Workflow panel
  (§6.1). OSM attribution underneath.
- **Data:** `localStorage` company snapshots (survive refresh without re-query).
- **Assessment:** essential (the shortlist itself); the per-row CRM stack is
  optional (see §6).
- **Files:** `saved-leads-client.tsx`, `company-table.tsx`.

### 4.4 Saved demo section (LeadTable + per-row CRM controls)

- **What:** Saved fictional records with unsave + add-to-list + workflow panel.
  "Fictional sample records" disclaimer.
- **Data:** `localStorage` demo references + `DEMO_LEADS`.
- **Assessment:** duplicated (demo root data is fictional; saving it exercises
  the same code path as live saves).
- **Files:** `saved-leads-client.tsx`, `lead-table.tsx`.

---

## 5. Lists `/lists` — `lists-client.tsx`, `add-to-list-control.tsx`

Local-only grouping. Demo samples and live records can share a list.

### 5.1 Create-a-list form

- **What:** Name input (max 60, unique case-insensitive) + Create button +
  inline validation errors.
- **Data:** `localStorage (lists.v1)`.
- **Assessment:** unclear — useful with 10+ leads; overhead for a 1–2-project pipeline.
- **Files:** `lists-client.tsx`, `hooks/use-lead-lists.ts`, `lib/lead-lists.ts`.

### 5.2 Add-to-list picker (on every saved row)

- **What:** Dropdown of lists the lead is not in + Add button; "In N lists: …"
  label; when no lists exist, a "Create a list to organize" link. Success/error
  feedback text.
- **Data:** `lists.v1` + `savedLeads.v2`.
- **Assessment:** optional (companion to §5.1; repeats on every row).
- **Files:** `add-to-list-control.tsx`.

### 5.3 List cards (rename / delete / members)

- **What:** Per list: name, member count, created date, Rename (inline form),
  Delete (inline "Delete …? Yes, delete / Cancel" confirm — saved leads are
  kept), member rows (name + OSM/Sample/Removed badge + workflow status badge +
  remove-from-list button), member add-select (saved leads not yet in the list).
- **Data:** `lists.v1` + resolved lead names; missing refs show "Removed".
- **Assessment:** optional — full mini-CRUD; rename/delete/member-add is the most
  code per retained value for a simple workflow.
- **Files:** `lists-client.tsx` (`UserListRow`, `MemberList`).

### 5.4 Sample list (read-only example)

- **What:** Dashed card: "Sample: Berlin service businesses" (2 demo ids by
  name). Cannot be renamed/deleted, not stored.
- **Data:** `demo/mock` (`SAMPLE_LIST`).
- **Assessment:** optional — illustrative only.
- **Files:** `lists-client.tsx`, `data/demo-leads.ts`.

---

## 6. Lead workflow / mini-CRM (per saved lead) — `lead-workflow-panel.tsx`

User-assigned pipeline metadata, separate localStorage key so
saving/unsaving never destroys notes and vice versa. Re-saving restores prior
status/notes. Surfaced on every Saved Leads row + as status badges in Lists.

### 6.1 Status selector (+ StatusBadge, overdue badge)

- **What:** Dropdown: Unreviewed / Researching / Qualified / Not a fit / Ready
  for outreach (absent = Unreviewed). "Follow-up due" badge when the date passes.
- **Data:** `localStorage (leadWorkflow.v1)`.
- **Assessment:** optional — classic CRM stage tracking; overkill for "contact
  this month's 5 prospects."
- **Files:** `workflow/lead-workflow-panel.tsx`, `types/workflow.ts`, `lib/workflow.ts`.

### 6.2 Research notes (textarea + Save, 2000 chars)

- **What:** Free-form notes per lead, "stored only in this browser", last-reviewed
  date stamp, included in Copy-Summary (§3.17) and CSV export (§3.19).
- **Data:** `leadWorkflow.v1`.
- **Assessment:** unclear — the single most defensible CRM piece (a scratchpad
  beats a spreadsheet), but still CRM scope.
- **Files:** `lead-workflow-panel.tsx`, `hooks/use-lead-workflow.ts`.

### 6.3 Next action + follow-up date

- **What:** Next-action select (No action / Research online / Check website /
  Call / Email / Revisit later) + optional `YYYY-MM-DD` date picker with
  invalid-date error; "Next: … by …" summary line.
- **Data:** `leadWorkflow.v1`.
- **Assessment:** optional — task-manager scope.
- **Files:** `lead-workflow-panel.tsx`, `lib/workflow.ts` (`isValidDateString`, `isOverdue`).

### 6.4 Qualification checklist ("Research & checklist (N of 5 present)")

- **What:** Collapsible 5-row checklist derived from the record (contact known,
  website status, location detail…): Present / Unknown badges + "Unknown means
  the record does not contain it" disclaimer.
- **Data:** `derived` (`buildQualificationChecklist(signals)`).
- **Assessment:** optional — transparent but redundant with score/opportunity/
  completeness.
- **Files:** `lead-workflow-panel.tsx`, `lib/workflow.ts`.

---

## 7. Settings `/settings` — `settings-client.tsx`

### 7.1 Appearance (Light / Dark cards)

- **What:** Two selectable theme cards. Duplicates the header toggle (§1.2).
- **Data:** `localStorage (theme.v1)`.
- **Assessment:** duplicated (same setting as header button); harmless.
- **Files:** `settings-client.tsx`, `hooks/use-theme.tsx`.

### 7.2 Demo-data mode explainer card

- **What:** Static text: 12 fictional companies, flags illustrative, live search
  shows only source-provided details, saves are local-only.
- **Data:** none (documentation).
- **Assessment:** optional — helpful today, deletable with demo mode.
- **Files:** `settings-client.tsx`.

### 7.3 Data-sources card

- **What:** Static text: Overpass + Nominatim, brief in-memory caching,
  community-mapping coverage warning, OSM copyright link; samples = built-in,
  no network.
- **Data:** none (documentation).
- **Assessment:** essential-as-text (provenance + attribution); keep a shorter
  version anywhere.
- **Files:** `settings-client.tsx`.

### 7.4 Local-data reset ("Reset local data")

- **What:** Live counts ("N saved leads, M lists"), two-step confirm
  ("Clear all …? cannot be undone"), clears saved leads (both schema versions),
  lists, presets, workflow — theme kept. Notifies all storage subscribers so UI
  updates without refresh. Note: search history + website cache are *not*
  cleared by this button.
- **Data:** `localStorage` (4 keys + legacy).
- **Assessment:** essential (the only way to wipe local state).
- **Files:** `settings-client.tsx`, `hooks/use-local-storage-value.ts`.

---

## 8. Overall complexity summary

- **Routes:** 5 real pages (Dashboard, Find Companies, Saved Leads, Lists,
  Settings) + loading/error/not-found. One sidebar, one header, one footer.
- **Search systems:** 2 parallel stacks (live OSM + 12-row demo) sharing
  control styling but not logic — the single biggest duplication.
- **Heuristics on the same signals:** fit score (§3.11) + pitch opportunity
  (§3.12) + completeness meter (§3.14) + qualification checklist (§6.4) +
  6-way sort (§3.8) + pitch-focus tabs (§3.7). Any one would do for "who to
  contact first."
- **CRM layer:** per-lead status + notes + next action + follow-up date +
  overdue + status filter + lists + add-to-list + sample list + 3 CSV exporters
  + copy-summary/contact — a coherent small CRM, but a CRM nonetheless, and the
  stated workflow ("find a handful of companies, pitch, build 1–2 months")
  does not need it.
- **Persistence:** 9 localStorage keys + legacy migration + cross-tab sync +
  14-day website cache + shareable-URL state machine (own `writtenKey` /
  `appliedKey` protocol in both search sections). Robust, but a lot of
  machinery for a personal shortlist.
- **Network:** Overpass (bounded) + Nominatim (geocode + fallback POIs) + Jina
  Reader (per-site checks). No keys, no backend.
- **Dependencies:** only `next`, `react`, `react-dom`, `lucide-react`
  (+ dev: Tailwind, TypeScript, ESLint). Nothing to prune at the package level.

---

## 9. Potentially removable features (numbered for keep/remove decisions)

Reply with the IDs you want to **keep**; everything else in this list is
assessed as safe to remove completely (component + hook + lib + storage key
where noted).

- **R1 — Demo search stack (§3.9):** demo form, demo refine, demo results,
  `DEMO_LEADS`/`SAMPLE_ACTIVITY`/`SAMPLE_LIST` dataset, demo CSV path.
- **R2 — Dashboard demo content (§§2.2, 2.3, 2.5, 2.6):** metric cards, recent-demo
  preview, sample activity, quick-action cards. (Keep §2.4 only if a dashboard
  remains at all — otherwise the whole page can go.)
- **R3 — Entire Dashboard page (§2):** if Find Companies becomes the home page,
  hero + metrics + previews + activity all go together.
- **R4 — Fit scores (§§3.3, 3.11):** visibility toggle, `ScoreBadge`, legend,
  score sort/min-score, `lib/scoring.ts`.
- **R5 — Pitch opportunity system (§§3.7, 3.12):** opportunity badges/cells,
  pitch-focus tabs, opportunity sort, `lib/opportunity.ts`.
- **R6 — Website checker (§§3.7-bulk, 3.15):** per-row + bulk checks, verdicts,
  14-day `websiteAnalysis.v1` cache, Jina Reader dependency surface,
  `hooks/use-website-analysis.ts`, `lib/website-analysis.ts`,
  `lib/providers/website-reader.ts`.
- **R7 — Completeness meter (§3.14):** `lib/completeness.ts` + row line.
- **R8 — Details panel + research links (§3.16):** 3-column expander incl.
  Google/Maps/Facebook links, coordinates/source-link dump.
- **R9 — Copy buttons (§3.17):** Summary + Contact, `lib/clipboard.ts`.
- **R10 — Sort beyond Default/Name (§3.8):** relevance/info/score/opportunity
  orders (keep Default + Name A–Z).
- **R11 — Availability-check refinement (§3.4-checkboxes):** website/phone/email/
  hours instant filters + chips (§3.5). (Live form itself stays.)
- **R12 — Saved setups / presets (§3.20):** `searchPresets.v1` key, save/apply/
  delete UI, `hooks/use-search-presets.ts`, `lib/search-presets.ts`.
- **R13 — Recent search history (§3.21):** `searchHistory.v1` key, re-run list,
  `hooks/use-search-history.ts`, `lib/search-history.ts`.
- **R14 — Lists system (§§5.1–5.3 + §4-row picker §5.2):** Lists page, CRUD,
  member management, per-row add-to-list, `lists.v1` key,
  `hooks/use-lead-lists.ts`, `lib/lead-lists.ts`.
- **R15 — Sample list (§5.4):** `SAMPLE_LIST` card.
- **R16 — Workflow CRM (§§6.1–6.4 + §4.2):** status, notes, next action,
  follow-up/overdue, checklist, saved-leads status filter, `leadWorkflow.v1`
  key, `hooks/use-lead-workflow.ts`, `lib/workflow.ts`, `types/workflow.ts`.
- **R17 — Extra CSV exporters (§3.19-partial):** keep exactly one (saved-leads
  export); remove live-filtered and demo-filtered export buttons.
- **R18 — Header global search (§1.3):** top-bar keyword jump (Find Companies
  form covers it).
- **R19 — Settings explainer cards (§§7.1-partial, 7.2):** duplicate theme cards
  (keep header toggle), demo-mode documentation card (goes with R1).
- **R20 — Saved-demo section (§4.4) + stale-prune (§4.1-partial):** goes away
  with R1; prune logic exists only for demo-id drift.

Minimal-keep sketch (for reference, not a decision): §1 navigation + §3.1-live-only
+ §3.2 form + §3.6 states + §3.10 table (name/category/address/contact/save) +
§3.13 contacts + §3.18 save + §4.1/§4.3 saved list + one CSV export (§3.19) +
§7.3-attribution + §7.4 reset. Everything above is the delta.
