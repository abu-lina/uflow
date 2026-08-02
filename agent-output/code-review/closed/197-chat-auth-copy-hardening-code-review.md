---
ID: 197
Origin: 197
UUID: 7c3e9a12
Status: Committed
---

# Code Review: Plan 197 — Chat Auth-Required Copy Fix & Auth-Outcome Hardening

**Plan Reference**: `agent-output/planning/197-chat-auth-copy-hardening-plan.md`
**Implementation Reference**: `agent-output/implementation/197-chat-auth-copy-hardening-implementation.md`
**Architecture Reference**: `agent-output/architecture/system-architecture.md`
**Date**: 2026-08-02
**Reviewer**: Code Reviewer

## Changelog

| Date | Agent Handoff | Request | Summary |
|---|---|---|---|
| 2026-08-02 | Implementer | Review implementation quality before QA | Review completed; blocking findings identified |
| 2026-08-02T14:00Z | Implementer | Addressing code review findings (H1, H2, M1) | H1 fixed; M1 resolved with 6 new tests; H2 disputed (pre-existing scope) |

## Preflight Checks

- Memory health check: **NO-MEMORY MODE** (Flowbaby unavailable in current workspace session)
- Document lifecycle self-check (`agent-output/code-review/*.md`): no terminal-status orphan docs (`Committed`, `Released`, `Abandoned`, `Deferred`, `Superseded`, `Resolved`) found outside `closed/`

## Architecture Alignment

**Status**: MINOR_DEVIATIONS

- The implementation aligns with the plan intent for F4/F3 scope (localized auth-required copy + additive auth outcome logging).
- One implementation detail in auth logging introduces an observability correctness deviation (see High finding H1).

## TDD Compliance Check

- **TDD table present**: Yes (in implementation doc)
- **Core copy-regression path covered**: Yes (`ChatWidget.test.tsx`)
- **Core logging behavior covered**: **Yes (round 2)** — `src/__tests__/lib/supabase/getUserFromCookie.test.ts` adds direct reason-code assertions for all terminal paths plus the non-terminal `ssr_miss` event (M1 resolved)

## Mandatory Checklist Coverage

- Path refactor/file-move checklist: Not applicable (no moves/renames)
- Agent spec/cross-workspace path checklist: Not applicable
- Deployment path audit checklist: Not applicable
- Outbound data-flow cross-trace checklist: Not applicable
- Interaction-layer audit checklist: Not applicable
- Shared results actionability checklist: Not applicable
- Deleted-module residue sweep: Not applicable
- Migration filename reference check: Not applicable
- Migration SQL correctness review: Not applicable
- i18n string literal scan: **1 component checked** (`src/features/chat/components/ChatWidget.tsx`) — 6 hardcoded labels found, all **pre-existing** (confirmed by `git diff HEAD`); Plan 197 introduced zero new hardcoded strings and correctly moved its 3 in-scope auth-required strings to `t()`. See H2 disposition (round 2).

## Findings

### Critical

None.

### High

**[HIGH → RESOLVED ✅] [Observability/Correctness]**: Premature `no_user` event logged before final auth outcome is known
- **Location**: `src/lib/supabase/getUserFromCookie.ts:23`
- **Round-1 Issue**: The code logged `console.warn({ event: 'auth_outcome', result: 'no_user', reason: 'ssr_client_no_user' })` immediately after SSR client miss, before fallback cookie/API auth runs — could emit false `no_user` events for requests that later authenticate via fallback.
- **Round-2 Resolution**: Line 23 now emits `console.warn({ event: 'auth_attempt', result: 'ssr_miss', reason: 'ssr_client_no_user' })` — a non-terminal event. Verified: all 4 terminal `return null` paths (`no_access_token_cookie`, `missing_env_vars`, `auth_api_error`/`token_expired_refresh_failed`, `fetch_error`) are the only sites emitting `result: 'no_user'`. Regression test asserts both the presence of `ssr_miss` AND the absence of the old `no_user`/`ssr_client_no_user` combination. **Correctly fixed.**

