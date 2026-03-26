---
ID: 063
Origin: 063
UUID: a7e4f3b2
Status: Released
---

# Code Review — Plan 063: Restore Mobile Profile Entry When Logged Out

## Review Header

- Plan: `agent-output/planning/063-profile-menu-mobile-auth-entry-fix-plan.md`
- Implementation: `agent-output/implementation/063-profile-menu-mobile-auth-entry-fix-impl.md`
- Date: 2026-03-26
- Reviewer: Code Reviewer

## Changelog

| Timestamp (UTC) | Handoff | Request | Summary |
|---|---|---|---|
| 2026-03-26T21:45Z | Implementer → Code Reviewer | Review | First review of Plan 063 implementation |

---

## Self-Check

Scanned `agent-output/code-review/` for orphaned documents with terminal Status values (`Committed`, `Released`, `Abandoned`, `Deferred`, `Superseded`, `Resolved`). None found. All existing docs carry non-terminal statuses (`Active`, `APPROVED`, `Code Review Approved`, `Review Complete`).

---

## Files Reviewed

| File | Type | Description |
|---|---|---|
| `src/utils/navigationUtils.ts` | Modified | Removed `hasCompletedOnboarding()` gate from `/` path in `shouldShowCityEarlyAccessNavbar()` |
| `src/__tests__/utils/navigationUtils-063.test.ts` | Created | 9 TDD regression tests for Bug B |

---

## Applicable Checklists

| Checklist | Applicable? | Result |
|---|---|---|
| 6b — Path Refactor / File-Move | ❌ No moves or renames | N/A |
| 6c — Agent Spec / Cross-Workspace Paths | ❌ No agent spec changes | N/A |
| 6d — Deployment Path Audit | ❌ No Dockerfile/CI/deploy changes | N/A |
| 6e — Outbound Data-Flow Cross-Trace | ❌ No `router.push` / Link href params changed | N/A |
| 6f — Interaction-Layer Audit | ✅ Change affects nav visibility (pointer-events chain) | See below |
| 6g — Shared Results Actionability | ❌ No inline actions added to result sets | N/A |
| 6h — Deleted-Module Residue | ❌ No modules deleted | N/A |

### Checklist 6f — Interaction-Layer Audit

The change causes `shouldShowCityEarlyAccessNavbar('/', ...)` to return `true` for fresh users, resulting in `mobileUiMode = 'navbar'` and `data-mobile-ui='navbar'` on the slot.

**Trace when `data-mobile-ui='navbar'`:**

| Layer | Element | `pointer-events` |
|---|---|---|
| Slot | `.mobile-bottom-ui-slot[data-mobile-ui='navbar']` | `auto` (CSS line 456, on `origin/main`) |
| Wrapper | `.city-navbar-wrapper` | `auto` (CSS line 467) + `visibility: visible` |
| Component | `CityEarlyAccessNavbar` `<nav>` | `pointer-events-auto` (className, line 69) |
| Profile link | `<Link href="/login">` | inherits `auto` |

✅ **No blocking ancestor in the tap chain.** The CSS fix (Bug A) was merged to `origin/main` already. The interaction chain is complete and correct for fresh users on `/`.

---

## Security Checklist

This change is pure client-side navigation **display logic** — it decides whether to render a nav component, and has no server interaction, no auth state modification, and no data access.

| Category | Result |
|---|---|
| Input Validation | N/A — no user input processed |
| Authentication | ✅ Auth routes (`/login`, `/profile`) unchanged; nav icon simply routes to them |
| Authorization | N/A — nav visibility is a UX decision, not an access control boundary |
| Secrets | ✅ None present |
| SQL/Injection | N/A |
| XSS | N/A — no dynamic content rendered |
| CSRF | N/A |

---

## Correctness Review

### `shouldShowCityEarlyAccessNavbar` — logic trace

**Before fix (Bug B):**
```
pathname='/', onboarding=false, stage='onboarding'
  isStage3 = false     → continue
  onboardingComplete = hasCompletedOnboarding() = false
  pathname === '/' && onboardingComplete → false → SKIP
  onboardingPages=['/', '/about', '/welcome'].includes('/') && !false → return false ← BUG
```

**After fix:**
```
pathname='/', onboarding=false, stage='onboarding'
  isStage3 = false     → continue
  pathname === '/'     → return true ← CORRECT
```

**Stage 3 guard is correctly placed BEFORE the `/` early return** (line 336 vs line 341). Stage 3 users cannot access this path and correctly see `false`. ✓

**All other paths untouched:** The `hasCompletedOnboarding()` call is now only reached for paths other than `/`. For non-`/`, non-Stage-3 paths, behavior is identical to pre-fix. ✓

### Edge case: returning user (onboarding complete) on `/`

- Before: `pathname === '/' && true` → `return true`
- After: `pathname === '/'` → `return true`
- Result: identical. No behavioral change for returning users. ✓

### Redundancy note (LOW — informational only)

