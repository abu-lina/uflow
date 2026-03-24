---
ID: 057
Origin: 057
UUID: 5a8f3c2e
Status: Committed
---

# Plan 057 — JoinHalal Visible Halal-Badges Fallback

## Plan Header

- **Target Release**: next available patch after current `origin/main` version (currently `0.8.21`; `v0.8.22` already tagged, expected `v0.8.23` if still available), confirm at DevOps Stage 1
- **Epic Alignment**: Provider supply quality / import integrity / JoinHalal moderation accuracy
- **Status**: Committed for Release `v0.8.23`
- **Related Issues**: User-reported false-negative JoinHalal alcohol badge extraction; validated examples include `dakju-korean-chicken-25247` (positive `Alkoholverkauf` badge) and `triple-b-burger-brothers-stuttgart-mitte-5990` (negative `Kein Alkoholverkauf` badge)

## Changelog

| Date | Change | Agent | Notes |
|---|---|---|---|
| 2026-03-24T06:47Z | Initial plan created from validated source-pattern gap | Planner | Follow-up to released Plan 051: current importer only reads JSON-LD `additionalProperty`; some JoinHalal pages express alcohol-sale status only in visible `Halal Merkmale` badge lists |
| 2026-03-24T07:00Z | Added backfill scope per user requirement | Planner | All ~900 providers already imported with review_status = 'pending'; normal re-import preserves that value; plan updated to include a safe backfill mode |
| 2026-03-24T07:30Z | Addressed critique MEDIUM-001 + MEDIUM-002 | Planner | Clarified backfill uses `service_role` + triggers fire; clarified `social_website` is the URL source, not `import_source_id` |
| 2026-03-24T08:45Z | Code Review — APPROVED | Code Reviewer | No CRITICAL/HIGH/MEDIUM findings. 2 LOW/INFO observations (class-exact regex fragility; no per-provider error logging in backfill). Both critique MEDIUM findings verified resolved in code. |
| 2026-03-24T09:18Z | QA complete | QA | Plan-scoped parser/import tests, QA-owned backfill CLI tests, and type-check passed. Remaining failures are unrelated repo debt or environment issues. |
| 2026-03-24T09:30Z | UAT complete | UAT | All 6 UAT scenarios PASS; both value statement outcomes delivered; APPROVED FOR RELEASE |
| 2026-03-24T09:30Z | Stage 1 commit prepared | DevOps | Version bumped to `0.8.23`, deferred follow-up tracker created, lifecycle docs prepared for local commit |

## Release Strategy

Release Strategy: Standalone (no other known active plans in `agent-output/planning/` currently targeting the next available patch after `origin/main` version `0.8.21`).

## Value Statement and Business Objective

As an admin, I want the JoinHalal importer to detect alcohol-sale status from the actual visible `Halal Merkmale` badges when JSON-LD is incomplete, so that providers with `Alkoholverkauf` are reliably imported as `review_status = 'rejected'` and providers with `Kein Alkoholverkauf` are not falsely rejected.

Additionally, because ~900 providers have already been imported and all have `review_status = 'pending'`, I need a safe backfill capability that re-evaluates those existing rows with the improved parser and flips `pending → rejected` for confirmed alcohol sellers — without touching rows that a human has already reviewed (i.e. `approved` or `rejected`).

## Objective

Extend the existing JoinHalal import parsing logic so it can read `Halal Merkmale` from the rendered badge list in page HTML when the Schema.org `additionalProperty` contract is absent, incomplete, hyphenated, or otherwise insufficient for alcohol-status decisions. The implementation must preserve the current JSON-LD path, correctly distinguish positive (`Alkoholverkauf`) from negative (`Kein Alkoholverkauf`) signals, and add regression coverage using representative real-page HTML structures.

Because ~900 providers have already been imported, the plan must also deliver a backfill mechanism that allows those existing `pending` rows to be re-evaluated and updated to `rejected` where the improved parser detects alcohol sale. This backfill must be constrained to rows still in `pending` state so that human moderation decisions (`approved`, `rejected`) are never overwritten.

## Scope

### In Scope

