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

## 2026-06-06 — Category taxonomy redesign: enum + seed data in single migration

**Context**: Plan 150 — adding `category_type` enum/column and 34 new category rows.

**Learning**: When adding an enum column to a table that already has rows, you DON'T need to backfill every existing row with the new column. The column is nullable by default with `ADD COLUMN IF NOT EXISTS`. Existing rows keep NULL, new INSERTs specify the value. This is fine because the enum is metadata — existing rows will get their category_type assigned in a follow-up if needed. The idempotent INSERT pattern using `WHERE NOT EXISTS` on names is the safe approach for seed data that may already exist across environments. Using `gen_random_uuid()` for `category_id` in the SELECT simplifies UUID generation while still being idempotent (the name guard prevents duplicates).
