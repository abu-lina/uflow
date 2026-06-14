---
ID: 176
Origin: 176
UUID: edfb7973
Status: Active
---

# UAT Validation: UFlow Chatbot Feature (Plan 176)

## Changelog
| Date | Agent | Change |
|------|-------|--------|
| 2026-06-14 | UAT | Initial UAT validation. Source files read, all scenarios walked through, UX assessed, verdict rendered. |

---

## 1. User Journey Walkthrough

### Scenario A: Hungry User Exploring Food

**Path: "Ich suche einen guten Döner in Berlin"**

| Step | Action | Expected | Actual (from code) | UX Assessment |
|------|--------|----------|--------------------|---------------|
| 1 | User opens app on mobile | Sees chat icon instead of "+" | ✅ Chat tab replaces Create in `MobileFooterBar.tsx:25-30`. ChatIcon renders chat bubble SVG. | Nav bar clean. Chat is distinct (onClick, not Link). |
| 2 | User taps Chat icon | Full-screen modal opens | ✅ `MobileFooterBar.tsx:110-128`: `inset-0 z-[60]`, teal header w/ title + X close button. | Properly isolated. `md:hidden`. |
| 3 | First-time experience | Welcome greeting | ✅ `ChatWidget.tsx:21-44`: teal-100 bubble icon, "UFlow Assistant" heading, German welcome text. | Clean and friendly. Hardcoded German (L2). Max-width 280px. |
| 4 | User types query | Message input + send button | ✅ `ChatInput.tsx`: rows=1 textarea, placeholder "Nachricht schreiben...", Enter to send, Shift+Enter newline. Send button teal arrow SVG, disabled when loading/empty. | aria-labels present. German-only placeholder (L2). |
| 5 | Sending message | Right-aligned teal bubble | ✅ `ChatMessage.tsx:33-35`: `bg-teal-600 text-white rounded-br-none`. | Clear visual distinction user (teal/right) vs assistant (gray/left). |
| 6 | Typing indicator | Animated dots | ✅ `ChatMessage.tsx:13-24`: 3 bounce dots w/ staggered 0/150/300ms delays. | Smooth CSS animation. `data-testid="typing-indicator"`. |
| 7 | LLM calls search_providers | Fetches from DB | ✅ `tool-executor.ts:200-223`: `search_providers_chat` RPC. JSON results with provider_ids, names, badges, HALAL level. | Postgres tsvector search. GIN-index compatible. |
| 8 | **Results presented** | **Structured ProviderCards with links** | ❌ **CRITICAL GAP (L1)** — `useChat.ts:49-52` ignores `data.results` field entirely. Assistant message = `{ content: data.message.content }` (plain text only). `ProviderCard.tsx` exists but is never rendered by `ChatMessage` or `ChatWidget`. | **Users see plain text, not clickable cards. No links to provider pages. The primary exploration reward is missing.** |
| 9 | User drills into details | "Zeig mir das erste" | ✅ LLM calls `get_provider_details` → `getProviderById()` service. Returns structured JSON. | Works but user sees LLM-summarized text, not rich data. |

**Desktop**: `ChatFloatingWidget.tsx` — bottom-right FAB (56x56px teal circle). Expands to 400x600px panel with embedded ChatWidget. Same ProviderCard gap applies.

**Scenario A Verdict**: ⚠️ CONDITIONAL. Flow works end-to-end but the user's primary reward — discovering and clicking through to providers — is absent. ProviderCard never renders. This fundamentally undermines the chatbot's value vs the existing search UI.

---

### Scenario B: User Registering Their Restaurant

**Path: "Ich möchte mein Restaurant registrieren" → multi-turn → submission**