- `src/utils/joinhalal-parser.ts` extraction logic for alcohol-status detection
- Shared dry-run/admin import path in `src/lib/import/joinhalal.ts`
- CLI write path in `scripts/import-joinhalal.ts`
- A new `--backfill-alcohol` flag (or equivalent) that fetches each already-imported JoinHalal provider's page, runs the improved detector, and updates `review_status` from `pending` to `rejected` for confirmed alcohol sellers
- Backfill-mode dry-run output showing which rows would flip before any writes occur
- Guard: backfill must only touch rows where `review_status = 'pending'`; rows already manually reviewed (`approved` or `rejected`) must not be modified
- Regression coverage for both positive and negative visible-badge patterns
- Maintainer/operator notes needed to explain the new fallback behavior and backfill operation
- Release artifact updates for the confirmed patch version

### Out of Scope

- New moderation policies beyond alcohol-sale detection
- Manual denylist/override systems for upstream data disagreements
- External site scraping beyond the JoinHalal listing page itself
- UI changes to admin review or discovery surfaces
- Automatic scheduled re-evaluation; the backfill is a one-time operator-triggered command

## Context

Plan 051 correctly wired the rejection rule into the importer, but it assumed JoinHalal would expose `Halal Merkmale` as a structured JSON-LD `additionalProperty` entry with a usable `value`. Real page inspection now shows two relevant patterns:

- Positive case: `dakju-korean-chicken-25247` exposes a visible badge list under the heading `Halal Merkmale`, including a badge with text `Alkoholverkauf`, while JSON-LD only provides `{"name":"Halal-Merkmale","value":"Asiatisch"}`.
- Negative case: `triple-b-burger-brothers-stuttgart-mitte-5990` exposes a visible badge with text `Kein Alkoholverkauf`, while JSON-LD exposes `{"name":"Halal-Merkmale","value":null}`.

This means the current JSON-LD-only detector is a false-negative source for at least some genuine alcohol-selling providers and does not yet understand the explicit negative badge pattern either. The importer needs a fallback source-contract that reads the visible badge list after JSON-LD parsing fails to provide a usable alcohol-status signal.

**Backfill requirement**: All ~900 providers imported prior to this fix have `review_status = 'pending'` because the importer could not detect their alcohol-sale status. The upsert RPC (`upsert_joinhalal_providers`, migration 063/064) deliberately classifies `review_status` as an `ADMIN_CONTROLLED_FIELD` — it is excluded from the `DO UPDATE SET` clause and therefore preserved on conflict. This means simply re-importing will never update existing rows. A dedicated backfill path is required that bypasses the standard upsert restriction and directly updates `review_status` for eligible rows.

## Assumptions

- The visible `Halal Merkmale` badge section is sufficiently stable across JoinHalal detail pages to support deterministic parsing.
- Badge text is a more authoritative signal for alcohol-sale status than the current incomplete JSON-LD `additionalProperty` values.
- `Alkoholverkauf` and `Kein Alkoholverkauf` should be treated as mutually exclusive explicit signals, with the negative badge preventing rejection.
- Existing JSON-LD behavior for other metadata (category, address, menu links, etc.) should remain unchanged.
- All ~900 already-imported providers have `review_status = 'pending'`; none have been manually reviewed yet. If any have been approved or rejected by an admin, the backfill guard must leave those untouched.
- JoinHalal listing pages for already-imported providers are still publicly accessible; the backfill can re-fetch them.
- The backfill is a one-time corrective operation, not an ongoing process.

## Decision Record

- [RESOLVED] Keep JSON-LD parsing as the primary source and add visible-badge parsing only as a fallback — this minimizes change surface and preserves the current import contract where it already works.
- [RESOLVED] Treat `Alkoholverkauf` as a positive rejection signal and `Kein Alkoholverkauf` as an explicit non-rejection signal — exact label handling is required to avoid false positives from substring matching.
- [RESOLVED] Accept both `Halal Merkmale` and `Halal-Merkmale` heading/property-name variants during normalization — live examples show both spellings.
- [RESOLVED] Keep the rejection rule scoped to the JoinHalal page itself — using the provider’s external website as a second source would be a broader policy and scraping change.
- [RESOLVED] Require regression fixtures from representative real-page HTML structures, not synthetic JSON-only samples — the bug exists specifically in rendered badge markup.- [RESOLVED] Backfill must be constrained to `review_status = 'pending'` rows only — rows already reviewed by an admin (`approved` or `rejected`) must never be modified by an automated backfill operation.
- [RESOLVED] Backfill must support a dry-run mode so operators can review which rows would change before committing any writes.- [DEFERRED: Product/Operations + needs explicit moderation-policy approval + follow-up plan/version] Introduce manual override or denylist tooling for cases where real-world knowledge conflicts with JoinHalal’s published badge state.

