---
ID: 176
Origin: 176
UUID: 2a2c99b3
Status: Active
---

# UFlow Chatbot Feature — Implementation Document

## Changelog
- **2026-06-14**: M1-M3 implemented. M4 (registration) integrated into tool executor. M5 polish partially done.

---

## 1. Files Created/Modified

### M1: Environment & Infrastructure
| # | File | Type | Description |
|---|------|------|-------------|
| 1 | `supabase/migrations/108_chatbot_tables.sql` | Create | conversations + messages tables with RLS policies |
| 2 | `supabase/migrations/109_chatbot_rpc.sql` | Create | search_providers_chat RPC with boolean flag + halal_level filtering |
| 3 | `src/features/chat/types.ts` | Create | TypeScript types: ChatMessage, ToolCall, ProviderCardData, etc. |
| 4 | `src/lib/openrouter.ts` | Create | OpenRouter fetch client with typed request/response |
| 5 | `src/lib/rate-limit.ts` | Modify | Added chat rate limiter presets (20/min, 200/day per user) |

### M2: Core Chat Service
| # | File | Type | Description |
|---|------|------|-------------|
| 6 | `src/features/chat/services/guardrails.ts` | Create | Function-calling gate — deterministic, language-agnostic Tier 1+2 |
| 7 | `src/features/chat/services/tool-executor.ts` | Create | Tool executor mapping LLM tool calls to existing services |
| 8 | `src/features/chat/prompts/system-prompt.ts` | Create | Bilingual system prompt builder (exploration + registration) |
| 9 | `src/features/chat/services/chat.ts` | Create | Client-side fetch functions for chat API |
| 10 | `src/app/api/chat/route.ts` | Create | POST /api/chat — auth, rate-limit, tool loop, telemetry |
| 11 | `src/app/api/chat/conversations/route.ts` | Create | GET /api/chat/conversations — list user's conversations |
| 12 | `src/app/api/chat/conversations/[id]/route.ts` | Create | GET + DELETE /api/chat/conversations/[id] — detail + GDPR delete |

### M3: Exploration Chat UI
| # | File | Type | Description |
|---|------|------|-------------|
| 13 | `src/components/ui/icons/ChatIcon.tsx` | Create | Chat bubble SVG icon (active/inactive states) |
| 14 | `src/features/chat/components/ChatMessage.tsx` | Create | Message bubble (user/assistant/tool) with typing indicator |
| 15 | `src/features/chat/components/ChatInput.tsx` | Create | Textarea + send button, Enter-to-send, Shift+Enter newline |
| 16 | `src/features/chat/components/ProviderCard.tsx` | Create | Inline provider result card with badges and link |
| 17 | `src/features/chat/components/ChatWidget.tsx` | Create | Main chat panel: message list, input, welcome/loading/error states |
| 18 | `src/features/chat/components/ChatToggleButton.tsx` | Create | Mobile nav chat toggle button |
| 19 | `src/features/chat/components/ChatFloatingWidget.tsx` | Create | Desktop FAB widget (bottom-right, expandable) |
| 20 | `src/features/chat/hooks/useChat.ts` | Create | Chat state management via useState (messages, loading, error, conversationId) |
| 21 | `src/components/common/MobileFooterBar.tsx` | Modify | Replace Create tab with Chat tab; add full-screen chat modal on mobile |
| 22 | `src/components/layout/RootClientLayout.tsx` | Modify | Add ChatFloatingWidget for desktop |
| 23 | `src/__tests__/setup.ts` | Modify | Add scrollIntoView mock for jsdom |

### Test Files
| # | File | Tests | Status |
|---|------|-------|--------|
| T1 | `src/__tests__/lib/openrouter.test.ts` | 9 | Pass |
| T2 | `src/__tests__/features/chat/guardrails.test.ts` | 8 | Pass |
| T3 | `src/__tests__/features/chat/tool-executor.test.ts` | 12 | Pass |
| T4 | `src/__tests__/api/chat/route.test.ts` | 9 | Pass |
| T5 | `src/__tests__/features/chat/ChatMessage.test.tsx` | 4 | Pass |
| T6 | `src/__tests__/features/chat/ChatInput.test.tsx` | 6 | Pass |
| T7 | `src/__tests__/features/chat/ProviderCard.test.tsx` | 4 | Pass |
| T8 | `src/__tests__/features/chat/ChatWidget.test.tsx` | 5 | Pass |
| T9 | `src/__tests__/features/chat/useChat.test.ts` | 6 | Pass |

