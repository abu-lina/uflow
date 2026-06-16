# Code Review: Chatbot Feature (Plan 176)

**Plan Reference**: `agent-output/planning/176-chatbot-feature.md`
**Implementation Reference**: `agent-output/implementation/176-chatbot-feature.md`
**Date**: 2026-06-16
**Reviewer**: Code Reviewer
**Branch**: `feature/176-chatbot`

## Files Reviewed

- `src/features/chat/types.ts` — Chat types
- `src/features/chat/services/tool-executor.ts` — Tool definitions + execution
- `src/features/chat/services/guardrails.ts` — Guardrail logic
- `src/features/chat/services/chat.ts` — Client chat service
- `src/features/chat/prompts/system-prompt.ts` — System prompt builder
- `src/features/chat/hooks/useChat.ts` — Client chat hook
- `src/features/chat/components/ChatWidget.tsx` — Main chat widget
- `src/features/chat/components/ChatMessage.tsx` — Message bubble
- `src/features/chat/components/ChatInput.tsx` — Message input
- `src/features/chat/components/QuickReplies.tsx` — Quick reply buttons
- `src/features/chat/components/ProviderCard.tsx` — Provider result card
- `src/features/chat/components/ChatFloatingWidget.tsx` — Floating action button
- `src/features/chat/components/ChatToggleButton.tsx` — Toggle button
- `src/app/api/chat/route.ts` — Main API route handler
- `src/app/api/chat/conversations/route.ts` — Conversations list API
- `src/app/api/chat/conversations/[id]/route.ts` — Conversation detail API
- `src/lib/openrouter.ts` — Mistral/OpenRouter client + streaming
- `supabase/migrations/108_chatbot_tables.sql` — Conversations + messages tables
- `supabase/migrations/109_chatbot_rpc.sql` — `search_providers_chat` RPC
- `supabase/migrations/110_chatbot_redirect_count.sql` — Redirect count column

## Changelog

| Date | Agent Handoff | Request | Summary |
|------|---------------|---------|---------|
| 2026-06-16 | Orchestrator | Code review chatbot feature | Full review of all files |

## Architecture Alignment

**Alignment Status**: ALIGNED

Follows the feature module pattern (`src/features/chat/`), proper server/client separation, API routes in `src/app/api/`, migrations in `supabase/migrations/`. Reuses existing services (`getProviderById`, `fetchProviderCities`). Placement per rubric is correct.

## TDD Compliance Check

**TDD Table Present**: Yes
**All Rows Complete**: Yes
**Tests Found**: `useChat.test.ts`, `ChatWidget.test.tsx`, `tool-executor.test.ts`, `guardrails.test.ts`, `ChatMessage.test.tsx`, `ProviderCard.test.tsx`, `ChatInput.test.tsx`

## Findings

### CRITICAL

None.

### HIGH

None.

### MEDIUM

1. **[MEDIUM] Security**: `openrouter.ts` missing `import 'server-only'`
   - **Location**: `src/lib/openrouter.ts`
   - **Issue**: The file handles `MISTRAL_API_KEY` and `OPENROUTER_API_KEY` but lacks a `'server-only'` directive. Currently only imported by server-side route.ts, but without the directive a future refactor could accidentally import it from client code, exposing API keys.
   - **Recommendation**: Add `import 'server-only';` at the top of `src/lib/openrouter.ts`.

