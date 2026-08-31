---
ID: 199
Origin: 199
UUID: c4e8f213
Status: Active
---

# Plan 199 — Chatbot "Open Now" Filter

| Field | Value |
|-------|-------|
| Plan ID | 199 |
| Target Release | next available patch after current origin/main version (origin/main = v0.15.2 → expected v0.15.3); confirm at DevOps Stage 1 |
| Epic Alignment | Conversational Discovery / Chatbot (follow-on to Plans 176, 196, 198) |
| Related Issues | None (originated from user-reported chatbot UX feedback, 2026-08-02) |
| Classification | Bugfix (feature-gap: chatbot missing filter parity with /search page) |
| Pipeline | Abbreviated (Analyst → Planner → Critic → Implementer → Code Review → QA → UAT → DevOps) |
| GitHub Issue   | https://github.com/abu-lina/uflow/issues/287 |
| Created | 2026-08-02T17:20Z |
| Source Analysis | [199-chatbot-open-now-filter-analysis.md](../analysis/199-chatbot-open-now-filter-analysis.md) |

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-08-02T17:20Z | Planner | Initial plan from analysis 199. NO-MEMORY MODE. |

---

## Value Statement and Business Objective

> "As a user of the UFlow chatbot, I want the assistant to only show me restaurants that are currently open when I ask for 'open' ones, so that I don't waste time navigating to a restaurant that is closed."

**Alignment**: Supports master product objective — trustworthy discovery requires accurate temporal context. Users lose trust when the chatbot ignores their explicit "open" request.

---

## Decision Record