| Step | Action | Expected | Actual | Assessment |
|------|--------|----------|--------|------------|
| 1 | User states intent | Bot starts guided flow | ✅ `system-prompt.ts:44-57`: 9-step addendum (name → city → category → description → contact → flags → halal → summary → confirm). | Well-structured prompt. One question at a time. |
| 2 | City validation | Check against DB | ✅ `tool-executor.ts:296-298`: `checkCityExists()`. Throws on invalid city. | Works. Error propagates to LLM for retry. |
| 3 | Category selection | List categories, match user input | ✅ `tool-executor.ts:256-273`: ILIKE on `public.categories`. | ILIKE fine for small table. ILIKE on `name_de` only (no English match). |
| 4 | Field collection (6-8 turns) | Each answer in context | ✅ LLM tracks via full conversation history (20 messages). | Natural. Depends on LLM adherence. |
| 5 | Summary + confirmation | "Here's a summary. Confirm to submit." | ✅ System prompt: "Only call register_provider after user CONFIRMS." | Good UX guard. |
| 6 | Submission | Provider created with `pending` | ✅ `tool-executor.ts:301-323`: `createProviderOrService()` with `review_status: 'pending'`. Uses `as never` casts (H2). | Enters admin review queue. Hidden from public search. |
| 7 | Confirmation message | "Submitted for review" | ✅ Returns `{ success: true, provider_id, review_status: 'pending' }`. | Clear. |
| 8 | **Duplicate check** | **Warn on similar name + city** | ❌ **MISSING** — Plan specified it. Not implemented in `tool-executor.ts`. | Accidental duplicates possible. |

**Registration Verdict**: ⚠️ CONDITIONAL (H2, missing dupe check). Happy path works. Registration submits correctly. But `as never` casts at `tool-executor.ts:320-321` bypass TypeScript safety — silent runtime breakage if `createProviderOrService` interface changes. Duplicate detection absent.

---

### Scenario C: Off-Topic Guardrail

**Path: Weather → redirect. User persists → ???**

| Step | Action | Expected | Actual | Assessment |
|------|--------|----------|--------|------------|
| 1 | "What's the weather?" | Tier 1 redirect | ✅ System prompt defines scope. LLM has no weather tool. `checkGuardrail()` detects text-only → `{ status: 'redirect', count: 1 }`. | Works for single query. |
| 2 | "Tell me about politics" | **Tier 2 hard block** | ❌ **BROKEN (H1)** — `createRedirectCounter()` at `route.ts:139` creates fresh `{ count: 0 }` per HTTP request. Step 2 count = 1 again, never reaches `MAX_CONSECUTIVE_REDIRECTS=2`. | **Tier 2 cross-request escalation never triggers.** |
| 3 | Valid exploration query | Guardrail = "ok" after tool calls | ❌ **FALSE POSITIVE (H1)** — After tool-call loop, LLM's final text summary has no `tool_calls`. `checkGuardrail()` at line 207 flags it as `redirect`. Valid conversations get `guardrail: 'redirect'` in response. | Adds noise. Confusing for any client-side guardrail UI. |
| 4 | Block UX (if triggered) | Friendly hard-block message | ✅ Content replaced: "I can only help you find and register services on UFlow." | Message is clear. In practice never shown (H1). |

**Guardrail Verdict**: ⚠️ CONDITIONAL. Tier 1 works. Tier 2 is architecturally broken — the counter is request-scoped rather than session-scoped. False positives on valid conversations add noise. A determined user can ask off-topic indefinitely with only gentle redirects.

---

## 2. Business Value Assessment

### 2.1 Does the chatbot make finding providers easier than current search?

**Current state: NO, but the foundation is solid.**

| Dimension | Current Search UI | Chatbot (current code) | Chatbot (L1 fixed) |
|-----------|-------------------|----------------------|---------------------|
| Input | Form fields | Natural language ✅ | Natural language ✅ |
| Results | Grid of ProviderCards with links | **Plain text only (L1)** ❌ | Structured ProviderCards ✅ |
| Drill-down | Click card → detail page | Text description → manual search ❌ | Clickable cards ✅ |
| Complex filtering | Multiple dropdowns | Single sentence ✅ | Single sentence ✅ |
| Multi-turn refinement | Repeat form search | Clarifying questions ✅ | Clarifying questions ✅ |

Natural language querying works. But plain-text results mean the user gets no actionable next step. They read a description, memorize a provider name, and go search for it manually elsewhere. This is **worse** than the existing search UI for result consumption.

**Value after L1 fix**: Chatbot becomes superior for complex filtered queries (3+ filters in one sentence) and conversational-preference users. For simple name searches, the existing grid UI stays faster.

### 2.2 Does the registration flow reduce friction?

**Modest improvement.** Conversational collection is friendlier for non-technical users. But the `/create` form has visual guidance (maps, category icons, image upload) that chat can't replicate. Chat registration can't accept images. The two flows complement — chat for quick text-only, form for visual + image.

