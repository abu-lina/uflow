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
  - `agent-output/_archive/planning/147-plan-store-category.md`
  - `agent-output/_archive/implementation/147-implementation-store-category.md`
  - `agent-output/_archive/code-review/147-code-review-store-category.md`
  - `agent-output/_archive/qa/147-qa-store-category.md`

### 2026-06-05 — Plan 148: NOT NULL violation in RPC on NULLIF(null, '')

- **Context**: Debugged a 500 error in PATCH /api/admin/edit-provider caused by a NULLIF expression in a PL/pgSQL RPC function.
- **Learning**: `NULLIF(column->>'key', '')` does NOT protect against absent JSONB keys. When `->>` returns NULL, `NULLIF(NULL, '')` returns NULL (PostgreSQL: NULL ≠ '' is unknown, not true, so NULLIF returns the first argument). If the target column is NOT NULL, the INSERT fails. Use `COALESCE(NULLIF(column->>'key', ''), default_value)` instead.
- **What to do differently**: Review all RPC INSERT blocks for `NULLIF` usage on NOT NULL columns — they should all be wrapped in `COALESCE` with an explicit default.
- **Files affected**: 2 new files
  - `supabase/migrations/098_plan_148_fix_rpc_verification_method_not_null.sql`
  - `agent-output/_archive/analysis/148-analysis-edit-provider-500.md`
  - `agent-output/_archive/planning/148-plan-rpc-not-null-fix.md`
  - `agent-output/_archive/implementation/148-implementation-rpc-fix.md`
  - `agent-output/_archive/code-review/148-code-review-rpc-fix.md`
  - `agent-output/_archive/qa/148-qa-rpc-fix.md`

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

### 269 - Dependabot raises alerts for ecosystems it was never told to update, so zero PRs can still mean real debt

- **Date**: 2026-09-30
- **Context**: 12 open npm security alerts (2 high) had accumulated across three lockfiles with not one Dependabot PR against them. `.github/dependabot.yml` registered only `package-ecosystem: github-actions` at `/`. The alert graph scans dependencies regardless of config, but Dependabot only opens update PRs for ecosystems declared in `dependabot.yml`. So the PR list looked healthy (4 open, all CI bumps) while the alert list had been growing untouched. The repo has three independent npm manifests (`/`, `/tools/memory-backend`, `/tools/uflow-memory-extension`) and none were registered.
- **Learning**: "No Dependabot PRs" and "no Dependabot debt" are different facts sourced from different mechanisms. Reviewing the PR queue never surfaces this gap, because the absence of a PR is exactly the symptom. Only `gh api repos/<org>/<repo>/dependabot/alerts` shows it. A repo with multiple manifests compounds the risk: registering the root directory does nothing for `tools/*`, each directory needs its own entry.
- **Change to prevent repeat**:
  - Audit with `gh api repos/<org>/<repo>/dependabot/alerts --paginate -q '[.[] | select(.state=="open")] | length'`, not by reading the PR list.
  - Cross-check every manifest against the config: `find . -name package.json -not -path '*/node_modules/*'` versus the `directory:` entries in `dependabot.yml`. Any manifest without an entry is invisible to update PRs.
  - When adding npm ecosystems to a repo that has never had them, group `minor`/`patch` by `dependency-type` so the first Monday doesn't open 30 PRs and get the whole thing muted.
- **Task/PR**: Request 269, PR #446, commit `ced921eb`

### 269 - Triage vulnerable versions from the lockfile; `npm ls` reports whatever is on disk

- **Date**: 2026-09-30
- **Context**: Triaging which packages were actually vulnerable. `npm ls vitest` at root reported `vitest@3.2.7 invalid: "5.0.1" from the root project` — `node_modules` was stale. The alert range for the `@vitest/mocker` path-traversal advisory is `>= 2.1.0, < 4.1.11`, so 3.2.7 looks vulnerable. But `package-lock.json` pinned 5.0.1, which is what CI and every deploy install. Root was never affected. Had the fix been scoped from `npm ls`, it would have bumped an already-safe root dependency and produced a large unnecessary lockfile diff. The same stale tree also reported `brace-expansion@5.0.9` correctly, which made the output look trustworthy.
- **Learning**: Dependabot scans the committed lockfile; `npm ls` and `npm why` report the local `node_modules`, which drifts the moment anyone changes a manifest without reinstalling. For dependency-graph questions the two disagree silently and the stale answer is plausible, so nothing flags it. Partial agreement between them is not evidence: one correct line invites trusting the wrong one.
- **Change to prevent repeat**:
  - Read resolved versions straight from the lockfile, e.g. `python3 -c "import json;pk=json.load(open('package-lock.json'))['packages'];print(pk['node_modules/<pkg>']['version'])"`. Use `npm ls` only to understand _who depends on what_, never to decide _which version is installed_.
  - When `npm ls` prints `invalid:`, treat the whole tree's version output as unreliable, not just that line.
- **Task/PR**: Request 269, PR #446, commit `ba2ab244`

### 269 - `npm install` rewrites lockfile `dev` flags, and an open-ended `overrides` range can hoist a major across a peer boundary