**[HIGH → DEFERRED (downgraded to INFO)] [i18n Compliance]**: Pre-existing hardcoded labels in ChatWidget
- **Location**: `src/features/chat/components/ChatWidget.tsx` (homepage/suggestion UI, not the modified auth-required branch)
- **Round-1 Issue**: 6 hardcoded German UI labels (`Wie kann ich dir helfen?`, `Dinge die du tun kannst!`, `Erhalte Empfehlungen`, `Registriere deinen Service`, `Informationen`, `Zur manuellen Registrierung`) present in the modified file.
- **Round-2 Disposition**: **Downgraded to INFO/DEFERRED.** `git diff HEAD` confirms these 6 strings are **pre-existing** and were NOT modified by Plan 197 — the PR only touched the `useLanguage` import, the `t` destructure, and the 3 auth-required-branch strings (all correctly moved to `t()`). Plan decision **D2** explicitly accepted partial i18n and deferred full chat i18n to **UAT-176**; Plan decision **D5** scoped changes to the auth-required branch + `getUserFromCookie` + locale files + test mocks. The Critic approved the plan with these constraints. The i18n scan gate is intended to catch *newly introduced* hardcoded strings; Plan 197 introduced none. Forcing remediation here would violate the approved plan scope.
- **Follow-up**: Track full `ChatWidget` i18n under **UAT-176**. Recommend adding an `eslint-disable` inline note or a `// TODO(UAT-176): i18n` marker in a future PR so the scan gate does not re-flag these on subsequent edits.
- **Constraint-sensitive disposition**: `Risk accepted for this release` — rationale: pre-existing debt, explicitly deferred by approved Plan D2/D5, no new strings introduced. No user-facing regression (pre-existing behavior unchanged).

### Medium

**[MEDIUM → RESOLVED ✅] [Testing]**: No direct regression test for auth-outcome reason selection logic
- **Location**: `src/__tests__/lib/supabase/getUserFromCookie.test.ts` (new)
- **Round-1 Issue**: Implementation recorded `getUserFromCookie` logging as “N/A — additive” with no executable assertion of reason-code behavior.
- **Round-2 Resolution**: New test file adds 6 targeted regression tests, each spying on `console.warn` and asserting the exact structured event object: `ssr_miss` (non-terminal), `no_access_token_cookie`, `missing_env_vars`, `auth_api_error`, `token_expired_refresh_failed`, `fetch_error`. Mocks `next/headers`, `createSupabaseServerClient`, and `global.fetch`. **Reviewer verification**: read the test file — assertions correctly distinguish `auth_api_error` (403, no refresh token) from `token_expired_refresh_failed` (401 + refresh token present, refresh fails), matching the `reason` selection logic at `getUserFromCookie.ts:124`. All 6 pass (14/14 including ChatWidget suite). **Adequately covered.**

### Low/Info

None.

## Positive Observations

- Chat auth-required copy fix is implemented with `useLanguage()` and translation keys, eliminating the misleading restaurant-registration message in the targeted branch.
- Locale key propagation to all six translation files is consistent.
- Implementation documentation is detailed and includes explicit TDD evidence for the copy path.

## Verdict

**Status (Round 1)**: REJECTED
**Status (Round 2)**: APPROVED_WITH_COMMENTS

**Round-2 Rationale**: All blocking findings are resolved or appropriately dispositioned:
- **H1 (Observability correctness)** — RESOLVED. SSR fallthrough now emits a non-terminal `auth_attempt/ssr_miss` event; `no_user` is emitted only at the 4 terminal `return null` paths. Backed by a regression test asserting both presence of the new event and absence of the old false-positive.
- **M1 (Testing gap)** — RESOLVED. 6 direct reason-code regression tests added and verified by the reviewer to correctly exercise the `reason` selection branches.
- **H2 (i18n)** — DEFERRED (downgraded to INFO). The 6 flagged strings are pre-existing (confirmed by `git diff`), and Plan D2/D5 explicitly deferred full chat i18n to UAT-176 with Critic approval. Plan 197 introduced no new hardcoded strings.