### 2.3 Is German language support adequate?

**LLM-level: YES.** System prompt: "Respond in the same language as the user." GPT-4o-mini handles German well.

**UI-level: NO.** All UI strings are hardcoded German (L2):

| Component | String | Language |
|-----------|--------|----------|
| ChatWidget welcome | "Ich helfe dir..." | German only |
| ChatInput placeholder | "Nachricht schreiben..." | German only |
| ChatFloatingWidget labels | "Chat öffnen" / "Chat schließen" | German only |
| Error message | "Entschuldigung, ein Fehler..." | German only |
| Nav bar label | "Chat" | Neutral |

English-speaking users get English LLM responses inside a German UI shell. The codebase has a `useLanguage()`/`t()` i18n pattern (used in `RootClientLayout.tsx:39`) but it was not applied to chatbot components.

### 2.4 Is chat history useful?

**API-level: YES.** Persisted via `conversations` + `messages` tables with RLS. Last 20 messages as context. GDPR delete endpoint (soft delete via `is_active = false`).

**UI-level: NO (M4).** `useChatHistory` hook never implemented. Users cannot browse past conversations, resume a chat, or delete from UI. Each new session starts fresh — `conversationId` held in React state, lost on navigation.

**Impact**: User leaves chat mid-conversation → context lost. Returns → blank welcome screen. Data stored but inaccessible.

---

## 3. UX Quality Findings

### 3.1 Loading States

| State | Implementation | Score |
|-------|---------------|-------|
| LLM response pending | ✅ Typing indicator: 3 animated dots in gray bubble. `ChatWidget.tsx:56-62`. | Good |
| Message sending | ✅ Input + button disabled with `opacity-50 cursor-not-allowed`. | Good |
| History loading | ❌ N/A — no history UI (M4). | — |
| Initial page load | ✅ Welcome screen renders immediately. No loading flash. | Clean |

### 3.2 Error States

| Error | Implementation | Score |
|-------|---------------|-------|
| API 5xx (LLM down) | ✅ `ChatWidget.tsx:67-72`: red box w/ "Entschuldigung" + specific error. `route.ts:265-269`: 503. | Adequate. **No retry button** (plan specified one). |
| API 401 (unauthenticated) | ⚠️ 401 "Authentication required". `useChat.ts` catches → shows in red box. **No login prompt/redirect.** | Poor. User sees error without resolution path. MobileFooterBar requires auth context — should redirect to login. |
| API 429 (rate limit) | ✅ "Rate limit exceeded" / "Daily message limit reached". | Adequate. |
| Network failure | ✅ `useChat.ts:55-58` catches generically. | Adequate. **No retry button.** |
| Empty results | ⚠️ LLM handles via system prompt ("say so honestly if no results"). No visual distinction in frontend. | Acceptable (LLM-managed). |
| Guardrail block | ✅ Content replaced with scoped message. | Works in code. Never triggered (H1). |

### 3.3 Empty State (First-Time Chat)

`ChatWidget.tsx:21-44`: teal-100 circle with 28x28 SVG chat icon, "UFlow Assistant" heading, German welcome text explaining capabilities. Clean, friendly, teal-brand-consistent. **Missing**: no example queries to guide first-time users ("Try: 'Finde halal Restaurants in Berlin'").

### 3.4 Accessibility

| Criterion | Status | Details |
|-----------|--------|---------|
| ARIA labels on interactive elements | ✅ | Input, send button, FAB open/close all labeled. |
| Semantic HTML | ⚠️ | `<p>` for content is fine. No `<article>`/`<section>` landmarks on chat panel. No heading hierarchy beyond h3. |
| Keyboard navigation | ⚠️ | Input/send/FAB/close work with keyboard. No message navigation. No focus trap in modal. |
| Screen reader | ⚠️ | No `aria-live` region for new messages. No `role="status"` on typing indicator. `data-role` attributes help but aren't ARIA. |
| Focus management | ⚠️ | No `autoFocus` on input when modal opens. User must tap. Focus not trapped in modal. |
| Color contrast | ✅ | Teal `#589D96`/white, `text-red-700`/`bg-red-50` all pass. |

### 3.5 Mobile Experience