- **Date**: 2026-09-30
- **Context**: Two separate traps in one small dependency fix. (1) Bumping one `overrides` entry and running `npm install` also flipped 26 `@rollup/rollup-*` platform binaries plus `@napi-rs/lzma-linux-x64-gnu` to `"dev": true`, turning a 6-line diff into 32. `node_modules/rollup` itself stays `dev: false` — it is a production dependency via `@ducanh2912/next-pwa` -> `workbox-build` -> `@rollup/plugin-node-resolve` (peerOptional) — so the result was a lockfile where a prod package's native binaries are dev-only. Any `npm ci --omit=dev` would then fail with `Cannot find module @rollup/rollup-linux-x64-gnu`. It stayed latent only because `Dockerfile:29` and `deploy-uat.yml:100` run plain `npm ci`, and `Dockerfile:27` already carries the comment "Using `--omit=dev` can cause build failures", which is plausibly this exact bug from a previous encounter. (2) Pinning `"brace-expansion": ">=2.1.7"` to patch a 2.x transitive made npm hoist 5.0.12 to the top level, violating `minimatch@9`'s `^2.0.1`. `"^2.1.7"` resolved it nested under minimatch where it belonged.
- **Learning**: An `overrides` bump is not a surgical edit; `npm install` recomputes the whole tree including `dev` metadata, and that metadata is load-bearing for `--omit=dev` installs even though it changes no version. Separately, `>=` in an override is only safe when the package has one live major line in the tree. When several majors coexist (`brace-expansion` 2.x under minimatch@9, 5.x under minimatch@10) an open-ended range resolves to the newest and breaks the older consumer, and because overrides bypass peer checks it lands without complaint.
- **Change to prevent repeat**:
  - After any `overrides` change, diff the lockfile for anything that is not a version/resolved/integrity swap: `git diff -- package-lock.json | grep '^[+-]' | grep -v 'version\|resolved\|integrity'`. Revert metadata-only churn, or hand-edit the entry and verify with `npm ci` that the lockfile is still installable.
  - Before writing an override range, check how many majors of that package are in the tree (`grep -c '"node_modules.*<pkg>"' package-lock.json` and inspect each consumer's declared spec). More than one live major means use `^`, not `>=`.
  - A security PR should contain only the security change; unexplained lockfile churn is diff a reviewer cannot evaluate.
- **Task/PR**: Request 269, PR #446, commit `ba2ab244`

### 270 - A stale Dependabot PR's diff describes the repo it was opened against, not the one you have

- **Date**: 2026-09-30
- **Context**: Dependabot PR #276 ("bump actions/checkout from 4 to 7") touched 12 workflow files and was `DIRTY` with a failing test job. Taken at face value it read as a risky 12-file major CI bump needing a real investigation. Current `main` had already migrated most refs since: of 22 `actions/checkout` refs, 13 were SHA-pinned to v6.0.2, 4 floated on `@v6`, and only 5 were still on `@v4`. One of those 5 lived in `discover-halal.yml`, which did not exist when #276 was opened, so the PR could never have fixed it. Its CI logs had also expired (`HTTP 410`), making the reported failure undiagnosable from the PR. Rebasing it would have been strictly more work than a clean sweep on current main, and would still have missed a file.
- **Learning**: A long-lived dependency PR's file list is a snapshot of the past, and the conflict is the signal that the snapshot expired. The failing check compounds the illusion, since it invites debugging a failure that may have nothing to do with the bump and whose evidence is already garbage-collected. Re-deriving the true scope from current `main` took one grep and shrank the task from "12 files, unknown failure" to "5 straggler refs plus a style split".
- **Change to prevent repeat**:
  - Before working a stale dependency PR, re-derive scope on current main (`grep -rn "<dep>@" <dir>`) and compare against the PR's file list. A mismatch means close and redo, not rebase.
  - Check whether a failing check's logs still exist (`gh run view <id> --log-failed`) before planning around that failure. Expired logs mean the only real signal is a fresh run.
  - Fold the version bump and the pin-style normalization into one change when a repo has drifted into multiple styles; grep for the _absence_ of the new pin (`grep -v <new-sha>`) to prove no ref was missed.
- **Task/PR**: Request 270, PR #456, commit `54ffb10a`

### 273 - Review a lockfile by per-package version delta, never by package count

- **Date**: 2026-09-30
- **Context**: Landing 8 "production-minor-patch" bumps from Dependabot. The reported result was "1297 -> 1275 packages, -22", which reads like a clean win. Measuring the committed final state directly gave **1312, net +15**: the -22 was a mid-task reading taken after an earlier removal commit, before the bumps were installed. Diffing per-package rather than counting showed why: `@tanstack/react-query-devtools` 5.101.4 -> 5.104.0 had pulled in **roughly 20 packages of Solid.js** (`solid-js`, 13 `@solid-primitives/*`, `@kobalte/core`, `seroval`, `goober`, `@floating-ui/*`) via `@kobalte/core`. `npm why solid-js` traced it in one command. The devtools package was also declared in `dependencies`, not `devDependencies`, and nothing in the repo imported it, so an entire alternative UI framework had been added to the production tree for dead code. Removing it turned +15 into **-18**.
- **Learning**: A lockfile package count is a single scalar summarising thousands of lines, and it hides composition entirely: a bump that adds 37 and removes 22 looks like "-22" if you measure at the wrong moment and like "nothing much" if you only read the total. A transitive framework arriving inside a patch-level-looking bump is invisible at that resolution. The second-order lesson is that an unused dependency is not merely dead weight, it is an unbounded liability: nobody reviews the transitive consequences of bumping something they believe is inert.
- **Change to prevent repeat**:
  - Review any lockfile change with a per-package delta against the merge base, not a count or a line total:
    ```
    python3 -c "
    import json,subprocess
    old=json.loads(subprocess.run(['git','show','main:package-lock.json'],capture_output=True,text=True).stdout)['packages']
    new=json.load(open('package-lock.json'))['packages']
    for k in sorted(set(new)-set(old)): print('+',k,new[k].get('version'))
    for k in sorted(set(old)-set(new)): print('-',k)
    for k in sorted(set(old)&set(new)):
        if old[k].get('version')!=new[k].get('version'): print('~',k,old[k].get('version'),'->',new[k].get('version'))
    "
    ```
  - Any unfamiliar package name in the `+` list gets `npm why <pkg>` before the PR goes up.
  - Measure counts on the committed final state only. A figure taken between commits is not a result.
  - When auditing dependencies, grep for actual imports before upgrading: `@mui/material`, `@mui/icons-material` and `@tanstack/react-query-devtools` were all declared in `dependencies` with zero importers. `next.config.js`'s `optimizePackageImports` listed MUI, which made it look used while no code referenced it.
- **Task/PR**: Request 273, PR #471, commits `290d3623`, `df23bfdc`, `a6ce111a`

### 274 - A green pipeline cannot verify a renamed prop; that needs a test proven to fail

- **Date**: 2026-09-30
- **Context**: `lottie-react` 2 -> 3 is breaking in two ways that only surface at runtime: the default export was removed (v3 exports named components only), and the `animationData` prop was renamed to `src`. `src/components/ui/LottieAnimation.tsx` was the only consumer and had **zero** test coverage. The default-export change is caught by the compiler. The prop rename is not: passing `animationData` to a v3 `<Lottie>` means `src` is `undefined`, the component renders nothing, and nothing throws. `npm run lint`, `npm run type-check`, `npm run build` and all 2678 tests passed identically with the correct and the incorrect prop name. Verification came from reading the installed package: `build/animation/normalizeAnimationSource.cjs:34` returns `{ animationData: { ...source } }` from a `src` object, confirming the rename and that passing a parsed JSON object is the supported path.
- **Learning**: For a change whose failure mode is a silently absent value rather than an error, every gate in the pipeline is blind, and the more gates pass the more confident the change looks. The declared type of a prop bag does not catch a key that was renamed, because the wrong key is simply an excess property on an object the compiler never relates to the old name. "Build passes" is evidence about compilation, never about rendering.
- **Change to prevent repeat**:
  - When a dependency upgrade renames a prop, option or config key, add a test asserting the **new** name is passed and the **old** name is not. Pinning both directions makes a revert or a bad merge fail loudly.
  - Prove the test discriminates: revert the component to the broken version, confirm the test fails, then restore. A test that passes against the broken code is worth nothing, and this is cheap to check.
  - Verify a renamed API against the installed package (`node_modules/<pkg>/**/*.d.ts` and the built source), not release notes alone. The normalisation function showed both the new prop name and the accepted value shapes.
  - Mock the dependency rather than rendering it, for anything that wants canvas/WebGL/SVG in jsdom. Asserting on the props handed to a `vi.fn()` is stable and tests the contract that actually broke.
- **Task/PR**: Request 274, PR #472, commits `d5b8890f`, `adf20b82`

### 274 - "Minor" and "dev-only" in a Dependabot title say nothing about the blast radius

- **Date**: 2026-09-30
- **Context**: Four PRs in one dependency sweep were each mislabelled by their own metadata. (1) A `production-minor-patch` group contained `@supabase/ssr` `^0.6.1 -> ^0.12.7`; under semver, `0.x` puts breaking changes in the **minor** slot, so that is six breaking release lines on the library handling auth session cookies, grouped as routine. (2) `@vitejs/plugin-react` 4 -> 6, labelled `deps-dev`, requires peer `vite: ^8.0.0` while the repo declares `vite: 7.3.5` exact _and_ pins `overrides.vite: 7.3.5`; it also moved to the oxc/rolldown toolchain and added three new peers. (3) `@testing-library/jest-dom` 6 -> 7, also `deps-dev`, adds a peer `@testing-library/dom >=10 <11` against a resolved 9.3.4 that arrives via `@testing-library/react@14`, so it is gated on an RTL major across all 295 test files. (4) Conversely, `next` 15 -> 16 was _assumed_ to need React 19, but `next@16.3.6` peers list `react: ^18.2.0 || ^19.0.0`, identical to 15.5.26, so it is not React-gated at all.
- **Learning**: The semver range in a PR title describes the version arithmetic, not the risk. Three independent things break the correspondence: `0.x` relocates the breaking axis to minor, a peer-dependency requirement can make a "dev" bump demand a major upgrade elsewhere, and a reputation for being hard ("Next majors need a React major") can overstate risk just as easily as a label understates it. A `dev` classification bounds _where_ breakage lands, never _how much_.
- **Change to prevent repeat**:
  - Read `npm view <pkg>@<target> peerDependencies --json` before classifying any major as low-risk, and compare against what the repo declares **and** overrides. A `vite: ^8` peer against a pinned `vite: 7.3.5` is a blocker, not a warning.
  - Treat a `0.x` minor bump as a major. Check how many minor lines are being crossed, and for an auth, crypto, or persistence library, require verification the test suite does not provide.
  - Check the assumed blocker too. Comparing the old and new versions' peer ranges side by side is one command and it settles the question instead of inheriting folklore.
  - When a grouped PR mixes `0.x` and `1.0+` packages, split it: land the 1.0+ members and re-raise the `0.x` ones individually. Dependabot groups by version arithmetic and cannot make this distinction.
- **Task/PR**: Request 274, PRs #471 / #472, with #455, #462, #464 documented and deferred

### 276 - A gate verified only in dev mode is not verified

- **Date**: 2026-10-01
- **Context**: The new Playwright smoke suite passed 5/5 locally against `npm run dev`, then failed every auth test the moment it ran the way CI runs it (`npm run build` + `npm run start`). Two separate production-only defects were hiding behind the dev server. (1) The workflow built with `NEXT_PUBLIC_SUPABASE_ANON_KEY: sb_publishable_placeholder_for_build_only` and injected the real key into the server's runtime env, but Next **inlines `NEXT_PUBLIC_*` into the client bundle at build time**, so the browser shipped a placeholder key and got 401s. It failed quietly rather than loudly: that string is 41 characters and starts with `sb_`, so it satisfies both the prefix and 30-character checks in `src/lib/supabase/client.ts:44` and never trips the placeholder guard. (2) Underneath that, `next.config.js` only added `http://127.0.0.1:*` to CSP `connect-src` when `isDev`, so a production build against a local or self-hosted Supabase had every browser-side Supabase call refused by CSP.
- **Learning**: `npm run dev` differs from the deployed artefact in exactly the places a smoke suite is supposed to cover. Dev reads env at request time while a production build freezes `NEXT_PUBLIC_*` into JavaScript, and dev relaxes security headers that production enforces. So a suite whose entire purpose is catching deploy-time breakage, verified only against the dev server, proves nothing about the thing it guards. Both bugs were pre-existing and invisible to every other check in CI.
- **Change to prevent repeat**:
  - Verify any E2E or smoke suite against a real production build before trusting it. Make the config switch explicit, e.g. `command: process.env.CI ? 'npm run start' : 'npm run dev'`, and run the `CI=1` path locally at least once.
  - Never pass placeholder values for `NEXT_PUBLIC_*` into a build whose output will actually be exercised. Resolve real values before `npm run build`, not into the server's runtime env afterwards.
  - When adding a placeholder guard, make it reject the placeholders you actually use. A guard keyed on substrings like `your` or `placeholder` plus a length floor is trivially passed by a realistic-looking fake.
  - Treat `isDev`-conditional security headers as a production surface. Anything allowed only when `isDev` should be checked against a production build on a non-hosted backend.
- **Task/PR**: Request 276, PR #474, commit `72c4941a`

### 276 - A new CI gate starts non-blocking, because its first failure usually is not its own

- **Date**: 2026-10-01
- **Context**: The E2E workflow's first CI run failed, and the cause had nothing to do with the suite: `supabase start` died with `duplicate key value violates unique constraint "schema_migrations_pkey"` (SQLSTATE 23505), `Key (version)=(089) already exists`. Two migrations shared the `089` prefix, `089_fix_search_food_concepts_junction.sql` (2026-05-12) and `089_add_food_category_american.sql` (2026-06-04), and the Supabase CLI derives the `schema_migrations.version` primary key from that prefix. Every from-scratch `supabase start` or `db reset` on main was broken, which also meant clean local onboarding was broken. Nobody noticed because everyone already had a populated local database; only a fresh stack exposes it. A doc under `agent-output/_archive/implementation/closed/267-*` had already recorded the collision without it being fixed. Because the job was deliberately left out of the ruleset's required checks, `mergeStateStatus` was `UNSTABLE`, not blocked: the failure was informative and the repo kept merging.
- **Learning**: A new gate's first job is to tell you about the repo, and what it finds first is usually a latent defect in the environment rather than a bug in the code under test. The repo's ruleset uses `strict_required_status_checks_policy: true`, so promoting that job to required on day one would have blocked **every** merge in the repo on an unrelated migration-numbering mistake from four months earlier. The sequencing matters more than the strictness: earn the required status with a track record.
- **Change to prevent repeat**:
  - Land a new CI job non-blocking. Promote it to a required check only after it has run green repeatedly on real PRs.
  - When any tool derives an identifier from a filename, duplicate prefixes are a primary-key collision waiting to happen. `ls migrations | sed -E 's/^([0-9]+)_.*/\1/' | sort | uniq -d` must return empty; it is worth a CI assertion of its own.
  - Renumber the **later** of two colliding migrations. The earlier one legitimately owns the version and is already recorded under it remotely.
  - Before renaming any migration, confirm it is re-runnable. This one declared its own intent ("Keep this idempotent across environments") and used `INSERT ... WHERE NOT EXISTS` plus a normalizing `UPDATE`, which made re-application under a new version a safe no-op.
  - Fix a defect a doc has already recorded. A written-down problem that nobody actioned is indistinguishable from an unknown one.
- **Task/PR**: Request 276, PR #474, commit `85e2198b`

### 276 - Never key a test selector to the thing the test is meant to guard

- **Date**: 2026-10-01
- **Context**: The first pass at the auth spec selected the user menu with `button[aria-label="Profil Dropdown öffnen"]` and the logout control with `button.text-danger`. Both worked. Both were wrong. The `aria-label` is hardcoded German at `Header.tsx:266` in an app that translates everything through `LanguageProvider`, so it is an accessibility bug in its own right (every locale hears a German label), and the correct fix would have broken the test. `text-danger` is a Tailwind theme utility used 38 times across `src/`, and a stated purpose of this suite is guarding the Tailwind v3 to v4 migration, which rewrites config and class generation. Both were replaced with `data-testid` hooks.
- **Learning**: "The selector is stable today" is the wrong test. The right question is what has to change for it to break, and whether that change is one you expect and want. A selector built on a generated utility class cannot distinguish "logout broke" from "class generation changed", which is precisely the signal the suite exists to produce during the migration it is supposed to protect. A selector built on an known-buggy string actively punishes fixing the bug. Either way the suite argues against improving the code.
- **Change to prevent repeat**:
  - Prefer an explicit `data-testid` for behavioural tests. Reach for copy, `aria-label`, or utility classes only when they are genuinely semantic and genuinely stable.
  - Before accepting a selector, name the change that would break it. If that change is one you are planning (a framework migration) or one you want (an a11y fix), pick a different handle.
  - Never select on translated copy in an i18n'd app, and treat a hardcoded non-translated string as a bug to report rather than a hook to depend on.
- **Task/PR**: Request 276, PR #474, commit `72c4941a`

### 276 - Rank upgrade risk by the code path that executes, not by what the manifest declares

- **Date**: 2026-10-01
- **Context**: I ranked `@supabase/ssr` `0.6 -> 0.12` as the highest-risk open upgrade, reasoning from the manifest and the semver `0.x` rule: six breaking minor lines on the library handling auth session cookies. Building the smoke suite disproved it. `src/lib/supabase/cookieAdapter.ts` has no `setAll`, and its `set`/`remove` are no-ops, so the official SSR cookies are **never written**. `getUserFromCookie` consequently always logs `event: 'auth_attempt', result: 'ssr_miss'` and falls through to a custom httpOnly `sb-access-token` cookie, which is what actually carries server-side auth. Breaking `cookieAdapter.getAll` outright, the discrimination test I had specified, changed no observable behaviour at all; the suite passed against it. The real risk surface is the hand-rolled `sb-access-token` flow (`/api/auth/set`, `/api/auth/logout`, the middleware read at `src/middleware.ts:78`).
- **Learning**: A dependency can be declared, imported, constructed, and still be load-bearing for nothing. Risk ranked from `package.json` plus semver arithmetic measures the library's capacity to break, not this codebase's exposure to it. Here a fallback path silently absorbed the library's total failure, which also means the upgrade is lower risk **and** the custom code is higher risk than the manifest suggests. Note the failure mode of my own planning: I specified a discrimination target from reading the code, and the target turned out to be inert. Prescribing which break should fail a test is a hypothesis, not a fact, until the break is run.
- **Change to prevent repeat**:
  - Before ranking an upgrade's risk, confirm the library's code path actually executes and carries the behaviour. A no-op adapter method or an unconditional fallback means it does not.
  - When specifying a discrimination test, state the expected failure as a hypothesis and require the result either way. "Break X, confirm the test fails" must be reported honestly as "X did not fail, here is why", which is how the real contract was found.
  - Grep for fallback chains around any dependency you are about to upgrade. `getUserFromCookie`'s try/catch plus custom-cookie fallback is exactly the shape that converts a hard dependency failure into a silent downgrade.
  - When a library turns out to be inert, record it. Candidate follow-ups are removing it or wiring it up properly, and either beats upgrading something that does nothing.
- **Task/PR**: Request 276, PR #474, commits `6ae8b5d6`, `72c4941a`

### 277 - A clean `npm audit` is not clearance, and "prefer older releases" can pick the vulnerable one

- **Date**: 2026-10-01
- **Context**: The Next 16 upgrade targeted **16.3.6** on purpose. It had been public 9 days while 16.3.7 and 16.3.8 were 2 and 1 days old, and the rule here is to prefer a release that has been out at least 7 days, because a share of supply-chain attacks are caught and yanked within days. It was also Dependabot's proposal. Four independent checks then said the tree was clean: `npm audit` reported **0 vulnerabilities at every level**; the GitHub advisory database showed `next@16.3.6` unaffected by every published Next advisory, and in fact showed 16.3.6 as the **patch** for `GHSA-vcvr-r3jv-pc5j`, a critical `next/og` RCE; none of the seven newly-added transitive packages had any advisory; and the repo's own `Security Audit` CI job passed. Snyk failed the PR anyway. It was right: `next@16.3.6` carries **CVE-2026-94483**, a high-severity SSRF (CWE-918, CVSS 8.3), fixed only in **16.3.8**. GHSA does not carry that CVE yet, and `npm audit` reads GHSA, so every "clean" result traced back to a single database that had not caught up. The two patch releases a day apart after a 7-day gap were the security releases, and that cadence was visible before the finding was.
- **Learning**: "0 vulnerabilities" answers "does this database know about a problem", not "is this safe". Several green checks reading the same source are one check, not four, so stacking them produces false confidence rather than corroboration. When two scanners with independent databases disagree, the one reporting a finding is the one to act on, because a miss is far more likely than a fabrication. The age heuristic also inverted here: it is a defence against an _unverified_ supply-chain risk, and it selected a version with a _published_ CVSS 8.3 vulnerability. A confirmed risk outranks a hypothetical one.
- **Change to prevent repeat**:
  - Never treat a green `npm audit` as clearance on its own. Name the database behind each check and notice when several collapse to the same one.
  - When a dependency scanner fails and the others pass, get the finding before deciding anything. Do not merge past it and do not reason from the passing checks; the whole point is that they disagree.
  - Apply the 7-day rule to versions with no known vulnerability. The moment a specific CVE exists in the older candidate, take the patched release even if it is a day old, and record why the rule was overridden.
  - Treat a burst of patch releases a day or two apart, after a quiet gap, as a signal to check advisories before pinning to anything below them.
  - Pin exact rather than with a caret, so the chosen version is a decision rather than whatever the range floats to.
- **Task/PR**: Request 277, PR #476, commit `8bda9374`

### 277 - When a major flips a default, every invocation site is a separate migration

- **Date**: 2026-10-01
- **Context**: Next 16 makes Turbopack the default bundler, and Turbopack does not read `webpack()` config. This repo wraps its whole config in `withPWA` from `@ducanh2912/next-pwa`, which generates the service worker **through webpack**: `importScripts: ['/sw-push-handler.js']` for push notifications, an `/offline.html` fallback, and hand-tuned `runtimeCaching`. Under Turbopack none of it is emitted, with no build error and no failing test. The fix is the documented `--webpack` flag, and the first pass added it to `dev` and `build`. That left **six** other entry points still defaulting to Turbopack, including `Dockerfile:56`, which runs `npm run build:standalone` to produce the **production image**, plus `build:raw`, `build:production`, `build:local`, `ci.yml`'s Build Verification and two `weekly-quality-gates.yml` steps, all of which call `next build` directly. CI would have stayed green, because CI builds through `npm run build`, while the production container shipped with no service worker. There is no config-level escape: `next/dist/lib/bundler.js` `parseBundlerArgs` defaults to Turbopack when no flag is passed, 16.3.6 has no `bundler` key in its config schema, and the only webpack env var is the internal `IS_WEBPACK_TEST`.
- **Learning**: A fix expressed as a CLI flag is not applied to the project, it is applied to one command. The real unit of work is "every place that invokes the tool", which spans package scripts, workflow steps that bypass those scripts, and the Dockerfile. A correctness property that has to be restated in seven places will drift, so the flag is only half the fix; the other half is something that fails loudly when it is missing. Note also which path is riskiest: the one CI does not exercise. Here CI used the fixed script and production used an unfixed one, so green CI was actively misleading.
- **Change to prevent repeat**:
  - When adding a required flag, enumerate invocation sites across `package.json`, every workflow, and the Dockerfile. Grep for the bare binary (`next build`, `npx next build`) as well as the script names.
  - Pay specific attention to the deploy path. `Dockerfile` and release workflows often bypass the scripts that local development and CI use.
  - Pair the flag with an assertion on its **output**, not its presence. `scripts/verify-pwa-output.js` checks that `public/sw.js` exists and contains the push-handler import, and runs on every production build path. npm's `postbuild` hook only fires for `build`, so the other scripts chain it explicitly.
  - Prove the guard fails. Forcing a Turbopack build made it exit 1 with a clear message; a guard never seen failing is not known to work.
  - Before accepting a CLI flag as the answer, check whether a config-level equivalent exists, by reading the installed package rather than release notes or blog posts.
- **Task/PR**: Request 277, PR #476, commits `b346eae0`, `d0a06df8`

### 277 - Never weaken a production security control to make a test suite pass

- **Date**: 2026-10-01
- **Context**: The E2E suite deterministically hit 429s from the middleware rate limiter. The first fix added an env-gated early return to `checkRateLimit` in `src/middleware.ts`: return allowed whenever `PLAYWRIGHT_E2E === '1'`, with the variable set from `playwright.config.ts` and the CI build step, and a comment saying it is "never set in production". The reasoning was defensible, since the flag is inlined into the middleware bundle at build time and production builds do not set it. It was still rejected. The actual cause was a test-environment artifact, not a limit that was too strict: `getRateLimitKey` reads `x-forwarded-for`, then `x-real-ip`, then `cf-connecting-ip`, and falls back to a single `'unknown'` bucket; `next start` sets none of those, so the entire suite shared one bucket against `API_RATE_LIMIT_MAX_REQUESTS = 30`. The fix was to give each test its own identity, a unique synthetic private-range `x-forwarded-for` from a Playwright fixture, which needed no application change and left the limiter fully active. The same investigation surfaced a production question worth its own work: if a deployment does not sit behind a proxy that sets those headers, every user shares one 30 requests/minute bucket.
- **Learning**: A kill switch on a security control is a permanent property of the code, and the guarantee that it is never enabled lives in build configuration and a comment, neither of which is enforcement. "Only set in test" describes current intent, not a constraint. More usefully: tests failing against a security control are usually evidence that the test environment is unrealistic, not that the control is wrong. Asking why the control fired, rather than how to silence it, turned a rejected bypass into a test-only fix and surfaced a latent production issue in the same code path.
- **Change to prevent repeat**:
  - Treat any diff that adds a conditional bypass to auth, rate limiting, CSP, or validation as blocked by default, however narrow the condition looks.
  - When a security control blocks tests, find the input that makes the control behave differently and supply a realistic one from the test. Here that was a request header the production proxy sets and `next start` does not.
  - Prefer fixes that live entirely in test code. The final change touched only `e2e/fixtures.ts`; `src/middleware.ts` ended with zero diff against main, which is itself the check that the control was left intact.
  - When a control misbehaves under test, ask whether the same condition can occur in production. The `'unknown'` fallback that bucketed the whole suite together would bucket all users together behind a proxy that does not set those headers.
- **Task/PR**: Request 277, PR #476, commits `6c45de7d`, `b346eae0`

### 278 - A guard on a path no pipeline runs is untested code on the most important path

- **Date**: 2026-10-01
- **Context**: Request 277 added `scripts/verify-pwa-output.js` precisely so a production build could not silently ship without a service worker, and wired it into every build script including `build:standalone`, the one `Dockerfile:56` uses for the deployed image. #476 merged with **every check green**, including the Playwright smoke suite built two chunks earlier for exactly this class of regression. `Build & Deploy to UAT` then failed on `main`, for two reasons neither CI nor the smoke suite could see. First, `.dockerignore`'s bare `__tests__` pattern never matched `src/__tests__`, so 254 test files entered the build context while `scripts/` (which they import) was excluded; Next 16 type-checks those files during `next build` where 15 did not, giving TS2307. Second, and self-inflicted: `build:standalone`'s new `&& node scripts/verify-pwa-output.js` could never run, because `scripts/` is dockerignored, so it died on `MODULE_NOT_FOUND`. `build:standalone` could not have succeeded in Docker at all. The guard written to protect the production image was absent from that image, and nothing caught it because **no pipeline runs a Docker build before merge**: CI builds via `npm run build`, production via `build:standalone`.
- **Learning**: The sharp part is that this was a repeat. Learning 276 recorded "a gate verified only in dev mode is not verified", and 277 recorded "when a major flips a default, every invocation site is a separate migration". Both were written, both were accurate, and the very next change still modified a build script that no pipeline executes and shipped it on green CI. Writing the learning down did not prevent recurrence because both were phrased as principles about care, and under time pressure a principle loses to a green checkmark. The mechanical version is narrower and survives: _before merging a change to a build script, name the pipeline that executes that exact command; if there isn't one, the change is unverified_. Note also the specific trap in adding a guard: a guard is new code on the path it protects, so a guard that cannot execute converts a silent regression into a hard failure of the deploy, which is worse than the gap it was closing.
- **Change to prevent repeat**:
  - When a diff touches `package.json` build scripts, `Dockerfile`, or `.dockerignore`, run a real `docker build` before merging. A local `npm run build` proves nothing about what is in the image context.
  - For any newly added guard or check, observe it **running and passing** on the path it protects. Its presence in the script text is not evidence; `build:standalone` contained the call for the entire life of #476 and never once executed it.
  - Enumerate build paths and which pipeline covers each. Here `npm run build` is covered by CI and e2e, while `build:raw`, `build:standalone`, `build:production` and `build:local` are covered by nothing. Uncovered paths that ship are the ones to care about.
  - When a defect recurs despite a recorded learning, rewrite the learning as a trigger-and-action check rather than a principle. "Verify on the production path" is advice; "touching `build:standalone` or `.dockerignore` means run `docker build`" is a check.
- **Task/PR**: Request 278, PR #478, commit `5d199d08`

### 278 - `.dockerignore` patterns are not `.gitignore` patterns, and a silent miss looks like success

- **Date**: 2026-10-01
- **Context**: `.dockerignore` carried an obviously intentional Tests section, `tests/` and `__tests__`, and had for a long time. The second pattern never worked. Docker matches patterns against the full path relative to the build context, so a bare `__tests__` matches only a root-level entry and never `src/__tests__`; 254 test files were copied into every image build while everyone reasonably assumed they were excluded. Nothing surfaced it, because including extra files is invisible until something depends on what is _missing_ alongside them: the tests import from `scripts/`, which **is** correctly ignored, and Next 16 began type-checking them. Fixing it to `**/__tests__` then exposed a second layer, 226 TS2339 errors across 23 colocated `*.test.*` files, because the jest-dom type augmentation lives inside the directory just excluded. The eventual fix also had to cover colocated tests, `__mocks__`, `e2e/`, `playwright.config.ts` and `vitest.config.ts`. Separately, re-including a single file needed `scripts/*` plus `!scripts/verify-pwa-output.js`, because Docker cannot reliably re-include a path under a wholly excluded directory.
- **Learning**: An ignore pattern that silently matches nothing is indistinguishable from one that works, because both produce a successful build. The failure mode is extra files in the context, which costs nothing until it costs everything. The two formats look identical and are not: `.gitignore` treats a bare name as matching at any depth, `.dockerignore` anchors it to the context root. Excluding test files from a build context is also not one pattern but a set, since test code spreads across colocated files, mock directories, type augmentations and config files, and removing part of it can break the remainder in a way that only shows up as type errors.
- **Change to prevent repeat**:
  - Verify ignore patterns by inspecting the resulting context, not by reading the file. `docker build --target <stage>` then `ls` inside the stage shows the truth; here it proved `/app/scripts` held exactly one file and no test files survived.
  - Use `**/name` in `.dockerignore` for anything nested. Never assume `.gitignore` semantics carry over.
  - Treat "exclude tests" as covering `**/__tests__`, `**/__mocks__`, colocated `**/*.test.*` and `**/*.spec.*`, plus test configs, and check what the excluded set provided to the rest (type augmentations are the usual casualty).
  - To re-include one file, exclude with `dir/*` rather than `dir/`, then negate. Negation under a fully excluded directory does not reliably apply.
- **Task/PR**: Request 278, PR #478, commit `7ee6d8f2`

### 279 - Trusting a proxy header means knowing which hop wrote it, and whether it replaced or appended

- **Date**: 2026-10-01
- **Context**: This started as a different claim. During request 277 I flagged that `getRateLimitKey`'s `'unknown'` fallback might bucket all production users into one 30 requests/minute limit. Checking it showed that was **wrong**: both nginx templates set `X-Real-IP` and `X-Forwarded-For` on all 14 `proxy_pass` blocks, so per-client bucketing worked. The check surfaced something worse. nginx used `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for`, which **appends** the real IP to whatever the client sent, producing `<client-supplied>, <real-ip>`. All nine app consumers read `split(',')[0]`, the client-supplied half. nginx also never set or stripped `cf-connecting-ip`, and had no `real_ip_module`, so that header was pure client input too, yet `src/lib/rate-limit.ts` trusted it **first** and its comment called it "most reliable" while `src/utils/security.ts` documented priority as "Cloudflare > X-Forwarded-For > X-Real-IP". Sending one header and rotating it per request defeated both global rate limits, the email-enumeration throttle on `check-email-exists` (whose F-049-04 comment claims the endpoint is enumeration-safe), the password-reset throttle, and let an attacker write arbitrary IPs into the admin audit trail. Only `X-Real-IP` was trustworthy, because `proxy_set_header` **replaces** rather than appends.
- **Learning**: A header name tells you nothing about whether its value can be trusted; only the hop that wrote it does. The same header is authoritative or attacker-controlled depending on one nginx directive, and `$proxy_add_x_forwarded_for` versus `$remote_addr` is the whole difference. The failure here was documentation-shaped: the comments asserted a trust ordering derived from a Cloudflare deployment that does not exist in this infrastructure, and that assertion then propagated unchallenged into nine call sites. Also worth noting the shape of the discovery: my original hypothesis was wrong, and checking it anyway is what found the real defect. An unverified security concern is worth the few minutes to settle, including when it turns out to be nothing.
- **Change to prevent repeat**:
  - For any identity derived from a request header, trace which component sets it and whether that component **replaces** or **appends**. `proxy_set_header X-Real-IP $remote_addr` replaces and is trustworthy; `$proxy_add_x_forwarded_for` appends and the leftmost value is the client's.
  - Prefer the value your own edge writes. Read `cf-connecting-ip` only when Cloudflare is actually the edge **and** nginx is configured with its ranges via `real_ip_module`; otherwise it is a free-text field.
  - When reading `X-Forwarded-For`, take the **last** hop, not the first. That is correct whether the proxy appends or replaces, and stays correct if another proxy is added in front.
  - Fix it in two places. The edge fix (`$remote_addr`, plus stripping `CF-Connecting-IP`) corrects all consumers at once; the app fix (one shared `getTrustedClientIp`) means the app is not relying on the edge being configured correctly. Neither alone is enough.
  - Write the test that encodes the vulnerability, not just the behaviour: supply both `x-real-ip` and a spoofed `x-forwarded-for` and assert the spoof cannot move the result.
  - Treat a comment asserting a trust ordering as a claim to verify against the deployed topology, not as documentation.
- **Task/PR**: Request 279, PRs #480 and #482, commits `cc25b25a`, `4976a3ba`

### 279 - A deploy that reports success may have applied nothing

- **Date**: 2026-10-01
- **Context**: PR #480 fixed the nginx directives, merged, and `Build & Deploy to UAT` reported **success**. The config was never applied. `appleboy/scp-action` v1.0.0 preserves the relative source path, so `source: deploy/nginx/nginx-uat-template.conf` with `target: /tmp/` lands at `/tmp/deploy/nginx/nginx-uat-template.conf`, while the deploy script only checked `/tmp/nginx-uat-template.conf`. Its else branch printed `⚠️ nginx-uat-template.conf not found, skipping Nginx update` and continued, after which `nginx -t` passed and nginx reloaded, both against the **old** config. Every success marker in that job was real and the change was absent. Worse, `deploy-hetzner.yml` already carried the fix, with a comment explaining the exact scp path behaviour and a hard `exit 1`; it had never been back-ported to UAT, so UAT nginx changes had been silently discarded for an unknown period. While fixing it I first wrote an unconditional `exit 1`, which would have broken every deploy that does not touch nginx, because the upload step is conditional on the template having changed; production gets away with an unconditional check only because it is `workflow_dispatch`-only and always uploads.
- **Learning**: A conditional step whose not-found branch is a warning produces a build indistinguishable from one that worked, so the absence of the change is invisible precisely when it matters. The verification that followed the skip made it worse rather than better: `nginx -t` and the reload both passed, lending false confidence by testing an artefact nobody had updated. There is also a second-order lesson about fixing it: converting a silent skip into a hard failure is right only for the case where the action was actually expected. An unconditional failure would have traded a silent no-op for a broken pipeline, which is why the fix reads the same `changed` flag that gates the upload.
- **Change to prevent repeat**:
  - A deployment step that is supposed to change something must verify it changed something. Echo the source path actually used, and fail when an expected update cannot be performed.
  - Scope hard failures to the case where the action was expected. Read the same condition that gates the upload rather than asserting the file always exists.
  - When a deploy bug is fixed in one environment's workflow, check the sibling workflows immediately. The UAT and production deploys here are near-copies, and the fix plus its explanatory comment sat in one of them for an unknown time.
  - Treat a validation step that runs after a skipped update as actively misleading. `nginx -t` on an unchanged file is not evidence about the change you shipped.
  - After merging an infrastructure change, confirm it is live rather than inferring it from a green deploy. Here that meant dispatching the workflow and checking the log said `using /tmp/deploy/nginx/nginx-uat-template.conf`.
- **Task/PR**: Request 279, PR #481, commit `15d6f027`

### 281 - A remediation gated on `sessionStorage` is not one-shot, it is permanent

- **Date**: 2026-10-02
- **Context**: `cleanupServiceWorkers()` was added on 2026-02-05 to flush a broken `supabase-cache` route out of the service worker of clients that already had it. Its file header said it "runs once per session" and its only guard was `sessionStorage['sw-cleaned-up']`. `sessionStorage` is scoped to a browser session, so "once" meant once per session, forever: on the first page view of every new session it unregistered every worker, deleted every CacheStorage entry, and called `window.location.reload()`. Confirmed at runtime against https://ummahflow.com: 14/14 second-and-later sessions forced a reload, landing 8-15ms after FCP on `/` and 406-476ms after FCP on `/food` and `/about`, i.e. after the listing had already rendered. Cost per session was one extra full document load, ~50 requests and ~30KB, plus the PWA precache destroyed and re-downloaded. The `supabase-cache` route it existed to flush had been deleted **in the same commit that added the cleanup**, 8 months earlier. It was also self-sustaining rather than self-limiting: `next.config.js:3`'s `register: true` makes `@ducanh2912/next-pwa` re-register the worker at module eval on every load, so every session handed the next session a fresh worker to destroy.
- **Learning**: The defect is not that dead code survived. It is that the marker chosen to make the action one-shot was incapable of expressing one-shot. `sessionStorage` is the wrong durability class for a remediation: it means "once per session", which for a returning user is "always". A temporary remediation needs a **durable, versioned marker** (`localStorage` keyed to the version or date of the broken artefact, so it can be reasoned about and expired) **and a removal trigger written down when it ships**. With neither, it becomes permanent behaviour nobody remembers owning, and whoever eventually finds it has to prove from scratch whether it is still needed; here that cost a full runtime diagnosis against production. Note how little the comment helped: "runs once per session" was accurate and still read as reassurance. Secondary point, the same shape one layer up: the regression test written to guard this fix shipped with `test.skip(swResponse.status() !== 200)`, so a 429, a 5xx or a redirect would take an assertion-free exit and produce a CI run indistinguishable from a pass. That is the same false-green family as 278 (a guard that could never execute) and 279 (a deploy step whose not-found branch warned and continued). Writing the guard is not the hard part; making sure it cannot silently decline to run is.
- **Change to prevent repeat**:
  - Treat a client-side remediation gated on `sessionStorage` as a recurring action, never a one-shot. If it must run once per user, use `localStorage` with a version- or date-stamped key; if it genuinely must run per session, say so and justify it.
  - Ship every temporary remediation with its removal trigger in the same diff: the condition that makes it unnecessary, named in a comment, plus a follow-up task. "Remove once the `supabase-cache` route is gone" would have closed this in February.
  - When deleting a remediation, prove the thing it remediated is gone rather than inferring it from age. `git log -S supabase-cache` showed the route was removed in the same commit that added the cleanup, which is what turned "add an environment gate" into "delete it".
  - Do not ship a destructive client effect (unregister, cache delete, forced reload) without an environment or hostname gate. The cleanup had none, while the registration it was fighting had one, so the cleanup ran everywhere its opponent did not.
  - For any skip predicate in a test, enumerate which conditions it covers beyond the one you intended, and turn the path where skipping would be wrong into an assertion. In CI, `expect(status).toBe(200)` where you mean "this must be served" beats `test.skip(status !== 200)` every time.
  - Prove a new guard executed, using its runtime. CI run 36974467949 passing in 15.3s is evidence that two real persistent-context browser sessions ran; the same spec skipping returns in 57ms. "The assertion is in the file" is not evidence (learning 278).
- **Task/PR**: Request 281, PR #485, commits `ce09b942` (fix), `a5c19ecb` (review follow-ups)

### 282 - A library's default config carries the bugs of the library it was forked from

- **Date**: 2026-10-02
- **Context**: Replacing `@ducanh2912/next-pwa` (abandoned) with Serwist. Every Serwist migration example starts with `import { defaultCache } from "@serwist/next/worker"` and `runtimeCaching: defaultCache`. Serwist is a Workbox fork by the same author as `@ducanh2912/next-pwa`, and its `defaultCache` production branch ends with `{ matcher: ({ sameOrigin }) => !sameOrigin, handler: new NetworkFirst({ cacheName: "cross-origin", plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 })], networkTimeoutSeconds: 10 }) }` — **byte-identical, down to `maxEntries: 32` and `networkTimeoutSeconds: 10`, to the route quoted in finding F-02 of analysis 046**, the route two post-mortems (046 and 064/069) were written about. The entry after it is a bare dot-star `NetworkOnly`, which is the _other_ failure those post-mortems covered. In a non-production build `defaultCache` collapses to just that NetworkOnly catch-all, and `@serwist/cli` sets `NODE_ENV=development` whenever `--watch` is passed, so the "it's only for dev" version is the worst one. The repo's two hard-won runtime caching rules were ported by hand instead, and a build guard (`scripts/verify-sw-no-cross-origin-routes.mjs`) now executes the shipped `public/sw.js` under `node:vm` and asserts `event.respondWith` is never called for the three Iconify origins. That guard was shown failing against two deliberately-wrong builds (`defaultCache`, and an explicit Iconify `NetworkOnly` route) before being accepted. Its **positive control** — "a same-origin precached URL must still be intercepted, otherwise the negative assertions are vacuous" — then caught a second, unrelated and much worse bug: `@serwist/next`'s injected `manifestTransforms` strips `.html` from every manifest entry before the `public/` prefix strip, so `public/offline.html` was precached as `/public/offline`. Serwist fails the `install` event when any precache entry 404s, so the worker would have registered and then never activated. `verify-pwa-output.js` (file exists, push handler bundled) reported OK on that build.
- **Learning**: Two things. First: a default config is not boilerplate, it is a set of decisions made for an average app, and when the library is a **fork**, those decisions include the fork's inherited defects. Checking a fork's defaults against your own post-mortems is a five-minute `npm pack` and a read; the alternative is re-importing a bug you already paid for, in a package whose name no longer matches the incident report so nobody connects them. Second, and this is the one that actually earned its keep: **a negative assertion needs a positive control**. "No route matches Iconify" and "the routing table was never populated" produce identical output. The control that distinguishes them was added for rigour and immediately found a total PWA outage that three other green checks missed.
- **Change to prevent repeat**:
  - Before adopting any library's exported default configuration, diff it against the constraints your own incidents produced. Read the source, not the docs: `npm pack` the package, extract, and grep for the shapes your post-mortems name (here, `sameOrigin`, a dot-star matcher, a cross-origin cache name).
  - When a library is a fork or rewrite of one you are replacing, assume shared defaults until proven otherwise, and say so explicitly in the migration plan.
  - Every negative build guard ("X must not happen") ships with a positive control in the same script ("Y must happen"), and the control must exercise the same machinery. Without one the guard passes when the artifact fails to load at all.
  - Prove a new guard fails before trusting that it passes, against a real build of the thing it forbids. Learning 278 said this; doing it here is what made both "not intercepted" lines mean something.
  - A guard that asserts the artifact's _behaviour_ (execute `sw.js`, spy on `respondWith`) beats one that greps its _text_. The grep version depended on esbuild keeping the property name `matcher` unmangled, and `mangleProps` is a supported config key: a guard that can silently stop guarding.
- **Task/PR**: Request 282, branch `refactor/282-serwist-migration`

### 282 - A documented root cause can be folklore, and a correct fix does not validate its explanation

- **Date**: 2026-10-02
- **Context**: Four places in this repo — `next.config.js:31-44`, `src/__tests__/config/pwa-config.test.ts:16-24`, retrospective 064 and retrospective 069 — stated that the v0.9.9 Iconify regression happened because "Firefox with Enhanced Tracking Protection blocks the SW-context fetch at the network layer (status null)". Retrospective 069 recorded, as a thing that went **well**, that "the user-provided Firefox console evidence was incorporated directly into the diagnosis rather than treated as secondary noise", and derived a systemic finding from it: the team should add Firefox-ETP e2e coverage. Checking the mechanism before writing that spec: `api.iconify.design`, `api.unisvg.com` and `api.simplesvg.com` appear **0** times in Disconnect's `services.json` (the list Firefox ETP classifies by), **0** times in EasyPrivacy and **0** times in EasyList. ETP cannot block a domain on none of its lists. A Playwright Firefox 155 reproduction of the exact reverted semantics (`event.respondWith(fetch(event.request))` for `api.iconify.design`) returned HTTP 200, type `cors`, with ETP off and with ten strict ETP prefs on. The proposed spec would have been a permanent green check that could never fail. The fix — register no route — was and remains correct; the real failure mode was never identified.
- **Learning**: The fix working is evidence that the _fix_ is right. It is not evidence that the _stated cause_ is right, and the two get conflated the moment a remediation succeeds and the incident closes. Here a plausible mechanism inferred from one user's console output hardened into settled fact across four files in six months, and the next piece of work built on it was about to be a test asserting a condition that does not exist. The tell was available the whole time: the comment hedged ("or any browser extension that classifies CDN domains as trackers"), and that hedge was carrying the entire claim. There is a specific trap in deriving test coverage from a retrospective's "what to do differently": the proposed test inherits the retrospective's causal model, so if the model is folklore the test is theatre.
- **Change to prevent repeat**:
  - Label an unverified mechanism as unverified **at the moment it is written down**, in the comment and the retrospective both. "Suspected: Firefox ETP (user console evidence, not reproduced)" costs one line and stops the claim hardening.
  - Treat a hedge in a root-cause statement as a confession. If the sentence needs "or something like it" to be true, the named cause is not established.
  - Before writing a regression test from a retrospective's recommendation, verify the mechanism the test will assert. Ask what would make this test fail, and if nothing realistic would, do not write it.
  - Write the guard at the level you have actually verified. "The shipped worker registers no route matching these origins" was provable in under a second on the real artifact; "icons load in Firefox with ETP on" was not provable at all.
  - Correct closed post-mortems by **appending a dated note**, not by editing them. The original reasoning and the correction are both evidence, and future readers need to see that an attribution went unchallenged for six months.
- **Task/PR**: Request 282, branch `refactor/282-serwist-migration`

### 282 - A feature wired through a plugin hook needs a guard that it is REACHABLE, not just present

- **Date**: 2026-10-02
- **Context**: The Serwist migration ported the two `workboxOptions.runtimeCaching` rules it was told to port, exactly. `@ducanh2912/next-pwa` had also generated a third route from its `cacheStartUrl` default (`registerRoute("/", new NetworkFirst({ cacheName: "start-url" }), "GET")`), which sat outside that array and so was never on the port list. That route was the only one that ever handled a document request, and Serwist attaches `fallbacks` as a `handlerDidError` plugin on the `runtimeCaching` strategies rather than as a global navigation handler. Dropping it therefore made `fallbacks: { entries: [{ url: '/offline.html', matcher: ({ request }) => request.destination === 'document' }] }` unreachable: config that reads as working, does nothing. Nothing went red. The entry was present in `sw.ts`, `/offline.html` was still precached and still served on a direct request, `verify-pwa-output.js` passed, the Iconify probe passed (its positive control asserted `/offline.html` was intercepted, which proves the routing table is populated, not that the fallback can fire), and both PWA e2e specs passed. The only way it surfaced was reading the old generated worker line by line and noticing a `registerRoute` call with no counterpart in the new config.
- **Learning**: When a feature is wired up through a plugin hook on another feature, "the config is present" and "the feature can happen" are different claims, and only the second is worth guarding. The gap also exposes a second failure: a port list derived from one config key is incomplete whenever the library generates routes from its own defaults. `cacheStartUrl: true` was never written in `next.config.js`, so it was invisible to a config-level diff, and only visible in the artifact the old library emitted. Diff the generated worker, not just the config you wrote.
- **Change to prevent repeat**:
  - When replacing a library that generates code, diff the **generated output** of old and new, not only the configuration. A default that was never spelled out in your config still shipped behaviour.
  - For any option implemented as a plugin hook on another option (fallbacks on strategies, interceptors on clients, error handlers on routes), write the guard as "a request that should trigger it does reach a handler", not "the option is configured".
  - A positive control that proves the machinery is wired is not a positive control for every feature that rides on it. `scripts/verify-sw-no-cross-origin-routes.mjs` now carries a second one: a document request to `/` must be intercepted. It was observed failing with the start-url route removed, which is the only reason it counts.
  - Treat a reviewer's explicit "port only these N things" as a scope boundary and a **risk flag** at once: say out loud what the boundary excludes, in the artifact (here a comment on the `fallbacks` option) and the request doc, before it ships.
- **Task/PR**: Request 282, branch `refactor/282-serwist-migration`

### 282 - Moving artifact generation into an npm lifecycle hook breaks every pipeline step that calls the binary directly

- **Date**: 2026-10-02
- **Context**: Serwist's configurator mode moved service-worker generation OUT of `next build` (where `@ducanh2912/next-pwa` did it as a webpack plugin) and INTO a separate `scripts/build-sw.js`, reached from `npm run build` through the `postbuild` hook. Local verification went through `npm run build`, so the hook always fired and every check was green. CI mostly does not use `npm run build`: `.github/workflows/ci.yml:113` and two steps in `weekly-quality-gates.yml` call `npx next build --webpack` directly, and **npm lifecycle hooks do not run for a direct binary invocation**. Those three steps produced no worker at all, and `scripts/verify-pwa-output.js` failed on the missing file, which is the guard doing exactly its job. The same class of gap appeared twice more in the same request: `scripts/verify-sw-no-cross-origin-routes.mjs` had never run in CI at all, because only `build:sw` invokes it, and a regression test (`plan211-map-tiles-iphone.test.ts`) still asserted on `next.config.js` text after the rule moved to `src/lib/pwa/runtimeCaching.ts`. Separately, the CI 429 on `/sw.js` traced to another unexamined default: `@serwist/next` sets `precachePrerendered: true`, precaching every prerendered page, which next-pwa never did. That took install-time requests the middleware counts from 54 to 112 against a 100 req/min per-IP bucket, so the tail 429'd, Serwist rejected the `install` event, and the worker sat `installing` forever with no build-time symptom.
- **Learning**: This is learning 278's rule run in reverse. 278 was "a required flag must be added to every invocation site"; this is "when generation **moves** to a lifecycle hook, every site that invokes the underlying binary silently stops producing the artifact". Both have the same tell: the verification command differs from the pipeline's command. `npm run build` passing says nothing about `npx next build` passing once a hook is load-bearing. Second half, same shape one level down: a migration's "parity" list covers the options you ported and misses the options the new library sets for you. `precachePrerendered` was never written in any config file, so no config diff could show it; only diffing the generated manifest against the deployed old worker (`curl https://ummahflow.com/sw.js`) revealed +61 entries.
- **Change to prevent repeat**:
  - When you move artifact generation into an npm lifecycle hook, grep every pipeline for direct invocations of the underlying binary (`next build`, `npx next build`, `node_modules/.bin/next`) before assuming the hook covers them. Check workflows, `Dockerfile`, `scripts/`, `deploy/`.
  - Reproduce CI's **exact command**, not the npm script that wraps it. Here that one line, `npx next build --webpack && npm run build:sw`, was the only thing that would have caught it, and it had never been run locally.
  - Have the pipeline call the hook's target explicitly (`npm run build:sw`) rather than one script inside it, so adding a fourth guard to that target reaches CI automatically.
  - When a file moves, grep for its old path in the test suite before declaring the move done. A regression test that reads a path is a reference that no type checker will catch.
  - Diff the **generated artifact** of old and new library against the live deployed one. `curl https://<prod>/sw.js` and comparing precache manifests is a one-minute check that showed a defect no config review could.
- **Task/PR**: Request 282, PR #486, follow-up commits on `refactor/282-serwist-migration`

### 282 - A service worker's script fetch does not carry the test harness's headers

- **Date**: 2026-10-02
- **Context**: `e2e/fixtures.ts` hands every test a synthetic `x-forwarded-for` so the middleware's 100 req/min non-API bucket cannot make the suite flake. That worked for years because the suite never had a service worker: `npm run dev` generates none, and the PWA only registers when `NODE_ENV === 'production'`. Request 282 moved the e2e webServer onto a production build, so every page load in six specs that assert nothing about the PWA started registering a worker and precaching 290 URLs. CI then failed on `/sw.js` 429 in three different shapes across three runs, and two plausible-sounding explanations were wrong before the right one was measured. The measurements that settled it: (1) three back-to-back page loads on three different synthetic IPs, each installing the full worker, 0 x 429, so **precache** fetches do carry the context's `extraHTTPHeaders`; (2) exhaust the shared `'unknown'` bucket with 105 header-less requests, then the same path header-less returns 429 while with a header it returns 200; (3) with that bucket spent, a page load on a brand-new IP still fails with `A bad HTTP response code (429) was received when fetching the script` and `registrations=0`. The downloaded Playwright trace confirmed it from the other side: the failing session's own page load made only 17 rate-limited requests, so its per-IP bucket was nowhere near full. The worker's **script** fetch is the one request in the whole flow that the harness cannot label.
- **Learning**: A per-test identity injected through the browser context covers what the page fetches, not what the browser fetches on the page's behalf. The service-worker script fetch is issued by the browser's worker machinery, outside the context's header plumbing, so it silently joins whatever anonymous bucket the server uses. Two general points. First, when a test harness fakes an identity to work around a server-side limit, enumerate the request paths that will not carry it (worker scripts, manifest fetches, prefetches, beacons) rather than assuming the whole flow is labelled. Second, three failing CI runs in a row on the same 429 produced three different theories, and the thing that ended it was a probe designed to **distinguish** the candidate buckets (fill one, then request on a fresh IP) rather than another round of reasoning about the code. Build the discriminating experiment early; "it must be X" costs more than measuring.
- **Change to prevent repeat**:
  - Keep service workers blocked (`use.serviceWorkers: 'block'`) in every spec that is not testing one. A worker that installs 290 precache entries and then intercepts navigations is cross-test noise in a spec about login.
  - Give every request-issuing fixture the same synthetic identity, not just `page`. Playwright's `request` (`APIRequestContext`) sends no proxy header at all, which put both PWA specs red on a precondition that has nothing to do with the PWA.
  - When a rate limiter is implicated, find out which **key** is being charged before changing anything. Fill one bucket deliberately and request from another: if the fresh key still fails, the request is not being charged to the key you assumed.
  - Do not weaken the limiter to make a test pass. Every fix here was in the test layer or in the precache scope; `src/middleware.ts` is untouched, and it was reporting a true fact each time.
- **Task/PR**: Request 282, PR #486, commits `973cdbb0`, `d3d43def`

### 282 - A rate limiter that counted two identical classes of file differently, and the test that tells a fix from a bypass

- **Date**: 2026-10-02
- **Context**: Three CI runs of request 282 ended in a 429 and every fix was deliberately kept out of `src/middleware.ts`, on the rule in the entry above: do not weaken a limiter to make a test pass. That was right at the time, and it left the real defect in place. `src/middleware.ts`'s matcher already excluded `_next/static` and `_next/image` outright, so those immutable files were never counted; identical files served from `public/` (`/images/**`, `/icons/**`, `/sw.js`, `/offline.html`) were counted in full, against a 100 req/min per-IP page bucket. A service-worker precache fetches ~290 of them in one burst, so the limiter was converting one legitimate action into a wall of 429s, and because Serwist rejects the `install` event on any non-OK precache response, the only symptom was a worker stuck `installing`: no offline page, no push, nothing red. Measured after exempting them by file extension: install goes from 50 counted requests to **1**, a first page view plus install from 66 to **16** of the 100, and the app-route control still produces exactly 20 x 429 when driven 120 times from one IP.
- **Learning**: "Do not weaken the control to make the test pass" and "do not leave a control that miscategorises its input" are both true, and the way to tell which one you are doing is to write the control's own test first and prove it can still fail. Here that is one test: drive `/`, `/food`, `/about`, `/city/berlin` past the ceiling from a single synthetic IP and assert the 429. It was observed red twice, once with the exemption's negation inverted and once with the predicate broadened to directory prefixes. A change to a security control with a red control test behind it is a fix; the same change without one is a bypass, and the diff looks identical. Second, narrower point that cost real time: match a static-asset exemption on file **extension**, not directory prefix. Every app route in this codebase is extensionless, so an extension test cannot shadow one, while `startsWith('/images')` would also exempt a future `/images` page, and that broadening is invisible to a test that only drives today's routes. The assertion that catches it is `isStaticAssetRequest('/images') === false`.
- **Change to prevent repeat**:
  - Before changing a rate limit, enumerate what it already exempts. Two exemption mechanisms (a matcher and an in-handler predicate) describing the same class differently is the bug; one of them is usually already correct.
  - Put the predicate in the handler, not in the Next matcher regex. `'/((?!api|_next/static|...).*)'` with another nested lookahead plus `(?:...)` and `$` is fragile under path-to-regexp and cannot be unit-tested; a named predicate can be driven directly with the paths that must NOT match.
  - Add the negative-shadowing cases to the test, not just the positive ones. `/images` and `/icons` as extensionless paths are the assertions that fail against a prefix rewrite.
  - When a limiter blocks a legitimate burst, ask whether the burst is one logical action. A 290-request precache from one client in one second is not abuse; 290 page views are.
- **Task/PR**: Request 282, PR #486, commit `9cbb6c3b`

### 282 - A guard that bans a SHAPE to exclude a BEHAVIOUR expires the moment you need that shape

- **Date**: 2026-10-02
- **Context**: `src/__tests__/config/pwa-config.test.ts` asserted `expect(typeof matcher).not.toBe('function')` for every runtime caching rule. The reasoning was sound and written down: the thing it existed to keep out was `defaultCache`'s `({ sameOrigin }) => !sameOrigin`, incidents 046 and 064 were about exactly that route, and only a function matcher can express that shape at all. Then widening offline coverage required `({ request, sameOrigin }) => sameOrigin && request.destination === 'document'`, a function matcher that is the _opposite_ of the banned one, and the guard had no way to tell them apart. Replaced by the property it was standing in for: every matcher, whatever its shape, must evaluate to `false` for a cross-origin request to the three Iconify origins, at three `request.destination` values. `!sameOrigin` returns true and is rejected (verified: pasting `defaultCache`'s entry 19 back in fails 5 of 14 tests); `sameOrigin && ...` returns false and is permitted.
- **Learning**: A syntactic proxy for a semantic property is cheap to write and silently both too strong and too weak: too strong because it blocks correct code that happens to share the shape, too weak because it says nothing about any other shape that could express the same bad behaviour (a RegExp that lost its `^`, say, which the ban did not cover). The honest version evaluates the thing under test against the input it must reject. In this codebase that was four lines of work, because the matchers are plain values and Serwist's matcher argument is three fields, and it should have been the first version. The same pattern applies to the probe's positive controls: the existing control asserted a document request to `/` was intercepted, which stayed green against a root-only route, so the new capability needed its own control for a non-root path (`/food`). A control that cannot distinguish the state you just left from the state you intended is not a control for the change you made.
- **Change to prevent repeat**:
  - When a guard bans a shape, write down the behaviour it is standing in for, then check whether that behaviour is directly testable. If it is, assert it instead.
  - When a guard blocks a change you believe is correct, the first question is whether the guard's property or its proxy is in the way. Replacing a proxy with the property is a strengthening; deleting it because it is inconvenient is not, and the two commits look similar.
  - Add a positive control per capability, not per machinery. `/offline.html` is intercepted proves the routing table is populated; `/` is intercepted proves documents are routed; `/food` is intercepted proves routing is not root-only. Each was observed failing on its own.