## Plan

### Milestone 1 — Confirm and Normalize Visible Badge Source Contract

**Objective**: Define exactly how `Halal Merkmale` badges are represented in rendered JoinHalal HTML and how the parser will normalize them.

**Acceptance Criteria**:

- The implementation identifies the stable HTML pattern for the `Halal Merkmale` section and its badge items.
- Normalization rules are explicit for heading variants (`Halal Merkmale` / `Halal-Merkmale`), whitespace, icon wrappers, and badge text extraction.
- The parser behavior is defined for positive, negative, missing, and contradictory badge states.

**Dependencies**: None

---

### Milestone 2 — Add Visible-Badge Fallback to Alcohol Detection

**Objective**: Extend alcohol-status detection so the importer can use rendered badge text when JSON-LD does not provide a usable decision signal.

**Acceptance Criteria**:

- `hasAlkoholverkauf()` (or equivalent detection flow) first checks structured data and then falls back to the visible badge list when structured data is absent, null, or non-decisive.
- Explicit `Alkoholverkauf` badge text resolves to `review_status = 'rejected'`.
- Explicit `Kein Alkoholverkauf` badge text does not trigger rejection.
- The fallback does not broaden scope into unrelated HTML scraping beyond the `Halal Merkmale` section.

**Dependencies**: Milestone 1

---

### Milestone 3 — Preserve Import-Path Consistency

**Objective**: Ensure both shared import paths use the improved detector consistently.

**Acceptance Criteria**:

- `src/lib/import/joinhalal.ts` and `scripts/import-joinhalal.ts` continue to derive `review_status` from the same alcohol-status detector.
- Dry-run/admin preview and CLI write-mode produce the same rejection outcome for the same source HTML.
- Existing `autoRejected` operator reporting remains intact and reflects the improved detection coverage.

**Dependencies**: Milestone 2

---

### Milestone 4 — Backfill Already-Imported Providers

**Objective**: Provide a safe, operator-triggered mechanism to retroactively apply the improved alcohol detector to the ~900 providers already in the database.

**Acceptance Criteria**:

- A `--backfill-alcohol` flag (or equivalent) is available in the CLI importer.
- In backfill mode, the script queries all JoinHalal providers from the database (`WHERE import_source = 'joinhalal'`), reads the full source URL from the `social_website` column (which stores the JoinHalal listing URL, e.g. `https://joinhalal.com/locations/restaurant/dakju-korean-chicken-25247/`), fetches each page, runs the improved detector, and prepares a set of updates. Note: `import_source_id` stores only the numeric post ID and cannot be used to reconstruct URLs.
- Only rows with `review_status = 'pending'` are eligible for update; rows with `approved` or `rejected` status are skipped and reported.
- Backfill mode supports dry-run by default (`--dry-run` or combined with existing dry-run flag); writes only proceed when explicitly confirmed.
- The CLI reports: total rows scanned, would-be-rejected count, skipped (already reviewed) count, and error/unreachable count.
- Backfill writes use a direct targeted update (via `service_role` Supabase client, consistent with the existing CLI import path) rather than the standard upsert RPC, to avoid re-triggering the `ADMIN_CONTROLLED_FIELDS` preservation logic. Existing triggers (e.g. `trigger_providers_updated_at`) should fire normally on the update.

**Dependencies**: Milestone 2

---

### Milestone 5 — Add Regression Coverage for Positive and Negative Badge Patterns

**Objective**: Protect the importer from both false negatives and false positives around visible alcohol badges.

**Acceptance Criteria**:

- Automated coverage proves a visible `Alkoholverkauf` badge yields `review_status = 'rejected'`.
- Automated coverage proves a visible `Kein Alkoholverkauf` badge keeps the provider on the non-rejected path.
- Automated coverage proves the detector still behaves safely when the badge section is missing.
- Test fixtures are representative of the real JoinHalal DOM pattern (heading + advanced-list badges), not only structured-data mocks.
- Automated coverage for backfill mode: dry-run correctly identifies candidates, write mode updates only `pending` rows, and `approved`/`rejected` rows are skipped.

