---
ID: 176
Origin: 176
UUID: c4b1a7e8
Status: Active
---

# UFlow Chatbot Feature — Implementation Plan

## Changelog
- **2026-06-14**: Initial implementation plan. 8 sections populated from analysis 176.

---

## 1. Plan Overview

Build an LLM-powered chatbot for logged-in UFlow users to explore providers (restaurants, stores, community services) and register new providers through natural language conversation. The chatbot uses OpenRouter's OpenAI-compatible API (`openai/gpt-4o-mini`), function-calling as its primary interaction mechanism, and a two-tier guardrail (system prompt + redirect counter). All data comes from the existing UFlow Postgres database — no internet lookups.

**Architecture**: Single `POST /api/chat` API route that authenticates via Supabase SSR cookie, loads conversation history from new `conversations`/`messages` tables, calls OpenRouter with tool definitions, executes tool calls against Supabase (RPCs and services), and returns structured responses. Client-side is a chat widget — mobile replaces the Create tab in `MobileFooterBar`, desktop shows a floating FAB widget.

**Key constraints**: Non-streaming for MVP, last 20 messages as context window, `review_status: 'pending'` for chat-registered providers, German + English bilingual support, logged-in users only.

---

## 2. Milestones & Phases

### M1: Environment & Infrastructure
**Depends on**: Nothing  
**Delivers**: Working migration, env vars, OpenRouter connectivity verified

- Create migration `108_chatbot_tables.sql` with `conversations` + `messages` tables, indexes, RLS policies
- Create migration `109_chatbot_rpc.sql` with `search_providers_chat` RPC function
- Add `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` to environment config
- Create `src/lib/openrouter.ts` — thin `fetch()` client with type-safe request/response
- Create `src/features/chat/services/chat.ts` — API fetch functions (POST /api/chat, GET/DELETE conversations)
- **Verification**: Run migrations locally, verify tables exist in Supabase, call OpenRouter health endpoint with API key

### M2: Core Chat Service & Guardrails
**Depends on**: M1  
**Delivers**: Working `/api/chat` endpoint with tool execution and guardrails

- Create `src/app/api/chat/route.ts` — POST handler with auth, rate limiting, conversation management, OpenRouter call, tool loop, response
- Create `src/app/api/chat/conversations/route.ts` — GET list user's conversations
- Create `src/app/api/chat/conversations/[id]/route.ts` — GET single conversation + messages, DELETE conversation (GDPR)
- Implement tool executor in `src/features/chat/services/tool-executor.ts` — maps tool names to Supabase calls (searchProviders, getProviderById, getCategories, getCities, registerProvider)
- Implement guardrail: system prompt (Tier 1) + redirect counter (Tier 2) with max 3 redirects before hard block
- Implement "last N messages" context trimming (default N=20)
- Implement rate limiting: 20 messages/min/user + 200 messages/day/user
- **Verification**: Curl the endpoint with a test message, verify tool calls execute, verify guardrail redirects on off-topic queries

### M3: Exploration Chat UI
**Depends on**: M2  
**Delivers**: Functional chat widget on both mobile and desktop

- Create `src/features/chat/components/ChatWidget.tsx` — main chat panel (message list + input)
- Create `src/features/chat/components/ChatMessage.tsx` — single message bubble (user/assistant/tool)
- Create `src/features/chat/components/ChatInput.tsx` — text input + send button with loading state
- Create `src/features/chat/components/ProviderCard.tsx` — inline provider result mini-card
- Create `src/features/chat/hooks/useChat.ts` — chat state management via `useReducer` (messages, loading, error, conversationId)
- Create `src/features/chat/hooks/useChatHistory.ts` — conversation list fetch + management
- Create `src/components/ui/icons/ChatIcon.tsx` — chat bubble SVG icon
- **Modify** `src/components/common/MobileFooterBar.tsx` — replace Create nav item with Chat item that opens chat modal
- Create `src/features/chat/components/ChatFloatingWidget.tsx` — desktop FAB (bottom-right, `hidden md:block`)
- **Verification**: Chat with the bot in browser, receive search results with provider cards, verify mobile FAB and desktop FAB

### M4: Registration Chat Flow
**Depends on**: M3  
**Delivers**: Guided multi-turn provider registration through chat