2. **[MEDIUM] Security**: RLS bypassed by admin client (mitigated by app-level checks)
   - **Location**: `src/app/api/chat/route.ts` and `src/features/chat/services/tool-executor.ts`
   - **Issue**: All API routes use `getSupabaseAdmin()` (service role key) which bypasses RLS. The application-level user ID checks (`.eq('user_id', user.id)`) provide protection, but RLS is not a defense-in-depth layer. If an application-level check is missed, there's no DB-level fallback.
   - **Recommendation**: Consider using the user-scoped server client (`createSupabaseServerClient()`) where possible, especially for user-owned reads. The admin client is necessary for writes (LLM responses are inserted on the server's behalf) but reads from conversations/messages could use the user-scoped client.

3. **[MEDIUM] Security**: `sanitizeOutput` regex may have bypasses
   - **Location**: `src/app/api/chat/route.ts:573-581`
   - **Issue**: The sanitization uses regex to strip `<script>`, `<iframe>`, `<object>`, `<embed>`, and `on\w+` attributes. Regex-based HTML sanitization is notoriously bypassable — e.g., `onerror` with backtick syntax, `<svg/onload=alert(1)>`, data URI in `<a href>`, or nested encodings. However, content is rendered via `ReactMarkdown` which escapes raw HTML by default, providing a second layer.
   - **Recommendation**: Add `rehype-sanitize` plugin to ReactMarkdown for defense in depth, or expand the sanitize function to handle more XSS vectors.

4. **[MEDIUM] Registration**: Mode detection only checks first message
   - **Location**: `src/app/api/chat/route.ts:231-232`
   - **Issue**: Registration mode detection checks `history.find(m => m.role === 'user')?.content` — only the first user message. If a user starts with an exploration query then later says "I want to register," the detection won't switch to registration mode.
   - **Recommendation**: Also check the current message (`trimmedMessage`) for registration keywords, not just history. Or check all messages in history, not just the first.

5. **[MEDIUM] Reliability**: `saveStreamToDb` silently swallows errors
   - **Location**: `src/app/api/chat/route.ts:68-118`
   - **Issue**: If the DB insert for messages or conversation update fails, the error is logged via `console.error` but no action is taken. The user sees a successful stream but the conversation state is lost on refresh. This is a fire-and-forget pattern with no retry or fallback.
   - **Recommendation**: Add at least one retry attempt. Consider a client-side message cache that can be replayed if the server-side save fails.

6. **[MEDIUM] Code Quality**: Unused imports in `tool-executor.ts`
   - **Location**: `src/features/chat/services/tool-executor.ts:8`
   - **Issue**: `createProviderOrService` is imported from `@/services/providerService` but not used in any function. Similarly, `checkCityExists` is imported from `@/services/providers` on line 7 but the city check is done inline with a direct Supabase query.
   - **Recommendation**: Remove unused imports. If they were intended for future use, document that intent.

7. **[MEDIUM] Code Quality**: Duplicate `GuardrailResult` interface
   - **Location**: `src/features/chat/types.ts:127-130` and `src/features/chat/services/guardrails.ts:7-10`
   - **Issue**: The same `GuardrailResult` interface is defined in two places with identical fields. This creates a maintenance risk if one is updated without the other.
   - **Recommendation**: Define `GuardrailResult` once in `types.ts` and import it in `guardrails.ts`.

8. **[MEDIUM] Streaming**: Non-streaming fallthrough path may serve stale tool calls
   - **Location**: `src/app/api/chat/route.ts:476-551`
   - **Issue**: The code at lines 476-551 (non-streaming response) appears to be partially dead code — the streaming path exits early at line 424 with a `new Response(stream, ...)`. If neither the guardrail block nor the tool-call path nor the no-tool-call-stream path executes, the response returns the original LLM message with `tool_calls: undefined` but with the tool results already incorporated into the messages array. This could return incomplete content to the client.
   - **Recommendation**: Add a final `else` that throws or returns an error if no code path matches, rather than falling through to an ambiguous response.

9. **[MEDIUM] Accuracy**: Token count attributed incorrectly
   - **Location**: `src/app/api/chat/route.ts:278-279,286-287`
   - **Issue**: Both user and assistant messages in the guardrail block path receive the same `total_tokens` from the LLM response. The user message didn't consume those tokens as output. This inflates user message token counts.
   - **Recommendation**: Set user message `token_count` to 0 or `usage?.prompt_tokens`, and assistant message to `usage?.completion_tokens`.

### LOW / INFO

10. **[LOW] Naming**: `GENERIC_TERMS` regex in `tool-executor.ts` uses `RegExp` test — could be `Set` for clarity
    - **Location**: `src/features/chat/services/tool-executor.ts:198`
    - **Issue**: Using a regex to match one of several exact words is over-engineered. A `Set` lookup would be more performant and readable.
    - **Recommendation**: `const GENERIC_TERMS = new Set(['essen', 'food', 'restaurant', ...])` and check with `GENERIC_TERMS.has(rawQuery.toLowerCase())`.

11. **[LOW] UX**: Empty stream fallback text hardcoded in English/German mix
    - **Location**: `src/features/chat/hooks/useChat.ts:119`, `src/app/api/chat/route.ts:481`
    - **Issue**: "Entschuldigung, ich konnte keine Antwort generieren." is hardcoded with no i18n support. The rest of the app uses `next-intl` for translations.
    - **Recommendation**: Extract to an i18n message or add to the system prompt as a fallback instruction for the LLM.

12. **[LOW] Performance**: `getSupabaseAdmin()` called multiple times in the same request
    - **Location**: `src/features/chat/services/tool-executor.ts:204,223,322,335,400`
    - **Issue**: `getSupabaseAdmin()` is called 5+ times per request, each time creating a new Supabase client. This is a minor overhead.
    - **Recommendation**: Create the admin client once at the top of the function and reuse it.

13. **[INFO] Documentation**: `tool-executor.ts` line 342 uses a hardcoded category UUID `4470c3e0-458f-40a6-a96e-ca0fbdf145d7`
    - **Location**: `src/features/chat/services/tool-executor.ts:342`
    - **Issue**: A hardcoded UUID for "ummah" category detection appears in an inline ternary. This is fragile — if the category UUID changes in the database, this breaks silently.
    - **Recommendation**: Either fetch the ummah category UUID dynamically, or add a comment explaining where this UUID comes from and that it must stay in sync with the database.

14. **[INFO] Observation**: `ChatToggleButton.tsx` appears unused — the floating widget uses `ChatFloatingWidget.tsx` directly
    - **Location**: `src/features/chat/components/ChatToggleButton.tsx`
    - **Issue**: This component is exported but no import references it in the codebase search. It may be intended for future use or a remnant.
    - **Recommendation**: Remove or document as future-use.

## Positive Observations

1. **Excellent server/client separation** — clear boundaries with `'use client'` and `'server-only'` directives used correctly.
2. **Thorough error classification** — API route distinguishes 401/400/429/503/500 with proper messages.
3. **Rate limiting implemented** at both per-minute and per-day granularity.
4. **Comprehensive test suite** — 7 test files covering hooks, components, services, and guardrails.
5. **Telemetry integration** — uses `createRequestContext` and `measureDependency` for observability.
6. **Guardrail pattern is elegant** — deterministic Tier 1/Tier 2 approach using the model's own tool-call behavior.
7. **Proper i18n-aware sanitization** — the system prompt's language detection + stickiness is well-designed.
8. **Registration flow is well-contained** — removing `search_providers` from tools during registration is a clean, model-agnostic approach.
9. **SSE streaming with `tee()`** is used correctly for dual client/DB consumption.

## Verdict

**Status**: APPROVED WITH NOTES

**Rationale**: The implementation is well-structured, follows project conventions, and covers the essential security bases (auth enforcement, rate limiting, input validation, output sanitization). The 9 MEDIUM findings do not represent a blocking risk — they are defensive improvements and edge-case hardening. The 5 LOW findings are style and minor maintenance issues. No CRITICAL or HIGH findings were identified.

The streaming implementation, guardrail system, registration flow, and tool execution are all fundamentally sound. The missing `import 'server-only'` on `openrouter.ts` is the most important actionable item to prevent accidental API key exposure in future refactors.

## Required Actions (Optional — Can Defer)

1. Add `import 'server-only'` to `src/lib/openrouter.ts` (MEDIUM #1)
2. Remove unused imports (`createProviderOrService`, `checkCityExists`) from `src/features/chat/services/tool-executor.ts` (MEDIUM #6)
3. Deduplicate `GuardrailResult` interface (MEDIUM #7)

All other findings are recommended but not blocking.