- **Task/PR**: Request 282, PR #486, commit `70dbb620`

### 282 - An exemption keyed on a suffix the client controls is a bypass, whatever it is named

- **Date**: 2026-10-02
- **Context**: The static-asset exemption added earlier in request 282 (commit `9cbb6c3b`) keyed purely on file extension, and the entry above explicitly recommends that over a directory prefix. It is wrong. The predicate runs on EVERY path in `src/middleware.ts`, so `/p/anything.json`, `/food.json`, `/city/berlin.png`, `/about.html` and `/create/listing.js` were all exempt from the 100 req/min page bucket while still reaching the app. `/p/[slug]` does a provider lookup before it 404s, so that is an unmetered database request per hit, available to anyone who can append `.json` to a URL. The shadowing test that was supposed to cover this asserted `isStaticAssetRequest('/images') === false`, i.e. it only ever checked that a real route is not mistaken for an asset, never that a fake asset is not mistaken for a real route. Fixed by requiring an exact known file from `public/` or a static extension INSIDE one of the five known asset directories. Six new tests, all shown red against the extension-only version: five drive a fake-extension route 120 times from one IP and assert 20 x 429 (they got 0), one asserts the predicate returns false for each. Re-measured afterwards: the narrower rule changed the counted totals by **zero** at every phase (install 1, page view 13, both 14), because real traffic only ever fetches from the known dirs and the known root files.
- **Learning**: The two failure modes of an allowlist predicate are not symmetric, and testing only one of them is the trap. "Does this exempt something it should not?" needs inputs the ATTACKER chooses, not inputs the app generates. Every negative case in the original test (`/images`, `/icons`, `/food`, `/city/berlin`) was a path the app itself serves, so the suite proved the exemption could not shadow a real route and said nothing about an attacker synthesising a fake asset, which is the cheaper attack and the one that matters. The general rule: when a security predicate reads a client-controlled part of the request (a suffix, a header, a query param), the test set must contain adversarial values for that part, not just the values production emits. The structural fix is to pin the exemption to a closed set the server owns (5 filenames, 5 directories, enumerable from `ls public/`) and require BOTH halves, so neither a suffix nor a prefix alone opens it.
- **Change to prevent repeat**:
  - For any exemption predicate, write the adversarial row first: take each path the control must still cover and append/prepend whatever the exempt set accepts. If the predicate then exempts it, the rule is too broad regardless of how it reads.
  - Prefer a closed enumerable set (known filenames, known directories) over an open pattern. `public/` has 5 top-level files and 5 asset dirs; that list is short, greppable and diffs loudly when it changes.
  - Require both halves when combining a prefix and a suffix test. Extension alone lets any route be suffixed; directory alone exempts a future extensionless page at that path. Each half has its own red test.
  - Re-measure after narrowing a performance-motivated exemption instead of assuming it still pays. Here the probe reported identical counted totals under both predicates, which is the evidence that the narrow rule costs nothing.