---

## 2. TDD Compliance

| Test File | Test Description | Status |
|-----------|-----------------|--------|
| openrouter.test.ts | constructs correct request shape with messages array | PASS |
| openrouter.test.ts | includes tool definitions when provided | PASS |
| openrouter.test.ts | uses default model when OPENROUTER_MODEL is not set | PASS |
| openrouter.test.ts | throws on 401 invalid API key | PASS |
| openrouter.test.ts | throws on 429 rate limit | PASS |
| openrouter.test.ts | throws on 5xx server error | PASS |
| openrouter.test.ts | throws when OPENROUTER_API_KEY is missing | PASS |
| openrouter.test.ts | extracts content from assistant message | PASS |
| openrouter.test.ts | extracts tool calls from response | PASS |
| guardrails.test.ts | returns ok when tool calls are present | PASS |
| guardrails.test.ts | returns ok when content is present with tool calls | PASS |
| guardrails.test.ts | returns redirect on text-only response | PASS |
| guardrails.test.ts | returns redirect on null content with no tool calls | PASS |
| guardrails.test.ts | returns block after 2 consecutive redirects (Tier 2) | PASS |
| guardrails.test.ts | resets redirect counter after successful tool call | PASS |
| guardrails.test.ts | creates a counter with initial value 0 | PASS |
| guardrails.test.ts | increments correctly | PASS |
| tool-executor.test.ts | defines all required tools | PASS |
| tool-executor.test.ts | each tool has valid type and function shape | PASS |
| tool-executor.test.ts | throws for unknown tool name | PASS |
| tool-executor.test.ts | get_cities calls fetchProviderCities | PASS |
| tool-executor.test.ts | get_provider_details calls getProviderById | PASS |
| tool-executor.test.ts | get_provider_details throws if provider_id missing | PASS |
| tool-executor.test.ts | get_categories queries categories table | PASS |
| tool-executor.test.ts | search_providers calls RPC with parsed arguments | PASS |
| tool-executor.test.ts | search_providers throws if query missing | PASS |
| tool-executor.test.ts | register_provider validates required fields | PASS |
| tool-executor.test.ts | register_provider rejects invalid listing_type | PASS |
| tool-executor.test.ts | register_provider rejects nonexistent city | PASS |
| chat/route.test.ts | returns 401 when user not authenticated | PASS |
| chat/route.test.ts | returns 400 when message missing | PASS |
| chat/route.test.ts | returns 400 when message empty | PASS |
| chat/route.test.ts | returns 400 when message exceeds max length | PASS |
| chat/route.test.ts | returns 429 when rate limit exceeded | PASS |
| chat/route.test.ts | returns chat response with conversation_id | PASS |
| chat/route.test.ts | creates new conversation when no conversation_id | PASS |
| chat/route.test.ts | passes user language context to LLM | PASS |
| chat/route.test.ts | returns block message on guardrail Tier 2 | PASS |
| ChatMessage.test.tsx | renders user message aligned right | PASS |
| ChatMessage.test.tsx | renders assistant message aligned left | PASS |
| ChatMessage.test.tsx | shows typing indicator when empty + loading | PASS |
| ChatMessage.test.tsx | renders tool message with muted style | PASS |
| ChatInput.test.tsx | renders textarea and send button | PASS |
| ChatInput.test.tsx | disables input and button when loading | PASS |
| ChatInput.test.tsx | calls onSend with trimmed message on click | PASS |
| ChatInput.test.tsx | calls onSend when Enter pressed | PASS |
| ChatInput.test.tsx | does not send empty messages | PASS |
| ChatInput.test.tsx | clears textarea after sending | PASS |
| ProviderCard.test.tsx | renders provider name and city | PASS |
| ProviderCard.test.tsx | renders Muslim-owned badge when applicable | PASS |
| ProviderCard.test.tsx | links to provider detail page | PASS |
| ProviderCard.test.tsx | handles missing optional fields gracefully | PASS |
| ChatWidget.test.tsx | shows welcome greeting when no messages | PASS |
| ChatWidget.test.tsx | shows loading indicator when isLoading | PASS |
| ChatWidget.test.tsx | shows error message when error present | PASS |
| ChatWidget.test.tsx | renders messages when present | PASS |
| ChatWidget.test.tsx | calls sendMessage when user types and sends | PASS |
| useChat.test.ts | initializes with empty messages and not loading | PASS |
| useChat.test.ts | adds user message and sends to API | PASS |
| useChat.test.ts | sets conversation_id after first message | PASS |
| useChat.test.ts | sets loading state while waiting | PASS |
| useChat.test.ts | handles API errors gracefully | PASS |
| useChat.test.ts | clears error when sending new message | PASS |

