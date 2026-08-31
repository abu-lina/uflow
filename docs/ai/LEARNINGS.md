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

### 2026-08-31 — ESLint continue-on-error silently hid 86 errors
- **Context**: CI lint step had `continue-on-error: true`, letting 86 ESLint errors accumulate across the codebase without blocking any PR.
- **Learning**: `continue-on-error` in CI is acceptable during a transition period but must have a deadline. In this case it was set once and forgotten for months while errors compounded. Also: running `eslint --fix` globally can pick up untracked WIP files and cause cascading contamination. Fix targeted files, not the whole repo, when there are untracked changes in the working tree.
- **Change to prevent repeat**: Never add `continue-on-error: true` to lint/type-check CI steps without a JIRA/issue to remove it within 2 sprints. Added `varsIgnorePattern: '^_'` to ESLint config so intentionally unused vars can be marked with `_` prefix instead of deleted.
- **Task/PR**: Pipeline hardening (fix/pipeline-hardening branch)
