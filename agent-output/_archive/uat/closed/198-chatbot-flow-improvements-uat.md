---
ID: 198
Origin: 198
UUID: b7e4a1c9
Status: Released
---

# UAT Report: Chatbot Flow Improvements (Plan 198)

**Plan Reference**: `agent-output/planning/198-chatbot-flow-improvements.md`
**Date**: 2026-08-02T16:45Z
**UAT Agent**: Product Owner (UAT)

## Changelog

| Date | Agent Handoff | Request | Summary |
|------|---------------|---------|---------|
| 2026-08-02T16:45Z | QA → UAT | QA Complete — 15/15 tests pass, all gates green | UAT Complete — implementation delivers stated value; APPROVED FOR RELEASE |

## Value Statement Under Test

> "As a user of the UFlow chatbot, I want the assistant to only offer what actually exists (food), converse naturally, and keep my recommendation list when I open a result and press back, so that I can browse → inspect → return without losing context and trust the assistant enough to keep using it for discovery."

Three discrete user problems addressed:
1. **Item 1** — Dead-end options (food/business/social clarifying question)
2. **Item 2** — Machine-artifact prefix "Folgendes trifft zu: " in multi-select confirmation
3. **Item 3** — Back-navigation destroys conversation state (highest priority — broken core loop)

## Mandatory Gate Audit

| Gate | Applicable | Result |
|------|-----------|--------|
| PWA/Privacy Runtime Evidence Gate | Not applicable — not a service-worker/cross-origin fix | PASS |
| Admin Runtime Smoke Gate | Not applicable — no admin role metadata | PASS |
| UI Visual Validation Gate | Not applicable — no UI rendered from DB records modified | PASS |
| Performance Timing Gate | Not applicable — no performance targets in plan | PASS |
| **Removed Capability Discoverability Gate** | **Applicable** — M1 removes store/ummah discovery via chatbot | See assessment below |
| Focus/Scroll Side-Effects | Not applicable | PASS |
| Accordion/Typeahead Idle-State | Not applicable | PASS |
| Import Dry-Run Deferral | Not applicable | PASS |

### Removed Capability Assessment (M1)

The plan removes the 3-type clarifying question (food/business/social) and scopes the chatbot to food/restaurants only.

**Was the removed capability working?** No. Analysis F1.1 (confirmed in plan) established that the "business" and "social" branches in the 3-type question were dead ends — selecting them produced no useful results. The removed capability was a broken path, not a working feature.

**Is there still a reachable entry point for store/community discovery?** Yes — direct section navigation (`/food?section=store`, `/food?section=business`) and the main search page remain fully functional. The chatbot was not the intended primary entry for non-food sections.

**Is the scoping intentional and documented?** Yes — Plan D3: "Food-only scoping is prompt + tool-contract level, not data deletion. Store/ummah/business rows remain in the DB; the assistant simply will not offer or search them. Rationale: reversible, low-risk, avoids destructive changes."

**Entry points checked**: `ChatWidget.tsx` "Empfehlung erhalten" card → sends `sendMessage('Empfiehl mir etwas')` → now routes through food-only scope LLM. No other chatbot entry point for store/ummah discovery existed or was added.

**Gate verdict**: PASS — removal of broken capability with documented intentional scope (D3). No live entry points for store/ummah via chatbot remain that are unintentional.

## UAT Scenarios

### Scenario 1: Food-only chatbot scope (M1 — Item 1)

- **Given**: A logged-in user opens the chatbot (FAB → modal or `/chat` page) and taps "Empfehlung erhalten"
- **When**: The message "Empfiehl mir etwas" is sent to the LLM via `/api/chat`
- **Then**: The LLM responds with food/restaurant recommendations or a focused clarifying question about cuisine type — no 3-type choice menu (food/business/social)
- **Result**: **PASS**
- **Evidence**:
  - `src/features/chat/prompts/system-prompt.ts` SCOPE: "Help users discover and register restaurants on Ummah Flow"; OUT OF SCOPE includes "Stores, community services, or any other category besides restaurants/food"
  - Category DB query: `.in('applicable_section', ['food', 'all'])` — only food-applicable categories injected as context
  - Redirect copy in `route.ts` L285: "I can only help you find and register restaurants on UFlow. Please ask me about restaurants or Muslim-friendly dining near you."
  - All three M1 vectors updated consistently (prompt scope, DB filter, redirect copy)
  - Route test confirms API handler reaches the LLM with updated system prompt (9/9 `route.test.ts` tests pass)
- **Live LLM validation**: DEFERRED — see DF-1 below. Textual evidence sufficient for this gate; live confirmation expected post-deploy.

### Scenario 2: Natural conversation — no machine artifact (M2 — Item 2)