| ID | Decision | Status |
|----|----------|--------|
| D1 | Apply open/closed filtering in the tool executor (TypeScript), not in the RPC (PL/pgSQL) | [RESOLVED] — reuses battle-tested `getOpenStatus()` utility; avoids complex JSONB day/time logic in Postgres; consistent with Plan 196 architecture |
| D2 | Return `opening_hours` from the RPC as a new column | [RESOLVED] — the column exists on `providers`; adding it to the RETURNS TABLE is a 1-line RPC change; no schema migration needed |
| D3 | Add `open_now` boolean parameter to the tool definition | [RESOLVED] — LLM needs explicit affordance; without it, even intent-aware models cannot signal the filter |
| D4 | Annotate results with open/closed status (not just filter) | [RESOLVED] — show "(geöffnet)" or "(geschlossen)" next to each result so the LLM can present status even when `open_now` is false; user sees context |
| D5 | System prompt hint for temporal keywords | [RESOLVED] — add a TOOL USAGE note so the LLM uses `open_now: true` when user says "offen/geöffnet/open" |
| D6 | Providers without `opening_hours` data are treated as "unknown" (not filtered out) | [RESOLVED] — `getOpenStatus(null)` returns `{ visible: false, isOpen: false }`; when `open_now: true`, only providers with positive `isOpen` pass; providers with no data are excluded from "open" queries — acceptable (they'd be indeterminate anyway) |

---

## Release Strategy

Release Strategy: Standalone (no other known plans for this version).

---

## Assumptions

1. The `opening_hours` JSONB column on `providers` is populated for a meaningful percentage of Stuttgart providers (enrichment pipeline has run). If not, the filter will correctly return fewer results — the LLM can note "only X restaurants have opening hours data."
2. `getOpenStatus()` uses device-local time. In the chatbot context (server-side execution), this means **server time** — which is UTC or the deployment timezone. This is acceptable for German users if the server is in Europe (Hetzner EU). If timezone drift becomes an issue, a follow-up can pass explicit timezone.
3. No new DB migration is needed — only an `ALTER FUNCTION` to add `opening_hours` to the RETURNS TABLE (done via a new migration file that `CREATE OR REPLACE`s the function).

---

## Milestones

### M1 — RPC: Add `opening_hours` to `search_providers_chat` return columns

**Objective**: The chatbot search RPC returns opening hours data alongside each provider.

**Scope**:
- Create migration file (next sequence number) that `CREATE OR REPLACE FUNCTION search_providers_chat(...)` with `opening_hours JSONB` added to the RETURNS TABLE and `p.opening_hours` added to the SELECT clause.
- No new parameters needed at the RPC level — filtering happens in TypeScript.

**Acceptance Criteria**:
- [ ] Migration file exists in `supabase/migrations/`
- [ ] RPC returns `opening_hours` JSONB column for each result
- [ ] Existing parameters and behavior unchanged (backward compatible)
- [ ] Applied successfully to local dev database

### M2 — Tool Executor: Apply `filterOpenNow` + annotate results

**Objective**: When the LLM passes `open_now: true`, only currently-open providers are returned. All results are annotated with open/closed status.

**Scope**:
- In `src/features/chat/services/tool-executor.ts`, `search_providers` case:
  - Import `getOpenStatus` from `@/utils/openStatus`
  - After RPC results arrive, compute `isOpen` for each result using `getOpenStatus(result.opening_hours)`
  - If `args.open_now === true`, filter to only `isOpen === true` results
  - Annotate each result in the JSON response with `is_open: boolean | null` (null = no data)
- Add `open_now` parameter to the `search_providers` tool definition in `TOOL_DEFINITIONS`

**Acceptance Criteria**:
- [ ] `open_now: true` filters results to currently-open providers
- [ ] Each result includes `is_open` field (true/false/null)
- [ ] Providers without `opening_hours` return `is_open: null`
- [ ] When `open_now` is not passed or false, all results returned (annotated but not filtered)

### M3 — System Prompt: Add temporal keyword guidance

**Objective**: The LLM knows to use `open_now: true` when the user mentions temporal intent.

**Scope**:
- In `src/features/chat/prompts/system-prompt.ts`, TOOL USAGE section:
  - Add: "When user asks for 'open', 'geöffnet', 'offen', or 'jetzt' restaurants: set open_now: true"
  - Add presentation guidance: "When results include is_open status, mention it (e.g., '✅ Geöffnet' or '❌ Geschlossen')"

**Acceptance Criteria**:
- [ ] System prompt TOOL USAGE section includes temporal keyword guidance
- [ ] Presentation guidance for open/closed status annotation

### M4 — Version & Release Artifacts

**Objective**: Version bump and CHANGELOG entry.

**Scope**:
- `package.json` + `package-lock.json`: version bump to target release
- `CHANGELOG.md`: entry under `[Unreleased]` describing the open now filter

**Acceptance Criteria**:
- [ ] Version bumped in package.json + lockfile
- [ ] CHANGELOG entry documents the feature

---

## Milestone Dependencies

```mermaid
graph LR
    M1["M1: RPC column"] --> M2["M2: Tool executor filter"]
    M2 --> M3["M3: System prompt"]
    M3 --> M4["M4: Version bump"]
```

Sequencing: M1 must complete before M2 (executor needs the data). M3 can technically start in parallel with M2 but is trivial. M4 is always last.

---

## Testing Strategy

- **Unit tests**: Test that `executeToolCall('search_providers', { open_now: true, ... })` filters results correctly (mock RPC response with known opening_hours data)
- **Unit tests**: Test annotation logic — providers with/without opening_hours get correct `is_open` value
- **Integration**: Existing `getOpenStatus` tests already cover the time-calculation logic; no new tests needed there
- **Regression**: Verify existing `search_providers` tests still pass (no `open_now` = no filtering)

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Server timezone != user timezone → wrong open/closed | Low (Hetzner EU) | Medium | Document as known limitation; follow-up if reported |
| Most providers lack `opening_hours` data → empty results | Medium | Low | LLM can note "X of Y have hours data"; enrichment pipeline continues populating |
| RPC change breaks existing callers | Very Low | High | `opening_hours` is added as a new return column — existing callers ignore extra columns |

---

## Duration Estimates

| Phase | Estimate | Uncertainty |
|-------|----------|-------------|
| Planning | 15 min | Low (simple scope) |
| Critique | 10 min | Low |
| Implementation | 30–60 min | Low (reuses existing infra) |
| Code Review | 10 min | Low |
| QA | 15 min | Low |
| UAT | 10 min | Low (testable via chatbot) |
| DevOps | 15 min | Low |
| **Total** | ~2h | Low — all infrastructure exists |

Key uncertainty driver: Whether `opening_hours` data coverage in the DB is sufficient to produce useful results for Stuttgart specifically.

---

## Validation

- Chatbot query "Zeig mir offene Burger Restaurants in Stuttgart" returns only providers where `getOpenStatus()` returns `isOpen: true`
- Chatbot query without "open" intent returns all providers with annotation
- No regression in existing chatbot searches

---

## Rollback

If issues arise post-deploy:
- Revert the tool definition change (remove `open_now` param) → LLM stops using the filter
- The RPC column addition is harmless and can remain
- No DB data changes to roll back