- **Follow-up**: `public/images/seals/README.md` is still counted by the limiter (`.md` is not an asset extension) and, more to the point, a README is shipped as a public static asset at all. Move it out of `public/`.
- **Task/PR**: Request 282, PR #486

### 283 - An unbounded `>=` override silently defeats a transitive pin, and a 200-only check cannot see either failure it causes

- **Date**: 2026-10-03
- **Context**: `/api-docs` returned 500 for ~6 months and nobody noticed. `swagger-jsdoc` pins `yaml: 2.0.0-1` exactly (the only version carrying `defaultOptions`), and the repo's global `"yaml": ">=2.8.3"` override (added 2026-03-28 by `f37af618`, a broad security-remediation commit) made npm silently drop the nested pinned copy and hoist 2.9.0 over it. First property write on `YAML.defaultOptions` threw inside the route's catch, which leaked `error.message` to the client. Independently, the `js-yaml >=4.3.0` override pushed swagger-ui-react's `import { default as M } from 'js-yaml'` past the version that dropped the default export, so even with a valid spec the page threw on render. Both breaks came from unbounded security overrides; neither from a feature commit nor a dependabot bump. The QA records that "verified" the page (037, 2026-03-08) asserted only that it compiles and returns 200 for the HTML shell — a signal that stayed green through the server 500 (rewrite target died, page still 200s a spinner) and through the client-side render failure (page is 200 either way). Deleted the whole surface rather than fixing it: broken 6 months unnoticed, 5% route coverage, publicly unauthenticated, ~1.2MB of deps plus a dompurify/immutable advisory tail.
- **Learning**: A `>=` override in `package.json` is not a floor, it is an override of EVERYONE's declared range, including a dependent's exact pin — and npm does not warn when it substitutes 2.9.0 for a pinned `2.0.0-1` inside a subtree. The override that breaks things is indistinguishable in the diff from the override that fixes an advisory; the difference only shows up in `npm ls` resolution. Second failure is symmetric: HTTP 200 on a client-rendered page asserts that a shell was served, nothing more. A page that fetches its content client-side can be 200 while returning 500 for the data and throwing on render, and a status assertion passes all three states. The signal that would have caught either half was one command (`node -e "import('next-swagger-doc').then(m=>m.createSwaggerSpec(...))"`, seconds, red-capable) or one console-error assertion, and neither existed.
- **Change to prevent repeat**:
  - Before adding a global override, run `npm ls <pkg>` and check whether any consumer declares an exact pin or a narrower range than the override resolves to. A pinned transitive dep being silently overridden is a red flag; scope the override to the dependents that actually need it (`"swagger-jsdoc": { "yaml": "2.0.0-1" }`) rather than widening the whole tree.
  - Ban unbounded `>=` in `overrides` (org guardrail already does; this repo still has ten). Where an override must stay because consumers remain, record which advisory it answers and which packages consume it, in the file, so the next session can evaluate removal in one lookup instead of a git bisect.
  - For any client-rendered page, the "it works" assertion must include the content fetch and zero console errors, not the shell's status. HTTP 200 stayed green through six months of this page being completely broken.
  - When a bug has two independent causes, verify the second one separately after fixing the first. The 500 fix here still left the page broken; a fix verified only to "route returns 200" would have shipped a spec that renders nothing.
  - Deletion is a legitimate fix when the artifact has been silently broken for months, covers a fraction of its claim, and carries its own advisory surface. The costliest part of this bug was not the broken page, it was the tooling gravity keeping a 2022 prerelease parser and a broken upstream import alive.
