# AI / workflow learnings

Short log of learnings from plan → build → review → test loops. Append one entry per learning. Use `@capture-learning.md` to generate entries.

## Entry format

```markdown
### YYYY-MM-DD — [short context]

- **Context**: [1 sentence]
- **Learning**: [what we learned]
- **Change to prevent repeat**: [1–3 bullets: rule/command/acceptance criteria]
- **Task/PR**: [Notion link or PR number if applicable]
```

## Entries

(Add new entries below.)

### 2026-06-13 — Search Location Filter Persistence (Plan 172)

- **Context**: Client-state precedence over URL params caused stale location filter to persist even after user explicitly cleared it.
- **Learning**: Two-tier bugs (primary: fallback chain falls through to context; secondary: storage re-hydration on remount) need both fixed together — fixing only one leaves the bug partially live. The session guard pattern (`uflow:wo-cleared-this-session` flag) is reusable for any per-session "user has made a choice" gate.
- **Change to prevent repeat**: Add a checklist item for "does the fix need both a URL-origin fix AND a storage/context guard?" when the bug involves state persistence across navigation.
- **Task/PR**: Plan 172

### 2026-06-04 — Nearby Click Navigation (Plan 142)

**What**: Made nearby provider list items clickable with `router.push` navigation. Added `onClick` prop to `DetailListItem` and conditional `<button>` / `<div>` rendering.

**Why**: Users should navigate to nearby provider pages by tapping list items. Non-clickable items must remain `<div>` for accessibility correctness.

**How**:

- `vi.mock` factories are cached per-module — a test file's `vi.mock('next/navigation', ...)` does NOT override a setup file's mock for already-cached modules
- To verify `router.push` calls in tests, import `next/navigation` dynamically and replace `useRouter` on the module namespace object (Vitest preserves live bindings in mocked module namespaces, so the replacement propagates to the component)
- Structure: use `beforeAll` with dynamic `import()` for the component under test, so it's loaded AFTER any module namespace modifications
- `cursor-pointer` belongs on the shared className when using conditional element rendering — even though `<button>` default is `pointer`, explicitly adding it documents intent and handles the `<div>` case

## 2026-06-03 — Halal Check Section UX Improvements (S134)

**What**: Removed dead `/halal` link from HalalTrustBanner, fixed banner position (above sections) on mobile, added tier badge to ExpandSection title, and moved TrustBadgesSection outside the Halal Check section.

**Why**: The dead link caused 404s (trust-eroding). The banner was below sections on mobile (inconsistent with modal and ADR). Users couldn't see verification depth without expanding the section. Trust badges mixed with halal verification confused information architecture.

**How**: Used Python for multi-line text replacements in TypeScript files (more reliable than sed for JSX). Key insights:

- `ExpandSection` takes `title: string`, so tier badge must be concatenated into a string — can't use ReactNode fragments without changing the component API
- `TrustBadgesSection` handles its own empty state — no wrapper condition needed when moving it outside ExpandSection
- Testing Library `getByRole('button', { name: '...' })` does exact match on accessible name — use regex when title is computed dynamically
- TypeScript `tsc` doesn't support the `/u` regex flag when targeting below ES6 — use plain regex instead
- The `/halal` route is referred to in translations and components but doesn't exist and isn't planned — consistent dead link audit needed across all locales

**Files changed**:

- `src/components/providers/ProviderDetailPage.tsx` — banner position fix
- `src/features/providers/components/HalalTrustBanner.tsx` — dead link removal
- `src/features/providers/components/ProviderDetailSections.tsx` — tier badge + TrustBadgesSection move
- 4 test files updated for new behavior

**Next**: Consider reducing HalalTrustPopup view limit from 10 to 3, and audit other dead links in the app.

## 2026-06-04 — Checklist Redesign with Per-Item Icons (S134)

**What**: Redesigned the "What we verified" checklist from a framed `<ul>` with uniform `Check` icons to a frameless `DetailListItem`-style layout with per-item icons (`SquareMenu`, `BeerOff`, `PiggyBank`, `HalalIcon`).

**Why**: The old design had all items using the same `Check` icon inside a bordered frame, making it visually flat and indistinguishable from similar lists elsewhere. The new design uses distinct icons per verification type (menu, alcohol, pork, halal) matching the `DetailListItem` pattern already used in `ProviderDetailSections.tsx`.

**How**:

- `hugeicons-react` has a `HalalIcon` component — but the same file already defined a local `function HalalIcon()` for the `GoldAttestationSection`. Import with alias (`import { HalalIcon as HugeHalalIcon } from 'hugeicons-react'`) to avoid naming conflicts with local definitions.
- Per-item icons require individual JSX per item — can't use a template/map loop when each item needs a different lucide icon. Each icon becomes an explicit `<div>` per item.
- When appending a colon outside `t()`, test assertions using `getByText` exact match break. Use `getByText(v => v.startsWith(...))` matcher instead.
- `tsc` passes with zero errors even when mixing icons from two different packages (lucide-react + hugeicons-react).

**Files changed**:

- `src/features/providers/components/ProofTierCard.tsx` — complete checklist rewrite
- `src/features/providers/components/__tests__/ProofTierCard.test.tsx` — test fix for colon
- `src/__tests__/features/providers/ProofTierCardQA.test.tsx` — test fix for colon
- `package.json` + `package-lock.json` — added `hugeicons-react` dependency

**Next**: None — session complete.

## 2026-06-04 — Nearby Section Visual Consistency (Plan 140)

**What**: Redesigned the "In der Nähe" (Nearby) section to use `DetailListItem` + `MapPin` icon instead of plain `<p>` tags, matching the Menu section's pattern.

**Why**: The Nearby section was visually inconsistent with Menu and Amenities sections, which already used `DetailListItem` — a simple `<p>` list felt like an unfinished section.

**How**:

- The analysis correctly identified `MapPin` as the best icon (universal location pin, neutral across provider types)
- The change was purely presentational: same file, same component, same props pattern — zero new dependencies or data flow changes
- All 8 existing tests mocked `data: []` for the nearby query, so no existing test exercised the data-rendering branch being changed — no regression risk, but also no coverage for the new markup
- The `DetailListItem` component is a local function in the same file — reusing it is DRY, and its interface (label + icon) fits the nearby data shape perfectly

**Task/PR**: Plan 140, commit `1b45f8be`, tag `v0.12.18`

## 2026-06-04 — Nearby Food-Only Section with Haversine Proximity (Plan 141)

**What**: Reworked the "In der Nähe" section to show only food providers using Haversine geo-distance via a Postgres RPC, with city-based fallback for providers without coordinates.

**Why**: The old section showed providers of all types (cleaning, tutoring, car photos) mixed with restaurants in the same city — irrelevant for a user viewing a restaurant. City-name exact match missed the nuance of "nearby" (a provider 30km away in the same "Berlin" bucket). The Haversine RPC gives real distance sorting without needing PostGIS.

**How**:

- Haversine in a `LANGUAGE sql SECURITY INVOKER` RPC works immediately on Supabase — no PostGIS extension needed, aligns with the project's "Start with Postgres" philosophy
- CTE deduplicates the distance computation (avoids repeating the Haversine expression in SELECT and WHERE)
- `GREATEST(-1, LEAST(1, ...))` clamp on acos argument prevents NaN from floating-point edge cases — a trivial fix that prevents silent query failures
- `LIMIT GREATEST(p_limit, 0)` prevents negative limit values from crashing the RPC
- Two-path fallback (RPC → city-based) is architecturally clean: availability over performance when the RPC fails
- The architect review was valuable: caught `STABLE` keyword inconsistency and the missing acos clamp before they reached production
- The `useQuery` mocking pattern in tests means queryFn branching (RPC vs fallback vs error) is never exercised — deferred to future service-layer extraction

**Files changed**:

- `supabase/migrations/093_plan_141_nearby_food_haversine.sql` — new migration (RPC + partial index)
- `src/features/providers/components/ProviderDetailSections.tsx` — RPC-first query with fallback
- `src/__tests__/features/providers/ProviderDetailSections.test.tsx` — 2 new tests
- `src/translations/en.ts` + `de.ts` — empty-state text

**Next**: Load translation keys are still generic ("Loading providers...") — update when touching the section again.

## 2026-06-04 — Back button unresponsive: `router.back()` is unreliable

**Context**: Back chevron on provider detail page was sometimes unresponsive. Root cause: `router.back()` silently does nothing when there's no browser history (direct link, bookmark, external referrer). The button rendered but had no effect.

**What worked**: Replacing `router.back()` with explicit `router.push('/providers')` via the existing `backPath` prop. The mechanism was already there (used by desktop modal) — just wasn't wired for mobile. One-line fix.

**Pattern to reuse**: When navigation needs "go back to overview," always use an explicit path over `router.back()`. Only use `router.back()` when you're certain there's a history entry to target (e.g., modal overlays).