`/about` appears in both `onboardingPages` (`['/about', '/welcome']`) and `excludedPages`. The `onboardingPages` check fires only when `!onboardingComplete`; `excludedPages` fires unconditionally. This means `/about` is double-blocked. The double-block is defensive and harmless — a returning user with onboarding complete still cannot see the navbar on `/about` because `excludedPages` catches it absolutely. No action required.

---

## Maintainability Review

| Category | Result |
|---|---|
| Naming | ✅ Comment explains the decision clearly, references Plan 063 and the bug |
| Complexity | ✅ Change reduces cyclomatic complexity — one fewer `&&` compound condition |
| Coupling | ✅ No new dependencies or coupling introduced |
| Documentation | ✅ Inline comment explains business reason for the unconditional return |
| Error Handling | N/A — pure boolean logic, no new failure modes |
| Tests | ✅ 9 new tests; TDD compliance verified (4 failed pre-fix, all 9 pass post-fix) |

---

## Test Quality Review

**File**: `src/__tests__/utils/navigationUtils-063.test.ts`

| Check | Result |
|---|---|
| Storage isolation (`beforeEach`/`afterEach` clear) | ✅ |
| Fresh-user case: all relevant stage values tested (`onboarding`, `stage1`, `stage2`, `loading`) | ✅ |
| Stage 3 guard: both `isAppLaunched=true` and `stage='stage3'` tested | ✅ |
| Decision 4 (deferred): `/about` and `/welcome` remain gated | ✅ |
| `shouldShowMobileFooter` for fresh user (footer stays false) | ✅ |
| Regression against Plan 062 tests | ✅ All 9 pass |
| Full suite: 699 passed, 0 failed | ✅ |

**One LOW note**: No explicit test for `stage=undefined` (which is a valid call signature). At runtime `undefined` does not match `stage === 'stage3'`, so the fix path is reached correctly. The existing Plan 062 tests cover the happy path with defined stages. Not blocking.

**TDD compliance table** is present and complete in the Implementation doc. ✓

---

## TDD Compliance Table Verification

| Attribute | Value |
|---|---|
| Test written before implementation | ✅ stated and structurally consistent |
| Pre-fix failure mode verified | ✅ 4 `AssertionError: expected false to be true` failures documented |
| Post-fix pass | ✅ all 9 tests pass |
| Regression coverage | ✅ covers the exact Bug B code path, not only adjacent behavior |

Per the copilot instructions: "For client-State Precedence Regression Pattern bugs, write focused logic tests that mirror the exact pre-fix and post-fix expressions." The test assertions match the exact `shouldShowCityEarlyAccessNavbar(...)` call that was failing. ✓

---

## Findings

### CR-1 — `/about` double-blocked in `excludedPages` and `onboardingPages` (LOW / Informational)

| Attribute | Value |
|---|---|
| **Severity** | LOW |
| **Status** | OPEN |
| **Location** | `src/utils/navigationUtils.ts` lines ~351, ~356 |
| **Description** | `/about` appears in both the `onboardingPages` guard and the `excludedPages` list. The `onboardingPages` guard fires only when `!onboardingComplete`; `excludedPages` fires unconditionally. The combined effect is correct — `/about` never shows the navbar. |
| **Impact** | No functional issue. Minor dead-code smell: the `onboardingPages` check for `/about` is redundant given `excludedPages` already blocks it absolutely. |
| **Recommendation** | Consider removing `/about` and `/welcome` from `onboardingPages` in a future clean-up (or removing `excludedPages` entries for those two paths). Not required for this patch. |

### CR-2 — `stage=undefined` not tested (LOW / Coverage gap)

| Attribute | Value |
|---|---|
| **Severity** | LOW |
| **Status** | OPEN |
| **Location** | `src/__tests__/utils/navigationUtils-063.test.ts` |
| **Description** | `shouldShowCityEarlyAccessNavbar` has `stage?: ...` (optional). No test covers `stage=undefined` for the fresh-user `/` path. |
| **Impact** | At runtime `undefined !== 'stage3'`, so the early `/` return is reached correctly. Risk is negligible; existing tests provide adequate confidence. |
| **Recommendation** | Add one test `expect(shouldShowCityEarlyAccessNavbar('/', false, null, undefined)).toBe(true)` in a follow-up if desired. Not required to unblock QA. |

---

## Outstanding Items from Implementation Doc

| Item | Assessment |
|---|---|
| Milestone 5 (version bump + CHANGELOG) deferred to DevOps Stage 1 | ✅ Acceptable — version must be confirmed at merge time since `origin/main` is already `0.9.5` |
| Latent debt: `hasCompletedOnboarding()` / `skipWaitlist` inconsistency | ✅ Acknowledged; not in scope. Should be tracked in open-actions. |

---

## Verdict

**APPROVED**

The implementation is correct, minimal, and well-tested. The fix is a 7-line net change that removes a single compound condition, replacing it with an unconditional early return for the root path. The security posture is unchanged. The interaction-layer chain is verified. TDD compliance is full. Both regression suites pass. No HIGH or CRITICAL findings.

The two LOW findings (CR-1, CR-2) are informational and do not require resolution before QA.

---

## Status Update

Updating Plan 063 Status to **Code Review Approved**.