- Extend tool executor in `src/features/chat/services/tool-executor.ts` — add `register_provider` tool that calls `createProviderOrService()` with `review_status: 'pending'`
- Implement registration system prompt — guides LLM through 6-8 turn data collection flow (name → city → category → description → contact → flags → confirm → submit)
- Implement city validation via `checkCityExists()` from `src/services/providers.ts:706`
- Implement duplicate check before submission — `searchProviders()` for similar names in same city
- **Verification**: Complete a full registration flow through chat, verify provider appears in admin review queue with `review_status: 'pending'`

### M5: Integration & Polish
**Depends on**: M4  
**Delivers**: Production-ready UX with all states handled

- Add loading states: typing indicator (animated dots) in assistant bubble while waiting for OpenRouter
- Add error states: friendly error messages for API down, rate limit, auth required, network failure — each with retry button
- Add empty states: welcome greeting for new conversations, "no results found" with search adjustment suggestion
- Add auth gate: show login prompt instead of chat input when unauthenticated
- Add conversation title auto-generation — first user message truncated to 100 chars as title
- Wire up conversation history list in GET `/api/chat/conversations`
- Add delete conversation confirmation in UI
- Add mobile chat modal that opens from MobileFooterBar chat button (full-screen sheet)
- **Verification**: Test all states manually in browser, verify no console errors, verify mobile + desktop responsive behavior

---

## 3. File Manifest

### Files to Create

| # | File Path | Milestone | Description |
|---|-----------|-----------|-------------|
| 1 | `supabase/migrations/108_chatbot_tables.sql` | M1 | `conversations` + `messages` tables, indexes, RLS policies |
| 2 | `supabase/migrations/109_chatbot_rpc.sql` | M1 | `search_providers_chat()` RPC with boolean flag + halal_level filtering |
| 3 | `src/lib/openrouter.ts` | M1 | OpenRouter `fetch()` client — typed request/response interfaces, model config from env |
| 4 | `src/features/chat/services/chat.ts` | M1 | Client-side fetch functions for `/api/chat` endpoints (POST chat, GET/DELETE conversations) |
| 5 | `src/features/chat/services/tool-executor.ts` | M1 | Tool execution layer — maps LLM tool names to Supabase service calls (searchProviders, getProviderById, getCategories, getCities, registerProvider) |
| 6 | `src/features/chat/services/guardrails.ts` | M2 | Guardrail logic — system prompt builder, redirect counter, Tier 2 hard-block check |
| 7 | `src/app/api/chat/route.ts` | M2 | POST `/api/chat` — auth, rate-limit, conversation load, OpenRouter call, tool loop, response |
| 8 | `src/app/api/chat/conversations/route.ts` | M2 | GET `/api/chat/conversations` — list user's conversations (id, title, updated_at) |
| 9 | `src/app/api/chat/conversations/[id]/route.ts` | M2 | GET + DELETE `/api/chat/conversations/[id]` — single conversation with messages; GDPR delete |
| 10 | `src/features/chat/components/ChatWidget.tsx` | M3 | `'use client'` — main chat panel: message list scroll area + ChatInput. Renders ChatMessage for each entry. Handles loading/error/empty states. |
| 11 | `src/features/chat/components/ChatMessage.tsx` | M3 | `'use client'` — single message bubble. Renders user/assistant/tool roles with appropriate styling. Renders ProviderCard components inline for search results. |
| 12 | `src/features/chat/components/ChatInput.tsx` | M3 | `'use client'` — textarea + send button. Disabled during loading. Shift+Enter for newline, Enter to send. |
| 13 | `src/features/chat/components/ProviderCard.tsx` | M3 | `'use client'` — compact provider result card rendered inside assistant messages. Shows name, badges, city, halal_level. Links to `/providers/[id]`. |
| 14 | `src/features/chat/components/ChatFloatingWidget.tsx` | M3 | `'use client'` — desktop-only (`hidden md:block`) floating FAB (bottom-right, `fixed bottom-6 right-6`). Expands to chat panel (400px × 600px max) with minimize/close. |
| 15 | `src/features/chat/components/ChatToggleButton.tsx` | M3 | `'use client'` — mobile nav button replacement for CreateIcon. Triggers chat modal open. |
| 16 | `src/features/chat/hooks/useChat.ts` | M3 | `'use client'` — `useReducer`-based chat state: messages[], isLoading, error, conversationId. `sendMessage()` posts to `/api/chat`, appends response. |
| 17 | `src/features/chat/hooks/useChatHistory.ts` | M3 | `'use client'` — fetches conversation list from GET `/api/chat/conversations`, manages active conversation selection. |
| 18 | `src/components/ui/icons/ChatIcon.tsx` | M3 | SVG chat bubble icon component, consistent with existing icon pattern (ExploreIcon, CreateIcon, etc.) |
| 19 | `src/features/chat/services/system-prompt.ts` | M2 | System prompt templates in German + English — exploration prompt, registration prompt. Exports `buildSystemPrompt(userLanguage)` |
| 20 | `src/app/api/chat/register-provider/route.ts` | M4 | (Optional, if registration tool needs separate endpoint) — alternative: handled inside tool executor in main chat route |