- **Given**: The chatbot presents a multi-select feature list (e.g., registration flow: Muslim-friendly features)
- **When**: User selects "Muslimisch geführt" + "Gebetsraum" and taps "Bestätigen (2)"
- **Then**: `onSelect` is called with `'Muslimisch geführt, Gebetsraum'` — no "Folgendes trifft zu: " prefix prepended
- **Result**: **PASS**
- **Evidence**: `src/__tests__/features/chat/QuickReplies.test.tsx` — `[post-fix PASSES] multi-select confirmation sends comma-joined items WITHOUT machine artifact prefix` ✅. Source confirmed: `QuickReplies.tsx confirmSelection()` no longer constructs a `prefix` variable.

### Scenario 3: Browse → inspect → return loop (M3 — Item 3, highest priority)

- **Given**: A user opened the chatbot, sent "Empfiehl mir Restaurants in Berlin", received a recommendation list, and taps a provider card to navigate to the detail page
- **When**: User presses browser Back to return to `/chat`
- **Then**: The React component remounts, `useChat()` lazy-initializes `messages` and `conversationId` from `sessionStorage` key `'uflow_chat'`, and the full recommendation list is visible without re-sending
- **Result**: **PASS**
- **Evidence**:
  - `src/__tests__/features/chat/useChat.test.ts` — `[pre-fix FAILS] restores messages from sessionStorage on remount` passes ✅ (named to show historical failure was verified before fix)
  - `src/__tests__/features/chat/useChat.test.ts` — `[post-fix PASSES] saves conversationId and messages to sessionStorage after API response` passes ✅
  - `src/features/chat/hooks/useChat.ts` lazy initializers: `useState(() => loadSession().messages)`, `useState(() => loadSession().conversationId)` — confirmed in source (Code Reviewer fix-in-review applied; lazy pattern runs only on mount)
  - `useEffect([messages, conversationId])` saves after every state change
  - Architecture: `sessionStorage` survives page-to-page navigation within the same browser tab, is cleared on tab close (correct session boundary per plan F2)

### Scenario 4: ChatFloatingWidget renders correctly (M3 hooks fix)

- **Given**: User is on any page other than `/chat` (e.g., `/food`, `/search`)
- **When**: `ChatFloatingWidget` mounts in the shared layout
- **Then**: FAB button renders — all 4 hooks (`usePathname`, `useRouter`, `useAuth`, `useState`) execute before the early return check
- **Result**: **PASS**
- **Evidence**: Code Review confirmed removal of `react-hooks/rules-of-hooks` violations from `ChatFloatingWidget.tsx` (2 violations removed, confirmed via git stash comparison); source confirmed — early return moved to after all hook calls.

### Scenario 5: No duplicate FAB on /chat page (M3 hooks fix)

- **Given**: User is on the `/chat` full-page mobile route
- **When**: `ChatFloatingWidget` mounts
- **Then**: Component returns `null` (no FAB shown — prevents duplicate chat UI on the dedicated chat page)
- **Result**: **PASS**
- **Evidence**: Source confirmed — `if (pathname === '/chat') return null` executes after all 4 hooks.

### Scenario 6: First visit — clean start (M3 session boundary)

- **Given**: User opens the app in a new tab or closes/reopens their browser
- **When**: `ChatWidget` mounts and `useChat()` initializes
- **Then**: No stored conversation is shown; `messages = []`, `conversationId = null` (fresh start)
- **Result**: **PASS**
- **Evidence**: `src/__tests__/features/chat/useChat.test.ts` — `starts fresh when sessionStorage is empty (no regression to existing behavior)` ✅. `sessionStorage` is scoped per-tab-session and cleared on tab close.

## Value Delivery Assessment

All three user problems are demonstrably resolved by the delivered code:

| User Problem | Value Delivered | Evidence Type |
|-------------|-----------------|---------------|
| Dead-end 3-type menu (Item 1) | LLM scope narrowed to food; category filter active | Source code verified |
| Machine-artifact prefix (Item 2) | Prefix removed; regression test prevents re-introduction | Automated test (QA verified) |
| Back-nav state loss (Item 3) | sessionStorage persistence; lazy init on remount | Automated test (QA verified) |

The core value statement — "browse → inspect → return without losing context" — is mechanically verified by the sessionStorage tests. The trust-building dimension (natural conversation, food-only scope) is verified by code inspection and automation respectively.

**No core value is deferred.** All three items ship in this release.

## QA Integration

**QA Report Reference**: `agent-output/qa/198-chatbot-flow-improvements-qa.md`
**QA Status**: QA Complete
**QA Findings Alignment**:

All 5 automated gates passed:
- Gate 1 (TDD Compliance) ✅
- Gate 2 (15/15 delta tests) ✅ — including 3 back-nav regression tests and 2 no-prefix regression tests
- Gate 3 (full suite: 2 failed / 227 passed, both pre-existing) ✅
- Gate 4 (`tsc --noEmit` exits 0) ✅
- Gate 5 (delta lint: no new errors; net −2 `react-hooks/rules-of-hooks` removed) ✅

**Code Review Remediation**: Code Reviewer applied one fix-in-review (lazy `useState` initializers replacing `useRef(loadSession()).current` pattern to prevent repeated `loadSession()` calls during SSE streaming). QA confirmed this does not affect test results. UAT accepts the fix as part of the delivered code.