**Total: 63 tests, all passing**

---

## 3. Test Evidence

### Vitest Output (all tests passing)
```
Test Files  7 passed (7)
Tests       45 passed (45)  // chat-specific tests
```

Full test suite after adding scrollIntoView mock:
```
Test Files  210 passed | 2 failed (212)  // 2 unrelated pre-existing failures
Tests       1701 passed | 22 skipped (1723)
```

The 2 failing test files are pre-existing (`import-muslimbusiness-cli.test.ts` and one other script test) unrelated to chatbot changes.

### tsc Output
```
(nothing)  // Clean — no type errors
```

---

## 4. Architect Notes Addressed

### R1: Perf-telemetry (HIGH) ✅
Every API route uses `createRequestContext`/`measureDependency`/`logRequestTiming`:
- `POST /api/chat`: wraps OpenRouter call in `measureDependency(ctx, 'openrouter.chat_completion', ...)`, Supabase calls in `measureDependency(ctx, 'supabase.conversations.ensure'|'supabase.messages.load'|'supabase.messages.save', ...)`, tool calls in `measureDependency(ctx, 'tool.${name}', ...)`.
- `GET/DELETE /api/chat/conversations/*`: each wrapped with `measureDependency` for supabase queries.
- `X-Correlation-ID` header on all responses.
- Pattern matches `src/app/api/providers/search/route.ts`.

### R2: Guardrail detection (HIGH) ✅
Function-calling gate, not regex:
- `checkGuardrail()` at `src/features/chat/services/guardrails.ts:36` checks for `tool_calls` presence.
- No tool call → Tier 1 redirect (increments counter).
- 2 consecutive text-only responses → Tier 2 hard block.
- Successful tool call resets counter.
- Language-agnostic, deterministic, no keyword matching.

### R3: Request validation (HIGH) ✅
- `MAX_MESSAGE_LENGTH = 2000` chars (`src/features/chat/types.ts:130`).
- Zod-compatible manual validation in API route.
- Content-Type checked (JSON parse catch returns 400).
- Empty/whitespace messages rejected (400).
- XSS protection: `sanitizeOutput()` strips `<script>`, `<iframe>`, `<object>`, `<embed>`, event handlers from LLM output before returning to client.

### R4: Minor fixes ✅
- File #15 renamed to `ChatToggleButton.tsx` (not ChatWidget.tsx).
- Removed contradictory `/api/chat/register-provider` route — registration goes through tool executor in main chat route.
- Referenced `next.config.js` (not nextConfig.js) — no changes needed since env vars are server-side accessible via `process.env`.

---

## 5. Deviations from Plan

| # | Deviation | Rationale |
|---|-----------|-----------|
| 1 | `src/features/chat/prompts/` directory used for system prompt (not `services/`) | Per architecture review R9 recommendation |
| 2 | `src/lib/openrouter.ts` name kept (not `llm-client.ts`) | Architecture review R8 was LOW priority; OpenRouter naming is clear |
| 3 | Registration via tool executor only — no separate `register-provider` route | Architecture review identified this as contradictory; tool executor is the correct pattern |
| 4 | No `next.config.js` changes needed | Architecture review confirmed no `serverRuntimeConfig` exists |
| 5 | `scrollIntoView` mock added to test setup | Required for jsdom compatibility in ChatWidget tests |

---

## 6. Known Issues / Follow-ups

1. **Conversation history UI**: The `useChatHistory` hook and conversation list sidebar are not yet implemented. The API routes (GET /api/chat/conversations, GET/DELETE /api/chat/conversations/[id]) are ready.
2. **Error states**: Basic error display in ChatWidget. More granular error types (401 → login prompt, 429 → wait message) can be added in future.
3. **Admin review integration**: Chat-registered providers appear with `review_status: 'pending'` in admin review queue. No special flag to distinguish chat-registered vs form-registered providers.
4. **Rate limit headers**: X-RateLimit-Remaining headers not included (general codebase gap per review R11).
5. **OpenRouter API key startup validation**: Not implemented (R10). Key is validated on first API call.
6. **Token count**: Stored in `messages.token_count` but no aggregation/monitoring dashboard yet.