### Files to Modify

| # | File Path | Milestone | Change |
|---|-----------|-----------|--------|
| 21 | `src/components/common/MobileFooterBar.tsx` | M3 | Replace second navItem (Create, `/create`) with Chat item. Chat item uses `ChatIcon` and opens chat modal via `onClick` handler instead of `<Link>` navigation. The `/create` route remains accessible via URL for form-based registration. |
| 22 | `src/lib/rate-limit.ts` | M1 | Add `chat` rate limiter preset: `perMinute` (20 req/min), `perDay` (200 req/day) |
| 23 | `.env.local.example` | M1 | Add `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` entries with placeholder values |
| 24 | `next.config.js` | M1 | (If needed) Add `OPENROUTER_API_KEY` to `serverRuntimeConfig` or verify env passthrough |

### Files to Delete

None. The existing `/create` route and form flow are preserved. The `CreateIcon` component is kept (may be used elsewhere). The Create nav item is replaced, not the entire create flow.

---

## 4. Data Flow

### Sequence: Exploration Query

```
User types "Finde halal Döner in Berlin"
  │
  ▼
1. ChatInput.tsx → useChat.sendMessage("Finde halal Döner in Berlin")
  │
  ▼
2. useChat → POST /api/chat { message: "Finde halal Döner in Berlin", conversation_id: "..." }
  │
  ▼
3. route.ts → getUserFromCookie() → extract user.id
  │            checkRateLimit(identifier, 20, 60000, 'chat-minute')
  │            checkRateLimit(identifier, 200, 86400000, 'chat-day')
  │
  ▼
4. route.ts → Load/create conversation from conversations table
  │            Load last 20 messages from messages table
  │
  ▼
5. route.ts → Build messages array:
  │            [ {role:'system', content: SYSTEM_PROMPT + tool_defs},
  │              ...history (last 20 messages),
  │              {role:'user', content: "Finde halal Döner in Berlin"} ]
  │
  ▼
6. route.ts → fetch("https://openrouter.ai/api/v1/chat/completions", {
  │              headers: { Authorization: "Bearer OPENROUTER_API_KEY" },
  │              body: { model: "openai/gpt-4o-mini", messages, tools }
  │            })
  │
  ▼
7. OpenRouter responds with tool_calls: [{ function: { name: "search_providers", arguments: { query: "Döner", city: "Berlin", listing_type: "food", halal_level: 1 } } }]
  │
  ▼
8. route.ts → tool-executor.ts: executeToolCall("search_providers", { query: "Döner", city: "Berlin", listing_type: "food" })
  │            → calls supabase.rpc("search_providers_chat", { ... })
  │            → returns structured provider data + cards
  │
  ▼
9. route.ts → Sends tool result back to OpenRouter (if more tool calls needed, loop to step 6)
  │
  ▼
10. OpenRouter responds with final text: "Hier sind 3 Döner-Restaurants in Berlin: ..."
  │
  ▼
11. route.ts → Store user message + assistant message + tool_calls in messages table
  │             Update conversations.updated_at
  │
  ▼
12. route.ts → Return ChatResponse { conversation_id, message: { role, content, tool_calls }, results: [...] }
  │
  ▼
13. useChat → Append assistant message to state, render ChatMessage + ProviderCard components
```

### Sequence: Registration Flow

```
User → Bot conversation (6-8 turns collecting fields)
  │
  ▼
When all fields collected, LLM calls: register_provider({ name, listing_type, category_id, city, ... })
  │
  ▼
tool-executor.ts → validate city exists (checkCityExists)
  │                → validate no duplicate (searchProviders for same name+city)
  │                → call createProviderOrService({ ...fields, review_status: 'pending' })
  │                → return { success: true, provider_id: "..." }
  │
  ▼
Bot confirms: "Dein Restaurant wurde zur Überprüfung eingereicht!"
```