**Dependencies**: Milestone 2, Milestone 4

---

### Milestone 6 — Validate Release Artifacts and Operator Notes

**Objective**: Ship the parser hardening with clear operator expectations.

**Acceptance Criteria**:

- Release artifacts (`package.json`, `CHANGELOG.md`) are updated to the confirmed patch version during DevOps Stage 1.
- Release notes mention that JoinHalal alcohol detection now falls back to visible `Halal Merkmale` badges when JSON-LD is incomplete.
- Release notes include instructions for the one-time backfill operation: how to run in dry-run mode first, how to interpret the output, and how to execute writes.
- Operator notes make clear that the backfill is constrained to `pending` rows and will not overwrite admin moderation decisions.

**Dependencies**: Milestone 3, Milestone 5

## Testing Strategy

- Unit coverage for badge-text extraction and normalization inside the parser utility layer
- Regression tests for shared importer transformation behavior using real DOM-shaped HTML fixtures
- Backfill mode tests: dry-run identifies candidates; write mode only affects `pending` rows; `approved`/`rejected` rows are untouched
- Validation that dry-run/admin preview and write-mode remain behaviorally aligned
- Static analysis (`tsc`, lint) on changed parser/import files

No detailed test cases are defined here; QA owns executable test design.

## Validation

- `vitest` on changed parser/import test files
- `npx tsc --noEmit`
- `eslint` on changed parser/import source and tests
- Manual spot-check against at least one positive (`Alkoholverkauf`) and one negative (`Kein Alkoholverkauf`) example page fixture captured in tests

## Risks

- **HTML structure drift**: JoinHalal may change Elementor class names or section nesting. Mitigation: keep parser anchored to the semantic heading text and nearby badge list, not brittle element IDs.
- **False positives from substring matching**: `Kein Alkoholverkauf` must never be treated as positive alcohol sale. Mitigation: exact normalized label handling for explicit negative states.
- **Source contradictions**: Visible badge text may still disagree with real-world behavior. Mitigation: keep scope limited to what JoinHalal publishes; defer override tooling.
- **Backfill touches reviewed rows**: If any providers were manually reviewed before this fix ships, the backfill must not overwrite those decisions. Mitigation: the `pending`-only guard on the backfill write path is a hard requirement, not optional.
- **Backfill page fetch failures**: Some pages may be unreachable or removed from JoinHalal. Mitigation: the backfill must skip unreachable pages, log them separately, and not abort the entire run.
- **Backfill rate limiting**: Fetching ~900 pages in batch may trigger JoinHalal rate limiting. Mitigation: implement a reasonable inter-request delay in the backfill loop.

## Handoff Notes

- Use the two validated real-page patterns as anchor fixtures:
  - Positive badge: `dakju-korean-chicken-25247` with visible `Alkoholverkauf`
  - Negative badge: `triple-b-burger-brothers-stuttgart-mitte-5990` with visible `Kein Alkoholverkauf`
- Do not widen the data source to external menu websites in this plan.
- If JoinHalal pages show both positive and negative alcohol badges simultaneously in future examples, escalate before implementation; that would be a source-contract ambiguity, not a straightforward bugfix.
- The backfill is a one-time corrective operation. Document clearly in release notes so that the operator knows to run the dry-run preview first, review the candidate list, then execute with writes enabled.
- The backfill must use the `social_website` column (which stores the full JoinHalal listing URL) to fetch each provider's page. `import_source_id` stores only the numeric post ID and cannot reconstruct the URL. Rows with `NULL` `social_website` must be skipped and reported separately.

## Duration Estimates

- Analysis/fixture confirmation: 0.25–0.5h
- Planning: 0.25h
- Implementation (parser + backfill mode): 2–3h
- QA: 1–1.5h
- UAT: 0.5h
- DevOps: 0.25h

**Uncertainty drivers**: consistency of the `Halal Merkmale` badge DOM across JoinHalal pages; whether the current parser can be extended cleanly without introducing brittle HTML matching; how many fixtures are needed to cover heading/badge variations; the rate-limiting and error-handling strategy for bulk page fetching during backfill.