### 2026-06-04 — Re-review Pattern for Plan 144 Fix Verification

- **Context**: Re-reviewed all 5 fixes from a rejected code review (1 CRITICAL + 4 MEDIUM) for the Wolt delivery platform enrichment feature.
- **Learning**: When verifying fixes from a rejected review, verify each fix in the source code (not just tests), run the full test suite for the affected module, and run `tsc --noEmit`. The root cause (stats TDZ) was a runtime crash that tests alone wouldn't catch — type checking and code reading were essential.
- **Change to prevent repeat**: Include `tsc --noEmit` in the verification checklist for re-reviews. Verify each fix at the code level, not just via test output.
- **Task/PR**: Plan 144 — Wolt Delivery Platform Enrichment

## 2026-06-05 — Plan 145: Provider Edit Page Rebuild

**What happened**: Complete 8-phase pipeline to rebuild the admin provider edit page. Added 6 new sections, removed deprecated offers/needs, created transaction-safe RPC, storage bucket for certificates, and enrichment review pages.

**Key learning**: Migration files in the repo are not the source of truth — the live database can differ significantly. We initially planned based on migration files (which showed `proof_tier`, `halal_level`, `offers_ids`/`needs_ids` columns), but querying Supabase directly revealed these columns were already dropped/renamed. This changed the halal check data model from 3-tier to 2-tier + certificate, and simplified the offers/needs removal (columns already gone). Always query the live database schema early in the analysis phase.

**What worked well**:

- Breaking the implementation into Foundation (DB + API) and UI (sub-pages + form) chunks kept delegation sizes manageable
- Architect review caught transaction safety and storage security issues before they reached production
- Using a Supabase RPC for atomic multi-table writes instead of individual JS-level writes

**What to do differently**: Query live schema in Phase 1 (Analyst) instead of relying on migration files. This would have caught schema drift earlier and saved 2-3 hours of rework.

**Files affected**: 38 files, 5279 insertions, 855 deletions
**Tests**: 1461 passing, 0 failed
**Version**: 0.13.0 (unreleased)

### 2026-06-05 — Plan 147: Add store category via migration

- **Context**: Added "Lebensmittel" (Groceries) category under Store section via idempotent SQL migration.
- **Learning**: When subagents of type planner, implementer, and code-reviewer fail with `ProviderModelNotFoundError`, the `general` subagent type works as a fallback for writing files and documents. This suggests a configuration gap for domain-specific subagents vs the general-purpose agent.
- **What to do differently**: File an issue to investigate the subagent model provider config, or update the pipeline to route through `general` as a default fallback.
- **Files affected**: 2 new files
  - `supabase/migrations/097_plan_147_add_store_category_lebensmittel.sql`
  - `agent-output/planning/147-plan-store-category.md`
  - `agent-output/implementation/147-implementation-store-category.md`
  - `agent-output/code-review/147-code-review-store-category.md`
  - `agent-output/qa/147-qa-store-category.md`

### 2026-06-05 — Plan 148: NOT NULL violation in RPC on NULLIF(null, '')

- **Context**: Debugged a 500 error in PATCH /api/admin/edit-provider caused by a NULLIF expression in a PL/pgSQL RPC function.
- **Learning**: `NULLIF(column->>'key', '')` does NOT protect against absent JSONB keys. When `->>` returns NULL, `NULLIF(NULL, '')` returns NULL (PostgreSQL: NULL ≠ '' is unknown, not true, so NULLIF returns the first argument). If the target column is NOT NULL, the INSERT fails. Use `COALESCE(NULLIF(column->>'key', ''), default_value)` instead.
- **What to do differently**: Review all RPC INSERT blocks for `NULLIF` usage on NOT NULL columns — they should all be wrapped in `COALESCE` with an explicit default.
- **Files affected**: 2 new files
  - `supabase/migrations/098_plan_148_fix_rpc_verification_method_not_null.sql`
  - `agent-output/analysis/148-analysis-edit-provider-500.md`
  - `agent-output/planning/148-plan-rpc-not-null-fix.md`
  - `agent-output/implementation/148-implementation-rpc-fix.md`
  - `agent-output/code-review/148-code-review-rpc-fix.md`
  - `agent-output/qa/148-qa-rpc-fix.md`

## 2026-06-06 — Provider edit form inline state persistence

**Context**: Plan 149 — users lost inline form edits (name, description) when navigating to sub-pages (category, images, etc.) in the admin provider edit form.

**Problem**: `syncFromLocalStorage` only restored sub-page data (category, social, images, menu, delivery, hours, halal, values). Inline fields (name, description, address, contact) were React state only and lost on unmount.

**Solution**: Added `saveInlineDataToLocalStorage` that persists inline fields to localStorage under `{prefix}edit_inline_{pid}`. All `router.push()` calls to sub-pages were replaced with `saveInlineDataAndNavigate()` which saves before navigating. `syncFromLocalStorage` now restores inline fields on return.

**Pattern**: For any multi-page edit form using sub-page navigation + localStorage, ensure ALL fields (not just sub-page fields) are persisted before navigating away. The pattern is: save-before-navigate + restore-on-return.

## 2026-06-09 — Cheerio type mismatch: Root vs CheerioAPI (Plan 156 M2)

**Context**: Plan 156 M2 — using cheerio 1.x for Lieferando HTML parsing.