---

## 5. Testing Strategy

### M1: Infrastructure Tests

| Test File | What It Tests |
|-----------|---------------|
| `src/__tests__/lib/openrouter.test.ts` | OpenRouter client constructs correct request shape, parses valid responses, handles errors (401, 429, 5xx) |
| `src/__tests__/features/chat/tool-executor.test.ts` | Tool executor routes tool names to correct services, handles unknown tool names, validates required params |
| SQL verification | Run migrations against local Supabase, verify tables + indexes + RLS exist, verify `search_providers_chat` RPC returns expected columns |

### M2: API Route Tests

| Test File | What It Tests |
|-----------|---------------|
| `src/__tests__/api/chat/route.test.ts` | POST /api/chat: auth required (401 without cookie), rate limiting (429 after 20 requests), valid message returns response with conversation_id, guardrail redirect on off-topic ("what's the weather"), conversation_id reuse loads history |
| `src/__tests__/api/chat/conversations.test.ts` | GET lists only user's conversations, GET [id] returns messages, DELETE removes conversation + messages (GDPR), 404 on other user's conversation |

### M3: UI Component Tests

| Test File | What It Tests |
|-----------|---------------|
| `src/__tests__/features/chat/ChatWidget.test.tsx` | Renders empty greeting, shows loading indicator during API call, renders messages after response, shows error state on API failure |
| `src/__tests__/features/chat/ChatMessage.test.tsx` | Renders user/assistant/tool messages with correct alignment, renders ProviderCard for tool results, handles markdown content |
| `src/__tests__/features/chat/ChatInput.test.tsx` | Sends message on Enter, disabled during loading, Shift+Enter inserts newline |
| `src/__tests__/features/chat/ChatFloatingWidget.test.tsx` | Hidden on mobile, visible on desktop, expands/collapses on FAB click |
| `src/__tests__/components/MobileFooterBar.test.tsx` | Chat nav item renders instead of Create, ChatIcon appears, onClick opens chat modal (not navigation) |

### M4: Registration Flow Tests

| Test File | What It Tests |
|-----------|---------------|
| `src/__tests__/features/chat/registration-flow.test.ts` | Simulate multi-turn conversation: LLM collects required fields incrementally, city validation rejects nonexistent cities, duplicate check warns on similar names, final submission creates provider with review_status='pending' |
| `src/__tests__/features/chat/tool-executor-register.test.ts` | register_provider tool: validates required fields (name, listing_type, category_id, city), handles optional fields, rejects invalid listing_type enum values |
| `src/__tests__/api/chat/register-provider.test.ts` | End-to-end: POST with full registration tool call creates provider, verify in Supabase with review_status='pending' |

### M5: Integration & Polish Tests

| Test File | What It Tests |
|-----------|---------------|
| `src/__tests__/features/chat/error-states.test.tsx` | Displays appropriate messages for: 401 (login prompt), 429 (rate limit), 5xx (server error + retry), network failure |
| `src/__tests__/features/chat/empty-states.test.tsx` | New conversation shows welcome greeting, search with no results shows "nichts gefunden" + suggestions |
| `src/__tests__/features/chat/conversation-history.test.tsx` | Lists user's conversations sorted by updated_at desc, loads conversation on click, delete removes from list |
| `src/__tests__/features/chat/mobile-footer-bar-chat.test.tsx` | Chat modal opens from MobileFooterBar, full-screen on mobile, modal closes properly |

---

## 6. Migration Design

### Migration 108: Chat Tables & RLS

```sql
-- supabase/migrations/108_chatbot_tables.sql

-- Conversations table: one row per chat session
CREATE TABLE IF NOT EXISTS public.conversations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title         TEXT,                          -- auto-generated from first user message (first 100 chars)
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active     BOOLEAN NOT NULL DEFAULT true   -- soft close; set to false on delete
);

-- Index for listing user's conversations newest-first
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id, updated_at DESC);

-- Messages table: one row per message (user, assistant, tool)
CREATE TABLE IF NOT EXISTS public.messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
    content         TEXT NOT NULL,                -- message text or JSON string for tool results
    tool_calls      JSONB,                        -- store tool call/result data (function name, arguments, result)
    token_count     INTEGER,                      -- estimated token usage for cost tracking
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fetching last N messages per conversation (context window)
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id, created_at DESC);

-- Enable RLS on conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
    ON public.conversations FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own conversations"
    ON public.conversations FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own conversations"
    ON public.conversations FOR DELETE
    USING (user_id = auth.uid());

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
    ON public.messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM public.conversations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own messages"
    ON public.messages FOR INSERT
    WITH CHECK (
        conversation_id IN (
            SELECT id FROM public.conversations WHERE user_id = auth.uid()
        )
    );

-- No UPDATE policy on messages — messages are immutable once created
-- No explicit DELETE policy — messages cascade with conversation deletion (ON DELETE CASCADE)
```