## Technical Compliance

| Plan Deliverable | Status | Evidence |
|-----------------|--------|---------|
| M1 — Food-only LLM scope (prompt + DB filter) | ✅ Delivered | Source: `system-prompt.ts` SCOPE, `.in('applicable_section', ['food', 'all'])`, `route.ts` redirect |
| M2 — No "Folgendes trifft zu:" prefix | ✅ Delivered | Source + automated regression test |
| M2 — MULTI-SELECT ANSWERS cleaned | ✅ Delivered | Source: prefix rule removed from system-prompt.ts |
| M2 — CONVERSATION STYLE polished | ✅ Delivered | Source: CONVERSATION STYLE section updated |
| M3 — sessionStorage persistence | ✅ Delivered | Source + 3 automated tests |
| M3 — ChatFloatingWidget hooks fix | ✅ Delivered | Source + lint evidence |
| M4 — Version `0.15.2` (preliminary) | ✅ Delivered | `package.json` + lockfile aligned |
| M4 — CHANGELOG entry | ✅ Delivered | `CHANGELOG.md` Plan 198 entry under [Unreleased] |

**Known limitations**:
- `VALID_LISTING_TYPES` in `tool-executor.ts` still includes `store` and `ummah` — intentional per plan D3 (reversible; avoids breaking existing registrations)
- `streamedConvId` unused variable in `useChat.ts` — pre-existing, out of scope

## Objective Alignment Assessment

**Does code meet original plan objective?**: **YES**

**Evidence**: 
- Item 1 (dead-end options): The `SYSTEM_PROMPT_EXPLORATION` SCOPE field now explicitly limits the assistant to restaurants. The DB category injection filters `applicable_section IN ('food', 'all')`, ensuring no store/community categories are suggested. The three-vector consistency (prompt + DB + redirect copy) closes all paths to dead-end options.
- Item 2 (machine artifact): `QuickReplies.confirmSelection()` now sends plain `selectedTexts` without prefix. The `MULTI-SELECT ANSWERS` rule in the system prompt no longer references the prefix (removed). The CONVERSATION STYLE updated from "Be friendly, concise" to "Be warm, conversational, and to the point."
- Item 3 (back-nav): `useChat` persists `{messages, conversationId}` to `sessionStorage` on every state change and restores lazily on mount. The broken core loop is mechanically fixed.

**Drift Detected**: None. All three items delivered at stated scope (Tier A for Item 2 per D1). No scope creep. Version bump is preliminary pending DevOps Stage 1 confirmation.

## UAT Status

**Status**: **UAT Complete**
**Rationale**: All 6 scenarios pass. All predecessor gates (Implementation Complete, Code Review APPROVED, QA Complete) are satisfied. Value statement is demonstrably delivered. No CRITICAL/HIGH code findings. One deferred non-blocking follow-up (DF-1: live LLM validation).

## Release Decision

**Final Status**: **APPROVED FOR RELEASE**

**Rationale**: The implementation correctly and completely addresses all three reported chatbot UX issues. The highest-priority fix (M3 back-nav state loss — broken core loop) is fully automated and verified. The copy changes (M1, M2) are verified at source level with automated regression for the machine-artifact fix. Technical quality is high: no new lint errors, clean type-check, net improvement to the test suite.

**Recommended Version**: Next available patch after current `origin/main` (currently v0.15.1 → expected v0.15.2; confirm at DevOps Stage 1 via `git fetch --tags`).

**Key Changes for Changelog** (already recorded under `[Unreleased]`):
- `fixed(chat)`: Chatbot scoped to food/restaurants only — removed dead-end store/ummah options
- `fixed(chat)`: Multi-select confirmation no longer prepends "Folgendes trifft zu: " machine artifact
- `fixed(chat)`: Chat session (messages + conversationId) persisted to `sessionStorage` — Back navigation restores conversation
- `fixed(chat)`: `ChatFloatingWidget` Rules-of-Hooks violation resolved

## Deferred Follow-ups

### DF-1: Live LLM Scope Validation (M1)

- **Residual Risk**: MEDIUM — live LLM behaviour cannot be fully automated; the LLM might occasionally reference non-food categories despite the prompt restriction
- **Owner**: DevOps / on-call operator post-deploy
- **Trigger**: Within 24h of UAT deployment
- **Closure Evidence Required**: Open the chatbot on production, tap "Empfehlung erhalten", confirm the response is food-focused with no store/ummah category options. One successful cold conversation (5+ turns) sufficient.
- **Reachable in current live user flow**: YES — `ChatWidget.tsx` "Empfehlung erhalten" card is reachable by any authenticated user
- **Fallback if not met**: Revert `system-prompt.ts` SCOPE + category filter (reversible per D3); no DB changes required

*No other deferred items. M2 (machine artifact) and M3 (sessionStorage) are fully automated with no live validation residual.*

## Next Actions

Handing off to devops agent for release execution.
