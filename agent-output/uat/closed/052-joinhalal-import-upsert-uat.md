---
ID: 052
Origin: 052
UUID: b4e91c3f
Status: Released
---

# UAT Report: Plan 052 — JoinHalal Import Upsert with Unique ID

**Plan Reference**: `agent-output/planning/052-joinhalal-import-upsert-plan.md`
**Date**: 2026-03-22
**UAT Agent**: Product Owner (UAT)

## Changelog

| Date       | Agent Handoff | Request                           | Summary                                                                                      |
| ---------- | ------------- | --------------------------------- | -------------------------------------------------------------------------------------------- |
| 2026-03-22T18:25Z | QA     | QA Complete, ready for UAT review | UAT Complete — implementation delivers stated value; release approved pending staging verify |

### Timestamp Discipline

- UAT start captured at 2026-03-22T18:25Z (UTC, approx.).
- All predecessor changelog entries use 2026-03-22 (same calendar date; ordering is consistent with the documented handoff sequence).

---

## Value Statement Under Test

> **As an** import operator, **I want to** re-run the JoinHalal import and have it update existing providers with fresh data instead of skipping or duplicating them, **so that** provider information stays current as JoinHalal listings change over time.

---

## Predecessor Document Statuses

| Document        | Status               | Verdict / Notes                                                                                     |
| --------------- | -------------------- | --------------------------------------------------------------------------------------------------- |
| Implementation  | Active (complete)    | All 6 milestones delivered; QA re-fix applied; 395/395 tests pass, tsc clean                       |
| Code Review     | In Review **(stale)** | Verdict in body is **APPROVED_WITH_COMMENTS**; two fix-in-review applied; no CRITICAL/HIGH findings. The header `Status: In Review` was not updated to `Approved` — a doc hygiene issue, not a quality issue. |
| QA              | QA Complete          | All three blockers from first QA pass resolved; no residual blocking findings                       |

---

## Value-Evidence Preflight

**Plan milestones vs Implementation Milestones Completed checklist:**

| Milestone | Plan Deliverable                                   | Impl Status |
| --------- | -------------------------------------------------- | ----------- |
| M1        | Schema migration 062 (columns + index + trigger)   | ✅ Complete |
| M2        | `extractJoinHalalPostId` parser + 6 tests          | ✅ Complete |
| M3        | Upsert logic — dual-path write, selective dedup     | ✅ Complete |
| M4        | Dry-run created-vs-updated reporting + dashboard   | ✅ Complete |
| M5        | Regression tests (14 new), all 395 pass            | ✅ Complete |
| M6        | Version v0.8.12, CHANGELOG entry                   | ✅ Complete |

No user-visible milestone is missing. Preflight passes.

---

## UAT Scenarios

### Scenario 1: First-time import (no prior providers)

- **Given**: The database has no providers with `import_source = 'joinhalal'`.
- **When**: Operator runs `--dry-run` then `--write` against a JoinHalal sitemap.
- **Then**: Dry-run reports `Would INSERT: N, Would UPDATE: 0`; write mode inserts N providers with `review_status = 'pending'`; write report shows `Inserted (new): N, Updated (re-import): 0`.
- **Result**: PASS
- **Evidence**: M3 implementation (dual-path write: records with post ID → RPC upsert, records without → insert-only). M4 dry-run reporting. 395 tests pass including `counts a provider with vxconfig post ID but no DB match as wouldInsert`.

---

### Scenario 2: Re-import (existing providers, no admin changes)

- **Given**: JoinHalal providers already exist in the DB with `import_source = 'joinhalal'` and `import_source_id` populated.
- **When**: Operator reruns `--write` pointing at the same sitemap.
- **Then**: Existing rows are updated; source fields (name, address, contacts, category, offers) are refreshed; `updated_at` is bumped; no new duplicate rows.
- **Result**: PASS (code-level evidence)
- **Evidence**: Migration 063 `upsert_joinhalal_providers()` uses `ON CONFLICT (import_source, import_source_id) WHERE import_source IS NOT NULL AND import_source_id IS NOT NULL DO UPDATE SET [source-controlled fields only]`. The partial unique index prevents duplicates. The `updated_at` trigger fires on every UPDATE (migration 062).
- **Residual verification**: Live DB execution not yet confirmed — recorded as a required staging check below.

---

### Scenario 3: Re-import with admin modifications preserved (core safety requirement)

- **Given**: A moderator has set `review_status = 'approved'` and added `barakah_effects` on an existing imported provider.
- **When**: Operator reruns `--write`.
- **Then**: `review_status`, `barakah_effects`, `needs_ids`, `show_address`, `provider_owner_id`, `review_feedback`, `provider_images`, `user_created_id` are **unchanged**. Only source-data fields are refreshed.
- **Result**: PASS (code-level evidence)
- **Evidence**: The `DO UPDATE SET` clause in migration 063 lists exactly 12 source-controlled fields and omits all 8 admin-controlled fields. The field classification is contract-tested in `src/__tests__/lib/import/joinhalal-upsert-fields.test.ts` (4 tests). This is the core QA blocker that was fixed.
- **Residual verification**: No automation exercises the live RPC execution path. Staging verification is required before first production `--write` (see Deferred Follow-ups).