### Migration 109: Enhanced Search RPC

```sql
-- supabase/migrations/109_chatbot_rpc.sql

-- Enhanced search RPC for chatbot: supports boolean flag filtering and halal_level
-- Extends existing search_providers with additional filter parameters
CREATE OR REPLACE FUNCTION search_providers_chat(
    search_query      TEXT DEFAULT '',
    category_filter   UUID DEFAULT NULL,
    city_filter       TEXT DEFAULT NULL,
    listing_type_filter TEXT DEFAULT NULL,
    muslim_owned      BOOLEAN DEFAULT NULL,
    has_prayer_space  BOOLEAN DEFAULT NULL,
    family_friendly   BOOLEAN DEFAULT NULL,
    women_friendly    BOOLEAN DEFAULT NULL,
    children_friendly BOOLEAN DEFAULT NULL,
    has_parking       BOOLEAN DEFAULT NULL,
    economic_solidarity BOOLEAN DEFAULT NULL,
    makes_donations   BOOLEAN DEFAULT NULL,
    halal_level_min   SMALLINT DEFAULT NULL,
    limit_count       INTEGER DEFAULT 5,
    offset_count      INTEGER DEFAULT 0
)
RETURNS TABLE(
    provider_id          UUID,
    provider_name        TEXT,
    provider_description TEXT,
    address_city         TEXT,
    category_name        TEXT,
    listing_type         TEXT,
    muslim_owned         BOOLEAN,
    has_prayer_space     BOOLEAN,
    family_friendly      BOOLEAN,
    women_friendly       BOOLEAN,
    children_friendly    BOOLEAN,
    has_parking          BOOLEAN,
    economic_solidarity  BOOLEAN,
    makes_donations      BOOLEAN,
    rank                 REAL
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.provider_id,
        p.provider_name,
        p.provider_description,
        p.address_city,
        c.name_de AS category_name,
        p.listing_type::TEXT,
        p.muslim_owned,
        p.has_prayer_space,
        p.family_friendly,
        p.women_friendly,
        p.children_friendly,
        p.has_parking,
        p.economic_solidarity,
        p.makes_donations,
        CASE
            WHEN search_query = '' THEN 0.0
            ELSE ts_rank(
                to_tsvector('german', p.provider_name || ' ' || COALESCE(p.provider_description, '')),
                plainto_tsquery('german', search_query)
            )
        END AS rank
    FROM public.providers p
    LEFT JOIN public.categories c ON p.category_id = c.category_id
    LEFT JOIN public.food_providers fp ON p.provider_id = fp.provider_id
    WHERE p.review_status = 'approved'
      AND (
          search_query = ''
          OR to_tsvector('german', p.provider_name || ' ' || COALESCE(p.provider_description, ''))
             @@ plainto_tsquery('german', search_query)
      )
      AND (category_filter IS NULL OR p.category_id = category_filter)
      AND (city_filter IS NULL OR p.address_city = city_filter)
      AND (listing_type_filter IS NULL OR p.listing_type::TEXT = listing_type_filter)
      AND (muslim_owned IS NULL OR p.muslim_owned = muslim_owned)
      AND (has_prayer_space IS NULL OR p.has_prayer_space = has_prayer_space)
      AND (family_friendly IS NULL OR p.family_friendly = family_friendly)
      AND (women_friendly IS NULL OR p.women_friendly = women_friendly)
      AND (children_friendly IS NULL OR p.children_friendly = children_friendly)
      AND (has_parking IS NULL OR p.has_parking = has_parking)
      AND (economic_solidarity IS NULL OR p.economic_solidarity = economic_solidarity)
      AND (makes_donations IS NULL OR p.makes_donations = makes_donations)
      AND (
          halal_level_min IS NULL
          OR (fp.halal_level IS NOT NULL AND fp.halal_level >= halal_level_min)
      )
    ORDER BY
        CASE WHEN search_query = '' THEN 0.0 ELSE 1.0 END,
        rank DESC,
        p.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$;
```

