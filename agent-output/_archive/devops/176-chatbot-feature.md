---
ID: 176
Origin: 176
UUID: 51545955
Status: Active
---

# DevOps Finalization: UFlow Chatbot Feature (Plan 176)

## Changelog
| Date | Agent | Change |
|------|-------|--------|
| 2026-06-14 | DevOps | Phase complete. PR #253 created, agent-output docs committed. Awaiting merge. |

---

## 1. Commits Pushed

| # | Commit | Description |
|---|--------|-------------|
| 1 | `d585842a` | feat(176): M1-M2 chatbot infrastructure, core services, and API routes |
| 2 | `39c2b2a2` | feat(176): M3 exploration chat UI components |
| 3 | `06f49b30` | feat(176): M3-M5 integration - add ChatFloatingWidget to layout, implementation doc |
| 4 | `c62d9997` | fix(176): UAT blocker fixes — G1 ProviderCard rendering, G2 cross-request guardrail counter, G3 type safety |
| 5 | `e2550409` | docs(176): finalize agent-output docs for chatbot feature |

**Total**: 5 commits on `feature/176-chatbot`, all pushed to origin.

## 2. Pull Request

| Field | Value |
|-------|-------|
| PR Number | [#253](https://github.com/abu-lina/uflow/pull/253) |
| Base | `main` |
| Head | `feature/176-chatbot` |
| State | Open |
| Files Changed | 38 |
| Additions | 5,134 |
| Deletions | 49 |
| Status | Awaiting merge |

## 3. Files Changed (Source)

| Category | Files | Description |
|----------|-------|-------------|
| **API Routes** | `src/app/api/chat/route.ts`, `src/app/api/chat/conversations/route.ts`, `src/app/api/chat/conversations/[id]/route.ts` | Chat API, conversation CRUD |
| **Feature Module** | `src/features/chat/**` (14 files) | Chat UI components, hooks, services, types, prompts |
| **Library** | `src/lib/openrouter.ts`, `src/lib/rate-limit.ts` | OpenRouter client, rate limiting |
| **Layout** | `src/components/layout/RootClientLayout.tsx`, `src/components/common/MobileFooterBar.tsx` | Chat widget integration, mobile tab |
| **Icons** | `src/components/ui/icons/ChatIcon.tsx` | Chat icon component |
| **Migrations** | `supabase/migrations/108_chatbot_tables.sql`, `109_chatbot_rpc.sql`, `110_chatbot_redirect_count.sql` | DB schema, RPC, guardrail counter |
| **Tests** | `src/__tests__/**` (8 test files) | 1713 total tests passing |

## 4. Migration Deployment Instructions

After merging the PR to `main`, apply migrations to Supabase:

```bash
# Option A: Push via Supabase CLI (recommended)
supabase db push

# Option B: Manual migration apply
psql "$SUPABASE_DB_URL" -f supabase/migrations/108_chatbot_tables.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/109_chatbot_rpc.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/110_chatbot_redirect_count.sql
```

### Migration Details

| Migration | Purpose |
|-----------|---------|
| `108_chatbot_tables.sql` | Creates `conversations` and `messages` tables with RLS policies |
| `109_chatbot_rpc.sql` | Creates `search_providers_chat` RPC for full-text search |
| `110_chatbot_redirect_count.sql` | Adds `redirect_count` column to `conversations` for guardrail G2 |

## 5. Environment Variables Checklist

Set on production (Hetzner Docker env or .env file):

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `OPENROUTER_API_KEY` | **Yes** | `sk-or-v1-...` | OpenRouter API key for GPT-4o-mini |
| `OPENROUTER_MODEL` | No | `openai/gpt-4o-mini` | Model identifier (defaults to gpt-4o-mini) |
| `CHAT_HISTORY_LIMIT` | No | `20` | Max messages to send to LLM as context |

Set on UAT environment as well for pre-production validation.

## 6. Smoke Test Checklist

Post-deployment verification:

### API Health

- [ ] `GET /api/chat/conversations` — returns user's conversations (empty for new user)
- [ ] `POST /api/chat/conversations` — creates new conversation
- [ ] `POST /api/chat` — accepts chat messages and returns AI response

### Chat Flow

- [ ] Logged-in user sees chat button on mobile (replaces Create '+' tab) and desktop (floating widget)
- [ ] Start conversation: natural language query returns relevant providers via ProviderCard
- [ ] Registration flow: guided multi-turn provider registration works
- [ ] Guardrails: function-calling gate blocks unauthorized tool calls
- [ ] Cross-request redirect counter blocks conversation after threshold (G2)
- [ ] Chat history persists across page reloads
- [ ] Rate limiting: rapid requests get 429 responses

### Non-Functional

- [ ] Response time < 3s for simple queries
- [ ] No errors in production logs
- [ ] CSP headers allow OpenRouter API calls

## 7. Rollback Plan

If the chatbot feature causes issues post-deploy:

### Code Rollback
```bash
# Revert the merge commit on main
git revert -m 1 <merge-commit>
git push origin main
```

### Database Rollback (only if tables/RPCs cause issues)
```sql
-- Drop in reverse order
DROP FUNCTION IF EXISTS search_providers_chat(text, integer);
ALTER TABLE conversations DROP COLUMN IF EXISTS redirect_count;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
```

### Environment Rollback
Remove the three environment variables (`OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `CHAT_HISTORY_LIMIT`) to disable the feature. The API will return 500 errors without the key, but the rest of the app will function normally.

## 8. Release Notes Summary

**v0.15.0** — AI Chatbot for Provider Exploration & Registration

### Added
- AI-powered chatbot for natural language provider search (GPT-4o-mini via OpenRouter)
- Guided multi-turn provider registration flow through chat
- Two-tier guardrail system: function-calling gate + redirect counter
- Floating chat widget on desktop, tab replacement on mobile
- Conversation persistence with full chat history
- Rate limiting on chat API endpoint (30 req/min per user)
- Bilingual support (DE/EN) via system prompt
- New Supabase tables: `conversations`, `messages` (with RLS)
- New RPC: `search_providers_chat` for full-text search

### Technical
- OpenRouter API via native fetch() — zero SDK dependencies
- 5 function-calling tools mapped to existing Supabase RPC/search services
- 3 database migrations (108, 109, 110)
- 38 files changed, 1713 tests passing, type-check clean, lint clean

### Deployment
- Requires: `OPENROUTER_API_KEY` env var
- Optional: `OPENROUTER_MODEL`, `CHAT_HISTORY_LIMIT`
- Cost: ~$0.0005/conversation (~$16/month at 1K conversations/day)

## 9. Version Bump

| Field | Current | Proposed | Rationale |
|-------|---------|----------|-----------|
| Version | `0.14.0` | `0.15.0` | New feature (MINOR bump per SemVer) |

Version bump should be executed as a separate commit on `main` after merge (or included in the merge). Files to update:
- `package.json`: `"version": "0.15.0"`

## 10. Approval Gates

| Gate | Status |
|------|--------|
| Code Review | APPROVED |
| QA Validation | PASSED |
| UAT Validation | APPROVED WITH CONDITIONS (resolved) |
| PR Created | [#253](https://github.com/abu-lina/uflow/pull/253) |
| Agent-Output Docs | Committed |
| DevOps Document | Written |
| **User Merge Approval** | **PENDING** |