- **Task/PR**: Request 283, commits `2f70b94a` (diagnosis) and the deletion commit on `fix/283-api-docs-jsyaml`

### 284 - Probe the permission before dispatching the worker

> **SUPERSEDED by 284b below.** Its stated root cause is wrong. The nine dead
> workers were killed by the frontmatter `permissions.deny` block, not by a
> missing write scope, and `request_scope` was never broken. Do not apply the
> "Tool was rejected means a missing write scope" heuristic from this entry.

- **Date**: 2026-10-03
- **Context**: During request 284, nine consecutive subagent dispatches died instantly with "Tool was rejected", across the analyst and implementer profiles, foreground and background, plus sidekick. The orchestrator misdiagnosed it twice: first it removed a working `permissions.deny` fence from the orchestrator skill's frontmatter on the theory that the deny block was killing workers, then it reordered the worker instructions, before the actual cause was isolated. The real cause was a missing write scope: both uflow worker profiles order the worker to write `agent-output/_archive/requests/<ID>-<slug>.md` in the canonical repo as its first action and to stop if denied, no Write grant covered the canonical repo, and background subagents cannot prompt, so the write auto-denied and every worker stopped on instruction. The decisive evidence had been available from the start: the first `write` attempt returned a scope denial naming the directory, not a deny-rule block. A direct probe, one `write` call from the orchestrator to `agent-output/.permprobe-284.txt`, settled in one step what nine subagent deaths settled slowly.
- **Learning**: A worker that dies instantly with "Tool was rejected" is almost always a missing write scope, not a broken subagent system. Background subagents cannot prompt and auto-deny anything not pre-approved, and both uflow worker profiles write the tracking file in the canonical repo as their first action, so a canonical-repo write scope is required for every flow including exploration. Diagnose it with one direct `write` tool call from the orchestrator before dispatching: a scope denial names the directory it was denied on, while a deny-rule block does not. Also: permission config and skill frontmatter load at session start, so a permission fix cannot be verified in the session that made it. Changing a permission and testing it in the same session tests the old permission set.
- **Change to prevent repeat**:
  - Before dispatching any subagent whose brief includes a write, run one cheap `write` probe to the target directory from the orchestrator. A probe costs one tool call; a dead worker costs a whole dispatch.
  - Read the denial before theorising. A scope denial names the directory; a deny-rule block reads differently. The first failure here already contained the diagnosis.
  - Never remove a permission fence on an unconfirmed theory. Restoring it afterwards costs a commit pair that cancels out (here `db6489c9` and `6e36e890`) and leaves the investigation no further along.
  - Treat canonical-repo write scope as a precondition for every flow, not just implementation flows, because the tracking-file write happens before the worker's real work begins.
  - After changing permission config or skill frontmatter, say plainly that verification requires a session restart rather than claiming the fix works.
- **Task/PR**: Request 284, commits `6e36e890`, `db6489c9`

### 284b - A deny rule that reports itself as a missing scope

- **Date**: 2026-10-03
- **Context**: Correcting 284 above. Eight permission probes, run one variable at a time in a fresh session, inverted that entry's conclusion. Baseline first: with the orchestrator skill NOT invoked, a background `subagent_general` wrote to `/Users/NARAFIQ/Projects/uflow/agent-output/` successfully, while the same write one directory up at `/Users/NARAFIQ/Projects/` was denied with `... was denied because this agent is running in the background, where tools that would require approval are automatically denied` and the worker **survived to report it**. `request_scope` was then tested against a path proven denied moments earlier, with an ungranted sibling as an in-run control: the granted path succeeded, the control stayed denied, and a follow-up probe showed the grant is recursive to arbitrary depth and reaches workers dispatched after the call. So `request_scope` works. Then `/orchestrator` was invoked, loading `permissions: deny: [edit, write]` from its frontmatter, and the identical dispatch died instantly with `Tool was rejected`, producing no report at all; a second one died before even reaching its write; a read-only `subagent_explore` dispatch still succeeded, ruling out a broken harness. Five dispatches before invoking the skill survived, both `subagent_general` dispatches after it died. The skill's own fence was killing every worker. Worse, with the skill active, `request_scope` reported `Scope granted: write access to /Users/NARAFIQ/Projects/uflow` and the next write was still refused, with this message: `Write access to '<path>' was denied. The user needs to grant write permission for this directory — ask them to approve the write access request or add the directory to the workspace.` The user approved; it changed nothing, because a deny rule always beats an allow. That is the precise sentence that caused two misdiagnoses. It also means `db6489c9`, which dropped the deny block, was correct, and `6e36e890`, which restored it, was the regression.
- **Learning**: The denial message named a cause that was not the cause, and it named a remedy that cannot work. A deny rule emits a scope-shaped error inviting the user to grant permission, so the one action the message recommends is the one action guaranteed to have no effect; a session grant that reports success and is then ignored is the tell. The two signatures are what actually discriminate, and they are unambiguous once you know to compare them: a **deny rule** gives `Tool was rejected`, kills the worker, and returns no report, whereas a **missing scope** in a background worker gives an explicit background auto-deny message and the worker lives to tell you. Entry 284 read the first as the second and inverted the diagnosis. Two further corrections to it: permission config changes take effect **mid-session**, proven by removing a config entry and having the very next write denied in the same session, so "verification requires a restart" was wrong; and a skill-level `deny` **does** propagate into subagents the skill dispatches, which the CLI docs do not say, since their note that skill permissions are "not applied when the skill runs as a subagent" covers the skill itself running as a subagent and not the subagents it spawns. The deeper process point is that 284 asserted a root cause whose discriminating evidence was never collected: the cheap A/B here was the same probe with the skill inactive and then active, and nobody ran it before shipping a fix in the opposite direction.
- **Change to prevent repeat**:
  - Compare the denial signatures before theorising. `Tool was rejected` plus a dead worker and no report means a deny rule; a named path plus a surviving worker that reports means a missing scope. These are different bugs with opposite fixes.
  - Test the remedy a denial message recommends rather than trusting it. If a granted scope still fails, the blocker is a deny rule and no approval will help; stop asking for permission and go find the rule.
  - A/B the variable you control. Run the same probe with the skill inactive, then active. Two dispatches settle what nine dead workers did not.
  - Change one variable at a time. Removing the config entry and then invoking the skill in the same session confounded the result and cost a recovery step to re-establish a baseline.
  - Before asserting a root cause in a learning entry or a commit message, name the observation that rules out the competing explanation. 284 had no such observation, and its confident "CONFIRMED" framing is what carried the error forward into a shipped commit.
  - Do not fence an orchestrator skill with frontmatter `permissions.deny` while it dispatches workers. The block reaches the workers and kills them. Carry the restriction in prose rules addressed to the router instead.
- **Task/PR**: Request 284, commit `6f1f53a5`; corrects the entry for commits `6e36e890` and `db6489c9`

### 284c - The corrections list missed the instruction the correction invalidated

