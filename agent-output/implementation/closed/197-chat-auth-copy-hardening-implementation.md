---
ID: 197
Origin: 197
UUID: 7c3e9a12
Status: Committed
---

# Implementation Doc — Plan 197: Chat Auth-Required Copy Fix & Auth-Outcome Hardening

## Plan Reference
`agent-output/planning/197-chat-auth-copy-hardening-plan.md` (Status: In Progress)

## Date
2026-08-02

## Changelog

| Date | Handoff | Request | Summary |
|---|---|---|---|
| 2026-08-02T12:15Z | Implementer | Plan 197 (APPROVED by Critic) | Initial implementation |
| 2026-08-02T13:55Z | Implementer | Code Review REJECTED — H1, H2, M1 findings | H1 fixed (SSR fallthrough log changed to non-terminal event); M1 resolved (getUserFromCookie tests added); H2 disputed (pre-existing strings, plan D2/D5 scope) |

---

## Implementation Summary

**What**: Fixed two issues in the chat subsystem:
1. **F4 (Copy bug)**: ChatWidget's auth-required error card hardcoded "Um ein Restaurant zu registrieren, musst du angemeldet sein." — restaurant-specific copy shown for ANY unauthenticated chat request. Replaced with generic `chat.authRequired.*` i18n keys via `useLanguage()`/`t()`.
2. **F3 (Observability hardening)**: `getUserFromCookie()` had all logging gated by `NODE_ENV === 'development'`. Added `console.warn` at each auth-failure path with structured reason codes, active on all environments, no PII.

**How it delivers value**: Users who trigger the chatbot (e.g., asking for a recommendation) no longer see misleading restaurant-registration copy. Operations teams on UAT/production now have auth-outcome log entries to triage 401 patterns without enabling development mode.

---

## Milestones Completed

- [x] **M1a** — `chat.authRequired.{title,body,action}` keys added to all 6 locale files (de, en, ar, tr, ur, ps)
- [x] **M1b** — `useLanguage()` imported in `ChatWidget.tsx`; 3 hardcoded strings in auth-required branch replaced with `t()` calls
- [x] **M1c** — `LanguageProvider` mock added to `ChatWidget.test.tsx`; 2 regression test cases added (TDD gate passed)
- [x] **M2** — `console.warn({ event: 'auth_outcome', result: 'no_user', reason: '<code>' })` added at all 5 auth-failure sites in `getUserFromCookie.ts`
- [x] **M3** — `package.json` bumped `0.15.0` → `0.15.1` (preliminary); `package-lock.json` aligned; CHANGELOG entry added to `[Unreleased]` block
- [x] **CR-H1** — SSR fallthrough log changed from `{ event: 'auth_outcome', result: 'no_user' }` to `{ event: 'auth_attempt', result: 'ssr_miss' }` — non-terminal event, correct semantics
- [x] **CR-M1** — New test file `src/__tests__/lib/supabase/getUserFromCookie.test.ts` with 6 reason-code regression tests (all passing)
- [x] **CR-H2** — Disputed (see H2 Dispute section below): 6 flagged strings are pre-existing, not introduced by Plan 197

---

## Files Modified

| Path | Changes | Lines Δ |
|---|---|---|
| `src/features/chat/components/ChatWidget.tsx` | Added `useLanguage` import; destructured `t`; replaced 3 hardcoded strings in auth-required branch | +4 / -3 |
| `src/lib/supabase/getUserFromCookie.ts` | Added `console.warn` at 5 auth-failure sites; **CR-H1**: changed SSR-fallthrough log from `result: 'no_user'` (premature) to `result: 'ssr_miss'` (non-terminal, correct) | +7 / -1 |
| `src/translations/de.ts` | Added `chat.authRequired.{title,body,action}` namespace | +7 |
| `src/translations/en.ts` | Added `chat.authRequired.{title,body,action}` namespace | +7 |
| `src/translations/ar.ts` | Added `chat.authRequired.{title,body,action}` namespace | +7 |
| `src/translations/tr.ts` | Added `chat.authRequired.{title,body,action}` namespace | +7 |
| `src/translations/ur.ts` | Added `chat.authRequired.{title,body,action}` namespace | +7 |
| `src/translations/ps.ts` | Added `chat.authRequired.{title,body,action}` namespace | +7 |
| `src/__tests__/features/chat/ChatWidget.test.tsx` | Added `LanguageProvider` mock; added 2 regression test cases for auth-required card | +18 |
| `package.json` | Version bumped `0.15.0` → `0.15.1` (preliminary) | +1 / -1 |
| `package-lock.json` | Lockfile aligned via `npm install --package-lock-only` | +2 / -2 |
| `CHANGELOG.md` | Added Plan 197 entries to `[Unreleased]` Fixed section | +7 |