| Aspect | Assessment |
|--------|-----------|
| Full-screen modal | ✅ `inset-0 z-[60]`. No scroll bleed. Teal header matches brand. |
| Touch targets | ⚠️ Send button 40x40px (below 44px minimum). Chat nav icon 40x40px. Close button 32x32px. Slightly below WCAG 2.5.5 target size. |
| Keyboard viewport | ⚠️ No `visualViewport` API handling. `flex-1 overflow-y-auto` may not shrink on iOS keyboard open. Not verifiable from code alone. |
| Nav integration | ✅ Chat is proper tab. Replaces Create. Teal active state when chat open. |

### 3.6 Desktop Experience

| Aspect | Assessment |
|--------|-----------|
| FAB visibility | ✅ `hidden md:block`, `fixed bottom-6 right-6 z-50`. |
| FAB button | ✅ 56x56px teal circle, shadow, hover transition. |
| Widget panel | ✅ 400x600px, max-height calc(100vh - 100px), rounded-2xl, shadow-2xl. |
| Window resize | ⚠️ Fixed 400x600px. On 768px-wide viewport, widget is 52% of screen width. |
| Multi-page persistence | ⚠️ `ChatWidget` remounts on navigation (in `RootClientLayout`). Chat state lost on page change. |

---

## 4. Go-Live Risk Assessment

### 4.1 Risk Matrix

| # | Risk | Likelihood | Impact | Mitigation | Residual |
|---|------|-----------|--------|------------|----------|
| R1 | OpenRouter API down | Low | High — chatbot unavailable | 503 error. Search/registration form remain. | Medium — first impression failure may deter return. |
| R2 | PII entered in chat | Medium | High — GDPR | System prompt suggests redirect. No technical block. PII flows to OpenRouter + stored in `messages.content`. | High — prompt is suggestion, not guard. Privacy policy update mandatory. |
| R3 | Cost unsustainable | Low | Medium — $16/mo at 1K convos/day | Rate limits (20/min, 200/day). Token tracking. Model locked to gpt-4o-mini. | Low — costs linear with usage. |
| R4 | LLM hallucination | Medium | High — false info | System prompt: "never invent data." Tool-call-gated: all data from DB. No internet tools. ProviderCard (post-L1) renders from structured data, not LLM text. | Medium — LLMs embellish. Structured rendering (L1) is key mitigation. |
| R5 | Guardrail bypass | Medium | Medium — off-topic abuse | Tier 1 works. Tier 2 broken (H1). | High — no escalation mechanism for persistent abuse. Costs may increase from free-LLM usage. |
| R6 | Chat state loss on navigation | High | Medium — poor UX | None. `conversationId` in React state, not persisted. `ChatWidget` remounts on page nav. | Medium — frustrates users who navigate while chatting. |
| R7 | Registration silent breakage | Low (today) | High (after schema change) | None. `as never` bypasses all type safety (H2). | High — will break silently when `createProviderOrService` interface changes. |
| R8 | First-time user abandonment | Medium | Medium | Welcome message explains scope. No example prompts. No guided first interaction. | Medium — users may not know what to ask. |
| R9 | English user exclusion | Medium | Medium | LLM responds in English. UI is German-only (L2). | Medium — German-speaking majority, but English users get broken experience. |
| R10 | Token count inaccuracy | High (certain) | Low — monitoring gap | M1: intermediate tool-call usage discarded. M3: stored on user row instead of assistant. | Low — cost tracking unreliable but costs are low anyway. |

### 4.2 Worst-Case Scenario: LLM API Down

The chatbot returns 503 with "Chat service temporarily unavailable." The `ChatFloatingWidget` FAB remains visible. Tapping it opens the chat, user types, gets error. The existing search UI (`/providers`, `/food`) and registration form (`/create`) continue working. **Users who rely on chat for provider discovery have no fallback in the chat UI itself** — there's no link to '/providers' or '/create' from the error state.

### 4.3 What Breaks First at 10x Traffic?

1. OpenRouter rate limits (200 req/min free tier) — our app-side rate limit (200/day/user) at N users may exceed OpenRouter's limit
2. Token cost goes from ~$16/mo to ~$160/mo — still cheap but needing monitoring
3. Supabase RPC `search_providers_chat` — additional LEFT JOIN on `food_providers` adds query cost per message
4. Conversation table growth — 10K messages/day, 3.6M messages/year. No archiving strategy in place.