---

### Scenario 4: Dry-run visibility — created vs updated split

- **Given**: The DB has 100 existing JoinHalal providers and the sitemap contains 120 URLs (80 existing + 40 new).
- **When**: Operator runs `--dry-run`.
- **Then**: Report shows `Would INSERT: 40, Would UPDATE: 80`; dashboard reflects these counts in the "Would UPDATE" row.
- **Result**: PASS
- **Evidence**: `wouldUpdate` classification logic in `src/lib/import/joinhalal.ts`; 4 dry-run classification tests pass; `ImportDryRunPageContent.tsx` displays "Would UPDATE" row; the dry-run invariant `wouldInsert + wouldUpdate = parsed - skipped` holds (tested).

---

### Scenario 5: Pages without vxconfig — backward-compatible fallback

- **Given**: Some JoinHalal pages lack the `vxconfig` JSON tag and `extractJoinHalalPostId` returns null.
- **When**: Import encounters these pages.
- **Then**: These providers fall back to name+city dedup (insert-only path), same as before Plan 052. No regressions.
- **Result**: PASS
- **Evidence**: Selective dedup (Task 3.7): records without `import_source_id` use `makeProviderKey(name, city)` dedup. Tested in `a page without vxconfig falls back to name+city dedup (no wouldUpdate)`.

---

### Scenario 6: Write-mode reporting accuracy

- **Given**: A batch includes both new inserts and conflict updates.
- **When**: `--write` completes.
- **Then**: `WRITE REPORT` shows `Inserted (new): X` and `Updated (re-import): Y` as separate lines.
- **Result**: PASS
- **Evidence**: RPC uses `xmax = 0` technique to return `inserted_count` and `updated_count`. CLI populates `stats.inserted` and `stats.updated` from RPC response and both are printed in `printWriteReport`.

---

## Value Delivery Assessment

The implementation delivers on every dimension of the value statement:

| Dimension                                                   | Delivered? | Evidence                                                          |
| ----------------------------------------------------------- | ---------- | ----------------------------------------------------------------- |
| Re-run updates existing providers (not skip/duplicate)      | ✅ Yes     | Migration 063 RPC with `ON CONFLICT DO UPDATE`                    |
| Provider info stays current (source fields refreshed)       | ✅ Yes     | 12 source-controlled fields in `DO UPDATE SET`                    |
| Admin moderation state not overwritten                      | ✅ Yes     | 8 admin fields absent from `DO UPDATE SET`; contract-tested       |
| Operator visibility before committing (dry-run split)       | ✅ Yes     | `wouldInsert`/`wouldUpdate` in dry-run report and dashboard       |
| Write-mode insert vs update reporting                       | ✅ Yes     | RPC xmax technique; `Inserted (new)` / `Updated (re-import)` rows |
| Backward compatibility for pages without post ID            | ✅ Yes     | Name+city fallback preserved (task 3.7)                           |
| Migration idempotent                                        | ✅ Yes     | `IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP TRIGGER IF EXISTS`    |

Core value is **not deferred**. The primary business concern — platform operator can safely re-run imports without destroying moderator work — is addressed by explicit SQL rather than implicit payload behavior.

---

## QA Integration

**QA Report Reference**: `agent-output/qa/052-joinhalal-import-upsert-qa.md`
**QA Status**: QA Complete

**QA Findings Alignment**:

The three original QA blockers were all remediated:

1. **[HIGH resolved]** Generic `.upsert()` replaced by `upsert_joinhalal_providers()` RPC with explicit DO UPDATE SET allowlist.
2. **[MEDIUM resolved]** `WriteStats.updated` now populated from RPC `updated_count`; write report shows both counters.
3. **[MEDIUM resolved]** `seenImportKeys` bug fixed (starts empty, DB keys checked separately); dry-run classification tests now pass.

**Remediation Review**: UAT reviewed the fix directly (migration 063 SQL, CLI write path, contract tests). This is YES — direct review, not relying solely on QA regression evidence.

---

## Technical Compliance

