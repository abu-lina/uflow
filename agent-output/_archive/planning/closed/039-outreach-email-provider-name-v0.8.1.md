---
ID: 039
Origin: 039
UUID: d480d9b0
Status: Released v0.8.1
---

# Plan 039: Replace Provider Name Placeholder in Outreach Emails

**Target Release**: v0.8.1  
**Epic Alignment**: Plan 038 follow-up — outreach quality + trust (provider acquisition / supply integrity)  
**Status**: Committed for Release v0.8.1  
**Related Issues**: None  

## Changelog

| Date | Change | Agent | Notes |
|------|--------|-------|-------|
| 2026-03-13T07:40Z | Status: Active → Code Review Approved | Code Reviewer | Review verdict: APPROVED WITH COMMENTS; 1 LOW finding (non-blocking) |  
| 2026-03-13T07:50Z | Status: Code Review Approved → QA Complete | QA | Tests PASS (focused + full suite), type-check PASS, build PASS, delta-lint PASS |
| 2026-03-13T08:00Z | Status: QA Complete → UAT Approved | UAT | Value delivered: provider emails now personalized; APPROVED FOR RELEASE (v0.8.1 patch) |
| 2026-03-13T08:10Z | Status: UAT Approved → Committed for Release v0.8.1 | DevOps | Stage 1 complete: commit 4d76fd6 (local only, no push); ready for Stage 2 release approval | 

## Value Statement and Business Objective

As a provider owner receiving an UFlow outreach email, I want the email to include my actual business name (not a placeholder), so that I trust the message is legitimate and can confidently decide to keep the listing, claim it, or request removal.

## Objective

Eliminate the hardcoded placeholder provider name used in the outreach dispatcher’s email dispatch path by retrieving the provider’s real display name from the database and using it consistently for:

- The email template parameter (`providerName`)
- The outreach token snapshot (`provider_name_snapshot`) used for downstream UX

## Scope

**In scope**:

- Read provider name from the `providers` table for a given `providerId` during email dispatch
- Pass retrieved provider name into the existing email template renderer and token creation
- Add/update automated tests to prove the value (no placeholder; correct fallback behavior)
- Update version artifacts for v0.8.1

**Out of scope**:

- Changing email copy/subject lines beyond replacing the dynamic placeholder value
- Refactoring the overall outreach architecture or moving services between layers
- Adding new DB schema elements, migrations, or RPCs

## Assumptions

- `providers.provider_name` exists and is the canonical display name.
- The dispatcher has appropriate DB read access in the runtime environment where it executes.
- The email template already interpolates `${providerName}`; the issue is the dispatcher’s placeholder parameter.

## Release Strategy

Standalone (no other known plans targeting v0.8.1).

## Decision Record

- [RESOLVED] Use `providers.provider_name` as the business name source — it is already the canonical display field used elsewhere.
- [RESOLVED] Preserve existing email template structure and only replace the dynamic `providerName` parameter — minimizes copy churn and translation risk.
- [RESOLVED] If provider name cannot be loaded, fall back to a language-appropriate generic string (e.g., “Ihr Unternehmen” / “Your business”) rather than failing dispatch.
- [DEFERRED: product owner + copy review + Plan TBD / v0.8.2+] Consider updating subject/title lines to include provider name — not required to meet the stated objective.

## Plan

### Milestone 1 — Confirm Data Source + Access Path

**Objective**: Validate the intended provider name field and access pattern for server-side dispatch.

**Acceptance Criteria**:

- Implementer confirms the exact column used for display name (expected: `provider_name`).
- Implementer confirms whether the dispatcher runs with DB privileges that can read the provider record in production (document evidence in implementation doc).

**Dependencies**: None

---

### Milestone 2 — Implement Provider Name Retrieval

**Objective**: Fetch a provider’s display name by `providerId` in the dispatch path.

**Acceptance Criteria**:

- Email dispatch uses the provider’s real name when available.
- Token snapshot uses the same provider name value.
- If provider name is unavailable or read fails, dispatch continues using a safe fallback.
- No new migrations introduced.

---

### Milestone 3 — Update/Extend Tests

**Objective**: Ensure automated coverage prevents regression to placeholders.

**Acceptance Criteria**:

- At least one dispatcher test asserts the email send call contains the real provider name (not the placeholder).
- At least one test covers the fallback behavior (missing provider name does not break dispatch).
- All existing tests continue to pass.

---

### Milestone 4 — Verification Gates

**Objective**: Prove the change is safe and release-ready.

**Acceptance Criteria**:

- `npm run type-check` passes
- `npm run lint` (or repo lint gate) passes
- `npx vitest run` passes
- `npm run build` passes

---

### Milestone 5 — Update Version and Release Artifacts

**Objective**: Prepare v0.8.1 patch release metadata.

**Acceptance Criteria**:

- Version bumped from `0.8.0` → `0.8.1` in versioned artifacts (minimum: `package.json` and `CHANGELOG.md`).
- CHANGELOG entry date uses UTC day of release (avoid mismatches).
- Changelog notes: “Outreach emails now include provider name from DB (no placeholder).”

## Validation (Non-QA)

- Functional sanity: approve one outreach queue row in a safe environment and confirm rendered email includes correct provider name (may be executed by UAT/DevOps depending on access).

## Risks

- **RLS/permission mismatch** could prevent reading provider name at dispatch time; must be detected early and handled with a fallback + documented remediation.
- **Inconsistent naming** if multiple name sources exist; decision record locks to a single canonical field.

## Duration Estimates

- Analysis / discovery: 0.25–0.5h
- Planning: 0.25h
- Implementation: 1–2h
- Code Review: 0.5–1h
- QA: 0.5–1h
- UAT: 0.25–0.5h
- DevOps: 0.5–1h

Uncertainty drivers: production DB read permissions for the dispatcher; exact provider name column selection.

## Handoff Notes

- Implementer should keep the change minimal: introduce a single provider-name lookup and reuse it for both token snapshot + email params.
- If DB access is not available for dispatcher, escalate immediately with evidence and propose an alternative (e.g., storing provider_name_snapshot earlier in the workflow).