---

## 5. Gap Analysis: "It Works" vs "Users Love It"

| # | Gap | Current State | What Users Need | Priority |
|---|-----|--------------|-----------------|----------|
| G1 | **ProviderCard rendering (L1)** | Plain text results. No links. | Clickable cards with badges, city, halal level. Link to `/providers/[id]`. | **P0 — release blocker** |
| G2 | **Tier 2 guardrail (H1)** | Counter resets per request. Never blocks. | Session-scoped counter (conversations table). 2 redirects → hard block. | **P0 — security/abuse** |
| G3 | **Type-safe registration (H2)** | `as never` bypasses type checking. | Typed adapter function `mapChatArgsToFormData()`. | **P0 — robustness** |
| G4 | Conversation history UI (M4) | API ready, no client UI. | Sidebar/drawer listing past conversations. Resume/delete. | P1 — post-MVP |
| G5 | i18n UI shell (L2) | All strings hardcoded German. | `useLanguage()`/`t()` for all UI strings. English + German. | P1 — post-MVP |
| G6 | Error retry + login redirect | Red box shows error. No retry or login path. | Retry button on errors. Login prompt with redirect for 401. | P1 — post-MVP |
| G7 | Tool-loop message persistence (M2) | Only user + final assistant saved. | Persist all assistant+tool messages for conversation continuity. | P2 — data integrity |
| G8 | Token accounting fixes (M1, M3) | Undercounted, stored on wrong row. | Accumulate across loop. Store on assistant row. | P2 — monitoring |
| G9 | Example prompts | Welcome screen is static text. | "Try: Finde halal Restaurants in Berlin" — clickable example prompts. | P2 — onboarding |
| G10 | Accessibility improvements | No live region, no focus trap, no autoFocus. | `aria-live="polite"` for new messages. `autoFocus` on input. Focus trap in modal. | P2 — a11y |
| G11 | Duplicate registration check | Not implemented. | `searchProviders()` check before submission. | P2 — data quality |
| G12 | ChatFloatingWidget tests (L3) | No test file. | Tests for mobile/desktop visibility, expand/collapse. | P3 — test coverage |
| G13 | Chat state persistence | Lost on navigation. | Persist `conversationId` in URL or sessionStorage. Restore on mount. | P3 — UX polish |

---

## 6. Recommendations: Post-MVP Improvements

### 6.1 Immediate (Release Blockers)

| # | Action | Files | Effort |
|---|--------|-------|--------|
| 1 | Wire `ChatResponse.results` field to `ProviderCard` components in `ChatWidget` / `ChatMessage`. Create `ChatResultMessage` variant that renders `<ProviderCard provider={...} />` for each result. | `ChatWidget.tsx`, `ChatMessage.tsx`, `useChat.ts` | 2-3 hours |
| 2 | Store `redirect_count` on `conversations` table. Load on conversation fetch, increment on text-only response in tool loop, reset on tool call. Move guardrail check INSIDE tool loop, not after. | `guardrails.ts`, `route.ts`, migration | 3-4 hours |
| 3 | Replace `as never` with typed adapter `mapChatArgsToFormData(args, userId)`: define local interface matching `createProviderOrService`'s actual shape, map fields explicitly. | `tool-executor.ts` | 1-2 hours |
| 4 | Add duplicate check before registration submission. | `tool-executor.ts` | 1 hour |

### 6.2 Short-Term (Within 2 Weeks of Launch)

| # | Action | Why |
|---|--------|-----|
| 5 | Implement `useChatHistory` hook + conversation list sidebar/drawer | Users need to resume chats. Data already exists. |
| 6 | Add `useLanguage()`/`t()` i18n to all chatbot UI strings | English users deserve their language in the UI shell. |
| 7 | Add retry button to error states | Avoids manual retype. |
| 8 | Add login redirect for 401 errors | Currently a dead end for unauthenticated users. |
| 9 | Add 3 example prompts under welcome message | Guides first-time users. Reduces "what do I ask?" confusion. |

### 6.3 Medium-Term (Post-Launch Polish)