---

## 7. Risk Mitigation

| # | Risk (from Analysis §8) | Likelihood | Impact | Plan Mitigation |
|---|------------------------|-----------|--------|-----------------|
| 1 | Cost exceeds estimates (model upgrade, high volume) | Low | High | **Default model locked** — `OPENROUTER_MODEL=openai/gpt-4o-mini`, only admin can override. **Daily token cap** per user via rate-limit per-day (200 msgs × ~500 tokens = ~100K tokens/day/user). **Monitor** daily token usage via `token_count` column. |
| 2 | Guardrail bypass (jailbreak attempts) | Medium | Medium | **Two-tier**: System prompt defines scope + function-calling as gate (no tool = no action). **Redirect counter**: 3+ redirects in session → hard block with 429. **Post-launch monitoring**: Log Tier 2 escalations, review monthly. |
| 3 | Long conversations (excessive history causing cost/token bloat) | Medium | Medium | **Context window capped at 20 messages** (env-configurable `CHAT_HISTORY_LIMIT`). Older messages silently dropped. No summarization needed for MVP. |
| 4 | Tool call loops (LLM keeps calling search_providers) | Medium | Medium | **Max 5 tool calls per user message**. Circuit breaker in tool loop in route.ts. If LLM exceeds limit, return last tool result without another LLM call. |
| 5 | Off-topic abuse (using chatbot as free LLM) | Medium | Medium | Tier 2 hard block after 3 redirects returns 429. Rate limit 200 msgs/day/user prevents sustained abuse. |
| 6 | LLM API down (OpenRouter 5xx) | Low | High | Return clear error message with retry button. Standard search UI and registration form remain available as fallback. No graceful degradation to non-LLM — chatbot is down but rest of UFlow works. |
| 7 | OpenRouter rate limiting (429 from their side) | Low | Medium | Application-side rate limits reduce likelihood. Parse `x-ratelimit-remaining` headers. Show "busy, try later" message to user. |
| 8 | Hallucination (LLM invents provider data) | Medium | High | **System prompt**: "You ONLY present data returned by tool functions. Never invent provider names, menu items, prices, or details." **Structured results**: Provider cards rendered from tool call data, not LLM text. Client can validate provider_id exists before rendering link. |
| 9 | Privacy/GDPR (user data sent to OpenRouter) | Medium | High | **Privacy policy update** required before launch. **System prompt**: "If user volunteers PII, remind them you can't store it." **GDPR delete endpoint**: DELETE `/api/chat/conversations/[id]` removes all messages + conversation. **OpenRouter zero-data-retention**: Verify plan tier includes this; document in privacy policy. |
| 10 | Missing halal search RPC | High (blocker for food queries) | Medium | **Resolved in M1**: New `search_providers_chat` RPC includes `halal_level_min` filter with LEFT JOIN to `food_providers`. |
| 11 | Desktop floating widget UX (no precedent in codebase) | Medium | Low | **Follows standard chat widget patterns**: FAB bottom-right, expand to panel. Design review before M3 implementation (Gap #4). |
| 12 | `/create` route coexistence with chatbot registration | Low | Medium | **Preserve both paths**: Chat replaces Create *tab* but `/create` route remains accessible. Chat registration sets `review_status: 'pending'` (same as form). Product decision on which is primary documented in Gap #5/#6. |

---

## 8. Definition of Done

### M1: Environment & Infrastructure

- [ ] Migration `108_chatbot_tables.sql` runs successfully against local Supabase
- [ ] Migration `109_chatbot_rpc.sql` runs successfully, `search_providers_chat()` returns correct columns
- [ ] RLS policies verified: user A cannot see user B's conversations
- [ ] `OPENROUTER_API_KEY` set in `.env.local`, call to OpenRouter health endpoint returns 200
- [ ] `src/lib/openrouter.ts` exports typed `sendChatRequest()` function
- [ ] `src/features/chat/services/chat.ts` exports `sendMessage()`, `getConversations()`, `deleteConversation()`
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes

### M2: Core Chat Service

- [ ] `POST /api/chat` returns 401 without auth cookie
- [ ] `POST /api/chat` accepts `{ message }`, returns `{ conversation_id, message: { role, content } }`
- [ ] Chat persists messages: second request with same `conversation_id` includes history in context
- [ ] Off-topic query ("what's the weather?") receives a redirect response, not a tool call
- [ ] 3 consecutive off-topic queries in same session returns 429 with "out of scope" message
- [ ] 21st message in same minute returns 429 (rate limit)
- [ ] Context window trims to last 20 messages (older messages dropped)
- [ ] `GET /api/chat/conversations` returns user's conversations sorted by `updated_at DESC`
- [ ] `GET /api/chat/conversations/[id]` returns messages for that conversation
- [ ] `DELETE /api/chat/conversations/[id]` removes conversation + all messages
- [ ] Unit tests for guardrail redirect counter pass
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes

### M3: Exploration Chat UI

- [ ] Mobile: Chat icon replaces Create in `MobileFooterBar`, tapping opens full-screen chat modal
- [ ] Desktop: `ChatFloatingWidget` FAB visible at bottom-right on `md:` breakpoint
- [ ] Sending a message shows typing indicator, then assistant response
- [ ] Search result responses render `ProviderCard` components with provider name, badges, city
- [ ] Each `ProviderCard` links to `/providers/[id]`
- [ ] `/create` page remains accessible via direct URL navigation
- [ ] Welcome greeting shown for new conversations
- [ ] "No results found" state with search adjustment suggestion renders
- [ ] Unit tests for all UI components pass
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes

### M4: Registration Chat Flow

- [ ] User can complete full registration through chat (6-8 turn conversation)
- [ ] Bot collects: name, city, category, description, phone/email, Muslim-friendly flags
- [ ] Bot validates city exists before accepting
- [ ] Bot warns on potential duplicate name in same city
- [ ] Bot shows summary and asks confirmation before final submission
- [ ] Submitted provider appears in database with `review_status: 'pending'`
- [ ] Submitted provider does NOT appear in public search results
- [ ] Registration flow unit tests pass (validation, duplicate check, submission)
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes

### M5: Integration & Polish

- [ ] Loading: typing indicator (animated dots) shown while waiting for LLM response
- [ ] Error: friendly message + retry button on API down (5xx)
- [ ] Error: "Login to chat" prompt when unauthenticated
- [ ] Error: rate limit message when 429 received
- [ ] Empty: welcome greeting for new conversations
- [ ] Empty: "no results" with search adjustment suggestion
- [ ] Conversation history: list loads from GET endpoint, select loads messages, delete removes with confirmation
- [ ] Conversation titles auto-generated (first message, truncated to 100 chars)
- [ ] Mobile chat modal: opens full-screen, closes cleanly, no scroll bleed
- [ ] Desktop chat widget: minimizes/expands, doesn't overlap content, closes
- [ ] German + English: bot responds in user's language (test with both)
- [ ] All M5 unit tests pass
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] Manual smoke test: explore flow + register flow in both German and English on mobile + desktop