- **Date**: 2026-10-04
- **Context**: Landing the 284b corrections. 284b's own baseline probe had already shown that writes under the workspace root `/Users/NARAFIQ/Projects/uflow` succeed with no grant, the denial boundary sitting one level up at `/Users/NARAFIQ/Projects/`. Six prose corrections were derived from 284b and applied, but all six targeted the denial-signature narrative. Step 1.6 and rule 4 of the orchestrator skill, which told the router to `request_scope` the canonical repo path and called it "Required for every flow", were left untouched, though 284b's evidence had already made them false. The gap surfaced only because the fix was re-verified from scratch rather than trusted: a negative-control probe, written to measure whether the grant was needed at all, reproduced 284b's baseline and in doing so exposed the stale instruction. The same re-verification caught two further inaccuracies in the handoff that carried the work between sessions, a `Write()` config entry recorded as removed that had regenerated itself mid-session, and a claimed ~100-line `dependabot.yml` diff that did not exist.
- **Learning**: A correction derived from new evidence has to be applied to every instruction that rested on the old evidence, not only to the passage that stated it. Explanation and imperative live in different sections and drift apart, so a corrections list assembled by reading the wrong-looking paragraph will walk straight past the confident-looking instruction built on top of it. Verification is what catches the drift: re-deriving the measurement instead of trusting the written record turned up a stale instruction, a regenerating config entry and a phantom diff, none of which a documentation review would have flagged.
- **Change to prevent repeat**:
  - When a learning entry inverts a mechanism, grep the affected documents for every instruction that cites that mechanism and fix them in the same pass. Correcting the explanation and leaving the imperative ships a document that contradicts itself.
  - Re-run the measurement when picking up handed-off work rather than trusting the handoff's record of it. Three findings this session contradicted a handoff written hours earlier by its own author.
  - Put a negative control in any permission test. A probe that only confirms success cannot tell "the grant worked" from "no grant was ever needed", which is the precise ambiguity that produced 284's inverted diagnosis.
- **Task/PR**: Request 284, follows up 284b

### 284d - A CI step set to continue-on-error is a gate that was never built

- **Date**: 2026-10-04
- **Context**: `.github/workflows/ci.yml` ran `npm run lint` with `continue-on-error: true`. Lint failures printed red and the pipeline carried on, so the step reported a status without gating anything. It was set once during a transition and left for months while 86 ESLint errors accumulated. PR #346 was opened in August to remove that one line, then sat CONFLICTING for a month; by the time it was rebased, 85 of its 86 fixes had landed independently through other PRs and the single line was all that remained novel. Separately, `npm run lint` is `eslint .`, which exits 0 at any warning count, so removing `continue-on-error` makes the step block on errors while leaving 131 warnings invisible and free to grow.
- **Learning**: A step with `continue-on-error: true` is not a weak gate, it is no gate, and it decays in a particular way: the thing it was meant to guard accumulates at full speed while a green check says otherwise. Two properties make it worse than having no step at all. It occupies the slot where a real gate would go, so nobody notices the absence, and it teaches reviewers to read the job name instead of the result. The same blindness repeats one level down: `eslint .` exits 0 on any number of warnings, so even a blocking lint step gates nothing until `--max-warnings` pins the count.
- **Change to prevent repeat**:
  - Give any `continue-on-error: true` an explicit removal condition recorded in `agent-output/`, and treat a missing condition as the finding. A transition with no deadline is a permanent state.
  - Pin the warning count with `--max-warnings <current>` whenever a lint step becomes blocking, and lower it as the backlog clears. A blocking step with an unbounded warning budget gates errors only.
  - Prove a new gate bites before merging it. Run the check one unit stricter than the pin and confirm it fails. A passing run on its own cannot tell a working gate from a flag the runner silently swallowed.
- **Task/PR**: Request 284, PRs #497 and #500. Supersedes the entry carried on `fix/pipeline-hardening` (#346), which recorded a `varsIgnorePattern` addition that was subsequently reverted.

### 285 - Every "invoke the X skill" line in every dispatch brief was a silent no-op

- **Date**: 2026-10-04
- **Context**: The orchestrator's six flow files each carry a Skills column, both worker profiles instruct the worker to invoke the skill named in its brief, and rule 8 made `tdd` mandatory for every implementation brief. None of it ran. A live `analyst` subagent reports its complete tool list as `edit, exec, find_file_by_name, grep, read, write`, with no `skill` tool, so the instruction had nothing to call and the worker proceeded without the skill rather than failing. The first fix attempted was adding `- skill` to `allowed-tools` on both profiles, on the theory that a custom profile's `allowed-tools` is a true restriction and `skill` had simply been omitted. Probing that in-session returned the same six tools, but the result was worthless: removing `write`, `edit` and `exec` from `analyst.md` mid-session left a freshly dispatched analyst still holding all three, proving profiles are frozen at session start. `devin -p` resolved it without a restart, since it spawns a fresh process that reloads profiles from disk. With `- skill` present, the fresh-process probe still returned exactly those six tools. With `allowed-tools` deleted outright, it returned all 22 tools including `web_search`, `webfetch`, `mcp_*`, `todo_write` and `request_scope`, and `skill` was still absent, sitting alongside the documented omissions of `run_subagent` and `ask_user_question`. Subagents have no `skill` tool under any profile, and no grant can produce one. Separately, 16 of the 27 mattpocock skills set `disable-model-invocation: true`, so `to-spec`, `to-tickets`, `implement`, `triage` and `retro` are unreachable by the `skill` tool even from the root agent.
- **Learning**: An instruction to use a capability the agent does not have degrades silently. A denied tool call produces an error that surfaces; an absent tool produces nothing at all, because the model simply does the task its own way and reports success, so the Skills column kept describing a pipeline that had never once executed. Two separate ceilings were conflated and only pulling them apart gave the right fix: `allowed-tools` is a true restriction, which made "the whitelist omits `skill`" a plausible and wrong diagnosis, when in fact the tool is withheld from subagents entirely. The discriminator was not a cleverer theory but deleting the whitelist and watching 22 tools arrive without `skill` among them. The in-session probe that preceded it looked like confirmation and was pure confound, which is the same frozen-config trap as 284 in a new costume: 284 concluded a restart was needed where it was not, and here the restart genuinely was needed, so the general rule is to probe in a fresh process rather than reason about which config reloads when. `devin -p` does that in one command and should be the default for any config-dependent probe.
- **Change to prevent repeat**:
  - Probe config-dependent behaviour with `devin -p`, not by reasoning about reload semantics or asking the user to restart. Subagent profiles freeze at session start, permission config does not, and the difference is not worth remembering when a fresh process settles it in one command.
  - When a brief tells a worker to use a named capability, make the worker's instructions say what to do if it is unavailable. Both profiles now carry a "Following a skill" section whose failure mode is stop and report, not proceed without it.
  - Verify a capability exists before writing documentation that depends on it. The Skills column, rule 8 and the flow tables were all internally consistent and all describing something that never ran, and no amount of reviewing those documents against each other would have caught it. One tool-list probe did.
  - Delete a grant proven to be a no-op rather than leaving it in place as harmless. A `- skill` entry in `allowed-tools` reads as evidence the capability exists and would have restarted this investigation from the wrong end.
  - When a fix lands on an unverified mechanism, say so in the artifact. The first commit here shipped with the grant unverified and a fallback documented; the fallback was then disproved by the same probe, and only an explicit "UNVERIFIED" note in the footer kept it from being read later as settled.
- **Task/PR**: Branch `chore/orchestrator-skill-resolution`, commits `9fc6711c` and `b8b815b3`

### 285b - A profile field that loads cleanly and does nothing

- **Date**: 2026-10-04
- **Context**: The analyst profile's `description` said "Does not change source code" and its Scope called source read-only, but nothing enforced either. To test whether a path-scoped guard existed, `permissions: deny: [Write(/Users/NARAFIQ/Projects/uflow/src/**)]` was added to `analyst.md`'s frontmatter. `devin doctor` reported all four profiles loading cleanly. A fresh `devin -p` probe under `--permission-mode accept-edits` then ran a TEST write to `/Users/NARAFIQ/Projects/uflow/src/__probe__.tmp`, which succeeded with `File created successfully at: ...`, and a CONTROL write to `/Users/NARAFIQ/Projects/uflow/agent-output/__probe__.tmp`, which also succeeded. The control proves the probe was capable of writing, so the TEST success is a real negative result: the deny rule was parsed and ignored. The documented frontmatter fields for a custom subagent are `name`, `description`, `model`, `allowed-tools` and `max-nesting`. `allowed-tools` is the only field that restricts anything, and it is tool-granular, not path-granular. The analyst genuinely needs `exec` to reproduce bugs for `diagnosing-bugs` and run `git diff` for `code-review`, and needs `write`/`edit` for its tracking file, so the tools that would have to go cannot go. With `exec` present the question is moot anyway, since `sed`, `tee` and `cat >` are all in the session allow-list. Real path enforcement would need session-level `Deny(Write(...))` rules plus `--sandbox`, because without that flag `exec` ignores `Write()` rules entirely; that is a whole-session policy change, not a per-profile one, and it is not in place. The fix shipped is prose: the `description` now says the boundary is convention rather than tool restriction, and the Scope bullet tells the worker that crossing it is a reportable routing error, not an option.
- **Learning**: The dangerous property was not that the field failed but that it was accepted silently. `devin doctor` passed, the profile loaded, nothing warned, so a reader would reasonably conclude the deny was active while it sat in the config as decoration. This is the same silent-degradation shape as 285, one layer down: there an absent `skill` tool produced no error and briefs went on describing a pipeline that never ran; here an ignored `permissions` key produced no error and a profile went on describing a guard that never fired. The second half of the finding is structural, not fixable: `allowed-tools` restricts tools while the thing worth restricting is a path, so a profile that needs `exec` can never be confined to a directory, because every write guard routes through a tool the profile must keep. When a boundary cannot be enforced, the honest move is to document it as convention and make violations self-reporting. A `description` that asserts "does not change source code" states a guarantee the harness does not provide, and the description is exactly what a future reader trusts.
- **Change to prevent repeat**:
  - Test that a restriction bites before relying on it, always with a negative control (284c already says this; it applies to config fields as much as to grants). A field that parses is not a field that acts.
  - Do not let a `description` assert a guarantee the harness does not provide. Check profile prose against enforced capability, not against intent.
  - When a boundary is unenforceable, convert the rule into a detectable failure mode: tell the worker to stop and report a misroute rather than to comply silently.
  - Probe config-dependent behaviour with `devin -p`. Two entries running, this one and 285, resolved only when a fresh process reloaded the config.
- **Task/PR**: Branch `chore/orchestrator-skill-resolution`, follows up 285

### 285c - A gitignore comment deleted the repo's whole agent config

- **Date**: 2026-10-04
- **Context**: Setting up the mattpocock skills' repo config found none of it present: no `docs/agents/`, no root `AGENTS.md`, no `GLOSSARY.md`, no `docs/adr/`. It had all existed. Commit `05e3c70a` on `backup/wip-requests-and-learnings` (2026-09-24) carried a working `AGENTS.md` plus all three `docs/agents/*.md` files, and `.scratch/` held real ticket slices for two features. What removed it from `main` was three lines added by the Next 16 upgrade (`59a446e3`, 2026-10-01): `# Generated by Next 16 postinstall (agent guidance; regenerated on npm install)` over `/AGENTS.md` and `/CLAUDE.md`. The claim is false. `next` 16.3.8 declares no `scripts` whatsoever, and the root `package.json` has only `prebuild`, `postbuild` and `prepare: husky`, so no `postinstall` or `install` hook exists in the project at all. What actually happens is that `AGENTS.md` sits in next's `files` array, shipping a 311-byte guidance doc to `node_modules/next/AGENTS.md`, which was evidently read as a file emitted into the repo root. The diff against the lost version showed `issue-tracker.md` byte-identical to the current template and `domain.md` differing only by the skill's own `CONTEXT.md` to `GLOSSARY.md` rename, so nothing bespoke was lost, but that was luck rather than design.
- **Learning**: A gitignore entry is a silent delete with a plausible-looking justification attached, and the justification is the part nobody checks. The comment named a mechanism (`postinstall`), a trigger (`npm install`) and a consequence (`regenerated`), none of which existed, and because the file it ignored was agent configuration rather than source, nothing failed loudly: the skills simply ran with no repo config and defaulted. This is the third instance this session of the same failure shape, after an absent `skill` tool that produced no error (285) and an ignored `permissions` key that loaded cleanly (285b). The common thread is that a confident assertion sitting in a config artifact gets trusted exactly as far as it is never tested, and the cost here was a month of running every skill against defaults. A secondary trap: an unreachable branch is not a backup. The only copy of the config lived on `backup/wip-requests-and-learnings`, reachable from nothing, so recovery depended on someone remembering it existed.
- **Change to prevent repeat**:
  - Verify the mechanism before adding a gitignore rule for a generated file. Name the hook and confirm it exists; `python3 -c` over `package.json` scripts and the dependency's own `scripts` field settles it in one command.
  - Do not trust a comment that explains why a file is ignored. It is the least-reviewed prose in the repo and it outlives the condition it describes.
  - Treat a file disappearing from `main` as a bug to diagnose, not as absence. `git log --all -- <path>` finds the last version and `git log -S` on `.gitignore` finds what started ignoring it.
  - When agent configuration goes missing, expect silence rather than failure. Skills degrade to defaults, so the absence has to be checked for deliberately; nothing will report it.
- **Task/PR**: Branch `chore/orchestrator-skill-resolution`, commit `a95102de`, follows up 285 and 285b

### 285d - A doc that inventories external state can be false before it merges

- **Date**: 2026-10-04
- **Context**: `docs/agents/triage-labels.md` shipped in PR #515 asserting that only `wontfix` existed on `abu-lina/uflow` and listing `gh label create` commands for the other four triage labels. The same body of work created those labels, so the assertion was already false when the PR merged; `gh label list` shows all five present with descriptions matching the file's own table. It was found by checking `gh label list` against the doc during post-merge review, not by any automated gate. Separately, the same PR's skill-resolution glob in both worker profiles was rooted at only one of the five directories that actually hold SKILL.md files, so a brief naming any project or user-level skill would have hit stop-and-report for no reason.
- **Learning**: A doc that inventories the current state of an external system (which labels exist, which files are present, which version is installed) is perishable, while a doc that records a mapping or a rule is durable. Mixing the two in one file means the durable part rots with the perishable part, and the mapping table here was fine while the inventory under it was wrong on arrival. Entries 285, 285b and 285c were all about confident assertions in config artifacts going untested; this is the same shape one step out, where the assertion described external state and was invalidated by the very change that wrote it.
- **Change to prevent repeat**:
  - State external state as a command the reader can run, not as a claim in prose. `gh label list` stays true forever; "only `wontfix` exists" was false before it merged.
  - When a change both writes a doc about external state and alters that state, re-read the doc after the state change.
  - Keep perishable inventory out of files whose main job is a durable mapping.
- **Task/PR**: Branch `fix/515-followups-skill-roots-and-labels`, follows up 285c and post-merge review of #515

## Resolved probes (moved verbatim from `.devin/skills/orchestrator/SKILL.md`)

Resolved (2026-10-03, request 284): a skill-level `permissions.deny` DOES propagate into dispatched subagents and is fatal to them. Five dispatches before invoking this skill all survived; both `subagent_general` dispatches after invoking it died with `Tool was rejected` and no report; a read-only `subagent_explore` dispatch still succeeded, ruling out a broken harness. The frontmatter block is therefore deleted and rule 6 carries the fence in prose. The same probes showed `request_scope` works, recursively, including for workers dispatched after the call. See `docs/ai/LEARNINGS.md` entry 284b. Verified 2026-10-04 by re-running the discriminating probe with the block removed: a background `subagent_general` dispatched after invoking this skill survived and wrote successfully, and the router kept its own `edit` and `write` tools.

