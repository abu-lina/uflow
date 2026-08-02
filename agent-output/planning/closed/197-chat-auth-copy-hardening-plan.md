---
ID: 197
Origin: 197
UUID: 7c3e9a12
Status: Committed
---

# Plan 197 — Chat Auth-Required Copy Fix & Auth-Outcome Hardening

| Field          | Value                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------- |
| Plan ID        | 197                                                                                         |
| Target Release | Next available patch after current origin/main v0.15.0; confirm at DevOps Stage 1           |
| Epic Alignment | Chat / UX Quality                                                                           |
| Related Issues | None (surfaced during investigation of a correct-behavior 401 on `/api/chat`)               |
| Classification | Bugfix                                                                                      |
| Pipeline       | Abbreviated                                                                                 |
| GitHub Issue   | https://github.com/abu-lina/uflow/issues/285                                               |
| Created        | 2026-08-02T11:30Z                                                                           |

## Changelog

| Date               | Agent   | Change                                    |
| ------------------ | ------- | ----------------------------------------- |
| 2026-08-02T11:30Z  | Planner | Plan created from analysis 197            |
| 2026-08-02T11:55Z  | Planner | Revised per critique 197: M1 → Option B (i18n via `useLanguage()`/`t()`), M2 → drop correlation-ID claim (standalone reason log), L1/L2 acknowledged |
| 2026-08-02T12:15Z  | Implementer | Status → In Progress |
| 2026-08-02T14:05Z  | Code Reviewer | Round 2 APPROVED_WITH_COMMENTS (H1 resolved, M1 resolved, H2 deferred to UAT-176); Status → Code Review Approved |
| 2026-08-02T14:20Z  | QA | 14/14 tests pass; type-check clean; delta lint clean; TDD compliance valid; Status → QA Complete |
| 2026-08-02T14:25Z  | UAT | Value delivery confirmed against plan statement and acceptance criteria; Status → UAT Approved |

## Value Statement and Business Objective

**As a** user who is not logged in and interacts with the UFlow chatbot,
**I want to** see a clear, context-appropriate message telling me I need to log in to use the chatbot,
**so that** I understand what to do next and am not confused by an irrelevant message about registering a restaurant.

## Objective

Fix two issues surfaced by analysis 197:

1. **F4 (copy bug)**: The chat widget shows a hardcoded, restaurant-specific auth-required message ("Um ein Restaurant zu registrieren, musst du angemeldet sein") for *any* auth error — misleading when the user asked for a recommendation or any non-registration intent.
2. **F3 (hardening)**: `getUserFromCookie()` suppresses all diagnostic logging outside `NODE_ENV === 'development'`, making auth failures on UAT/prod invisible. Add a lightweight, non-PII auth-outcome log keyed by correlation ID.

## Decision Record

| #  | Decision                                                                                   | Status     |
| -- | ------------------------------------------------------------------------------------------ | ---------- |
| D1 | Replace the hardcoded restaurant auth message with a generic, i18n-sourced message         | [RESOLVED] — the current text is factually wrong for most intents; generic text is correct |
| D2 | Add chat-specific i18n keys under a new `chat` namespace in `de.ts` and `en.ts`, consumed via the existing `useLanguage()`/`t()` hook (`@/providers/LanguageProvider`) | [RESOLVED] — **Option B** (per critique 197 M1): the codebase's i18n mechanism is the `useLanguage()`/`t()` hook, not direct file access. This card becomes the first localized string in the chat feature (rest is hardcoded German per UAT 176); full chat i18n remains a separate future effort tracked in UAT 176. Partial-i18n is an accepted tradeoff to keep this fix correct and forward-compatible. |
| D3 | Add a structured, standalone auth-outcome log in `getUserFromCookie()` for all environments | [RESOLVED] — **Revised** (per critique 197 M2): `getUserFromCookie()` takes no params and has no access to the route's `ctx.correlationId`, so the log is NOT correlation-ID-keyed. It emits a standalone reason code. The route already returns `X-Correlation-ID` on the 401 response, which is sufficient for request-level triage; aggregate reason counts come from this log. Non-PII, minimal overhead. |
| D4 | Do NOT clear stale cookies on 401 (originally suggested in analysis F3)                    | [RESOLVED] — clearing httpOnly cookies from a route handler requires a mutable response; the current return-early pattern makes this awkward and YAGNI for now |
| D5 | Scope: only `ChatWidget.tsx`, `getUserFromCookie.ts`, `de.ts`, `en.ts` (+ any ChatWidget test mock for `LanguageProvider`) | [RESOLVED] — smallest surface for the fix; no schema, no migration, no deployment changes |

