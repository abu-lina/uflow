---
ID: 012
Origin: 012
UUID: b61b2d3f
Status: Released
---

# Plan 012 — Root-Level Files Placement Cleanup

## Plan Header

- **Target Release**: v0.6.0
- **Epic Alignment**: Engineering Excellence (Repo maintainability / onboarding)
- **Status**: Released (v0.6.0, 2026-02-23)

### Changelog

| Date       | Agent         | Change                                | Rationale                                                                               |
| ---------- | ------------- | ------------------------------------- | --------------------------------------------------------------------------------------- |
| 2026-02-23 | planner       | Created plan 012 targeting v0.6.0     | Reduce repo-root clutter and clarify folder responsibilities                            |
| 2026-02-23 | implementer   | Status → In Progress                  | Implementation started; all milestones 1-6 complete                                     |
| 2026-02-23 | code-reviewer | Status → Code Review Approved         | APPROVED WITH COMMENTS: 1 MEDIUM finding (fix-nginx-uat-mime.sh)                        |
| 2026-02-23 | uat           | Status → UAT Approved                 | All 3 primary values delivered; ready for v0.6.0 release                                |
| 2026-02-23 | devops        | Status → Committed for Release v0.6.0 | Stage 1: Changes committed locally; documents moved to closed/                          |
| 2026-02-23 | devops        | Status → Released                     | Stage 2: v0.6.0 released (bundled with Plan 011); CHANGELOG updated, tag created/pushed |

---

## Value Statement and Business Objective

As a **developer/contributor**, I want **the repository root to contain only essential entrypoints and build wiring**, so that **navigation is faster, onboarding is simpler, and contributors don’t misplace scripts/docs/SQL that cause boundary drift**.

---

## Context

- Root directory contains many operational markdown artifacts (summaries, reviews, action plans), one-off shell scripts, and an ad-hoc SQL file.
- Existing conventions already exist:
  - Documentation taxonomy: `docs/{summaries,reviews,fixes,troubleshooting,action-items,guides,...}`
  - Dev/ops scripts: `scripts/`
  - Reference SQL: `sql/`
  - Authoritative DB migrations: `supabase/migrations/`
  - Import/export data: `imports/`
- Architecture guidance for mapping and folder contracts is defined in Arch 012.

**Primary inputs**:

- Arch guidance: [agent-output/architecture/012-root-level-files-placement-architecture-findings.md](agent-output/architecture/012-root-level-files-placement-architecture-findings.md)
- Placement rubric: [docs/guides/PLACEMENT_RUBRIC.md](docs/guides/PLACEMENT_RUBRIC.md)
- Docs taxonomy index: [docs/README.md](docs/README.md)

---

## Scope

### In Scope

1. Move non-entrypoint root markdown files into the correct `docs/` subfolders.
2. Move one-off root shell scripts into `scripts/` under a small number of namespaces (e.g., `scripts/db/`, `scripts/debug/`).
3. Decide how to handle `standardize-image-storage.sql` (authoritative migration vs reference-only query) and place it accordingly.
4. Move `users_rows.csv` into `imports/` (or delete if confirmed obsolete).
5. Update references caused by moves:
   - Any links in docs (especially `docs/INDEX.md`/`docs/README.md`)
   - Any scripts that reference moved scripts/assets
   - Any CI/deploy docs that mention old paths

### Out of Scope (Explicit)

- No runtime code refactors (no `src/` changes except updating imports if any script paths leak into runtime, which should be avoided)
- No UX changes
- No database schema changes unless `standardize-image-storage.sql` is explicitly promoted into a migration
- No mass reorganization beyond the files currently cluttering root

---

## Assumptions

- v0.6.0 is the next planned release, and this change can ship as part of it (roadmap: “Current Working Release: v0.6.0”).
- Root should keep stable entrypoints: `README.md`, `START_HERE.md`, `SECURITY.md`, `CHANGELOG.md`, and build/tooling configs.

---

## Decisions (Resolved)

1. **Move nginx templates** into `deploy/nginx/`.
2. **Promote `standardize-image-storage.sql` into an authoritative migration** under `supabase/migrations/` (it performs schema + data migration).
3. **Keep root docs minimal**: retain only `README.md`, `START_HERE.md`, `SECURITY.md`, `CHANGELOG.md` at root; move all other operational markdown under `docs/`.

---

## Milestones (Implementation-Ready)

1. **Inventory & classify root clutter**
   - Objective: establish an explicit list of files to move and their destinations.
   - Acceptance: a single checklist exists in the PR description (or implementation doc) with all moved items.

2. **Move root markdown artifacts into `docs/`**
   - Objective: reduce root markdown noise while preserving discoverability.
   - Acceptance:
     - Root retains only core entrypoints.
     - Moved docs land in one of: `docs/summaries/`, `docs/reviews/`, `docs/fixes/`, `docs/guides/`, `docs/action-items/`, `docs/performance/`.
     - No broken internal links from `docs/INDEX.md` and `docs/README.md`.

3. **Move root shell scripts into `scripts/` namespaces**
   - Objective: keep executable tooling out of root.
   - Acceptance:
     - Root has no `test-*.sh`/debug scripts.
     - Scripts remain executable (mode preserved) or are documented if mode changes.

4. **Place SQL and data artifacts in canonical locations**
   - Objective: avoid “two sources of truth”.
   - Acceptance:
     - `standardize-image-storage.sql` is converted into a new `supabase/migrations/*` entry (authoritative) and removed from repo root.
     - `users_rows.csv` is moved into `imports/` (or removed if obsolete).

5. **Move nginx template configs into `deploy/nginx/`**
   - Objective: keep infra templates out of repo root while preserving deployment wiring.
   - Acceptance:
     - `deploy/nginx/nginx-template.conf` and `deploy/nginx/nginx-uat-template.conf` exist.
     - Any scripts/docs/pipelines referencing the old paths are updated.

6. **Update all references (docs + scripts + pipelines)**
   - Objective: prevent regressions due to path changes.
   - Acceptance:
     - `npm run type-check`, `npm run lint`, and `npm test` pass.
     - Any scripts/documents that pointed at old root paths are updated.

7. **Version management & release artifacts**
   - Objective: ensure the change is correctly attributed to the target release.
   - Acceptance:
     - Coordinate with Roadmap/DevOps whether this plan ships in v0.6.0.
     - If included in the release: add a brief note to `CHANGELOG.md` under v0.6.0.
     - If not included: explicitly mark the plan as deferred/superseded, or retarget release in changelog.

---

## Validation (Non-QA)

- Static checks: `npm run type-check`, `npm run lint`
- Test suite: `npm test`
- Manual sanity: open `docs/INDEX.md` and verify the navigation links still resolve.

---

## Risks & Mitigations

- **Broken links** after moving docs → mitigate by searching for old filenames and updating `docs/INDEX.md` + top-level references.
- **Scripts referenced by CI** → mitigate by grep for script names in `.github/` workflows and `scripts/`.
- **Accidental runtime imports of scripts** → mitigate by keeping scripts in root `scripts/` and not exporting them into `src/`.

---

## Rollback Plan

- Single-PR mechanical moves to keep rollback simple.
- If regressions are found, revert the PR to restore paths.

---

## Handoff Notes

- This plan intentionally does not propose new design system/UI changes.
- Implementer should keep moves incremental and avoid opportunistic renames beyond the mapped items.
