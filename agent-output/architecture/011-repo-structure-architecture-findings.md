---
ID: 011
Origin: 011
UUID: 3c8f1d7a
Status: Active
---

# 011 - Repo Structure Review: Architecture Findings

**Date**: 2026-02-23
**Trigger**: User request — review repo structure vs `.github/copilot-instructions.md` and existing architecture artifacts
**Scope**: Repository layout and module boundaries (no code changes; no UX changes)

## Outcome Summary

UFlow’s repository is broadly well-organized and already contains the expected Next.js 15 `src/` layout primitives (App Router, services, lib/utils, hooks, types) plus a strong documentation taxonomy under `docs/`. The main architecture concern is **boundary drift**: domain-specific UI is split across `src/components/*` and `src/features/*`, scripts are split across root `scripts/` and `src/scripts/`, and there is a parallel SQL area (`sql/`) alongside `supabase/migrations/` that can create “two sources of truth” risk.

These are solvable as **low-risk, incremental refactors** focused on tightening folder responsibilities rather than large renames.

## 1) Current-State Structure Summary

### Repo Root

- Strong operational scaffolding: `Dockerfile`, `next.config.js`, `eslint.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`, env templates, deployment scripts.
- Documentation is substantial: `docs/` is categorized (architecture/design/features/deployment/guides/troubleshooting/etc.).
- Multiple “top-level status/summary” markdown files exist at repo root (e.g., investigation and security summaries).

### `src/` (Application Code)

- App Router present and route groups used: `src/app/(public)`, `src/app/(dashboard)`, `src/app/(debug)`, plus `src/app/api/*`.
- Expected functional layers exist:
  - `src/services/` for Supabase/data access (includes server-specific variants like `*.server.ts`).
  - `src/lib/`, `src/utils/`, `src/hooks/`, `src/types/`, `src/translations/`.
- UI and design system are split across:
  - `src/components/{ui,shared,common,layout}` (matches the Copilot instructions)
  - plus several domain-specific component folders under `src/components/` (e.g., `providers/`, `community-services/`, `mosque/`, `create/`, `admin/`, `auth/`).
  - `src/design-system/` exists as a distinct internal package (tokens/themes/components).
- Testing footprint is split:
  - `src/__tests__/...` (unit/integration-style tests and helpers)
  - `tests/performance/...` (performance harness)

### Database & SQL

- Supabase canonical structure exists: `supabase/migrations/`, `supabase/functions/`.
- Separate `sql/` folder exists with `migrations/`, `queries/`, debug scripts, and schema exports.

## 2) Concrete Improvements (Move/Rename Only If Justified)

### P0 — Clarify and enforce folder responsibilities (minimal moves)

**Goal**: Reduce ambiguity and accidental imports by ensuring every folder has a single, stable “reason to change” (SRP).

1. **Narrow `src/components/` to shared UI only**
   - Target steady state:
     - Keep: `src/components/ui`, `src/components/common`, `src/components/shared`, `src/components/layout`.
     - Gradually migrate domain-specific UI (e.g., `src/components/providers`, `src/components/mosque`, `src/components/community-services`, `src/components/create`, `src/components/admin`) into `src/features/<domain>/components`.
   - Justification:
     - Prevents “components as a dumping ground” and makes ownership obvious.
     - Aligns with feature-module cohesion (especially important with App Router server/client boundaries).
   - Non-disruptive path:
     - Do not move everything at once. Migrate feature-by-feature when touching code anyway.

2. **Decide on a single home for scripts**
   - Current split: root `scripts/` (extensive) and `src/scripts/` (few items).
   - Recommendation:
     - Prefer root `scripts/` for all developer/ops scripts.
     - If any script is truly runtime code, it should not live in `scripts/` at all; it belongs under `src/lib/` or a feature.
   - Justification:
     - Prevents accidental bundling or confusion between runtime modules and dev tooling.

3. **Prevent “two migrations sources” drift (`supabase/migrations` vs `sql/migrations`)**
   - Recommendation:
     - Treat `supabase/migrations/` as the only authoritative migration source.
     - If `sql/migrations/` is for experiments/snapshots, re-home it to a clearly non-authoritative place (e.g., `docs/archive/` or `sql/archive/`) and add a README stating it is not applied in CI/CD.
   - Justification:
     - Database drift is expensive and hard to debug; this is a recurring architecture risk in Postgres-first stacks.

### P1 — Optional improvements (higher churn; do only if payoff is clear)

4. **Reduce naming ambiguity in `src/services/`**
   - Current: both `providers.ts` and `providerService.ts` exist (and similar patterns elsewhere).
   - Recommendation:
     - Standardize on one naming convention: either `providers.ts` as the canonical module name, or `providers.service.ts` as the canonical convention.
   - Justification:
     - Avoids duplicate entrypoints and accidental divergence.

5. **Codify testing layout contracts**
   - Recommendation:
     - Keep `tests/` for performance/e2e/system-style harnesses.
     - Keep `src/__tests__/` for unit and component-level tests.
     - Add/extend a single “Testing Layout” note in docs (no immediate moves required).

## 3) Risks and Migration Steps

### Key Risks

- **Import churn**: moving domain UI between `components/` and `features/` touches many imports.
- **Server/client boundary regressions**: relocating files can accidentally move server-only imports into client components.
- **Docs drift**: folder responsibilities may differ from what contributors infer from history.
- **DB drift**: keeping multiple “migrations” locations increases risk of applying the wrong SQL in UAT/prod.

### Migration Steps (when implementing)

1. Choose one domain at a time (e.g., `providers`) and migrate only that domain’s UI.
2. Keep stable public imports during transition:
   - Option A: temporary re-export modules (short-lived)
   - Option B: mechanical search/replace for moved paths in a single PR
3. Validate Next.js constraints:
   - ensure client components don’t import `server-only` modules
   - ensure `*.server.ts` remains server-only
4. Run the standard verification set:
   - `npm run type-check`
   - `npm run lint:check`
   - `npm test`
5. For any SQL re-homing, explicitly document “authoritative” vs “reference-only” locations.

## 4) What NOT to Change

- Do not flatten or rename `src/app/` route groups; App Router conventions (route groups, `loading.tsx`, `error.tsx`) are already in place and should remain stable.
- Do not move `supabase/migrations/` or change its role as the canonical schema history.
- Do not introduce new infra/services (e.g., Redis/Elasticsearch) as a side-effect of a structure refactor; this violates the Postgres-first architecture principle.
- Do not relocate the `docs/` taxonomy; it is already well-structured and provides navigability.
- Do not “mass move” root-level operational markdown files without a clear navigation replacement; these appear to be used as entrypoints during incidents.

## Integration Requirements

- Any refactor plan MUST reference and remain consistent with prior App Router findings (Arch 010), especially around server/client boundaries and client-heavy fetching.
- Any folder move that affects runtime imports MUST include a fast rollback path (single PR, mechanical changes, minimal behavior change).

## Verdict

**APPROVED_WITH_CHANGES** — The repo is in good shape, but the boundary drift items above should be addressed incrementally to keep the codebase scalable and predictable.