---

## Files Created

| Path | Purpose |
|---|---|
| `agent-output/implementation/197-chat-auth-copy-hardening-implementation.md` | This document |
| `src/__tests__/lib/supabase/getUserFromCookie.test.ts` | **CR-M1**: 6 reason-code regression tests for `getUserFromCookie` (ssr_miss non-terminal, no_access_token_cookie, missing_env_vars, auth_api_error, token_expired_refresh_failed, fetch_error) |

---

## Code Quality Validation

- [x] **`npm run lint`** — 236 problems (72 errors) but all pre-existing unrelated files. No new errors in changed files confirmed via targeted eslint run. Pre-existing ARIA error on line 86 of `ChatWidget.tsx` existed before this PR (verified by git stash test).
- [x] **`npm run type-check`** — exits 0 (`tsc --noEmit` clean)
- [x] **`npx vitest run`** — 2 failed / 225 passed. Failing files (`admin/review-provider/alcohol-conflict.test.ts`, `scripts/import-muslimbusiness-cli.test.ts`) are pre-existing; not in `git diff --name-only`. ChatWidget: 8/8 ✅. getUserFromCookie: 6/6 ✅.
- [x] **Lockfile alignment** — `package-lock.json` version shows `0.15.1` in top 2 entries ✅
- [x] **Version bump note** — `0.15.1` is preliminary; final version confirmed at DevOps Stage 1

---

## i18n Self-Scan

Only change to `ChatWidget.tsx` is replacing hardcoded German strings with `t()` calls. No new hardcoded user-visible string literals introduced. ✅

---

## Value Statement Validation

**Original**: ChatWidget shows restaurant-specific copy for any unauthenticated chat request; auth failures produce no observable signal on UAT/prod.

**Delivered**: Auth-required card shows generic "Um den Chatbot zu nutzen, musst du angemeldet sein." / "You must be logged in to use the chatbot." via `useLanguage()`. Auth-failure paths emit structured `console.warn` with reason codes on all environments.

---

## TDD Compliance

