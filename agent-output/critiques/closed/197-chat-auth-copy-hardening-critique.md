---
ID: 197
Origin: 197
UUID: 7c3e9a12
Status: Resolved
---

# Critique — Plan 197: Chat Auth-Required Copy Fix & Auth-Outcome Hardening

- **Artifact**: `agent-output/planning/197-chat-auth-copy-hardening-plan.md`
- **Analysis**: `agent-output/analysis/closed/197-chat-401-auth-determination.md`
- **Date**: 2026-08-02T11:45Z
- **Status**: APPROVED
- **Review**: Revision 1

## Changelog

| Date              | Handoff  | Request                        | Summary                                        |
| ----------------- | -------- | ------------------------------ | ---------------------------------------------- |
| 2026-08-02T11:45Z | Planner  | Pre-implementation review      | Initial critique; 2 MEDIUM findings, revision requested |
| 2026-08-02T12:05Z | Planner  | Re-review after revision       | M1 (Option B) & M2 resolved; L1/L2 acknowledged; new L3 (non-blocking doc-hygiene). **Verdict: APPROVED** |

## Value Statement Assessment

**PASS.** The plan opens with a well-formed user story (unauthenticated user → clear, context-appropriate login message → not confused by irrelevant restaurant copy). It ties directly to a real, observed UX defect (analysis 197 F4) and delivers direct user value. Semver classification (patch) is correct: a copy bugfix plus additive, non-breaking logging.

## Overview

The plan is small, well-scoped, and correctly refuses to over-reach (D4 sensibly declines the stale-cookie clearing). Duration estimates, Decision Record (no `[OPEN]` items), and Release Strategy are all present. Two issues prevent approval as written: (1) the i18n approach is inconsistent with the rest of the chat feature and mis-describes the codebase's i18n mechanism; (2) Milestone 2 claims correlation-ID keying that is not achievable with the current function signature.

## Architectural Alignment

- **Auth gate understanding**: Correct — analysis 197 F1 established `getUserFromCookie()` is the sole `/api/chat` auth gate; the plan builds on that accurately.
- **i18n mechanism**: **Misaligned.** The codebase does not use "direct key access from translation files" (plan Assumption 1). It uses a custom `useLanguage()` hook from `@/providers/LanguageProvider` exposing `t(key)`. More importantly, **the entire chat feature is hardcoded German** — no component under `src/features/chat/` imports `useLanguage`/`t()`, and UAT doc `agent-output/uat/176-chatbot-feature.md` (§2.3) explicitly documents this as a known gap. See Finding M1.
- **Logging placement**: Reasonable, but the correlation-ID claim is not feasible as written. See Finding M2.

## Scope Assessment

The copy fix (M1) is genuinely small. However, the plan couples it with introducing an i18n namespace and `t()` wiring into a component that is otherwise 100% hardcoded German. That coupling adds scope (new namespace, hook import, likely `LanguageProvider` test-mock updates) beyond what the bug requires, and produces a partially-localized component inconsistent with its siblings. M2 (logging) is appropriately additive.

## Technical Debt Risks

- **Partial i18n inconsistency**: Localizing one card in an all-German component is a new micro-inconsistency. If full chat i18n later happens (tracked conceptually in UAT 176), this one-off may need rework anyway.
- **False observability expectation**: If M2 ships claiming correlation-ID keying but cannot deliver it, ops/triage will expect a correlation they cannot make (see M2).

## Findings

### M1 — i18n coupling is inconsistent with the chat feature and mis-describes the i18n mechanism — **MEDIUM**

- **Status**: RESOLVED (Rev 1)
- **Description**: Plan Assumption 1 stated the i18n approach is "direct key access from translation files." The actual pattern is the `useLanguage()`/`t()` hook (`@/providers/LanguageProvider`). Separately, **every** string in `src/features/chat/` is hardcoded German (verified by grep; corroborated by UAT 176 §2.3). D1/D2 directed introducing i18n for just the auth-required card.
- **Impact**: Wrong mechanism if followed literally; partial-i18n inconsistency; incidental test-mock scope.
- **Recommendation**: Option A (copy-only) or Option B (i18n done correctly).
- **Resolution**: User chose **Option B**. Revised plan corrects Assumption 1 to name `useLanguage()`/`t()`, updates D2 to explicitly accept the partial-i18n tradeoff (full chat i18n deferred to UAT 176), and adds M1 Task 4 to update/mock `LanguageProvider` in `ChatWidget` tests. Adequately addressed.

