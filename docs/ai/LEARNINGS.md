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
- **Context**: The E2E workflow's first CI run failed, and the cause had nothing to do with the suite: `supabase start` died with `duplicate key value violates unique constraint "schema_migrations_pkey"` (SQLSTATE 23505), `Key (version)=(089) already exists`. Two migrations shared the `089` prefix, `089_fix_search_food_concepts_junction.sql` (2026-05-12) and `089_add_food_category_american.sql` (2026-06-04), and the Supabase CLI derives the `schema_migrations.version` primary key from that prefix. Every from-scratch `supabase start` or `db reset` on main was broken, which also meant clean local onboarding was broken. Nobody noticed because everyone already had a populated local database; only a fresh stack exposes it. A doc under `agent-output/implementation/closed/267-*` had already recorded the collision without it being fixed. Because the job was deliberately left out of the ruleset's required checks, `mergeStateStatus` was `UNSTABLE`, not blocked: the failure was informative and the repo kept merging.
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