| # | Action | Why |
|---|--------|-----|
| 10 | Fix token counting (M1, M3): accumulate across tool loop, store on assistant row | Accurate cost tracking. Currently unreliable. |
| 11 | Persist tool-loop messages to DB (M2) | Restore conversation continuity on reload. |
| 12 | Add `aria-live="polite"` region + `autoFocus` on chat input | Screen reader announcements. Better mobile UX. |
| 13 | Add `focus-trap` in chat modal | WCAG compliance. |
| 14 | Replace regex-based `sanitizeOutput` with nothing (rely on React escaping) or DOMPurify | Current sanitizer provides false confidence (M5). |
| 15 | Use typed error classes instead of `message.includes('fetch')` | Reliable error classification (M6). |

### 6.4 Monitoring Setup

- **Daily**: `SELECT SUM(token_count) FROM messages WHERE created_at > now() - interval '1 day'` for cost estimation
- **Weekly**: Count conversations created, messages sent, unique users. Track guardrail `redirect`/`block` counts.
- **Monthly**: Review OpenRouter billing. Check for jailbreak attempts (users with 5+ consecutive text-only responses).

---

## 7. UAT Verdict

```
UAT VERDICT: APPROVED WITH CONDITIONS

The chatbot feature is architecturally sound, well-tested (63/63 pass, tsc clean),
and delivers the foundations for natural language provider discovery and registration.
Three of five acceptance criteria pass, two are conditional (AC 3 guardrails, AC 5
registration), and the core exploration UX is incomplete (L1).

CRITICAL FIXES REQUIRED BEFORE PRODUCTION RELEASE:
  G1 — ProviderCard rendering: Wire ChatResponse.results to ProviderCard components
       (without this, the chatbot provides less value than the existing search UI)
  G2 — Tier 2 guardrail escalation: Store redirect counter in conversations table
  G3 — Type-safe registration: Replace as never with typed adapter

BLOCKING QA/UAT GATES:
  - AC 1 (Low cost): ✅ PASS
  - AC 2 (Database-only data): ✅ PASS  
  - AC 3 (Guardrails): ⚠️ CONDITIONAL — Tier 1 works; Tier 2 needs G2.
  - AC 4 (Multi-turn): ✅ PASS (M2 tool-persistence caveat is non-critical)
  - AC 5 (Exploration + Registration): ⚠️ CONDITIONAL — Exploration needs G1.
    Registration needs G3. Both flows are functionally correct but incomplete.

PRODUCTION READINESS: NOT YET — G1, G2, G3 must be resolved first.

POST-MVP RECOMMENDATIONS: G4-G13 (see Gap Analysis §5). All are quality-of-life
improvements. None block MVP if G1-G3 are addressed.
```

### Acceptance Criteria Summary

| # | Criterion | Verdict | Notes |
|---|-----------|---------|-------|
| 1 | Chatbot costs are low or free | ✅ PASS | GPT-4o-mini locked. ~$0.0005/conversation. Rate limits. Token tracking (imprecise but adequate for cost class). |
| 2 | Only uses database data | ✅ PASS | All 5 tools query Supabase. No internet/web-search tools. `review_status = 'approved'` filter. |
| 3 | Off-topic guardrails | ⚠️ CONDITIONAL | Tier 1 (system prompt) works. Tier 2 cross-request escalation broken (H1). False positive on valid conversations. G2 fix required. |
| 4 | Multi-turn interaction | ✅ PASS | 20-message context window. Tool call loop with max 5 iterations. LLM asks clarifying questions. M2 caveat (tool-loop messages not persisted) is non-blocking for MVP. |
| 5 | Exploration + registration flows | ⚠️ CONDITIONAL | Exploration: tool calls work, but results render as plain text (L1). Registration: happy path works, `as never` risks silent breakage (H2). Duplicate check missing. G1 + G3 fixes required. |

### Severity Count

| Severity | Count | Blocks Release |
|----------|-------|---------------|
| **CRITICAL (G1-G3)** | 3 | **Yes** |
| HIGH post-MVP (G4-G6) | 3 | No |
| MEDIUM post-MVP (G7-G11) | 5 | No |
| LOW post-MVP (G12-G13) | 2 | No |

### Feature Scorecard

