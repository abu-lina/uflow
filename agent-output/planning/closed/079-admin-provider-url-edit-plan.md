---
ID: 079
Origin: 079
UUID: 4a8f1c3e
Status: Committed
---

# Plan 079 — Admin Provider URL Edit Fix

**Target Release**: next available patch after current `origin/main` version (v0.10.7); confirm as v0.10.8 at DevOps Stage 1  
**Epic Alignment**: Admin moderation workflow reliability (post-v0.9.0)  
**Related Issues**: None (reported via internal screenshot — see Analyst session S79)  
**Release Strategy**: Standalone (no other known active plans targeting v0.10.8)

## Changelog

| Date | Agent | Action | Outcome |
|------|-------|--------|---------|
| 2026-04-04T11:30Z | Analyst | RCA complete | L1 root cause proven; analysis 079 created |
| 2026-04-04T11:35Z | Planner | Plan created | Ready for Critic review |
| 2026-04-04T11:56Z | Implementer | Implementation started | Entered TDD cycle for Milestone 1 |
| 2026-04-04T13:00Z | Code Reviewer | Code review approved | No blocking findings; one changelog residue fixed in-review |
| 2026-04-04T13:08Z | QA | QA validation completed | Automated gates passed; QA report created with PASS verdict |
| 2026-04-04T13:20Z (approx.) | UAT | UAT completed | Value statement validated; APPROVED FOR RELEASE with DF-1 runtime smoke follow-up |
| 2026-04-04T13:06Z | DevOps | Stage 1 preflight started | Version preflight completed; target release v0.10.8 confirmed available |
| 2026-04-04T13:30Z (approx.) | DevOps | Stage 1 local commit prepared | Plan marked Committed for Release v0.10.8 |

---

## Value Statement and Business Objective

> As an **admin**, I want to be able to type a website URL such as `www.yaneel.com` into the provider edit form and successfully approve or reject the provider, so that I am never blocked from completing moderation by browser-native input formatting constraints.

**Master objective alignment**: A blocked admin cannot approve providers → providers stay pending → community cannot discover services → directly undermines "Make UFlow the first thought when any Muslim seeks a service or business."

---

## Root Cause Summary (from Analysis 079)

The website `<input type="url">` in `ProviderEditForm` applies HTML5 strict URL validation. The admin moderation action guard calls `formRef.current.reportValidity()` before firing approve or reject. When the website input holds a schemeless URL (e.g. `www.yaneel.com`), the browser:

1. Displays native tooltip: "Please enter a URL."
2. Returns `false` from `reportValidity()` → early return → action never fires

No JavaScript errors are thrown. All console logs are silent. This is a browser-constraint block, not an application exception.

A normalization utility (`normalizeWebsiteUrl` in `src/utils/navigationUtils.ts`) already exists and handles schemeless URLs correctly. It is used in display views but not wired into the form's input layer.

---

## Assumptions

1. `normalizeWebsiteUrl` behaviour is considered correct and stable — it prepends `https://` to schemeless URLs; already trusted in 3 display contexts.
2. Storing normalized URLs (with scheme) in the database is the desired format — consistent with current display normalization and explicit `https://` placeholder text in the translation.
3. The fix applies to both `ProviderEditForm` (admin + owner edit) and `ProviderCreateForm` (new provider creation) since both have the same `type="url"` input. Scope confirmed below in Decision Record.
4. No database migration is required — the fix normalizes at the form layer; existing schemeless values in the DB are already handled at display time by `normalizeWebsiteUrl`.

---

## Decision Record

| # | Decision | Status | Rationale |
|---|----------|--------|-----------|
| 1 | Fix `ProviderEditForm` as primary target | `[RESOLVED]` | Direct root cause of the reported admin block |
| 2 | Include `ProviderCreateForm` in the same fix | `[RESOLVED]` | Same `type="url"` risk; same single-line fix; same utility available; combined in one plan to eliminate the risk class entirely rather than leaving a known hole |
| 3 | Apply normalization at form input level (not solely at API boundary) | `[RESOLVED]` | API boundary normalization alone would still leave `reportValidity()` failing; the fix must happen before the DOM validation fires |
| 4 | No database migration for existing schemeless rows | `[RESOLVED]` | Display normalization already handles stored schemeless values at read time; fixing the input layer prevents future schemeless writes; a one-time DB backfill is deferred per gap item below |
| 5 | Regression test required using schemeless `social_website` fixture | `[RESOLVED]` | Current test suite uses `social_website: ''` which trivially passes; the broken path is invisible without a schemeless fixture test |
| 6 | Owner submit path (non-admin `handleSubmit`) does NOT use `reportValidity` directly | `[RESOLVED]` | `handleSubmit` calls `e.preventDefault()` and proceeds; HTML5 validation is still triggered by browser on form submit, so the fix benefits both admin and owner use of this form |

---

## Plan

### Milestone 1 — Website Input Normalization Fix

**Objective**: Removing the URL constraint violation that blocks admin moderation and impairs provider creation.

**Files in scope**:

| File | Change |
|------|--------|
| `src/components/providers/ProviderEditForm.tsx` | Website input: accept schemeless input and normalize via existing utility on blur or before form constraint evaluation |
| `src/features/providers/ProviderCreateForm.tsx` | Same fix applied to the create-flow website input (same `type="url"` issue, line 646) |
| `src/__tests__/components/ProviderEditForm.regression.test.tsx` | Add regression test(s) covering the schemeless URL path in the moderation approve/reject flow |

**Acceptance Criteria**:

- [ ] Admin can type `www.yaneel.com` into the website field, click Approve or Reject, and the action completes successfully
- [ ] Admin can open a provider pre-populated with a schemeless website URL and immediately approve or reject without manual correction
- [ ] When user blurs off the website field with a schemeless URL, the input visually updates to a normalized URL (e.g. `https://www.yaneel.com`)
- [ ] An empty website field still passes validation (field is optional — must not become required)
- [ ] Website value sent in the save/approve/reject API payload is a normalized URL with protocol prefix, or null if empty
- [ ] `src/__tests__/components/ProviderEditForm.regression.test.tsx` contains at least one test named to signal the regression (e.g. `[pre-fix FAILS] / [post-fix PASSES]` pattern per project convention), exercising:
  - A schemeless `social_website` value in the provider fixture
  - Clicking Approve (moderation path)
  - Verifying the approve action IS called (not blocked)
- [ ] All existing `ProviderEditForm` regression tests continue to pass
- [ ] `ProviderCreateForm` website input accepts `www.example.com` without constraint failure

**Out of scope for M1**:
- Database backfill of existing schemeless rows (tracked as Gap #1 below)
- Validating that the URL is navigable / that the domain exists

---

### Milestone 2 — Version Artifacts

**Objective**: Update release metadata to reflect the patch.

**Tasks**:

1. Bump `package.json` version to confirmed next patch (v0.10.8)
2. Add CHANGELOG.md entry: `## [0.10.8] — Admin provider URL edit fix` with a one-sentence summary referencing Plan 079
3. No README changes required

**Acceptance Criteria**:

- [ ] `package.json` version matches target release
- [ ] CHANGELOG entry present and correctly describes fix

---

## Milestone Dependencies

Single-layer plan — no cross-layer blocking. M2 depends on M1 completion.

```
graph LR
  M1[M1: URL normalization fix + tests] --> M2[M2: Version artifacts]
```

---

## Testing Strategy

**Test types expected**:

- **Unit / component**: Regression tests in `ProviderEditForm.regression.test.tsx` — form render + schemeless URL input + moderation action invocation confirmation
- **Static analysis**: `tsc --noEmit` must pass; `eslint` must pass
- **Manual smoke**: QA to confirm admin can open a provider with `www.`-prefixed website and approve/reject in UAT environment

**Critical test scenarios (high level)**:

1. Schemeless URL in pre-populated form → approve fires successfully
2. Admin types schemeless URL → blurs → sees normalized value → approve fires
3. Empty website field → approve fires (no regressions on optional field)
4. Valid `https://` URL → approve fires (no regression for existing valid input)

**Coverage note**: Per project convention, tests must follow the `[pre-fix FAILS] / [post-fix PASSES]` naming pattern to make the bug boundary explicit in test output. The pre-fix test should fail with the current code before the fix is applied (or be clearly annotated if skipped for CI cleanliness).

---

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | How many live providers have schemeless `social_website` values? | Non-blocking for this fix | DB query: `SELECT COUNT(*) FROM providers WHERE social_website IS NOT NULL AND social_website NOT LIKE 'http%'` | DevOps / data team — deferred to post-release |
| 2 | Should a one-time DB backfill be scheduled? | Non-blocking for this fix | Depends on prevalence count from Gap #1; if > 0, plan a separate migration patch | Planner (future, post Gap #1 resolution) |

---

## Duration Estimates

| Phase | Estimate | Uncertainty Driver |
|-------|----------|--------------------|
| Implementation | 30–60 min | Single input + existing utility; near-zero unknowns |
| Testing | 30–45 min | One new regression test; existing suite already runs |
| Code Review | 15–30 min | Small, self-contained change |
| QA | 30–60 min | Manual smoke in UAT + confirming approve/reject flow |
| DevOps | 15–30 min | Standard patch release |
| **Total** | **2–3.5 hrs** | Low uncertainty |

---

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| `normalizeWebsiteUrl` returns `null` for empty string → stored as `null` vs `''` in formData | Low | Existing form already does `formData.website || ''` on load; `null` → API sends `null` which is correct for optional field |
| `onBlur` timing vs. rapid button click on mobile | Low | Normalization should also fire at the pre-submit state collection point, not only on blur, ensuring correctness regardless of interaction speed |
| Regressions in owner (non-admin) edit path | Low | Same component; fix benefits both paths; owner path tested by existing test suite |

---

## OPEN QUESTIONS at Handoff

None. All decisions are RESOLVED or DEFERRED with owners.

---

## Validation Summary

- ✅ Root cause L1 Proven (direct code trace)
- ✅ Fix utility already exists and is tested in other contexts
- ✅ No new dependencies required
- ✅ Change is ≤3 files, ≤10 lines of application code
- ✅ Regression test template follows project convention
- ✅ No database migration needed for this fix
- ✅ Worker session constraints honoured (ID inherited, `.next-id` not touched)