Resolved (2026-10-04): subagents have NO `skill` tool, so no dispatched worker can invoke a skill, ever. A worker profile's `allowed-tools` is a true restriction, but `skill` is not a grantable name: a fresh `devin -p` process reading an `analyst.md` that listed `- skill` still produced a subagent with exactly `edit, exec, find_file_by_name, grep, read, write`. Deleting `allowed-tools` entirely does not help either: the same probe then returned all 22 tools (`web_search`, `webfetch`, `mcp_*`, `todo_write`, `request_scope`, and the rest) and `skill` was still absent, alongside the documented omissions of `run_subagent` and `ask_user_question`. Until this was found, every "invoke the X skill" line in every brief was a silent no-op. The only route from a skill to a worker is the on-disk read in each profile's "Following a skill" section; that is also the only route to the 16 of 27 mattpocock skills that set `disable-model-invocation: true`. Two notes for anyone re-testing this: subagent profiles are frozen at session start, so profile edits cannot be tested in the session that makes them, and `devin -p` spawns a fresh process that reloads them, which is faster and less ambiguous than restarting the CLI.

Resolved (2026-10-04): `permissions` in a custom subagent profile's frontmatter is parsed and then ignored. `devin doctor` reported all four profiles loading cleanly with `permissions: deny: [Write(/Users/NARAFIQ/Projects/uflow/src/**)]` set on `analyst`, yet a fresh-process probe under `--permission-mode accept-edits` wrote `src/__probe__.tmp` with no denial, alongside an `agent-output/__probe__.tmp` control that proves the probe could write at all. The documented frontmatter fields for a custom subagent are `name`, `description`, `model`, `allowed-tools` and `max-nesting`; `allowed-tools` is the only field that restricts anything, and it is tool-granular, not path-granular. The analyst's "writes only under `agent-output/`" boundary is therefore convention, not a guard, and cannot be made one while the profile needs `exec` to reproduce bugs and run `git diff`, since `exec` bypasses write guards through `sed`, `tee` and `cat >`, all session-allowed. Real path enforcement would need session-level `Deny(Write(...))` rules plus `--sandbox`, because without that flag `exec` ignores `Write()` rules entirely; that is a whole-session policy change, not a per-profile one, and it is not in place.

### 2026-10-05 — Repo-side state stores are a race; the issue tracker is not (issue #517)

- **Context**: Stage A of the PO-first pipeline replaced the shared `.next-id` counter and the per-request tracking files under `agent-output/` with the GitHub issue as the only request ID and state store.
- **Learning**: A read-increment-write counter file cannot survive parallel sessions; moving identity allocation to the issue tracker removes the race for free because GitHub assigns numbers atomically. On review, a repo-wide rewrite of `agent-output/<dir>` references was reverted: in a repo carrying four overlapping agent generations (`.github/agents`, `.github/skills`, `.opencode/agents`, `.devin`), a path-reference rewrite cannot be finished consistently (`.github/agents` alone holds 18+ stale refs the spec deliberately left alone), so the move is documented once at the destination (`agent-output/_archive/README.md`) instead of chasing references across generations. Two tooling traps also surfaced: `gh issue view --comments` is broken on gh 2.67 (it queries the removed `projectCards` GraphQL field, while `--json comments` works), and BSD sed has no `\|` alternation, so a BRE rewrite of 47 files silently changed nothing until re-run with `sed -E`.
- **Change to prevent repeat**: Resume paths should use `gh issue view N --json title,body,labels,comments`, not `--comments`. When relocating a directory referenced by multiple doc generations, write one README at the destination mapping old paths to new rather than rewriting pointers; only update files that are read as live instructions or are load-bearing (tests that assert the file exists). Verify mass path rewrites by grepping for the old pattern immediately after; a sed that matches nothing exits 0.
- **Task/PR**: Branch `refactor/517-po-first-pipeline`, issue #517

### 2026-10-05 — Discovery listings are not session context (issue #519)

- **Context**: Stage B isolation. `devin rules list` kept reporting 7 Cursor rules after `read_config_from.cursor: false`, which looked like the flag did nothing.
- **Learning**: `devin rules list` (and `skills list`, `mcp list`) report disk discovery, not what reaches a live session's context. A marker probe settled it in one run: an `alwaysApply: true` marker rule under `.cursor/rules/` echoed in a control `devin -p` session and did not echo after the flag. Verify flags that claim to gate context with a live `devin -p` echo probe, never with the listing commands. Two supporting findings: `devin -p` refuses untrusted directories before reading project config, so headless probes in scratch dirs need the `--respect-workspace-trust false` CLI flag (the config key arrives too late); and untracked `.devin/*.local.json` files are invisible to worktrees, which is why every orchestrator worker had silently run with zero MCP servers.
- **Change to prevent repeat**: When a config flag claims to suppress something, prove it with a live-session marker, not `* list` output. For headless `devin -p` probes outside trusted dirs, pass `--respect-workspace-trust false`. Keep MCP server declarations at user scope (`devin mcp add -s user`); project-local untracked config starves worktrees.
- **Task/PR**: Branch `refactor/519-devin-isolation`, issue #519

### 2026-10-05 — Dead-workflow removal: the file that matches the grep is not always the file to delete (issue #521)

- **Context**: Removing the Notion planning workflow, `capture-learning.md` matched the Notion grep 6 times but is the only command implementing the AGENTS.md "capture one learning" rule, so it was kept and retargeted to GitHub issues. `EXPERT_ROLES.md` sat inside the doomed `.cursor/mcp/` directory but mostly documents the seven expert rules, so it moved to `docs/` instead of being deleted. The spec's own match list also missed `.cursor/agents/verifier.md`, found only by re-running the verification grep mid-change.
- **Learning**: For deletion tasks, treat every grep match as a verdict needing a content check, not a delete list: match count does not equal coupling. lint-staged's pre-commit stash conflicts when a commit is made while a renamed file is both staged and modified; running `npx prettier --write` on the changed files first and committing per-path avoids the restore conflict. `npm test` here is vitest watch mode and never exits; `npx vitest run` is the gate.
- **Change to prevent repeat**: After deleting per a spec's file list, re-run the spec's own verification greps immediately to catch files the list missed. Before deleting a file that matches on a removed keyword, check whether the keyword is a destination reference inside a still-live mechanism.
- **Task/PR**: Branch `refactor/521-remove-notion`, issue #521

### 2026-10-05 — A token threshold is the wrong tool for a context budget

- **Context**: The ask was to cap every orchestrator session and every subagent at 100k. The CLI does expose the lever: `--compaction-thresholds <spawn>,[<apply>,]<hard>` plus `DEVIN_COMPACTION_THRESHOLDS`, both hidden from `--help`, confirmed present in 3000.11.3. `agent.compaction_threshold_tokens` is a softer user-config variant that moves the compaction point earlier but sets no ceiling.
- **Learning**: Having the lever did not make it the answer. Checked against `ask-matt`'s `PHASE-BOUNDARIES.md`, a token threshold fires wherever the turn happens to land, which is mid-phase most of the time, and compacting mid-phase makes the agent lose the thread; `/compact` is the bottom of the five-option tree, not the first reach. For this router the tree's second question wins outright: its context is disposable because state is on the issue, so clearing is the cheapest move available. The sharper point is source quality. A phase comment is a primary source written by the worker that did the work, so `resume N` rehydrates from originals, whereas compaction substitutes a lossy summary of the router's own chatter. Enriching the issue is what makes clearing free; it is not a workaround for the cap. And 100k sits inside the ~150k smart zone, so capping workers there buys nothing while risking an implementer compacted mid-TDD.
- **Change to prevent repeat**:
  - Check a mechanism against the framework before adopting it. The existence of a knob is not an argument for turning it, and the config reference will never tell you where the knob is wrong.
  - Verify a hidden CLI flag by feeding it an invalid value and reading the validator's error. That proved `--compaction-thresholds` exists, and recovered its full grammar, without spending a session.
  - Orchestrator rule 13 now makes clear-and-resume the move at every gate, and every phase comment opens with a state block so one comment rebuilds the run. No threshold is set: `AGENTS.md` documents the flag and why it stays off.
  - Scope a fix to the blast radius of the problem. The first draft of this change put the threshold in a shell profile, which would have throttled every unrelated coding session on the machine to buy nothing for a router that cannot reach the limit anyway. A safety net whose only trigger is a rule violation is not a safety net, it is a way to not notice the violation.
- **Task/PR**: Direct edit to `.devin/skills/orchestrator/SKILL.md`, `flows/feature.md`, both worker profiles, and `AGENTS.md`

### 2026-10-05 — Dependency majors reach the API contract through raw issue objects (issue #527)

- **Context**: zod 3.25.76 -> 4.6.5. Two visible TS errors (`errorMap` dropped) hid the real cost: three routes put `validation.error.errors` straight into 400 bodies, so every v4 issue-field rename became a public API change, including a new `pattern` field leaking the validation regex onto the wire.
- **Learning**: A dependency's internal object should never be the response shape. One `toValidationDetails()` seam (`{path, message}`) at the three emitting routes turns the next zod major into a one-file change. Second trap: v4's `z.string().uuid()` enforces RFC 4122 version/variant nibbles that v3's regex ignored, so `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee` test fixtures that "worked" for years were never valid UUIDs; six of the seven v4 failures were that fixture, not the code under test. Third: a global `vi.mock('zod')` stub in `src/__tests__/setup.ts` made every schema test without `vi.unmock('zod')` prove nothing; deleting it zeroed the false-confidence surface with no cascade.
- **Change to prevent repeat**: At an HTTP boundary, map dependency error objects to a narrow owned shape instead of re-exporting them. When a validator upgrade starts rejecting fixtures, check whether the fixture was actually valid under the real spec before assuming the library regressed. Global mocks of the library under test hide exactly the failures a migration needs to see.
- **Task/PR**: Branch `refactor/527-zod-v4-migration`, issue #527

### 2026-10-05 — On a validator major, type errors under-report the blast radius (issue #527 rework)

- **Context**: Code review of the zod v4 commit. The migration's own framing — "8 `.errors` reads + 2 TS2769s" — predicted the wrong failure set entirely.
- **Learning**: Reported diagnostics were a poor guide to what actually broke. 6 of the 7 failing tests had nothing to do with the removed `errors` accessor; they failed because v3's loose `.uuid()` regex had been silently accepting non-RFC-4122 fixtures (`aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`, no valid version/variant nibble) and v4 merely started enforcing it. Meanwhile the highest-impact change — `providers/route.ts` emitting rewritten default messages — compiled with zero diagnostics. The practical rule on a validation-library major: enumerate every behavioral surface (grep for every accessor and every emission site), and A/B-probe old vs new side by side rather than reasoning from error text. Two smaller catches from review: a stable seam function should have no throw path (`path.join('.')` throws on symbol segments; `map(String)` fixes it), and counting by grep ("12 unmock sites") undercounts — the reviewer found 14 because the earlier count ran before some files were grepped with both quote styles.
- **Change to prevent repeat**: When a migration fix list is built from compile errors, verify it against a runtime probe of both versions before implementing. When removing a pattern, enumerate with a regex covering quote variants and record the count source in the report.
- **Task/PR**: Branch `refactor/527-zod-v4-migration`, issue #527

### 2026-10-05 — rewrite(url, {status:404}) drops route-level generateMetadata on not-found renders (issue #533)

- **Context**: Soft-404 fix: middleware pins the status with `NextResponse.rewrite(url, { status: 404 })`, pages still `notFound()` for the body. A route-level `generateMetadata` returning `robots: { index: false }` was added to `/p/[id]` to kill the `index, follow` the page used to emit.
- **Learning**: It did not work, and the reason generalises. Measured on the wire: once the middleware rewrite pins the status, a render that ends in `notFound()` emits only the ROOT layout metadata plus Next's injected `noindex` — the route's own `generateMetadata` output (title, robots) never reaches the head. On the same route without the rewrite, the route metadata does reach the wire. So under this mechanism the only lever against a leaked `index, follow` is deleting the unconditional `robots` block from the root metadata (`metadataUtils.ts`), which is crawler-default anyway; the route-level `generateMetadata` stays only as fail-open cover for the case where the guard's lookup errors and no rewrite happens. Two adjacent findings: porting a test-first fix, `npx tsc --noEmit` alone was enough to catch a `mock.calls[0][1]` tuple-type error that vitest (esbuild, no typecheck) ran green; and local e2e auth specs fail environmentally when the app server runs remote `.env.local` Supabase while `global-setup.ts` provisions the test user via `supabase status` (local).
- **Change to prevent repeat**: When a fix changes the render path (rewrite status, notFound, error boundary), re-measure which metadata source actually reaches the wire instead of assuming route-level overrides apply. Keep a `tsc --noEmit` pass in the loop even when vitest is green — vitest never typechecks.
- **Task/PR**: Branch `fix/533-food-soft-404`, issue #533

### 2026-10-05 — A route guard that fails closed turns a dependency blip into a site-wide 404 outage (issue #533 rework)

- **Context**: Code review of the middleware 404 guard. `postgrest()` mapped any non-OK Supabase response to `[]`, so a 500/503 emptied the city slug set and `shouldServeFoodNotFound('/food/berlin')` returned true — a hard 404 on every valid city page. Worse, the empty set was written to the 5-minute cache, so the 404s outlived the outage with zero further lookups.
- **Learning**: "Fail open" has to cover every failure shape, not just thrown exceptions. The code already caught network errors into `null` ("unknown, let it through") but treated an HTTP error as data (`[]`), which the guard then judged as "definitely not found". A guard in the request path needs three outcomes — known, unknown, error — and must only ever 404 on "definitely not found". The cache made it worse in a second way: caching the degraded answer extends an outage past recovery, so "could not determine" must leave the cache untouched and let the next request retry. Same class of trap in metadata: removing a contradictory `index, follow` block also dropped `max-image-preview`/`max-snippet`/`max-video-preview`, which are NOT crawler defaults — when you delete a block for one bad member, check what the other members did. And a third: forwarding the caller's token to "match what the page sees" assumed the page could see the session; it cannot (nothing writes the `sb-auth-token` cookie its SSR client reads), so the guard would have seen strictly more than the page and passed requests the page then soft-404s. Verify the downstream's actual auth state before aligning a guard to it.
- **Change to prevent repeat**: For any guard/middleware that judges a request from a dependency lookup, enumerate the dependency's failure modes (throw, non-OK HTTP, timeout) and assert each one in tests — the suite covered the throw but not the 5xx, which is exactly the path that shipped the defect. Never cache a lookup result you could not determine; retrying next request is always cheaper than a stale wrong answer. Put a bounded `AbortSignal.timeout` on any fetch in the request path so "hung" fails open too.
- **Task/PR**: Branch `fix/533-food-soft-404`, issue #533

### 2026-10-04 — "Is the repo clean?" is four independent questions, and a red check mark answers none of them (issue #525)

- **Context**: A 13-PR Dependabot batch plus manual infra bumps left the requester unsure the repo was in a known-good state. Audit-only exploration, no merges, no bumps.
- **Learning**: The PR list looked uniformly red and was mostly fine: `security/snyk` failed on all 13 with `You have used your limit of private tests`, an account quota, while 9 of the 13 had every GitHub Actions check green. Reading conclusions per check with `gh pr checks` instead of eyeballing the aggregate flipped the verdict for 9 PRs. Two more findings only a primary source gives you. First, job duration is a free triage signal: 505/508/510 died in 8-14s at `npm ci` with ERESOLVE peer conflicts (mechanical, nothing to review), while 506 ran 1-3 minutes and then failed typecheck with 8 × `TS2339: Property 'errors' does not exist on type 'ZodError'`, a Zod 4 rename of the `ZodError` issue accessor whose exact replacement API was NOT verified in this audit and must be read off the v4 migration guide before any call site is touched; same "major bump, CI red" label, completely different work. Second, 505 (`@eslint/js` 10) and 510 (`eslint` 10) are mutually blocking, each failing because the other is still on 9, so neither can ever pass alone and both are gated on `eslint-plugin-jsx-a11y` supporting eslint 10. Separately, "main is green" was true but narrower than it reads: `ci.yml` triggers on `pull_request: [main, develop]` and `push: [develop]`, not `push: main`, so lint, typecheck, tests and build never run on a main commit, and `main` has no branch protection at all (`404 Branch not protected`), meaning nothing is required and a red PR can be merged by hand.
- **Change to prevent repeat**:
  - Classify a dep-bump PR from `gh pr checks` plus the failing job's log, never from title or aggregate status. An install-stage ERESOLVE and a post-install typecheck break need different owners.
  - When one check fails identically across every open PR, suspect the integration's quota or config before suspecting the code. A status that is always red carries no information.
  - Check mutual blocking inside a bump cluster before filing per-PR work: peer-dependency pairs look like two tasks and are one.
  - Separate "the last run on main was green" from "main's tree passes the full gate". Read the workflow's `on:` block to see which jobs actually run post-merge, and read `branches/main/protection` to see which are required. Then close the gap instead of reporting it as unknown: replicating every `ci.yml` step against a detached worktree at `1d028936` took one pass and returned exit 0 on all of them (IOC scan, `npm ci`, lint, `type-check`, i18n, 2715 tests, build, perf budgets), turning the audit's biggest open hypothesis into a verified yes. The only nonzero exit was `npm audit`, which the workflow marks `continue-on-error`.
  - A `--max-warnings N` cap sitting exactly at N is a latent gate failure, not a passing check. Main lints clean at precisely 131 of 131, so the next new warning breaks CI and the next major ESLint bump is near-certain to produce one. Record the headroom, because the tempting fix is to raise the cap, which weakens the gate it exists to enforce.
  - Verify lockfile sync without mutating: copy manifest plus lockfile to a temp dir and run `npm ci --dry-run --ignore-scripts`. The `--ignore-scripts` matters, since the `prepare` hook exits 127 on missing husky long after resolution has already succeeded.
