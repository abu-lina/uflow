---
ID: 199
Origin: 199
UUID: c4e8f213
Status: Active
---

# Analysis 199: Chatbot "Open Now" Filter Missing

## Changelog

| Date | Agent | Change |
|------|-------|--------|
| 2026-08-02T17:15Z | Analyst | Initial analysis — root cause identified (L1 Proven) |

## Value Statement and Business Objective

Users expect the chatbot to respect temporal intent ("open burger restaurants in Stuttgart") and only return providers currently open. Returning closed restaurants wastes the user's time and erodes trust in the assistant's intelligence.

## Objective

Determine why the chatbot returns closed restaurants when the user asks for "open" ones, identify the gap in the current architecture, and document the fix surface.

## Context

- **Reporter**: User (live testing, 2026-08-02)
- **Reproduction**: Ask the chatbot "Zeig mir offene Burger Restaurants in Stuttgart" → results include closed providers
- **Related**: Plan 196 implemented "Open now" filtering for the public `/search` page using `filterOpenNow.ts` + `getOpenStatus()`. The chatbot search path does NOT use this infrastructure.

## Methodology

1. Traced the chatbot search path: user message → LLM → `search_providers` tool call → `executeToolCall()` → `search_providers_chat` RPC → results returned to LLM → presented to user.
2. Inspected tool definition parameters in `tool-executor.ts`.
3. Inspected RPC signature and body in migration `109_chatbot_rpc.sql`.
4. Compared with the working "Open now" path on `/search` (`filterOpenNow.ts` → `getOpenStatus()`).

## Findings

### F1 — No `open_now` parameter in `search_providers` tool (L1 Proven)

**Location**: `src/features/chat/services/tool-executor.ts` lines 11–67 (TOOL_DEFINITIONS)

The `search_providers` tool definition exposes: `query`, `category`, `city`, `listing_type`, `muslim_owned`, `has_prayer_space`, `family_friendly`, `women_friendly`, `limit`. There is **no** `open_now` boolean parameter.

**Impact**: The LLM has no mechanism to signal "only open providers" — even if it understands the user's intent, it cannot act on it.

### F2 — RPC does not return `opening_hours` (L1 Proven)

**Location**: `supabase/migrations/109_chatbot_rpc.sql` lines 20–34 (RETURNS TABLE)

The `search_providers_chat` RPC returns: `provider_id`, `provider_name`, `provider_description`, `address_city`, `category_name`, `listing_type`, 7 boolean flags, and `rank`. It does **not** return `opening_hours`.

**Impact**: Even if the tool executor wanted to post-filter results, it has no opening hours data to work with.

### F3 — RPC has no time-based WHERE clause (L1 Proven)

**Location**: `supabase/migrations/109_chatbot_rpc.sql` lines 58–82 (WHERE clause)

The RPC filters on: `review_status = 'approved'`, text search, category, city, listing_type, and boolean flags. No temporal filtering exists.

### F4 — Working "Open now" infrastructure exists (L1 Proven)

**Location**: `src/utils/openStatus.ts` (getOpenStatus), `src/utils/filterOpenNow.ts` (filterOpenNow), `src/types/openingHours.ts` (types)

Plan 196 shipped a complete, tested "Open now" utility:
- `getOpenStatus(opening_hours: OpeningHours | null, now?: Date): OpenStatusResult` — returns `{ isOpen, visible, nextChangeTime, nextChangeDay }`
- `filterOpenNow<T extends { opening_hours? }>(items, active): T[]` — filters a list to only open items
- Device-local time, overnight-window aware, tested in `src/__tests__/utils/openStatus.test.ts`

This utility is used by `ProviderCard.tsx` and `useNearMeSearch.ts` but **not** by the chatbot tool executor.

### F5 — `opening_hours` column exists on `providers` table (L1 Proven)

**Location**: `src/services/providers.ts` line 32, `src/types/location.ts` line 13

The `providers` table has an `opening_hours JSONB` column with the `OpeningHours` shape (day → `{open, close}` windows). Data exists for many providers (populated via enrichment pipeline).

## Root Cause

**L1 Proven**: The chatbot `search_providers` tool and `search_providers_chat` RPC were built (Plan 176) without "open now" awareness. The "Open now" infrastructure (Plan 196) was added later to the public search page but never wired into the chatbot path.

This is a **feature gap**, not a regression.

## Fix Surface (for Planner)

| Layer | Change Required | Complexity |
|-------|----------------|-----------|
| RPC (`search_providers_chat`) | Add `opening_hours` to RETURNS TABLE (or add a `p_open_now` param + server-side JSONB filtering) | Low (add column) or Medium (JSONB day logic in PL/pgSQL) |
| Tool Executor (`tool-executor.ts`) | Either (a) apply `getOpenStatus()` + filter server-side after RPC call, or (b) pass through to RPC | Low — reuses existing `filterOpenNow` utility |
| Tool Definition (`TOOL_DEFINITIONS`) | Add `open_now: { type: 'boolean', description: '...' }` parameter | Trivial |
| System Prompt (optional) | Add TOOL USAGE note: "Use open_now: true when user asks for 'open' or 'geöffnete' restaurants" | Trivial |

**Recommended approach** (lowest risk, reuses tested code): Return `opening_hours` from the RPC, apply `filterOpenNow()` in the tool executor TypeScript layer, and annotate results with open/closed status for the LLM. This avoids complex PL/pgSQL date/time logic and reuses the battle-tested `getOpenStatus()`.

## System Weaknesses

| Weakness | Risk Mechanism |
|----------|---------------|
| Chatbot tool surface not synced with public search capabilities | Each time the `/search` page gets a new filter, the chatbot doesn't get it unless explicitly wired |
| No feature parity checklist between search surfaces | Drift accumulates silently |

## Analysis Recommendations (Next Steps)

1. **Create plan** for wiring `open_now` into the chatbot search path (Planner).
2. **Consider**: Should the chatbot also get the "near me" geolocation filter? (Separate analysis if yes.)
3. **Audit**: List all `/search` page filters not yet available in the chatbot tool — create a tracking list for future parity work.

## Open Questions

None — root cause is fully determined (L1 Proven).