## Release Strategy

Release Strategy: Standalone (no other known plans for this version).

## Assumptions

1. The codebase's i18n mechanism is the custom `useLanguage()` hook from `@/providers/LanguageProvider`, which returns a `t(key)` function reading dot-notation keys from `src/translations/{de,en,...}.ts`. (Corrected per critique 197 M1 — it is NOT `next-intl` nor direct file access.) The chat feature currently imports none of this and is 100% hardcoded German (UAT 176 §2.3).
2. `getUserFromCookie()` is the sole auth gate for `/api/chat` (confirmed by analysis 197 F1) and takes no parameters (no access to the route correlation ID).
3. No other chat UI components render this same hardcoded auth-required message (confirmed by grep — only `ChatWidget.tsx`).
4. `ChatWidget` renders within the app's `LanguageProvider` (app shell provider tree), so `useLanguage()` is safe to call there. Any unit test that renders `ChatWidget` must mock `@/providers/LanguageProvider` following the established pattern in existing tests.

## Plan

### Milestone 1 — Fix auth-required copy in ChatWidget (F4)

**Objective**: Replace the hardcoded restaurant-specific auth message with a generic, i18n-sourced message that applies to any chat interaction.

**Files**: `src/features/chat/components/ChatWidget.tsx`, `src/translations/de.ts`, `src/translations/en.ts`

**Tasks**:
1. Add chat-specific i18n keys for the auth-required card (title, body, action label) under a new `chat` namespace in **all** locale files that the project keeps in sync (at minimum `de.ts` and `en.ts`; follow the repo convention for the other locales — `ar`, `tr`, `ur`, `ps` — using German or English fallback text if native copy is unavailable, consistent with how prior plans added keys).
2. Import and use the `useLanguage()` hook in `ChatWidget.tsx`; replace the three hardcoded strings in the auth-required error branch with `t('chat.<key>')` calls.
3. The generic message should say something like "Um den Chatbot zu nutzen, musst du angemeldet sein" (DE) / "You must be logged in to use the chatbot" (EN) — not reference restaurants.
4. Update any existing unit test that renders `ChatWidget` to mock `@/providers/LanguageProvider` per the established pattern (see e.g. `src/__tests__/regression/plan123-navbar-auth-state.test.tsx`). If no such test exists yet, the new test in the Testing Strategy provides the mock.

**Acceptance**:
- Auth-required error card shows a generic chat-login message, not a restaurant-registration message.
- Strings sourced via `useLanguage()`/`t()`, not hardcoded.
- Keys present in `de.ts` and `en.ts` (and other locale files per repo convention).
- No visual regression in the other two error branches (unavailable / generic error).
- `ChatWidget` still renders without throwing (i.e. `useLanguage()` resolves within the provider tree; tests mock it).

### Milestone 2 — Add auth-outcome logging in getUserFromCookie (F3-partial)

**Objective**: Emit a structured, non-PII log line when `getUserFromCookie()` returns null on non-development environments, so that auth failures on UAT/prod are diagnosable via server logs.

**Files**: `src/lib/supabase/getUserFromCookie.ts`