- **Task/PR**: No branch, no PR. Exploration flow, issue #525; evidence in that issue's three phase comments. Follow-ups filed as #526 (branch protection, human), #527 (zod v4), #528 (ESLint 10 as one PR), #529 (Snyk quota, human). The long-form audit doc was deliberately left untracked, and the gate run log is caught by `.gitignore`'s `*.log`, so the issue comments are the durable record.

Corrected (2026-10-05): the "no branch protection" claim above is stale. `main` is now gated by an active repo ruleset, "CI gates for main" (id 21941155), requiring `Run Tests`, `Lint & Type Check` and `Build Verification`; #526 produced it. `repos/:owner/:repo/branches/main/protection` still returns `404 Branch not protected`, because rulesets never surface on that endpoint, so the endpoint alone reports an unprotected branch while a ruleset is actively gating it. Same trap this entry warns about: one signal read as the whole answer. Check `repos/:owner/:repo/rulesets` too, and cross-check with `gh pr view <N> --json mergeStateStatus`, which returned `BLOCKED` on #543 at the same moment the classic endpoint returned 404. Still open from #526: `ci.yml` triggers on `pull_request: [main, develop]` and `push: [develop]`, so no job runs on a push to `main`.

### 2026-10-05 — A worktree with no node_modules has no hooks, so "it committed clean" means no gate ran (issue #526)

- **Context**: Code review of a one-line `ci.yml` change (`push: branches: [develop]` -> `[main, develop]`). The handoff flagged that `format:check` had never run against the file: the worktree had no `node_modules`, `npx prettier` died on a missing `prettier-plugin-tailwindcss`, and the husky pre-commit hook had presumably no-op'd.
- **Learning**: Installing deps and running it found the file clean, but the interesting part is why nothing had checked it, and the answer sits at two layers. (1) The hook genuinely did not fire: `core.hooksPath` is `.husky/_`, a directory husky's `prepare` script creates during `npm install`, so a fresh `git worktree add` has no such path and git silently finds no hook. No warning, exit 0, commit lands. That is a real hole, because `lint-staged.config.js:33` does cover `*.{yml,yaml}` with `prettier --write`, so the hook would have formatted the workflow file on an installed clone. (2) `ci.yml` runs no prettier step at all, so CI never catches what the hook misses, which is why `npm run format:check` exits 2 with 2374 pre-existing `[warn]` files across `.github/`, `tests/performance/` and `tools/`. A gate that has never run accumulates debt invisibly, and the accumulated debt then makes the repo-wide command useless as a signal: you cannot tell a new violation from the 2374 old ones without a targeted per-file check. A third trap caught me mid-review: I first read the `lint-staged` block in `package.json:178-187`, which lists only `*.{js,jsx,ts,tsx}` and `*.{json,css,md}`, and concluded YAML was unmatched. Wrong. A root `lint-staged.config.js` takes precedence over the `package.json` key, so the `package.json` block is dead config, and the committing hook printing its own task list is what disproved the claim.
- **Change to prevent repeat**: When a review needs to know whether a gate ran, check the gate's reachability at every layer before trusting its silence: does the hook path exist, does the file match the tool's glob, and is the tool wired into CI? "Exit 0" and "never invoked" are indistinguishable from the outside. For a verdict on a specific file, run the tool scoped to that path (`npx prettier --check <path>`) rather than the repo-wide script, because a script sitting at 2374 warnings returns the same red regardless of your change. Never read tool config from the first place it appears: for lint-staged, eslint, prettier and jest alike, a dedicated config file silently overrides the `package.json` key, so resolve precedence (or just read the tool's own output) before asserting what a glob covers. Two configs for one tool is itself the finding; delete the loser.
- **Task/PR**: Branch `cr/526-ci-push-trigger-main`, issue #526

### 2026-10-05 — A `fixed inset-0` layer with no handler is a tap eater, and only hit-testing catches it (issue #126)

- **Context**: Mobile users intermittently could not open the profile menu. `PWAInstallPrompt` rendered an invisible full-screen backdrop (`fixed inset-0 z-[60]`, no `pointer-events-none`, no `onClick`) plus a card at `bottom-4 z-[70]` over the `z-50` footer nav, 3s after load. Every tap landed on a layer that did nothing with it.
- **Learning**: The fix was to delete the backdrop, not give it a dismiss handler — a tap-to-dismiss scrim still eats the first tap, which is the reported symptom. The card's clearance is geometric, not z-index: `bottom: calc(var(--mobile-nav-height) + max(12px, env(safe-area-inset-bottom)) + 1rem)` on mobile, `md:bottom-4` where the footer is `md:hidden`. The assertion that catches the class of bug is `document.elementFromPoint` at the nav link's own centre, not a snapshot or a visibility check. Two environment traps cost more time than the fix: (1) `devices['iPhone 13']` carries `defaultBrowserType: 'webkit'`, which silently retargets a chromium-only project — pin `defaultBrowserType: 'chromium'` in `test.use`; (2) a stale worktree `node_modules` (zod 3 against package.json's 4.6.5) made `tsc --noEmit` fail on files the change never touched, and lint-staged runs full `tsc --noEmit` on any staged `.ts`, so the hook gates on deps being synced, not on your diff.
- **Change to prevent repeat**: Audit every `fixed`/`absolute` overlay for `inset-0` plus a missing `pointer-events-none` — position alone does not make a layer inert. For nav-overlap bugs, write the regression as a hit-test (`elementFromPoint` at the target's centre) at e2e level; DOM-order or z-index assertions pass while the bug ships. In a fresh or long-lived worktree, `npm ci` before trusting `tsc`/hook output — stale `node_modules` turns a clean diff red on unrelated files.
- **Task/PR**: Branch `fix/126-profile-menu-mobile`, issue #126

### 2026-10-06 — A never-focused `role="dialog"` is announced to nobody, and the honest fix is `role="region"` (issue #126 rework)

- **Context**: Code review of the non-modal PWA prompt rework. The first commit dropped `aria-modal` and the backdrop but left `role="dialog"` on a card nothing ever focuses, so the role still claimed modal semantics the component deliberately no longer has.
- **Learning**: Removing `aria-modal` does not unclaim dialog semantics — the role itself is the claim. A `role="dialog"` that never receives focus is announced to nobody: non-modal advisory surfaces want `role="region"` plus `aria-labelledby` pointing at their own heading (here `id="pwa-install-prompt-title"` on the existing "Installiere U-Flow" span, so no new hardcoded string and the i18n convention is untouched). A named region is a landmark a screen-reader user can find; a stray dialog is a promise the UI does not keep. Adding focus management would have been the wrong fix — a nudge must not steal focus. Second finding: the local e2e recipe is brittle in a specific way. Pointing the dev server at the hosted `.env.local` Supabase leaves the page stuck at skeleton "Loading..." forever — the spec only mocks `/rest/v1/*` and `/auth/v1/token|user`, and some other Supabase call against the real backend never resolves. The working recipe is a dev server on a side port with the fake `localhost:54321` env (`agent-output/artifacts/126-dev-server.sh.txt`), `PLAYWRIGHT_BASE_URL=http://localhost:3100` so Playwright's `webServer` reuses it instead of spawning its own, and the hosted trio exported into the Playwright process only so `resolveSupabaseEnv` skips `supabase status` (Docker was down) and `global-setup.ts`'s `createUser` reaches a real endpoint.
- **Change to prevent repeat**: When a change drops modal behaviour, drop the role too — audit `role="dialog"`, `aria-modal`, focus trap and Escape handling as one unit. For this e2e spec, copy the `:3100` + fake-env recipe verbatim; `PLAYWRIGHT_BASE_URL` plus a warm server is also the only way to get a clean red when dev-server cold compile would otherwise eat the visibility timeout.
- **Task/PR**: Branch `fix/126-profile-menu-mobile`, issue #126

### 2026-10-06 — Forwarding caller identity through a guard needs a per-route gate, not a blanket argument (issue #547)

- **Context**: The fix for pending providers 404ing for their creators required the middleware guard to run the visibility check as the caller (RLS + `auth.uid()`), which means threading the `sb-access-token` cookie into `shouldServeNotFound`. An existing #533 test pinned `expect(guard).toHaveBeenCalledWith('/p/abc')` — a one-argument call — and the request in that test carries a session cookie, so a naive `shouldServeNotFound(pathname, token)` would break a "keep green, unchanged" test file.
- **Learning**: The honest resolution was to forward the token only where it can change the answer — UUID-shaped `/p/<id>` paths, the one route whose visibility is caller-dependent. That kept the pinned call shape true rather than worked around: `/p/<junk>` 404s without a lookup regardless of identity, so skipping the token there is correct, not just test-preserving. When a pinned assertion collides with a new requirement, first check whether the assertion's literal surface still admits the fix before deciding it contradicts the intent. Second mechanism worth recording: Supabase RLS can be shared verbatim between a policy and middleware by extracting the predicate into a `STABLE` SQL function the policy calls, plus a `security definer` RPC returning a tri-state ('visible'|'hidden'|'absent') — the definer sees hidden rows while returning no row data, and `auth.uid()` still resolves from the caller's JWT inside a definer function.
- **Change to prevent repeat**: Before promising "apply the migration to DEV," check `supabase migration list` for remote/local divergence. This project's DEV history has remote-only versions (`006`, `20260928202818`) that make `db push` refuse outright, and ~20 local-only versions it would apply wholesale — so the migration file can only be applied via the dashboard or a reconciled history, not from the CLI. Also: `@supabase/supabase-js`'s `accessToken` client option (not `global.headers`) is the way to make a server client query as a bearer-token caller; it also turns `supabase.auth` into a throwing proxy, so keep it to data fetches.
- **Task/PR**: Branch `fix/547-provider-404-regression`, issue #547

### 2026-10-06 — A stubbed authorization boundary cannot confirm an authorization fix (issues #533, #547)

- **Context**: #533 shipped a middleware `/p/<id>` guard plus a server-side `notFound()`, both premised on "the page runs anon for every caller". That premise was true of SSR and false of the hydrated client, which is where the page body was actually coming from. Anon RLS on `public.providers` exposes `review_status='approved'` only, so 1,127 pending rows went dark for everyone including the admin who created them, and every quick-create submission landed on a 404. #533's 28 regression tests were green throughout: they asserted HTTP status codes against a stubbed PostgREST whose stub encoded the same anon-only assumption the bug was made of. The #547 fix then repeated the shape — 9 new tests, all green, all against a stub that pretends the unapplied migration exists. A review-time probe run through PGlite (`@electric-sql/pglite`, already a devDependency, used by `src/__tests__/migrations/134-*.test.ts`) executed the migration against a real WASM Postgres in under a second: no Docker, no DB password, no network.
- **Learning**: When the thing under test is an authorization decision, the test double is the hypothesis, not the oracle. Stubbing the enforcement point (RLS, a policy, an RPC, a token verifier) and asserting on what the application does with the stub's answer proves only that the wiring matches your model of the boundary; it cannot detect that the model is wrong, which is the single most likely defect in an authz change. Two corollaries bit here. (1) Asserting a status code is not asserting a response: a middleware that returns `NextResponse.next()` reports 200, so "200" in those suites means "the guard did not 404" and a soft 404 (status 200 with a not-found body) is indistinguishable from a real render — exactly the #533 bug, which the #547 commit reintroduces for every signed-in caller while the migration is unapplied. (2) A caller-class matrix is worthless if every row shares one fake: four token strings resolved by the stub's own `if` are four assertions about the stub. The fix that gets you real coverage is cheap and was already in the repo: run the actual DDL against a real engine, seed one production-shaped row per class, `SET ROLE` + set `request.jwt.claim.sub`, and compare the old predicate against the new one row by row.
- **Change to prevent repeat**: For any change to an RLS policy, a SECURITY DEFINER function, or a grant, add a `src/__tests__/migrations/<N>-*.test.ts` that executes the migration file in PGlite and asserts the visibility matrix (anon / creator / admin / unrelated x approved / non-approved / absent) before and after, including the anon-visible row count, which must not move. The repo convention already exists and migration 137 skipped it; the convention is the gate, not the `supabase db push` that happened to be blocked. Separately: shape the row the way production shaped it. All 1,127 real pending rows have `provider_owner_id IS NULL` and identify their creator only through `user_created_id`, so a seed that sets both columns silently tests the clause production never exercises. And never let a status-code assertion stand in for "the page rendered" — pair it with one body-level assertion, or the two halves of a soft 404 stay invisible.
- **Task/PR**: Branch `fix/547-provider-404-regression`, issue #547

### 2026-10-06: A script that echoes invented DB state is worse than a stale doc, and the fix for both is pointers to executable verification (issue #556)

- **Context**: After the Supabase MCP was repaired (expired OAuth tokens, no repo fault), the real bug was six repo artifacts asserting a 2025-era snapshot: 14 tables, 10 categories/offers/needs, "MCP connected", "UAT needs to be created". Reality: 40 tables in both projects, DEV empty, UAT holds ~48k rows. Four were undated point-in-time status docs, a genre with no correct present tense, so correcting 14→40 would only reset the rot clock. `scripts/identify-mcp-project.sh` went further: a "Database Status" block of five hardcoded `echo`s that printed those numbers unconditionally, fabrication dressed as tooling.
- **Learning**: Any committed artifact that asserts live system state (table counts, row counts, connection status) is a lie with a half-life. Deletion beats correction for completion reports; for keep-worthy history, a "superseded by ADR-N" header converts the file from instructions into record. In scripts, enforce "every printed line is derived from something the script actually read"; that check is what caught `if [ ! -f .env.local ]` reporting "placeholder values" for a missing file. Durable facts belong in executable verification (`verify-environments.sh`, `verify-both-projects.sh`), not prose.
- **Change to prevent repeat**: For doc-accuracy bugs, write the red test as a grep over the false claims (`14 tables|10 categories|...`) before touching anything; it doubles as the regression check (26 hits → 0 here). When deleting docs, grep the basenames repo-wide first: two READMEs pointed at a deleted status file. Separately, `lint-staged.config.js` mapped `*.sh` to `prettier --write`, but prettier ships no shell parser, so the mapping failed on every shell file and blocked this commit (#538). A gate that always fails is not a gate that catches anything; the fix was removing the mapping. Consequence on the record: `*.sh` files now pass through the hook with no formatter or linter at all; shell correctness rests on `bash -n` and review, and the user explicitly declined adding shellcheck. If a hook ever blocks a commit, split the changes so the unblockable files land first.
- **Task/PR**: Branch `fix/556-setup-doc-stale`, issue #556