| Deliverable                              | Status | Notes                                                                           |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------- |
| Migration 062 (columns + index)          | ✅ PASS | Idempotent, partial unique index correct                                        |
| Migration 063 (RPC function)             | ✅ PASS | Correct DO UPDATE SET allowlist; xmax technique; idempotent                     |
| `extractJoinHalalPostId` parser          | ✅ PASS | 6 unit tests; returns null gracefully                                           |
| Dry-run `wouldUpdate` reporting          | ✅ PASS | Dashboard + CLI; 4 passing tests                                                |
| CLI dual-path write + insert/update report | ✅ PASS | RPC for upsert path; `.insert()` for fallback; distinct reporting               |
| Field classification contract            | ✅ PASS | 4 contract tests; constants match migration 063 allowlist                       |
| `npm run build`                          | ⚠️ ENV  | Compiles; fails on page-data collection due to missing Supabase env var. Pre-existing, not Plan 052. |
| Test coverage: 395/395                   | ✅ PASS | Up from 391 pre-plan                                                            |
| `tsc --noEmit`                           | ✅ PASS | Clean                                                                           |
| Version bump to v0.8.12                  | ✅ PASS | `package.json`, `package-lock.json`, `CHANGELOG.md`                            |

---

## Objective Alignment Assessment

**Does code meet original plan objective?**: YES

**Evidence**: 
- Plan objective: "re-run the import and have it update existing providers with fresh data instead of skipping or duplicating them". The implementation delivers exactly this via migration 063 `upsert_joinhalal_providers()`.
- Plan success criterion: "Admin-modified fields (review_status, images, barakah_effects) are preserved across re-imports." Met via the RPC's explicit DO UPDATE SET allowlist excluding all admin-controlled fields.
- Plan success criterion: "Dry-run report shows created vs. updated counts." Met.
- Plan success criterion: "Migration is idempotent." Met.

**Drift Detected**: One intentional and positive implementation drift — Decision Record item 5 stated the CLI would use "Supabase `.upsert()` with `onConflict`". The implementation instead uses a dedicated Postgres RPC function (migration 063), which is architecturally superior because it gives explicit control over which fields are updated on conflict. This drift served the plan's actual intent better than the prescribed mechanism. It was adopted as part of the QA-blocker fix and is consistent with the project's Postgres-first philosophy.

---

## UAT Status

**Status**: UAT Complete
**Rationale**: The value statement is demonstrably delivered at code level. All success criteria are met. All three QA blockers are closed. Gates pass. The one residual uncertainty — staging confirmation that the RPC executes correctly against a live conflicting row — is not a UAT blocker but is recorded as a mandatory staging gate before the first production write.

---

## Release Decision

**Final Status**: APPROVED FOR RELEASE
**Rationale**: Value delivered. No residual blocking findings. Plan, implementation, code review, and QA chain all align to the same objective. The implementation is sound, well-tested for a CLI batch-import tool, and the admin-preservation guarantee is now enforced in SQL rather than relying on PostgREST payload semantics.

**Recommended Version**: v0.8.12 (patch bump — already set in `package.json`)

**Key Changes for Release Notes**:

- JoinHalal import pipeline now supports true re-import upserts via WordPress post ID as a stable unique identifier
- New `import_source` and `import_source_id` columns added to `providers` table (migration 062)
- New `upsert_joinhalal_providers()` PostgreSQL function performs safe conflict updates, preserving admin moderation state (migration 063)
- Dry-run report now shows `Would INSERT` vs `Would UPDATE` split
- Write-mode report now shows `Inserted (new)` vs `Updated (re-import)` distinct counts
- Backward compatible: providers without a vxconfig post ID continue to use name+city dedup (insert-only)

---

## Deferred Follow-ups

### Staging verification before first production `--write`

| Field           | Value                                                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Owner**       | Operator / DevOps                                                                                                                |
| **Trigger**     | Before executing the first `--write` run in production after migration 063 is applied                                           |
| **Due window**  | During DevOps Stage 1 staging verification, before tag/push                                                                     |
| **Action**      | In staging: apply migrations 062 and 063; run `--write --limit 10` against a sitemap subset that includes at least one already-imported provider; verify via `SELECT review_status, barakah_effects, needs_ids, show_address FROM providers WHERE import_source = 'joinhalal' LIMIT 5` that admin-controlled fields are unchanged after the run |
| **Evidence to close** | SQL query output showing admin fields unmodified on conflict rows; `review_status` not reset to `pending` for any approved provider |
| **Fallback**    | If admin fields are overwritten: roll back by running the inverse migration (`ALTER TABLE providers DROP COLUMN import_source, import_source_id`); re-investigate 063 function deployment |
| **Next destination** | Record outcome in DevOps Stage 1 deployment doc |

### Code review header status

| Field     | Value                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------- |
| **Owner** | Any agent touching the code review doc next                                                       |
| **Action** | Update `Status: In Review` to `Status: Approved` in `agent-output/code-review/052-joinhalal-import-upsert-code-review.md` |
| **Due window** | DevOps Stage 1 or retrospective                                                              |

---

## Next Actions

None blocking release. See Deferred Follow-ups above for staging gate.

Handing off to devops agent for release execution.