**Learning**: `cheerio.load()` returns `CheerioAPI` in the declaration files, but when the return value is used in tests or passed between modules, TypeScript infers the type as `Root` (from `domhandler`'s internal type). These are structurally incompatible — `Root` lacks `version` and `load` properties that `CheerioAPI` requires. The fix: use `type CheerioDoc = ReturnType<typeof cheerio.load>` as the parameter type in internal parsing functions instead of importing `CheerioAPI` from cheerio. This avoids the type mismatch entirely because TypeScript infers the concrete type from the module's own load function.

**Change**: Document this pattern for future cheerio usage — always use `ReturnType<typeof cheerio.load>` for the document type, not the named `CheerioAPI` export. If cheerio upgrades change this, update the manual fixture.

**Task**: Plan 156, M2

## 2026-06-10 — JoinHalal enrichment RPC mismatch (Plan 159)

**Context**: Plan 159 — extending JoinHalal enrichment with auto-apply for new fields.

**Learning**: The plan's `autoApplyJoinHalalFields` function described individual RPC parameters (`p_provider_name`, `p_description`, etc.), but the actual `admin_update_provider` RPC takes `(p_provider_id UUID, p_data JSONB)`. The script already uses the JSONB payload pattern in `autoApplyDeliveryFields` via `buildAutoApplyPayload`. Always check the actual RPC signature (in `supabase/migrations/`) rather than relying on plan pseudocode. For JoinHalal fields, the JSONB payload goes under `p_data.providers.{field_name}`.

**Change**: Used `supabase.rpc('admin_update_provider', { p_provider_id, p_data: { providers: { ... } } })` matching the existing Wolt/Lieferando auto-apply pattern.

**Task**: Plan 159

## 2026-06-10 — Enrichment source selection: re-fetch import source vs external search

**Context**: Plan 156-159 — building auto-enrichment for food providers.

**Learning**: When choosing enrichment sources for imported data, the import source itself is almost always better than external delivery platforms. For JoinHalal imports (80%+ of providers), re-fetching the original page gives rich Schema.org data (description, geo, opening hours, images, cuisine) with zero search friction — we already have the exact URL. In contrast, delivery platforms (Wolt, Lieferando, UberEats) require unreliable search-by-name-and-location, suffer from anti-bot measures, and often don't list small halal restaurants at all. The takeaway: always design the import to capture enough context for later enrichment (import_source_url, original schema), and prefer re-fetching the source over external matching.

**Change**: Scoped delivery platform enrichment to experimental (UberEats) or fallback. Made JoinHalal first-class with auto-apply. Updated workflow to run JoinHalal first.

**Task**: Plan 159

## 2026-06-10 — Direct-URL enrichment vs search-based (Plan 160)

**Context**: Plan 160 — building delivery link menu fetch.

**Learning**: Search-by-name-and-location enrichment (the original approach) is fundamentally unreliable for small/niche restaurants. The failure isn't in the code — it's in the data quality: most halal restaurants simply aren't discoverable via platform search APIs. A human-in-the-loop approach where the user manually finds the restaurant URL and adds it to the provider flips the problem: instead of "find this restaurant among 1000 venues in this city", it becomes "fetch this one page we know exists". This converts a search problem into a retrieval problem, which has near-100% success when the URL is valid. The tradeoff is human effort (finding URLs) vs automated processing (fetching is already automated).

**Change**: Created `scripts/add-delivery-link.ts` (human adds URL) and `scripts/enrich-delivery-menus.ts` (system fetches menu). Both scripts share `extractSlug` logic and the `admin_update_provider` RPC for menu writing.

**Task**: Plan 160

### 2026-06-12 — Test expectations as regression sensors for schema changes

- **Context**: Plan 165 — added `'ummah'` to Zod schema listingType enum (P0 fix), causing existing test `"restricts listingType to food, store, or null"` to fail.
- **Learning**: Tests that assert schema value restriction (e.g., `'ummah'` is rejected) are dual-purpose: they validate current behavior AND serve as regression sensors when values are intentionally expanded. The expected test failure is a feature, not a bug — it confirms the schema change took effect. Document expected failures explicitly in the plan to avoid false alarm during verification.
- **Change to prevent repeat**:
  - Include expected test failures in the plan's TDD compliance table, annotated with pre-fix/post-fix status
  - Run `npm test` first before any changes to establish baseline failures
- **Task/PR**: Plan 165

## 2026-06-10 — Direct-URL enrichment vs search-based (Plan 160)

- **Context**: Analysis 164 reported 11 stale + 36 new = 47 categories needing work, with a naive final pool of 9 + 11 + 36 = 56 entries. Italian, Indian, and Thai appeared in both stale-fix AND new-cuisine tables.
- **Learning**: When upstream docs partition data into groups (stale vs new), always cross-reference by UUID to detect overlapping entries. The true unique count was 53 (= 9 valid + 8 non-overlapping stale fixes + 36 new).
- **Change to prevent repeat**:
  - Planner: when inheriting counts from analysis, verify by comparing UUID/key sets between groups, not by summing raw counts
  - Analyst: if a category appears in both a "stale fix" and "new entry" table, note the overlap explicitly in findings
- **Task/PR**: Plan 164

### 2026-06-13 — Plan 169: "Alle Restaurants" sentinel type in search filter

- **Context**: Adding a static "Alle Restaurants" entry before dynamically loaded POPULAR categories with a dedicated `'all-restaurants'` sentinel type.
- **Learning**: When the plan says "if inline, extract it" for a utility function used by tests, extract it unconditionally — avoids import-path guesswork and keeps the regression test importing from the same source of truth as production code. The early-return guard needs to reference `shouldShowAllRestaurants` but `shouldShowRecent` is defined later in the original code — reordering the variable definitions fixed it cleanly.
- **Change to prevent repeat**: Introduce `shouldShowRecent` before the early return when adding a visibility condition that depends on it. Pre-extract utility functions early when tests need them, rather than leaving conditional extraction to implementation time.
- **Task/PR**: Plan 169

## 2026-06-13 — Mobile header gap: Tailwind token cascade

- **Context**: Plan 167 — mobile had 96px excess gap between header and content because `header-spacing` tokens were all flattened to `160px` and `PageContent.tsx` used a single flat value.
- **Learning**: Tailwind config spacing tokens cascade to all consumers automatically — fixing `header-spacing` in `tailwind.config.ts` also fixed `HeaderSpacer.tsx` without a code change. But `PageContent.tsx` used inline `pt-[calc(...)]` instead of the token (`pt-header-spacing`), so it needed a manual fix. The root cause was a Tailwind config flatten (all breakpoints set to the same value), which masked the breakpoint mismatch until deployment.
- **Change to prevent repeat**: When reviewing Tailwind config changes, check that per-breakpoint tokens (sm/md) actually differ from the base value. When hand-authoring calc expressions in components, prefer using the token name instead to stay DRY and auto-fix from config changes.
- **Task/PR**: Plan 167

## 2026-06-13 — Filter reorder: Where before What

- **Context**: User requested filter order change so Where (location) appears before What (search) in both search page accordion and SearchBar.
- **Learning**: Filter ordering is defined in two separate contexts — the accordion-based search page (`page.tsx`) and the inline SearchBar (`SearchBar.tsx`). Both need coordinated reordering. The SearchBar also required removing a wrapping filters div when restructuring the layout.
- **Change to prevent repeat**: When reordering UI elements across the app, always search for both contexts (accordion/page and inline/header) to ensure consistency.
- **Task/PR**: Direct user request

## 2026-06-13 — Plan 170: Section-scoped city counts

**Context**: "281 Anbieter" appeared hardcoded in the Wo (Where) accordion. Root cause was 3 linked issues: `fetchPopularCities()` had no `listing_type` filter (combined all sections), the `loadPopularCities` effect had empty `[]` deps (never refetched on section change), and `countByCity` Map was built from only top-3 cities (selected/recent cities outside top 3 showed 0).

**Fix**: Added optional `section` param to `fetchPopularCities()`, added `.eq('listing_type', section)` when provided; changed `loadPopularCities` effect dep to `[selectedSection]`; passed full `cityCounts` array instead of `slice(0,3)`.

**Takeaway**: When users report a "hardcoded" value that isn't in source code, it's often a stale or incorrectly-scoped data fetch. Trace the data flow from DB to UI — the number is real but comes from the wrong query scope.

## 2026-06-13 — Plan 169: Decoupled rendering pattern for static list entries

**Context**: Added an "Alle Restaurants" entry to the search filter's "Was?" accordion. The render was initially tied to `shouldShowPopular`, which depends on `items.length > 0` (API-driven). The Architect caught this: on a fresh database with no providers, the entry would be invisible.

**Pattern**: When adding a static entry to a dynamic list:

1. Give it its own visibility condition (`shouldShowAllRestaurants`) independent of the API-driven condition.
2. The early return guard must account for it: don't `return null` when the static entry is the only thing to render.
3. Same applies to any future "Alle" entries in other sections (ummah, store).

**File affected**: `src/features/search/components/WasCategoryResults.tsx` — early return guard (line ~115), `shouldShowAllRestaurants` variable (line ~113), RowItem render before POPULAR block (lines ~208-229).

### 2026-06-13 — Branch-first workflow: create branch before any code changes

- **Context**: CI Pipeline #411/#412 failed on pre-existing test issues because Plan 172 changes were made directly on the working tree, then committed to a branch at deploy time. If the branch had been created upfront, the CI feedback loop would have been faster.
- **Learning**: The orchestrator should create a dedicated feature branch at the start of Phase 3 (Implementer) — before any code is written — not at Phase 6 (DevOps). This gives CI visibility during implementation and avoids deployment-time surprises from pre-existing failures.
- **Change to prevent repeat**: Insert a branch-creation step between Planner → Implementer handoff. The orchestrator creates `fix/<ID>-<slug>` (or `feature/<ID>-<slug>`) from main, pushes it, and passes the branch name to the implementer. All subsequent commits (implementer, code-reviewer fixes, QA fixes) go onto that branch. The DevOps phase then only needs to push/PR.
- **Task/PR**: Plan 172, PR #249

### 2026-06-13 — Check actual database schema from Supabase, not local files

- **Context**: The `adminSchemas.test.ts` fix revealed a mismatch between the local test file and the actual database state. The test expected `listingType` to reject `'ummah'`, but the schema at `adminSchemas.ts:70` already accepted it (`z.enum(['food', 'store', 'ummah'])`). The DB migration and local validation were out of sync. Relying on local files (types, migrations) for schema truth is fragile — they can diverge from the actual database.
- **Learning**: When investigating bugs or planning changes that depend on database schema (enum values, column types, constraints), verify against the actual Supabase database — not local type definitions or migration files. Use `supabase db dump --schema public`, `supabase db diff`, or direct SQL queries (`SELECT * FROM information_schema.columns`, enum introspection) to get ground truth.
- **Change to prevent repeat**: Add a "verify DB schema from Supabase" step to the Analyst phase when the bug involves data validation, database enums, or column constraints. The analysis doc should cite actual DB state, not just local files.
- **Task/PR**: Plan 172, PR #249

### 2026-06-18 — Modal close navigation (Plan 185)

- **Context**: Provider detail modal close always navigated to hardcoded `/providers` instead of returning to the previous page.
- **Learning**: When a modal is rendered on a detail page and the expected behavior is "go back to wherever the user came from", use `router.back()` instead of `router.push('/static-path')`. This preserves the full URL (including query params) from the referrer. The `handleBack` function in the mobile component already had the correct fallback pattern (`if (backPath) push else back()`) — just needed the hardcoded prop removed.
- **Change to prevent repeat**: When reviewing navigation-on-close patterns for modals/modalsheets, check: is the back target dynamic (use `router.back()`) or static (use `router.push`)? Static targets lose referrer context.
- **Task/PR**: Plan 185, PR #263

### 2026-06-18 — Subagent model/perm root cause (Plan 186)

- **Context**: "The [subagent] encountered an error" appeared in almost every session. The analyst, code-reviewer, and planner all failed intermittently.
- **Learning**: Two root causes: (1) All subagents were configured with `anthropic/` and `openai/` model prefixes that don't exist in opencode Go — only `opencode-go/` models are available. (2) Analyst and code-reviewer had `edit: deny` globally with no path-specific overrides, so they couldn't create documents in their `agent-output/` directories. Always verify subagent model availability (`opencode models`) and edit permission path overrides when agents fail to initialize.
- **Change to prevent repeat**: When adding or modifying subagent configurations, verify the model ID exists in `opencode models` output and that document-creating agents have path-specific `edit` overrides matching the QA/Planner pattern.
- **Task/PR**: Plan 186, PR #264

### 2026-08-31 — External tool interference with file writes (SEO URLs)

- **Context**: While building path-based SEO-friendly URLs (`/food/[city]/[category]`), file writes via the Devin edit/write tools were silently reverted by an external process (`opencode serve` running in the background). New file creation and edits to existing files would appear to succeed but would revert within seconds, causing repeated build failures.
- **Learning**: When file changes are silently lost, check for competing AI coding tools or IDE processes that may be watching and reverting files. Use `ps aux | grep opencode` (or similar) to identify conflicts. Shell-based file writes (`cat > file << 'EOF'`) followed by immediate `git add && git commit` proved reliable because git locks the changes before the external process can revert them. Python scripts for batch edits also worked well.
- **Change to prevent repeat**: Before starting a multi-file refactor, check for running processes that might interfere with file writes (`opencode`, `cursor`, `windsurf`). Commit frequently (after each logical batch of changes) to lock in progress. Prefer shell-based writes when the edit tool shows unreliable behavior.
- **Task/PR**: SEO-friendly URLs feature branch

### 2026-09-05 — Search bar component mismatch after slot-based header refactor (Plan 222)

- **Context**: After refactoring the providers page header to use `DiscoveryHeader` with a `searchSlot` prop, `HomeSearchInput` was used in the slot. `HomeSearchInput` uses local `useState('')` and never reads URL params, so navigating to `/providers?q=Lolo` showed results but an empty search bar.
- **Learning**: When a header component uses a slot pattern (`searchSlot`), the slotted component must match the page's data flow. `HomeSearchInput` was designed for the home page (no URL query state). `SearchContextBar` was already built for results pages (reads `searchTerm` prop, syncs via `useEffect`, has clear button). The fix was a 1-line swap. Before using a component in a new context, check whether it reads the data source that context provides (URL params vs. local state vs. context).
- **Change to prevent repeat**: When wiring up slot-based headers, verify the slotted search component reads the same source of truth as the page. `HomeSearchInput` = local state only (home page). `SearchContextBar` = prop-driven with URL sync (results pages).
- **Task/PR**: Plan 222, PR #356

### 2026-09-05 — Nginx default timeout too low for LLM-backed API routes (Plan 223)

- **Context**: POST `/api/chat` returned 504 Gateway Timeout on UAT. The chat API calls Mistral AI (up to 60s per request + 30s streaming), but nginx's default `proxy_read_timeout` is 60s. The retry loop (5 retries with exponential backoff) could extend the total to 362s.
- **Learning**: Any API route that calls an external LLM needs a dedicated nginx `location` block with an extended `proxy_read_timeout`. The timeout budget must be layered: app deadline < nginx timeout < Cloudflare ceiling. For this project: 85s app < 95s nginx < ~100s Cloudflare. The admin routes already had 95s for import operations; the chat route was missing this because it was added later (Plan 176) without updating the nginx config.
- **Change to prevent repeat**: When adding a new API route that calls external services with latency > 10s, add a matching nginx `location` block with explicit `proxy_read_timeout`. Check the timeout chain: app-level deadline, nginx proxy timeout, CDN timeout. Document the budget in the nginx config comment.
- **Task/PR**: Plan 223, fix/223-chat-504-timeout

### 2026-09-06 — Shared hooks that manage UI state should sync to URL params (Plan 226)

- **Context**: The `useMapDiscovery` hook managed map/list view toggle as pure React state. Three surfaces (homepage, results pages, search) all used it, but none reflected the view in the URL. Users couldn't share, deep-link, or use back/forward to preserve view state.
- **Learning**: When a shared hook manages UI state that's meaningful to the user (view mode, tab selection, filter state), make URL sync an opt-in capability on the hook itself, not a per-consumer concern. The pattern: add an optional `urlSync` config with `searchParams`, `pathname`, and `replace`. Read the param on mount, write on change. Strip the param when the value matches the default to keep URLs clean. This avoids duplicating URL logic in every consumer and keeps the hook backward-compatible (no urlSync = pure state).
- **Change to prevent repeat**: When adding a new shared hook that manages a user-visible toggle/filter, include an optional `urlSync` param from the start. Check: can a user reasonably want to share this state via URL? If yes, sync it.
- **Task/PR**: Plan 226, cr/226-mobile-url-routing

### 2026-09-07 — Orchestrator must fetch main before worktree creation

- **Context**: The orchestrator created worktrees from local `main` without fetching from origin first. When local `main` was stale, worktrees started from outdated commits, causing avoidable merge conflicts.
- **Learning**: Two issues in the orchestrator skill: (1) No `git fetch origin main` before `git worktree add`, so branches could start days behind remote. (2) The bug/hotfix flows had the orchestrator doing read-only investigation (grep, read files, build hypotheses) itself instead of dispatching a subagent, blurring the orchestrator/worker boundary.
- **Change to prevent repeat**:
  - Added `git fetch origin main && git branch -f main origin/main` as a required step before every worktree creation (Phase 0, session isolation, multi-ticket)
  - Added Rule 2 "Fetch before branching" to the Rules section
  - Moved bug diagnosis and hotfix reproduction into subagent dispatches
  - Added explicit "What the orchestrator DOES do directly" section to clarify the boundary
- **Task/PR**: Orchestrator skill refinement

### 2026-09-07 — Orchestrator is pure router: skill docs define the work, not the orchestrator

- **Context**: The orchestrator SKILL.md had grown to 438 lines, re-describing what each skill does internally (grilling rounds, diagnosis phases 1-6, TDD loops, code-review axes). This duplicated the skill definitions, created maintenance burden, and confused the orchestrator's actual role.
- **Learning**: The orchestrator's job is three things: setup (ID, fetch main, worktree, tracking file), classify (feature/bug/refactor/CR/hotfix/exploration), and dispatch (which subagent, which skills, in what order). Each flow is a table: phase, subagent type, skills, one-line description. The skills themselves define what happens inside each phase. When the orchestrator re-describes skill internals, it creates drift and bloat.
- **Change to prevent repeat**:
  - Rewrote the orchestrator from 438 lines to ~240 lines
  - Each flow is a pipeline diagram + dispatch table, not a prose description of skill phases
  - Orchestrator never invokes skills directly, never does investigation, never runs grilling
  - Skills define their own internals; the orchestrator just names them
- **Task/PR**: Orchestrator skill refinement

### 2026-09-19 — Import scripts must create child table rows, not just parent

- **Context**: `discover-wolt.ts` imported providers with address/coordinate data on the `providers` table but never created a `locations` row. Post multi-location migration, the UI reads from `locations`, so Wolt-imported providers appeared completely empty (no address, no map, no hours). The Wolt enrichment pipeline couldn't fix them because it fuzzy-matches by name + city, and these providers had empty `address_city`. A backfill ran against 1265 providers and fixed 0 locations because there was no data to copy from providers to locations (the root problem was missing location rows, not missing data on the providers table).
- **Learning**: When a migration moves data from a parent table to a child table (e.g., `providers.address_*` to `locations.address_*`), all import scripts that write to the parent must also write to the child table. The migration backfills existing rows once, but post-migration imports silently produce incomplete records. Verify all write paths, not just the read path. Also: when a provider already has a known source identifier (e.g., Wolt slug in `import_source_id`), the enrichment pipeline should use it directly instead of fuzzy-matching by name. The direct path is more reliable and avoids the city-dependency.
- **Change to prevent repeat**: (1) After any migration that moves columns to a child table, audit all INSERT scripts for the parent table. (2) When building a backfill, verify the data actually exists where you expect it (the backfill assumed data on `providers` needed copying to `locations`, but the data didn't exist on either table). (3) For providers with known source identifiers, prefer direct API lookup over fuzzy matching.
- **Task/PR**: PR #393 (fix/240-wolt-direct-slug-enrichment), Issue #392

### 2026-09-24 — useIsMobile tree-branching is a codebase-wide anti-pattern

- **Context**: After fixing `/p/[id]` page transition flash (#248), an audit found the same `useIsMobile`/`useIsSmallMobile` anti-pattern in 20+ files: the hook starts `false`, so mobile renders desktop UI for one frame before swapping. Affected: community-service detail, profile, all create/* pages, legal pages, discovery grid, provider buttons, splash screen.
- **Learning**: `useIsMobile()` (or any `useState(false)` + resize effect) must never gate which component tree renders. The first client render always takes the `false` branch, causing a one-frame flash of wrong UI on mobile. Two fixes exist depending on the subtree: (1) CSS visibility toggling (`md:hidden` / `hidden md:block`) for pure DOM subtrees, (2) `matchMedia` + useState + useEffect JS gating for portal-based components (modals, sheets, dropdowns) that escape CSS display:none. Never mix portals with CSS hiding.
- **Change to prevent repeat**:
  - Grep for `useIsMobile` and `useIsSmallMobile` during code review. Any caller that branches on the return value to render different component trees is a bug.
  - The `useIsMobile` hook is safe only for non-layout concerns (analytics, telemetry, non-visual behavior).
  - For layout: always render both variants and let CSS pick. For portals: always JS-gate with `matchMedia`.
  - Deleted `DesktopCreateLayout` and `MobileLayoutWrapper` (dead code that encoded the anti-pattern).
- **Task/PR**: Request 250, PR #410

---

### 228 - Background subagents need pre-approved write scope

- **Date**: 2026-09-24
- **Context**: Dispatched a background worker to edit SKILL.md in a worktree. The subagent couldn't get write permission approved (background agents auto-deny unapproved tools).
- **Learning**: Background subagents in Devin CLI can't prompt for scope approval. Always call `request_scope` for the worktree path before dispatching a background worker, or use a foreground worker for the first write operation. Re-dispatching a failed background subagent as foreground wastes the cost savings.
- **Change to prevent repeat**: Add to orchestrator workflow: after creating a worktree, immediately `request_scope("write", worktree_path)` before any background subagent dispatch.
- **Task/PR**: Request 228, PR #411

### 255 - A NOT NULL column with no default silently killed the whole recommend flow

- **Date**: 2026-09-25
- **Context**: Request 255 set out to add a "+" menu for creating/recommending restaurants. The grill flagged a suspected bug (R1): `providers.listing_type` is NOT NULL with no default (`0061_phase4_semantic_constraints.sql:95-96`), but `createProviderOrService` omitted it from the insert payload and only called `resolveListingType()` _after_ the insert. Verification against the live DB via PostgREST introspection confirmed it: every public recommend submission had been failing on the NOT NULL constraint. The smoking gun was `recommender_email` non-null on **0 of 941** rows, meaning no recommendation had ever been saved. The 4 rows carrying `listing_type='food'` came from a different RPC path.
- **Learning**: Two failures compounded. First, a required column was resolved after the statement that required it, so the code could never work. Second, the adjacent halal-attestation write was wrapped in `try { ... } catch (e) { console.error(e) }`, so related failures were logged and swallowed rather than surfaced. A feature can be 100% broken in production indefinitely when the only signal is a console error in someone else's browser. "No rows have this column populated" is a much stronger health signal than "no error reports".
- **Change to prevent repeat**:
  - When touching an insert path, list the target table's NOT NULL columns that have no default and confirm every one is present in the payload _before_ the insert. Derive-then-insert, never insert-then-derive.
  - Never `catch` around a write whose failure leaves the row unusable. If the extension row is required for approval, its failure must throw and compensate (here: delete the provider, which is safe because `locations.provider_id` cascades).
  - Sanity-check a feature's health with a data question, not a code read: "how many rows has this path ever produced?" If the answer is zero, the path is broken.
  - The `.cursor/rules/workflow.mdc` rule about verifying schema against Supabase rather than local files is what caught this. Its weak point is access: `psql` and `supabase db dump --local` were both unavailable and both Supabase MCP servers failed to connect. PostgREST OpenAPI introspection with the service-role key is the fallback that worked; document it as the primary method.
- **Task/PR**: Request 255, Issue #415, commit `64cc2255`

### 255 - Making a column nullable silently reinterprets every read of it

- **Date**: 2026-09-25
- **Context**: Request 255 introduced tri-state halal answers (yes / no / not sure), which required migration `129_halal_attestation_nullable.sql` to drop NOT NULL and `DEFAULT false` on `no_alcohol`/`no_pork`/`no_gambling`. The migration itself was 28 lines and correct. The fallout was not. Two separate review rounds each found a defect caused purely by existing code meeting a value it had never seen before: (1) three admin edit load sites coalesced `?? false`, so opening and saving an edit form rewrote "unknown" as "submitter declared this non-halal", and `adminSchemas.ts` typed the fields `z.boolean()`, meaning NULL could never even reach the API; (2) `computeHalalStars` skipped its attestation guard when all three values were NULL and then awarded 1 star off the schema-default `verification_method='online'`, so every "not sure" recommendation would have displayed an unearned halal star on discovery cards.
- **Learning**: Adding NULL to a column's domain is a semantic change, not a constraint change. Every existing read was written against a two-valued domain and will coerce the third value into one of the two, usually the wrong one, and usually silently. The dangerous pattern is `?? false` / `!` / `Boolean(x)` on a newly-nullable column: it compiles, it type-checks, and it quietly asserts the opposite of "unknown". The second defect was more insidious because the buggy path already existed and was even unit-tested, but was unreachable in practice while the column was NOT NULL; the migration promoted it from dead code to the default case for the whole feature.
- **Change to prevent repeat**:
  - When a migration makes a column nullable, grep every read of that column and audit each one before shipping the migration. Treat `?? false`, `!x`, `Boolean(x)` and `!== undefined` on that column as defects until proven otherwise.
  - Check the validation layer too, not just the UI and the DB. A Zod `z.boolean()` in the middle silently makes a tri-state impossible end to end.
  - Ask "was this branch previously unreachable?" A guard that looks redundant may be dead only because of the constraint you are about to drop.
  - Where two algorithms compute the same user-facing signal (here `computeSealTier` and `computeHalalStars`), a nullability change must be applied to both, and a test should assert they agree on the new value. One had the guard; the other did not.
- **Task/PR**: Request 255, Issue #415, commits `95d64da3`, `2fd05daf`, `95a9d470`

### 255 - A blocked requirement can dissolve instead of being met

- **Date**: 2026-09-25
- **Context**: AC5.7 required writing GDPR consent to `consent_logs` when an anonymous recommender supplied their email. Implementation hit a wall: `consent_logs.user_id` is NOT NULL (an anonymous recommender has none) and its `consent_type` enum only holds `terms_of_service` and `privacy_policy`. The implementer correctly stopped and reported instead of inventing columns or writing an unrequested migration. The options looked like "migrate `consent_logs`" or "add a second consent table", both of which meant touching a table auth flows depend on. The actual resolution came from upstream of the code: require login before recommending. That removed the requirement entirely, because no third-party personal data is stored, the submitter is identified by `user_created_id`, and their account is already covered by existing ToS and privacy consent. No migration, no consent table, no compliance gap. It also let us delete the anonymous insert branch from the new RLS policy, remove a middleware carve-out, and drop a pile of now-dead anonymous-handling code.
- **Learning**: When a requirement collides with the schema, the cheapest fix is often a product decision, not a migration. Escalate the collision with the trade-off stated rather than engineering around it. Two habits made this work: the implementer stopped at the schema wall instead of guessing, and the blocker was put to the decision-maker as a _choice_ (migrate / separate table / stop collecting / require login) rather than as a request for approval of one predetermined plan. The option that won was not on the original list, it came from the user, and it was better than all four.
- **Change to prevent repeat**:
  - Brief implementers to stop and report when a requirement needs schema they were not asked to create. "Invent a column" and "write an unrequested migration" are both worse than a blocked report.
  - When escalating a blocker, present the real options with their costs, and name the trade-off you would accept. Leave room for an answer outside the list.
  - Say the uncomfortable part out loud. Requiring login reduces submissions, which works directly against this request's stated goal of "more content". Flagging that explicitly is what made it an informed decision rather than a silent regression.
  - After a decision like this, sweep for newly-dead code and newly-dead policy branches in the same chunk. Leaving the anonymous RLS branch in place would have left a path that bypassed the rule just established.
- **Task/PR**: Request 255, Issue #415, commits `d052cfcf`, `49b2e6cc`

### 255 - Source-scan tests buy confidence without buying coverage

- **Date**: 2026-09-25
- **Context**: Plan 255 shipped 9 commits with 1,459 passing tests, clean `type-check`, clean per-file lint, and a green `i18n:check`. A final independent review then found a Critical regression (**desktop owner create was impossible for every restaurant and shop**, because the desktop form has no halal UI and a new service-boundary guard rejected the resulting `undefined` attestations) plus five more serious defects. **Not one of them was caught by any automated check.** The clearest example: a guard test written specifically to prevent NULL being coerced to false asserted `not.toMatch(/noAlcohol.*\?\? false/)`, and the actual bug in the same file was `parsed.noAlcohol ?? prev.noAlcohol`. The test passed while the bug it existed to prevent was live one operator away. Others in the same family: a test titled "fits 4 tabs at 320/360/430px" that asserts a CSS class string and never renders at any width; tests asserting substrings in `.sql` files, which pass whether or not the SQL is correct or even applied; and a seal-leak test scanning a file that renders the leaking component indirectly.
- **Learning**: A test that greps source text proves a string exists, not that behaviour holds. It is worse than no test, because it occupies the slot where a real test would go and reports green. This repo has a pre-existing convention of source-scan tests (`plan228-...`, `mobile-nav-icon-flash`), which made it feel normal to keep adding them, and they accumulated until the suite could not detect a completely broken primary user path. Two structural lessons beyond the tests themselves: (1) reviewing work chunk by chunk catches defects **within** a layer but is blind to a value dying **between** layers, and every serious defect here clustered at exactly two untested boundaries, localStorage on the way in and a SQL RPC on the way out; (2) the author reviewing their own work missed all six, and so did the orchestrator who had reviewed each chunk, while a reviewer with no prior context found them in one pass.
- **Change to prevent repeat**:
  - For any behaviour a user can reach, write a test that exercises it. Reserve source scans for genuinely structural invariants (an import is absent, a route is deleted) and never for a value's behaviour.
  - Prove a new test works by making it fail. Stash the fix, watch it go red, restore, watch it go green. "Tests pass" is not evidence a test is doing anything; this is now the standard asked for in rework handoffs.
  - When a change alters a value's domain, write one test that follows that value end to end: form state -> validation -> service -> SQL -> read back -> render. Per-layer tests will each pass while the value dies in between.
  - Run a final review against the merge-base with a **fresh** reviewer, not the author and not the person who reviewed the pieces. Both of those have already formed the belief that the code is fine.
  - Assertions on migration SQL text prove nothing about the database. If a migration is not exercised, label it unproven rather than counting the test as coverage.
- **Task/PR**: Request 255, Issue #415, PR #418, fixes in `b7ac6f6b`

### 255 - "Narrowest checks that cover the change" is only safe if you know what the change covers

- **Date**: 2026-09-26
- **Context**: Across eight implementation handoffs on Plan 255 I asked for narrow verification each time, naming the test directories that looked relevant (`regression/`, `api/`, `components/`, `utils/`, `services/`). Every handoff reported green. When CI finally ran the full suite it found `src/__tests__/features/providers/ProofTierCardQA.test.tsx` failing 7 of 13, plus `src/__tests__/lib/import/joinhalal-section-fields.test.ts` failing, because both asserted contracts we had deliberately changed (gold tier without a stored certificate; the old JoinHalal import defaults). Neither directory was ever in the list I supplied. Separately, CI had **never run on the PR at all**: `ci.yml` triggers on `pull_request` targeting `[main, develop]`, and I had stacked the PR on another feature branch, so only Snyk ran while I told the user CI was running in parallel. The same run also caught two performance-budget violations nobody had looked for.
- **Learning**: Narrow verification is the right default for iteration speed, but the narrowing has to be derived from what the change actually touches, not from a directory list that felt relevant when the first handoff was written. A behaviour change ripples to every test asserting the old contract, and those live wherever the original feature was tested, which is frequently not where you are working. Two concrete rules fall out: run the **full** suite at least once before opening a PR and after any deliberate contract change, and verify that CI is genuinely running rather than assuming a green-looking PR page means it did. A stacked PR on a non-`main` base can look healthy while every gate that matters sat idle.
- **Change to prevent repeat**:
  - Before opening a PR, run the full suite with no path filter. Per-chunk narrow runs stay, but they are not the gate.
  - When deliberately changing a contract (a tier rule, a default, a column's domain), grep the whole test tree for assertions on the old behaviour **in the same change**, and update them with titles that state the new contract. A stale test that fails later is a bug report you paid for twice.
  - Check which workflows actually triggered on a PR instead of trusting the checks list. If a PR is stacked on a non-`main` base in this repo, `ci.yml` will not run; use `gh workflow run ci.yml --ref <branch>` or merge the parent first.
  - Never raise a performance budget or any other gate threshold to get green. Here the whole overage traced to the all-six-locale translations bundle being statically imported in root `ClientProviders`; lazy-loading the four non-default locales took ~59 kB off **every** route and left the budgets untouched. The gate was pointing at something real.
- **Task/PR**: Request 255, Issue #415, PR #418, commit `55eed7e1`, CI run 36243663373

### 255 - Fixing one blocker exposes the next, and every ownership-keyed policy excludes recommendations

- **Date**: 2026-09-26
- **Context**: PR #416 fixed the `listing_type` NOT NULL bug that had been failing every public restaurant submission. It auto-deployed to UAT (`deploy-uat.yml` runs on push to `main`), and recommendations immediately started failing at the _next_ statement with `42501 new row violates row-level security policy for table "locations"`. The `locations` INSERT policy from migration 101 read `auth.uid() IN (SELECT provider_owner_id FROM providers WHERE provider_id = locations.provider_id)`. A recommendation has `provider_owner_id = NULL` by design, so the subquery produced NULL, `auth.uid() IN (NULL)` evaluated to NULL rather than true, and the check never passed. That policy had only ever permitted owner-created providers. Worse: `createPrimaryLocation` sits inside a `Promise.all` that runs _before_ the extension-row write and its compensating delete, so the throw escaped before either ran, leaving an orphaned provider row with no location and no extension row, which the Plan 228 gate makes permanently unapprovable. And the `providers` DELETE policy keyed on `provider_owner_id` too, so nothing could clean it up.
- **Learning**: Two distinct lessons. **(1)** In a codebase where a "recommendation" is modelled as a row with a NULL owner, every RLS policy keyed on `provider_owner_id` silently excludes recommendations. That is a systemic class, not a one-off: it hit the `locations` INSERT policy, the `providers` DELETE policy, and would have hit `locations` UPDATE/DELETE had any path used them. When introducing an entity variant distinguished by a NULL column, audit every policy that references the non-NULL discriminator. **(2)** `x IN (SELECT nullable_col ...)` is a trap: when the subquery yields NULL the whole expression is NULL, which a `WITH CHECK` treats as failure, with no error explaining why. Prefer `EXISTS (SELECT 1 ... WHERE ...)`, which has unambiguous semantics. Corollary on sequencing: when you fix a blocking bug in a multi-step write, expect the step after it to have never executed successfully in production, and therefore to be untested. Trace the whole path before shipping the fix.
- **Change to prevent repeat**:
  - Grep every RLS policy for the ownership column before adding an entity variant that leaves it NULL. `provider_owner_id` is set on 1 of 941 rows in this codebase, so policies keyed on it are effectively closed doors.
  - Never write `x IN (SELECT nullable ...)` in a policy. Use `EXISTS`.
  - A multi-statement write needs compensation around **every** statement after the first insert, not just the last one. Here the extension-row write was wrapped and the location insert was not, purely because the extension row was the one someone had thought about.
  - Asymmetric policy branches deserve a comment explaining the asymmetry. The final `locations` policy gates the creator branch on `review_status = 'pending'` while leaving the owner branch unconditional, so a creator cannot keep adding publicly-visible locations to a listing after approval when they cannot even edit the row. Without a note, that reads as an oversight and invites "simplification".
  - Know which environments auto-deploy. `main` pushes go straight to UAT here, while production needs a manual `workflow_dispatch`. That asymmetry is what kept this out of production.
- **Task/PR**: Request 255, Issue #415, PR #418, migration 133, commits `fba42d80`, `3a694a14`

### 2026-09-20 — Button type="submit" inside forms causes double-fire when combined with onClick

- **Context**: Provider edit page had Reject, Save, and Approve buttons inside a `<form>`. None had explicit `type` attributes, so all defaulted to `type="submit"`. Clicking Reject triggered both the onClick handler (opening a modal) and form submission (navigating away). Save had both `type="submit"` AND `onClick={handleSubmit}`, firing `handleSubmit` twice per click.
- **Learning**: In HTML, buttons inside a form default to `type="submit"`. When you add an `onClick` handler AND leave the button as `type="submit"`, clicking fires both: the onClick handler runs, then the form's onSubmit handler runs. For action buttons that should NOT submit the form (Reject, Approve, Delete), always set `type="button"`. For the submit button, use `type="submit"` with NO `onClick`; let the form's `onSubmit` be the single entry point. Also: when two API calls write the same field (e.g., `review_status`), the second call's optimistic-concurrency check (`updated_at` match) fails because the first call bumped it. Route each field through exactly one write path.
- **Change to prevent repeat**: (1) All buttons inside `<form>` tags must have an explicit `type` attribute. (2) Submit buttons should use `type="submit"` only, with no `onClick`. (3) Review status changes go through `finishModerationAction` only, never through the general save endpoint.
- **Task/PR**: PR #395 (fix/227-provider-edit-bugs), Issue #394

### 227 - Don't change icon sizes without confirming design intent

- **Date**: 2026-09-24
- **Context**: Mobile bottom nav icons flashed when switching tabs. Diagnosis identified two causes: (1) active/inactive SVGs had different sizes, (2) `isNavigating` dimmed all icons for 150ms. The fix wrongly normalized icon sizes to 24x24, but the size difference was intentional design (filled icons are bigger than outline icons). The real fix was only removing the opacity flash.
- **Learning**: When icons have different sizes between active/inactive states, don't assume it's a bug. Check with the user or designer first. The visible "flash" here was caused by the 150ms `opacity-50` transition, not the size difference. Avoid fixing visual design that's working as intended; focus on the actual interaction flaw.
- **Change to prevent repeat**: Before changing visual design properties (icon sizes, colors, spacing), confirm with the user that the current state is wrong, not just different from what you expect.
- **Task/PR**: Request 227, PR #412

### 262 - A migration that redefines a shared function must be based on the newest definition, not the one you diagnosed

- **Date**: 2026-09-26
- **Context**: New provider locations were silently discarded on save. Root cause was in `admin_update_provider`: the admin edit form stamps every new location with `crypto.randomUUID()`, so a supplied `location_id` took the `UPDATE` branch, matched zero rows, and vanished (a 0-row UPDATE raises nothing). I diagnosed against `124_fix_nullable_string_coalesce.sql`, the newest definition on the `main` I branched from, and shipped the fix as migration `129`. While reviewing, `origin/main` had moved two commits and now contained `129`-`132`, including `131_admin_update_provider_tri_state_halal.sql`, which **redefines the same function**. Our `129` therefore collided on number and, worse, carried a body copied from `124`: applied before `131` the location fix would be overwritten and the bug would return; applied after, it would silently revert `131`'s tri-state halal work, re-breaking Plan 255's AC6.3. The fix had to be rebuilt as `133` from `131`'s body with only the locations block replaced, proven by diffing `131` against `133` and asserting two tri-state halal expressions survived.
- **Learning**: For `CREATE OR REPLACE FUNCTION` migrations, the migration file is a full-body snapshot, so two in-flight branches touching the same function do not merge, they clobber, and git reports no conflict because they are different files. Ordinary rebase hygiene does not catch this: the branch rebased cleanly and all tests passed while the regression sat in the SQL. The only reliable checks are (1) re-derive which migration is the newest definition of the function immediately before finalising, not at diagnosis time, and (2) diff your new migration against that newest definition so the change set is provably just your block. A second, sharper point: this bug and its near-miss both hid in the same place, a SQL RPC that no test executes.
- **Change to prevent repeat**:
  - Before writing a migration that replaces a function, run `grep -l "<function_name>" supabase/migrations/*.sql` against **freshly fetched** `origin/main` and copy the body from the highest-numbered hit. Re-run that check right before committing; `main` moves.
  - Ship a `diff <(git show origin/main:<newest_definition>) <new_migration>` in the handoff report. Any hunk outside your intended block, the header comment, and `COMMENT ON FUNCTION` is a regression you are about to merge.
  - When superseding a migration, assert in the test that a distinctive expression from the superseded one survived. Here that caught nothing only because the diff was already clean; it is the guard that fails loudly if someone later rebuilds from a stale body.
  - Carrying forward the Plan 255 rule: this migration's test is a SQL-text assertion and proves **nothing** about runtime behaviour. Treat the fix as **unproven** until the migration is applied and a second location is confirmed to persist against a real database. Do not count the 9 passing assertions as coverage.
- **Task/PR**: Request 262, branch `fix/262-provider-location-not-persisting`, commit `b22b574e`

### 2026-09-26 — Slot-prop mocks break "render the child" tests; capture element props instead

- **Context**: `ProvidersContent` tests mock `DiscoveryHeader` to null, so mocking `DiscoveryFilterBar` to capture props never fires — the bar is passed as the `filterBarSlot` element and never rendered. First test run failed with `props is null` on every chip assertion.
- **Learning**: When a component passes children via a slot prop (`filterBarSlot`) to a mocked wrapper, assert on the _element's props_ (`filterBarSlot.props`) captured inside the wrapper mock, not on the child component's own mock. Element props are readable without rendering.
- **Change to prevent repeat**: In `providers-content-location-chip.test.tsx` the `DiscoveryHeader` mock stores `filterBarSlot.props`; the same pattern applies to any `*Slot` prop in this codebase.
- **Task/PR**: cr/256-mobile-location-chip (Request 256)

### 2026-09-26 — Check whether the platform twin already enforces the rule, not just displays it

- **Context**: Request 256 proposed making mobile Near Me "visually supersede" the city "the way the desktop chip merges the two states". Desktop doesn't merge them visually at all: `SearchBar.syncUrl` enforces exclusivity structurally by routing to the section root and stripping the city (`SearchBar.tsx:219-241`).
- **Learning**: Before scoping a mobile/desktop parity change, verify whether the other platform _enforces_ the rule or merely _displays_ it. Verifying reframed this from "invent a cross-platform rule" into "close a mobile-only gap by extracting the rule desktop already had", which turned new logic into a shared-helper extraction (`buildNearMeUrl`). Corollary: when a request reverses a recorded decision (here plan 220 D7, "no need to display selected city label"), record the reversal as its own decision with rationale instead of letting it land silently.
- **Change to prevent repeat**: When a request describes the other platform's behaviour, read that platform's code before writing the spec. Cite it in the analysis doc.
- **Task/PR**: PR #417 (cr/256-mobile-location-chip), Request 256

### 2026-09-26 — Defer the URL write, not just the state write, when an action depends on an async permission outcome (Request 257)

- **Context**: Request 256 shipped a Near Me toggle that called `requestLocation()` and `router.push()` in the same tick, so the city was stripped from the path before the browser permission prompt resolved. Denying the prompt left the user on `/food` with their city gone and nothing gained. The fix defers the navigation to an effect watching `geolocation.status`.
- **Learning**: Three things worth carrying forward. (1) A status-watcher effect alone is not enough when the same status transition can be reached from a different entry path: `ProvidersContent` already auto-requests geolocation when `?near_me=1` arrives via URL from the desktop chip, so an unguarded "navigate on granted" effect fires there too and pushes the URL the user is already on — a duplicate history entry that breaks Back, not merely a wasted render. The deferred action needs a ref armed only by a real user gesture. (2) Deferring a state write turns any display gate reading the raw intent flag into a lie: keeping `nearMeActive` true on denial (so the permission-denied hint still renders) made the desktop chip read "Near me" while the URL and results were still Stuttgart. The honest flag already existed, `nearMeChipActive` = intent AND effective status; the gates had to move to it. When you defer, audit every consumer of the intent flag. (3) You cannot defer on an outcome you never request: `SearchBar` read `geolocation.status` and called `reset()` but never `requestLocation()`, so its status was permanently `idle` and its denied branch was dead code. A hook whose status you render but never drive is a signal that the surface is relying on some other component to do the asking.
- **Change to prevent repeat**: `src/features/search/hooks/useNearMeToggle.ts:91-129` had already solved the same problem for `/search` (request on toggle, write the URL from an effect once granted). It was not reused because it owns its own near-me/open-now/radius state and syncs via `router.replace`, but its shape is the pattern to copy. Grep for existing hooks before designing a deferred-permission flow.
- **Task/PR**: fix/257-near-me-denied-keeps-city, Request 257

### 2026-09-26 — `visibility: hidden` is not lazy: hidden React trees still hydrate, fetch, and burn the main thread

- **Context**: `/food/[city]` could not be scrolled for seconds on an iPhone SE PWA because `SearchMap` plus one ~8 KB `innerHTML` Leaflet marker per nationwide location mounted eagerly inside a `visibility: hidden` wrapper.
- **Learning**: Hiding pixels does not defer work. To make lazy loading safe for a shared hook, add an opt-in flag (`deferPinsUntilMapOpened`) rather than changing default behaviour — `RootPageContent` needs pins in list view, `ProvidersContent` does not. For heavy repeated SVG artwork, render it once as a `<symbol>` sprite and reference it with `<use>` from a shared `L.divIcon`; substring edits on the existing markup kept the geometry pixel-identical without re-deriving paths.
- **Change to prevent repeat**: When a page mounts a subtree that is only needed for a secondary view, gate mount on "was it ever shown" (`hasOpenedMap`) instead of toggling visibility, and scope `-webkit-overflow-scrolling` off universal selectors.
- **Task/PR**: fix/261-food-city-scroll-block (Plan 261)

### 2026-09-26 — Size a suspected cost against real row counts before calling it the root cause

- **Context**: Plan 261 was explained as "one ~8 KB marker per nationwide food location saturates the main thread". Querying UAT afterwards showed only **6** approved food locations with coordinates (774 food locations exist, but 801 are pending and 110 rejected), so the marker loop was ~6 iterations there, not hundreds. The real UAT costs were the Leaflet chunk, `L.map()` init with tile requests, and the universal `-webkit-overflow-scrolling` compositing rule.
- **Learning**: A code path that provably executes is not yet a sized cost. Reading the code tells you the loop runs; only the row count tells you whether it runs 6 times or 6000. Get the count before attributing magnitude, because the fix you prioritise depends on it.
- **Change to prevent repeat**: In the Analyst/Diagnose phase, when a hypothesis is "this is expensive because it happens per row", query the actual count for the reported environment and cite it. State per-item cost and item count separately.
- **Task/PR**: PR #420 (fix/261-food-city-scroll-block), Request 261

### 2026-09-26 — PostgREST streams every matching row unless you pass an explicit `.limit()`

- **Context**: `getMapLocations` selected every approved food location joined with providers and categories, with no limit and no ordering. Nothing in the call path bounded it; the map just rendered whatever came back.
- **Learning**: Supabase/PostgREST query builders have no implicit page size, so an unbounded `.select()` is a latent full-table read that grows silently with the data. Pair the cap with an `.order()` so truncation is deterministic, otherwise the returned subset shuffles between loads once the cap is hit.
- **Change to prevent repeat**: Any service function that returns a collection for rendering needs an explicit `.limit()` plus an `.order()`. Export the cap as a named constant (`MAP_LOCATIONS_LIMIT`) so tests can assert it and callers can see the ceiling.
- **Task/PR**: PR #420 (fix/261-food-city-scroll-block), Request 261

### 263 - An RLS policy compared against a nullable column denies silently, and RLS with zero policies denies everything

- **Date**: 2026-09-26
- **Context**: Recommending a provider failed with `42501` on `locations`. Two independent defects. (A) `101_plan_151_multi_location.sql` gates the `locations` INSERT with `auth.uid() IN (SELECT provider_owner_id FROM providers WHERE ...)`. A recommendation has `provider_owner_id = NULL` by design, so the subquery returns one NULL row, `x IN (NULL)` evaluates to NULL, and a WITH CHECK of NULL is a denial — no value of `auth.uid()` can ever pass. (B) `083_m5a_supertype_unification.sql` ran `ENABLE ROW LEVEL SECURITY` on `food_providers` and `store_providers` and never created a policy, so no client role can write them at all. Defect B was invisible because the flow died on Defect A first; a policy-only fix would have shipped and immediately failed on the next table.
- **Learning**: Two failure modes that both present as an opaque `42501`. First, SQL three-valued logic makes `IN (SELECT nullable_col ...)` unsafe in a WITH CHECK: NULL is not false, but it denies like false, and it denies unconditionally rather than for the row you expected. `EXISTS (SELECT 1 ... WHERE col = auth.uid())` cannot produce NULL and is the correct shape. Second, `ENABLE ROW LEVEL SECURITY` with no accompanying `CREATE POLICY` is a silent deny-all for every role except `service_role` — it looks like hardening in review and reads as a one-line diff, but it locks the table out permanently. Neither defect is visible from the error message, which names only the table.
- **Change to prevent repeat**:
  - Never write `IN (SELECT ...)` in an RLS `WITH CHECK` or `USING` clause where the selected column is nullable. Use `EXISTS (...)`. Migration 133 on the abandoned branch reached the same conclusion independently and said so in its header comment — worth reading before writing a new policy.
  - Any migration containing `ENABLE ROW LEVEL SECURITY` must either create policies in the same file or state in a header comment which non-`service_role` path is expected to write the table, and why none is needed. A grep for `ENABLE ROW LEVEL SECURITY` with no `CREATE POLICY` in the same file is a review smell.
  - When an RLS error names one table, do not assume it is the only blocked one. Probe every table the operation touches. The cheap non-destructive probe: insert with a non-existent FK value and read the code — `42501` means the policy rejected it, `23503` means the policy passed and only the FK failed.
- **Task/PR**: Request 263, PR #423, commits `a466a0b0`, `ed31c380`

### 263 - Briefing implementation off a stale local main reintroduced two deliberately-removed behaviours

- **Date**: 2026-09-26
- **Context**: I read `src/features/providers/services/mutations.ts`, diagnosed against it, and wrote an implementation brief from what I read. The local `main` was 5 commits behind `origin/main`. `origin/main` had since merged PR #418, which added a **login gate** (anonymous submissions rejected) and deliberately deleted `recommender_email` along with two regression tests asserting it is never written. My brief instructed the opposite on both counts. The implementation followed the brief faithfully and shipped a route that accepted unauthenticated submissions and wrote `recommender_email` again — re-opening a door that had been closed on purpose hours earlier. Caught on diff review, not by tests: the `recommender_email` guard test greps `mutations.ts` source, and the logic had moved to a new file, so it passed vacuously.
- **Learning**: Reading a file in the working tree tells you what your checkout contains, not what the branch you are targeting contains. Working solo this self-corrects, because the merge or the failing test surfaces it. When the brief is the artifact and someone else executes it, a stale premise is copied into the implementation verbatim and only surfaces at review, after the work is done. The cost is proportional to how confidently the brief was written. The `git status` I ran earlier was truncated to 20 lines and I never checked `main..origin/main`, so nothing flagged the gap.
- **Change to prevent repeat**:
  - Before writing any implementation brief, run `git fetch origin && git rev-list --count HEAD..origin/main`. If non-zero, read the target files from `origin/main` (`git show origin/main:<path>`) rather than the working tree.
  - When the brief depends on the _absence_ of a behaviour ("this flow is anonymous", "this field is unused"), check `git log --oneline -5 origin/main -- <path>` for a commit that removed it on purpose. A deliberate removal usually leaves a regression test behind; find it and read what it asserts.
  - Treat an executor's flagged tension as evidence, not noise. The report said `recommender_email` conflicted with an existing test that still passed; that was the stale premise surfacing, and it was correct.
- **Task/PR**: Request 263, PR #423, rework commit `ed31c380`

### 263 - Relocating logic defangs source-grep tests and silently re-scopes client-only helpers

- **Date**: 2026-09-26
- **Context**: Moving the provider-creation writes from a browser module to a `server-only` module broke two things that nothing failed on. (1) `255-submission-validation.test.tsx` asserts "never writes `recommender_email`" by reading `mutations.ts` as text and grepping it. Once the writes lived in `create-provider.server.ts`, the test passed while asserting nothing about where the writes actually happen. (2) The moved code kept calling `createProviderCommunityServiceRelationship`, whose module imports `supabase` from `@/lib/supabase/client` — the browser client. Called from server code it runs with the anon key and no session, so the `provider_engagements` insert is RLS-blocked; because that write is non-fatal it would have `console.error`d and continued, silently dropping every community-service link.
- **Learning**: A source-scanning test is pinned to a file path, so it survives a move by becoming vacuous — green, and weaker than before. And an import is not scope-neutral: the same helper means "authenticated user" in the browser and "anonymous" on the server, and a non-fatal error handler turns that difference into silence instead of a failure. Both are invisible in a diff that looks like a pure relocation.
- **Change to prevent repeat**:
  - When logic moves between files, grep the test suite for the **old path as a string literal** (`grep -rn "mutations.ts" src/__tests__`). Any hit is a test that is now pointed at the wrong file. Re-point it at every file the logic now spans, then verify it still fails when the behaviour is removed.
  - Before importing an existing helper into a `server-only` module, check which Supabase client its module imports. A `@/lib/supabase/client` import means browser-session semantics; server callers need the admin client or an explicitly-passed client.
  - A relocation is only proven by a test that fails when the relocated behaviour is removed. Spot-check at least the cleanup and error paths that way — the ummah cleanup branch in this change had no test at all until it was checked deliberately.
- **Task/PR**: Request 263, PR #423, commits `ed31c380`, `c4bedf58`

### 268 - Symlinking node_modules into a fresh worktree inherits the stale checkout's missing deps

- **Date**: 2026-09-29
- **Context**: Removing the `/create` Chat Assistant hint on a fresh worktree off `origin/main`. To skip a full install, `node_modules` was symlinked to the canonical checkout's. `vitest` ran fine, then `tsc --noEmit` failed on `@electric-sql/pglite` — declared in `package.json` but absent from the canonical checkout's `node_modules`, which had not been re-installed since Plan 266 added it. `npm ci` in the worktree (~17s, 1213 packages) cleared it.
- **Learning**: A symlinked `node_modules` makes the worktree inherit not just the packages but the install's staleness, and the failure surfaces as a type error in code you never touched, which reads like your change broke something. `vitest` passing first is misleading: it resolves lazily per-import, so a missing package only bites the tool that walks every type. The canonical checkout is also still broken for local `type-check` until someone re-installs there.
- **Change to prevent repeat**:
  - In a fresh worktree, run `npm ci` rather than symlinking. On this repo it costs about 17 seconds, less than one round trip spent diagnosing a phantom type error.
  - If you do symlink to save time, run `npm run type-check` as the first command, not the last. It is the check that fails on a stale install.
  - When a type error names a package you did not touch, verify it exists on disk (`ls node_modules/<pkg>`) before reading it as a real type regression.
- **Task/PR**: Request 268, branch `cr/268-remove-create-chat-hint`, commit `dc1bf61f`