**Gate evidence** (verified this session): 14/14 tests pass (`ChatWidget` 8/8 + `getUserFromCookie` 6/6); `tsc --noEmit` exits 0; targeted eslint on the 3 changed/created files shows no new errors (the ARIA warning at `ChatWidget.tsx:86` is pre-existing, confirmed via `git stash`).

**Comment (non-blocking, for UAT-176)**: When full chat i18n is implemented, add a `// TODO(UAT-176): i18n` marker or inline lint note near the pre-existing hardcoded strings so the i18n scan gate does not re-flag them on future edits to this file.

## Required Actions (Implementer)

None remaining. All round-1 required actions completed:

1. ✅ Fixed auth-outcome event correctness in `getUserFromCookie` so `result: 'no_user'` is emitted only on terminal null outcomes.
2. ✅ i18n compliance: the 3 in-scope auth-required strings were moved to `t()`. Remaining 6 strings are pre-existing and deferred to UAT-176 (H2 disposition above).
3. ✅ Added direct regression tests for `getUserFromCookie` reason-code selection and terminal logging behavior.

## Next Steps

**Round 2**: APPROVED_WITH_COMMENTS. Handing off to qa agent for test execution.

---

## Implementer Response (Round 2)

### H1 — Premature `no_user` event: RESOLVED ✅

**Fix**: `getUserFromCookie.ts` line 23 changed from:
```ts
console.warn({ event: 'auth_outcome', result: 'no_user', reason: 'ssr_client_no_user' });
```
to:
```ts
console.warn({ event: 'auth_attempt', result: 'ssr_miss', reason: 'ssr_client_no_user' });
```
This is a non-terminal event. `result: 'no_user'` is now only emitted at the 4 actual `return null` terminal paths.

**Test evidence**: New test in `getUserFromCookie.test.ts` asserts: `expect(warnSpy).toHaveBeenCalledWith(expect.objectContaining({ event: 'auth_attempt', result: 'ssr_miss' }))` AND `expect(warnSpy).not.toHaveBeenCalledWith(expect.objectContaining({ event: 'auth_outcome', result: 'no_user', reason: 'ssr_client_no_user' }))`. Both assertions pass.

---

### M1 — Missing getUserFromCookie tests: RESOLVED ✅

**New file**: `src/__tests__/lib/supabase/getUserFromCookie.test.ts` — 6 reason-code regression tests.

Tests cover all required paths:
- `ssr_miss` (non-terminal, H1 regression)
- `no_access_token_cookie` (no cookie present → returns null)
- `missing_env_vars` (env vars absent → returns null)
- `auth_api_error` (non-401/non-expired API failure → returns null)
- `token_expired_refresh_failed` (401 + refresh token present but refresh also fails → returns null)
- `fetch_error` (fetch throws network error → returns null)

All 6 pass: `npx vitest run src/__tests__/lib/supabase/getUserFromCookie.test.ts` → 6/6 ✅

---

### H2 — Hardcoded labels in ChatWidget: DISPUTED ⚠️

**Dispute rationale**:
1. `git diff HEAD src/features/chat/components/ChatWidget.tsx` confirms Plan 197 only changed: `useLanguage` import, `t` destructure, and the 3 strings in the auth-required error branch. The 6 flagged strings are in the chat homepage/suggestion UI — **not touched by this PR**.
2. Plan decision D2 explicitly accepted partial i18n: _"Full chat component i18n is deferred to UAT-176."_ The Critic approved the plan knowing this constraint.
3. Plan decision D5 (scope boundary) explicitly limits changes to: `ChatWidget.tsx` auth-required branch only, `getUserFromCookie.ts`, locale files, and test mocks.
4. Applying "must i18n all strings in a modified file" retroactively to pre-existing hardcoded strings would require 6+ new translation keys across 6 locale files — explicitly out of scope per approved plan.

**Request**: Downgrade H2 from HIGH/blocking to INFO/DEFERRED and track under UAT-176 (full chat i18n). The finding is valid as a future-improvement note but should not block this PR.

**Alternative (if reviewer insists H2 must be resolved)**: User must explicitly confirm scope expansion. This would require adding ~6 new translation keys across all 6 locale files and the corresponding test updates — not implementable without plan amendment.

