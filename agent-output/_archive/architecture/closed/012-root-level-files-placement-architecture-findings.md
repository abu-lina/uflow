---
ID: 012
Origin: 012
UUID: b61b2d3f
Status: Committed
---

# 012 - Root-Level File Placement: Architecture Guidance

**Date**: 2026-02-23  
**Trigger**: User request — reduce repo root clutter by moving files into existing folder conventions (`docs/`, `scripts/`, `sql/`, `imports/`)  
**Scope**: Repository information architecture and file placement guidance (no code changes)

---

## Outcome Summary

UFlow’s root directory currently mixes:

- **Project entrypoints** (expected at root)
- **Operational incident artifacts** (summaries/reports/action plans)
- **One-off debug scripts and SQL**
- **Ad-hoc data files**

This increases cognitive load and makes it harder to distinguish “how to build/run” from “what happened last week”. The best long-term structure is to make root a thin layer of **build + onboarding entrypoints**, and push everything else into:

- `docs/` for human documentation (summaries, reviews, troubleshooting, action items)
- `scripts/` for dev/ops scripts (never imported by runtime code)
- `sql/` for reference/debug SQL (non-authoritative)
- `supabase/migrations/` for authoritative schema history
- `imports/` for import/export datasets

This guidance aligns with SRP/KISS (each folder has one reason to change) and the project’s existing placement rubric.

---

## Folder Responsibility Contract (Recommended)

### Root (`/`)

Root should contain only **project entrypoints and build/runtime wiring**, e.g.:

- Build/package: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.js`, `Dockerfile`
- Tooling: eslint/prettier/tailwind/postcss configs
- Platform entrypoints: `README.md`, `START_HERE.md`, `SECURITY.md`, `CHANGELOG.md`
- Environment templates: `env*.template` (kept at root by convention)

### docs/

All human-readable operational docs:

- `docs/summaries/` for “what changed / status / upgrade summaries”
- `docs/reviews/` for “security/code review writeups”
- `docs/fixes/` for “bug fix summaries”
- `docs/troubleshooting/` for “incident response / diagnostics guides”
- `docs/action-items/` for “short-lived action plans and checklists”

### scripts/

Shell/Node scripts used for local dev, CI maintenance, or ops runbooks.

- If something must be imported by runtime code, it MUST NOT live in `scripts/`.

### sql/ vs supabase/migrations/

- `supabase/migrations/` is the **only authoritative migration source**.
- `sql/` is **reference-only** (debug queries, manual diagnostics, scratch migrations that must not be applied automatically).

### imports/

Import/export datasets (CSV/JSON) used by manual tooling.

---

## File → Target Mapping (Recommended)

Notes:

- “Move” implies the Implementer will also update any references in scripts/docs/CI.
- For incident-era root markdown files: prefer moving into `docs/…` and leaving a single stable root entrypoint (`START_HERE.md` or `docs/INDEX.md`) rather than keeping many parallel root docs.

### Keep at root (intentional entrypoints)

- `README.md` → keep
- `START_HERE.md` → keep
- `SECURITY.md` → keep (industry convention)
- `CHANGELOG.md` → keep (industry convention)
- `package.json`, `package-lock.json` → keep
- `next.config.js`, `tsconfig.json`, `vitest.config.ts`, `tailwind.config.ts`, `eslint.config.mjs`, `postcss.config.mjs` → keep
- `Dockerfile` → keep
- `env.local.template`, `env.template`, `env.uat.template`, `env.production.template` → keep (common convention)

### Root markdown files → docs/

- `CI_PIPELINE_FIX_SUMMARY.md` → `docs/summaries/CI_PIPELINE_FIX_SUMMARY.md`
- `INVESTIGATION_SUMMARY.md` → `docs/summaries/INVESTIGATION_SUMMARY.md`
- `PERFORMANCE_OPTIMIZATION_SUMMARY.md` → `docs/performance/PERFORMANCE_OPTIMIZATION_SUMMARY.md` (if a duplicate exists, consolidate to one canonical copy)
- `TEST_MOCK_FIX_SUMMARY.md` → `docs/fixes/TEST_MOCK_FIX_SUMMARY.md`
- `LOCAL_IPHONE_TESTING.md` → `docs/guides/LOCAL_IPHONE_TESTING.md`
- `UAT_PWA_FIX_ACTION_PLAN.md` → `docs/action-items/UAT_PWA_FIX_ACTION_PLAN.md`
- `VSCODE_AGENTS_SETUP.md` → `docs/guides/VSCODE_AGENTS_SETUP.md`

#### Dependency/security report docs

- `DEPENDABOT_ALERTS_REVIEW.md` → `docs/reviews/DEPENDABOT_ALERTS_REVIEW.md`
- `DEPENDABOT_ALERTS_RESOLVED.md` → `docs/summaries/DEPENDABOT_ALERTS_RESOLVED.md`
- `DEPENDABOT_ALERTS_SUMMARY.md` → `docs/summaries/DEPENDABOT_ALERTS_SUMMARY.md`
- `DEPENDABOT_VITE_ALERTS_REVIEW.md` → `docs/reviews/DEPENDABOT_VITE_ALERTS_REVIEW.md`

- `SNYK_PR_VERIFICATION_SUMMARY.md` → `docs/reviews/SNYK_PR_VERIFICATION_SUMMARY.md`
- `SNYK_UPGRADES_SUMMARY.md` → `docs/summaries/SNYK_UPGRADES_SUMMARY.md`
- `snyk-pr-verification-report.md` → `docs/reviews/snyk-pr-verification-report.md`

- `SECURITY_UPDATE_2025-12-21.md` → `docs/summaries/SECURITY_UPDATE_2025-12-21.md`

#### Vendor/email docs

- `RESEND_SECURITY_REVIEW.md` → `docs/reviews/RESEND_SECURITY_REVIEW.md`
- `RESEND_UPGRADE_SUMMARY.md` → `docs/summaries/RESEND_UPGRADE_SUMMARY.md`

### Root shell scripts → scripts/

These look like one-off diagnostics and should move under a single namespace to reduce root noise:

- `debug-pwa.sh` → `scripts/debug/debug-pwa.sh`
- `test-auth-context.sh` → `scripts/db/test-auth-context.sh`
- `test-direct-insert-with-debug.sh` → `scripts/db/test-direct-insert-with-debug.sh`
- `test-direct-postgrest.sh` → `scripts/db/test-direct-postgrest.sh`
- `test-policy-condition.sh` → `scripts/db/test-policy-condition.sh`
- `test-provider-insert.sh` → `scripts/db/test-provider-insert.sh`
- `test-without-return.sh` → `scripts/db/test-without-return.sh`
- `test-without-user-created-id.sh` → `scripts/db/test-without-user-created-id.sh`

### Root SQL files → sql/ or supabase/migrations/

- `standardize-image-storage.sql`
  - **Recommended**: Convert into a numbered migration under `supabase/migrations/` (it contains `ALTER TABLE` + data migration) and remove it from repo root.

### Root data files → imports/

- `users_rows.csv` → `imports/users_rows.csv` (and add a brief note in `imports/README.md` if it exists)

### Nginx templates (infra artifacts)

These are not docs or scripts, but deployment inputs. Recommended steady state:

- `nginx-template.conf` → `deploy/nginx/nginx-template.conf`
- `nginx-uat-template.conf` → `deploy/nginx/nginx-uat-template.conf`

This is the preferred steady state (chosen for this workstream).

---

## Risks / Guardrails (for Implementation)

- **CI/CD references**: moving files requires updating GitHub Actions, Docker builds, and any deployment scripts that assume root paths.
- **Docs discoverability**: when moving root markdown files, ensure `docs/INDEX.md` continues to point at the canonical copies.
- **Dupes**: there may already be copies in `docs/` (e.g., performance summaries). Consolidate to one canonical location to stay DRY.

---

## Verdict

**APPROVED_WITH_CHANGES** — Cleaning root-level clutter is healthy, but keep a small set of root entrypoints and move the rest into the existing `docs/` taxonomy to avoid losing “incident entrypoint” discoverability.