| Dimension | Score (1-10) | Notes |
|-----------|-------------|-------|
| Core functionality correctness | 7/10 | All tools execute correctly. 63 tests pass. Flows work end-to-end. |
| User experience | 4/10 | Plain-text results kill exploration value. No conversation history. German-only UI. |
| Robustness / error handling | 5/10 | Error states exist but lack retry/login paths. `as never` fragile. Tier 2 broken. |
| Accessibility | 5/10 | ARIA labels present. Missing live region, focus trap, autoFocus. |
| Cost efficiency | 9/10 | Locked to cheapest model. Rate limits. Token tracking. ~$16/mo at 1K conversations/day. |
| Security / guardrails | 4/10 | Tier 1 works. Tier 2 broken. PII flows to OpenRouter. XSS sanitizer is cosmetic. |
| Architecture / patterns | 9/10 | Follows all codebase conventions. Postgres-first. RLS correct. Telemetry thorough. |
| **Overall** | **6.2/10** | Solid foundation. UX gaps prevent delivering the intended value. |

---

## Appendix A: Source Files Reviewed

| File | Lines | Purpose |
|------|-------|--------|
| `src/features/chat/components/ChatWidget.tsx` | 78 | Main chat panel: messages, welcome, error |
| `src/features/chat/components/ChatMessage.tsx` | 45 | Message bubble: user/assistant/tool/typing |
| `src/features/chat/components/ChatInput.tsx` | 71 | Input + send button |
| `src/features/chat/components/ProviderCard.tsx` | 54 | Provider result mini-card (unused) |
| `src/features/chat/components/ChatFloatingWidget.tsx` | 52 | Desktop FAB + expandable panel |
| `src/features/chat/components/ChatToggleButton.tsx` | 21 | Mobile nav button (defined but MobileFooterBar inlines instead) |
| `src/features/chat/hooks/useChat.ts` | 73 | Chat state management + API fetch |
| `src/features/chat/services/guardrails.ts` | 47 | Guardrail logic: Tier 1+2 + counter |
| `src/features/chat/services/tool-executor.ts` | 345 | Tool definitions + execution (5 tools) |
| `src/features/chat/services/chat.ts` | 48 | Client fetch functions for chat API |
| `src/features/chat/services/system-prompt.ts` | 65 | System prompt templates |
| `src/features/chat/types.ts` | 152 | TypeScript types |
| `src/features/chat/prompts/system-prompt.ts` | 65 | Duplicate system prompt file |
| `src/app/api/chat/route.ts` | 287 | POST /api/chat main handler |
| `src/app/api/chat/conversations/route.ts` | 59 | GET conversation list |
| `src/app/api/chat/conversations/[id]/route.ts` | 132 | GET + DELETE single conversation |
| `src/components/common/MobileFooterBar.tsx` | 196 | Mobile nav bar with Chat tab |
| `src/components/layout/RootClientLayout.tsx` | 252 | Root layout with ChatFloatingWidget |
| `src/components/ui/icons/ChatIcon.tsx` | 32 | Chat bubble SVG icon |
| `supabase/migrations/108_chatbot_tables.sql` | 63 | Conversations + messages tables + RLS |
| `src/features/chat/types.ts` | 152 | TypeScript types |

## Appendix B: Key Code References

| Finding | File:Line |
|---------|-----------|
| ProviderCard not rendered (L1) | `useChat.ts:49-52` — ignores `data.results` |
| Tier 2 counter per-request (H1) | `route.ts:139` — `createRedirectCounter()` fresh each request |
| Guardrail false positive (H1) | `route.ts:207` — check AFTER tool loop on text-only final message |
| `as never` casts (H2) | `tool-executor.ts:320-321` — bypasses TypeScript on registration |
| Duplicate check missing | `tool-executor.ts:281-330` — no `searchProviders()` before `register_provider` |
| German-only UI (L2) | `ChatWidget.tsx:40-42`, `ChatInput.tsx:43`, `ChatFloatingWidget.tsx:17,33` |
| No conversation history UI (M4) | `src/features/chat/hooks/` — no `useChatHistory.ts` |
| No retry on error | `ChatWidget.tsx:67-72` — error box with no retry button |
| No login redirect for 401 | `useChat.ts:55-58` — generic error handling |
| Token undercounting (M1) | `route.ts:209` — only final LLM call's usage |
| Tool-loop messages not persisted (M2) | `route.ts:211-228` — only user + final assistant saved |
| Fragile error classification (M6) | `route.ts:265` — `message.includes('fetch')` |