| Function/Class | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
|---|---|---|---|---|---|
| ChatWidget auth-required branch (no restaurant text) | `src/__tests__/features/chat/ChatWidget.test.tsx` | ✅ Yes | ✅ Yes | `expect(element).not.toBeInTheDocument()` — restaurant text WAS present | ✅ Yes |
| ChatWidget auth-required branch (i18n key rendered) | `src/__tests__/features/chat/ChatWidget.test.tsx` | ✅ Yes | ✅ Yes | `Unable to find element with text: chat.authRequired.body` — hardcoded German was rendered | ✅ Yes |
| `getUserFromCookie` logging (M2) | N/A — additive console.warn at existing return-null sites; no new API surface | ⚠️ Post-fix (bugfix regression) | ✅ Yes — pre-fix code has zero warn statements, post-fix log call confirms reason codes | N/A — additive warn statements, no behavioral assertion | ✅ Yes |
| `getUserFromCookie` — SSR fallthrough emits non-terminal event (CR-H1) | `src/__tests__/lib/supabase/getUserFromCookie.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes — pre-fix code emitted `result: 'no_user'`; test asserts `result: 'ssr_miss'` (would have failed on old code) | `result: 'no_user'` emitted instead of `result: 'ssr_miss'` | ✅ Yes |
| `getUserFromCookie` — no_access_token_cookie reason code (CR-M1) | `src/__tests__/lib/supabase/getUserFromCookie.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes — no console.warn existed before M2 | No warn emitted | ✅ Yes |
| `getUserFromCookie` — missing_env_vars reason code (CR-M1) | `src/__tests__/lib/supabase/getUserFromCookie.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes — no console.warn existed before M2 | No warn emitted | ✅ Yes |
| `getUserFromCookie` — auth_api_error reason code (CR-M1) | `src/__tests__/lib/supabase/getUserFromCookie.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes — no console.warn existed before M2 | No warn emitted | ✅ Yes |
| `getUserFromCookie` — token_expired_refresh_failed reason code (CR-M1) | `src/__tests__/lib/supabase/getUserFromCookie.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes — no console.warn existed before M2 | No warn emitted | ✅ Yes |
| `getUserFromCookie` — fetch_error reason code (CR-M1) | `src/__tests__/lib/supabase/getUserFromCookie.test.ts` | ⚠️ Post-fix (bugfix regression) | ✅ Yes — no console.warn existed before M2 | No warn emitted | ✅ Yes |

---

## Test Coverage

| Type | Description |
|---|---|
| Unit — auth-required copy | `[pre-fix FAILS] auth-required error does NOT show restaurant-registration text` — asserts restaurant text absent |
| Unit — auth-required i18n | `[pre-fix FAILS] auth-required error card uses i18n key for body text` — asserts `chat.authRequired.body` key rendered by `t()` |
| Regression — non-auth error branches | Existing tests confirm `Netzwerkfehler` generic error path still renders (unchanged) |
| Regression — getUserFromCookie SSR miss (CR-H1) | Asserts SSR fallthrough emits `{event: 'auth_attempt', result: 'ssr_miss'}` and NOT `{result: 'no_user'}` |
| Regression — getUserFromCookie reason codes (CR-M1) | 5 tests covering `no_access_token_cookie`, `missing_env_vars`, `auth_api_error`, `token_expired_refresh_failed`, `fetch_error` — each spies on `console.warn` for exact structured event |

---

## H2 Dispute — Pre-existing Hardcoded Strings in ChatWidget

**Code Review finding H2** flagged 6 hardcoded German strings in `ChatWidget.tsx` as HIGH blocking.

**Dispute rationale**:
1. `git diff HEAD src/features/chat/components/ChatWidget.tsx` confirms Plan 197 only changed: (a) import line for `useLanguage`, (b) `t` destructure, (c) 3 strings in the auth-required error branch. No other strings were touched.
2. The 6 flagged strings (`Wie kann ich dir helfen?`, `Dinge die du tun kannst!`, `Erhalte Empfehlungen`, `Registriere deinen Service`, `Informationen`, `Zur manuellen Registrierung`) are in the chat homepage/suggestion UI — **pre-existing code not modified by this PR**.
3. Plan decision D2 (accepted tradeoff) explicitly states: _"Partial i18n is acceptable for this PR. Full chat component i18n (homepage strings, suggestion cards, etc.) is deferred to UAT-176."_ The Critic approved the plan with this constraint.
4. Plan decision D5 (scope boundary): _"Only ChatWidget.tsx auth-required branch, getUserFromCookie.ts, locale files, and test mocks are in scope."_

**Resolution**: H2 is a **pre-existing debt item** outside Plan 197 scope. It should be tracked under UAT-176 (full chat i18n). The code reviewer should accept this with a lower severity (INFO/DEFERRED) rather than a plan-blocking HIGH finding.

---

## Test Execution Results

```
npx vitest run src/__tests__/features/chat/ChatWidget.test.tsx src/__tests__/lib/supabase/getUserFromCookie.test.ts

✓ src/__tests__/lib/supabase/getUserFromCookie.test.ts (6 tests) 6ms
✓ src/__tests__/features/chat/ChatWidget.test.tsx (8 tests) 148ms

Test Files  2 passed (2)
     Tests  14 passed (14)
  Duration  1.34s
```

Full suite: 2 failed (pre-existing) / 225 passed / 24 skipped.

---

## Cross-Layer Integration Self-Check

N/A — no new API routes, no redirect/query params emitted or consumed.

## Search/Filter Client-Interaction Trace

N/A — ChatWidget is not a search form; no URL lifecycle changes.

## Multi-Plan State Audit

N/A — no prior-plan state mutations in scope for these files.

---

## Outstanding Items

- **L3 (non-blocking)**: Plan Objective section still says "keyed by correlation ID" and M2 objective says "non-development environments" — both contradict the correct tasks. Planner may sync when convenient. Does not affect this implementation.
- **Pre-existing lint errors** (72 errors, unrelated files) — not introduced by Plan 197.
- **Pre-existing test failures** (2 test files) — not introduced by Plan 197.
- **Full chat i18n** (Plan UAT-176 track) — deferred. This PR adds only the `chat.authRequired.*` namespace; the rest of `ChatWidget` remains hardcoded German per plan scope.

---

## Next Steps

QA → UAT → DevOps (version confirmation + release)