**Tasks**:
1. At each `return null` path in `getUserFromCookie()`, add a `console.warn` (not gated by `NODE_ENV === 'development'`) that logs a structured object with:
   - `event: 'auth_outcome'`
   - `result: 'no_user'`
   - `reason`: a code identifying which return path fired. `getUserFromCookie()` has **four** `return null` sites, so map reasons to those actual sites (per critique 197 L1):
     - SSR-client returned no user and fell through → `ssr_client_no_user`
     - No `sb-access-token` cookie → `no_access_token_cookie`
     - Missing Supabase env vars → `missing_env_vars`
     - Supabase `/auth/v1/user` not OK after (optional) refresh → `auth_api_error`. If distinguishing an expired-token-with-failed-refresh is cheap at that shared site, use `token_expired_refresh_failed` when a refresh was attempted and still failed; otherwise `auth_api_error`.
     - The `catch` (network/fetch failure) → `fetch_error`
   - **NO** tokens, user IDs, emails, or other PII. Do **not** attempt to include a correlation ID (not available in this function — see D3).
2. Keep the existing development-only `console.log`/`console.error` calls for detailed debugging — the new log is additive, not a replacement.

**Acceptance**:
- On UAT, a 401 from `/api/chat` produces a server-side `auth_outcome` log line with a `reason` code.
- No PII in the log; no correlation ID claimed.
- Existing development-mode verbose logging unchanged.

### Milestone 3 — Version Management

**Objective**: Update version artifacts for the patch release.

**Tasks**:
1. Bump `package.json` version to the confirmed patch number.
2. Add CHANGELOG entry documenting: chat auth-required copy fix, auth-outcome logging.
3. Commit message references Plan 197.

**Acceptance**:
- `package.json` version matches the release target.
- CHANGELOG reflects both changes.

## Testing Strategy

- **Unit**: Verify the `ChatWidget` auth-required branch renders the correct (generic) text, not the restaurant text. The test must mock `@/providers/LanguageProvider` (per the established pattern) so `t()` resolves. Verify the new `chat.*` translation keys exist in `de.ts` and `en.ts`.
- **Integration**: Manual verification that a 401 on `/api/chat` (unauthenticated) shows the correct card and produces a server-side `auth_outcome` log line.
- **Regression**: Confirm the other two error branches (unavailable, generic) are unchanged, and that `ChatWidget` renders without throwing after the `useLanguage()` introduction.

## Duration Estimates

| Phase          | Estimate   | Uncertainty |
| -------------- | ---------- | ----------- |
| Implementation | 30–60 min  | Low — small, well-scoped changes |
| QA             | 15–30 min  | Low — manual + unit test |
| DevOps         | 15 min     | Low — standard patch |

## Risks

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| `useLanguage()` introduced into `ChatWidget` breaks an existing test that doesn't mock `LanguageProvider` | Low | Low | Task 4 of M1 updates/mocks `LanguageProvider` per the established test pattern |
| Partial i18n: one localized card in an otherwise-German chat feature | Accepted | Low | Deliberate tradeoff (D2); full chat i18n tracked separately in UAT 176 |
| Auth-outcome logs too noisy on prod (public endpoint, L2) | Low | Low | `console.warn` only on `return null` paths — low frequency; can be downgraded later |

## Validation

- Verify on local dev: open `/chat` while logged out → auth-required card shows generic message.
- Verify server logs contain `auth_outcome` line with a `reason` field.

## Handoff Notes

- Analysis doc: `agent-output/analysis/closed/197-chat-401-auth-determination.md`
- Critique: `agent-output/critiques/197-chat-auth-copy-hardening-critique.md` (M1 resolved via Option B; M2 resolved by dropping correlation-ID claim; L1/L2 acknowledged)
- The only file with the hardcoded restaurant text is `src/features/chat/components/ChatWidget.tsx` (~L97–L105).
- i18n is the `useLanguage()`/`t()` hook from `@/providers/LanguageProvider`; the chat feature currently uses none — this card is the first localized string there.
- `getUserFromCookie.ts` has 4 distinct `return null` paths; map reason codes to those actual sites (see M2 task 1). The route already returns `X-Correlation-ID` on the 401, so the function-level log is standalone (no correlation ID).