### M2 — "Keyed by correlation ID" is not achievable with the current `getUserFromCookie()` signature — **MEDIUM**

- **Status**: RESOLVED (Rev 1)
- **Description**: D3 and Milestone 2 stated the auth-outcome log would be "keyed by correlation-id," but `getUserFromCookie()` takes no parameters and has no access to `ctx.correlationId`.
- **Impact**: Stated observability benefit not deliverable as written.
- **Recommendation**: Drop the correlation-ID claim, or thread it through the signature.
- **Resolution**: Planner dropped the correlation-ID claim (standalone reason-coded log). D3 now notes the route already returns `X-Correlation-ID` on the 401 for request-level triage, with the function-level log providing aggregate reason counts. Adequately addressed.

### L1 — Reason-code list (6) exceeds actual `return null` paths (4) — **LOW**

- **Status**: RESOLVED (Rev 1)
- **Description**: M2 originally listed six reason codes vs four `return null` sites.
- **Resolution**: Revised M2 Task 1 now maps reason codes to the four actual return sites and notes the conditional needed to distinguish `token_expired_refresh_failed` from `auth_api_error` at the shared `!res.ok` site.

### L2 — Log-noise on a public endpoint — **LOW**

- **Status**: RESOLVED (Rev 1, acknowledged)
- **Description**: Unauthenticated hits to `/api/chat` now emit a `console.warn`.
- **Resolution**: Retained in the Risks table as an accepted low risk (`warn` level, non-verbose, downgradable). Acceptable.

### L3 — Objective section still says the log is "keyed by correlation ID" (contradicts revised D3) — **LOW**

- **Status**: OPEN (non-blocking)
- **Description**: The **Objective** section, item 2 (F3), still reads "Add a lightweight, non-PII auth-outcome log **keyed by correlation ID**." This now contradicts the revised D3 and Milestone 2, which correctly drop the correlation-ID claim. The Milestone 2 objective line also still says "on non-development environments," while the task adds a `console.warn` that is *not* gated by `NODE_ENV` (i.e. all environments).
- **Impact**: Documentation inconsistency only. The governing sections (D3, Milestone 2 tasks) are unambiguous, so implementation is not at risk — an implementer follows the detailed Milestone tasks. Pure hygiene.
- **Recommendation**: Planner sync two wording leftovers when convenient (Objective F3 line: remove "keyed by correlation ID"; M2 objective: "all environments" not "non-development"). **Non-blocking** — does not gate implementation.

## Questions

1. **M1 decision**: Does the team want the minimal copy-only fix (Option A) or a deliberate i18n micro-migration (Option B)? This materially changes the implementation surface.
2. **M2 decision**: Standalone auth-outcome log (drop correlation-ID claim) or thread the correlation ID through the signature?

## Risk Assessment

Low overall product risk — the change is small and non-breaking. The two MEDIUM findings are about **accuracy and scope discipline**, not safety. Resolving them is cheap and will prevent implementer confusion and a false observability expectation.

## Recommendations

- **Verdict: APPROVED.** Both MEDIUM findings (M1, M2) are resolved; L1/L2 acknowledged. The remaining L3 is a trivial, non-blocking documentation-hygiene sync that does not gate implementation. The plan is clear, correctly scoped, and safe to implement.
- Suggested (non-blocking): Planner sync the two Objective/M2 wording leftovers noted in L3.

## Revision History

- **2026-08-02T11:45Z — Initial**: 2 MEDIUM (M1 i18n coupling/mechanism, M2 correlation-ID infeasibility), 2 LOW. Verdict: Revision Requested.
- **2026-08-02T12:05Z — Revision 1**: M1 resolved via Option B (i18n corrected + partial-i18n tradeoff accepted + test-mock task); M2 resolved (correlation-ID claim dropped, standalone reason log); L1 resolved (reason codes mapped to 4 sites); L2 acknowledged. New L3 (non-blocking doc-hygiene contradiction in Objective/M2 wording). **Verdict: APPROVED.**