---

## Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Non-streaming for MVP** | Yes | Simpler implementation; responses are short enough (search results, form prompts) that 1-2s wait is acceptable |
| **Function-calling gate** | Primary guardrail | Free (no extra API call), natural fit — LLM has no tool for off-topic = can only redirect |
| **Reuse existing services** | `searchProviders()`, `getProviderById()`, `createProviderOrService()` | No duplication; existing functions are tested and maintained |
| **MobileFooterBar replacement** | Chat tab replaces Create tab; `/create` route preserved | Chat becomes primary entry point; form-based flow still available for users who prefer it |
| **Conversation persistence** | Last 20 messages as context | GPT-4o-mini's 128K context window handles this easily; no summary needed |
| **Auth flow** | `getUserFromCookie()` in each API route | Consistent with 20+ existing API routes in codebase |
| **German + English** | System prompt instructs "respond in user's language" | LLM handles multilingual naturally; tool descriptions in English for reliability |
| **review_status** | `'pending'` for chat-registered providers | Same as form-registered; admin review workflow unchanged |
| **Migration naming** | `108_chatbot_tables.sql` + `109_chatbot_rpc.sql` | Next available migration numbers after 107 |
| **Rate limiting** | 20 msgs/min + 200 msgs/day per user | Uses existing `checkRateLimit()` utility; prevents abuse without hindering real usage |
