---
ID: 199
Origin: 199
UUID: c4e8f213
Status: Test Strategy Development
---

# QA Test Strategy: Plan 199 — Chatbot "Open Now" Filter

**Plan Reference**: `agent-output/planning/199-chatbot-open-now-filter.md`
**QA Specialist**: QA
**Date Started**: 2026-08-02

## Changelog

| Date | Agent Handoff | Request | Summary |
|------|---------------|---------|---------|
| 2026-08-02 | Code Reviewer → QA | Create test strategy for Plan 199 | Designed comprehensive test strategy covering unit, integration, regression, and user-facing paths. Test infrastructure identified. |

## Timeline

- **Test Strategy Started**: 2026-08-02T19:45Z
- **Test Strategy Completed**: [pending]
- **Implementation Received**: [pending]
- **Testing Started**: [pending]
- **Testing Completed**: [pending]
- **Final Status**: [pending]

---

## Test Strategy (Pre-Implementation)

### Testing Approach

User-centric perspective: The user reported a bug — "asking the chatbot for open restaurants returned closed ones." The fix adds an `open_now` filter + status annotation. Testing must validate:

1. **Happy path (temporal keywords)**: User asks for "open" restaurants → only open ones returned, annotated with open status
2. **General search (no filter)**: User asks without temporal intent → all results returned, all annotated with open/closed/unknown status
3. **Edge cases**: Overnight windows (closes 02:00), providers without opening_hours data, empty result sets
4. **Regression**: Existing chatbot searches unchanged, RPC backward compatible, other tools unaffected
5. **Integration**: Filter works end-to-end (chat message → LLM → tool call with open_now → executor filtering → user sees only open)

### Test Types & Coverage

#### Unit Tests (primary validation)

**Location**: `src/__tests__/features/chat/tool-executor.test.ts` (existing test file)

**Test Cases**:

1. **[UNIT] `search_providers` tool definition includes `open_now` parameter**
   - Assert that `TOOL_DEFINITIONS[0].function.parameters.properties.open_now` exists and is of type `boolean`
   - Ensures LLM can invoke the parameter

2. **[UNIT] Annotation: all results are annotated with `is_open` regardless of `open_now` value**
   - Mock RPC response with 3 providers: one with valid opening_hours, one with null, one with empty object
   - Assert each result includes `is_open: true | false | null` after executor processes them
   - Validates annotation-first design

3. **[UNIT] Filter: `open_now: true` returns only providers with `is_open === true`**
   - Mock RPC response with 5 providers: 2 open, 2 closed, 1 unknown
   - Call executor with `open_now: true`
   - Assert result length = 2, all with `is_open: true`
   - Validates filter correctness

4. **[UNIT] No filter: `open_now: false` or absent returns all results annotated**
   - Mock RPC response with 5 providers (mix of open/closed/unknown)
   - Call executor without `open_now` param and with `open_now: false`
   - Assert both return all 5 results, each annotated with correct `is_open`
   - Validates backward compatibility

5. **[UNIT] Time-aware status: overnight window (23:00–02:00) correctly identifies open status**
   - Mock provider with `opening_hours: { monday: { open: '23:00', close: '02:00' } }`
   - Mock `getOpenStatus()` to return `isOpen: true` for times in window, `false` otherwise
   - Assert annotation reflects this
   - Validates time logic is delegated correctly to `getOpenStatus`

6. **[UNIT] Null opening_hours: provider without data is annotated `is_open: null`, excluded from `open_now: true` filter**
   - Mock provider with `opening_hours: null`
   - Assert result has `is_open: null`
   - Assert provider excluded when `open_now: true`
   - Validates null handling per Decision D6

#### Integration Tests (optional, if Implementer creates)

**Location**: `src/__tests__/features/chat/tool-executor.integration.test.ts` (if created)

**Test Cases** (high-level intent):

1. **[INTEGRATION] Full chat flow: "zeig mir offene restaurants in berlin"**
   - Mock: chat message → LLM calls `search_providers` tool with `open_now: true`
   - Mock: RPC returns providers with opening_hours
   - Assert: executor filters to only open ones
   - Validates end-to-end flow (chat → LLM → tool → filter)

#### Regression Tests

**Location**: `src/__tests__/features/chat/tool-executor.test.ts` (within existing tests)

**Test Cases**:

1. **[REGRESSION] Existing `search_providers` calls (no `open_now`) still work**
   - Existing test: "calls search_providers_chat RPC with parsed arguments"
   - Re-run to ensure no breakage
   - Assert results are returned with both old AND new columns (opening_hours)

2. **[REGRESSION] Other chatbot tools unchanged**
   - `get_provider_details`, `get_categories`, `get_cities`, `check_registration_status`, `register_provider`
   - Run existing tests to ensure no side effects

3. **[REGRESSION] RPC backward compatibility**
   - Callers that don't handle `opening_hours` column should still work (extra columns are safe)
   - Implicit via unit tests that mock RPC responses with the new column

#### System/Browser Testing (manual QA phase)

**Test Cases**:

1. **[MANUAL] Chatbot "open now" query in browser**
   - Deploy to UAT
   - Open chatbot widget
   - Ask: "Zeig mir offene Burger Restaurants in Stuttgart"
   - Verify: LLM sets `open_now: true` and only open restaurants are shown
   - Verify: each result shows open/closed status indicator

2. **[MANUAL] Chatbot general query in browser**
   - Ask: "Welche Restaurants gibt es in Stuttgart?"
   - Verify: all restaurants shown, status indicators on each

3. **[MANUAL] Timezone behavior check (advisory)**
   - Note server time during test
   - Verify status matches server timezone (not user device time)
   - Document if drift is observed for future follow-up

---

## Testing Infrastructure Requirements

### Test Frameworks & Libraries

- **Vitest** (v3.2.7): Already in use, no new version needed
- **@testing-library/react**: Already in use for component tests
- **vi.mock()**: Mock Supabase RPC calls in tool-executor tests (already used)

### Configuration Files

- **vitest.config.ts**: Already configured, no changes needed
- Existing mock setup in `src/__tests__/features/chat/tool-executor.test.ts` is sufficient

### Mock Setup

- **Supabase RPC mock**: Already exists as `mockRpcSearch` in tool-executor tests
  - Extend mock response shape to include `opening_hours: JSONB`
- **`getOpenStatus` mock**: May need to mock `@/utils/openStatus` to control open/closed returns in tests
  - Allows predictable test isolation (don't rely on actual time)

### Build Tooling

No new scripts needed. Run existing tests with:
```bash
npm test  # or npx vitest run
```

### Dependencies to Install

None — all existing.

---

## Test Matrix

| Test Type | File(s) | Count | Trigger | Ownership |
|-----------|---------|-------|---------|-----------|
| Unit | tool-executor.test.ts | 6 new | M2 completion (tool executor changes) | Implementer writes; QA verifies |
| Unit | system-prompt.test.ts | 1 new (optional) | M3 completion (system prompt changes) | Implementer writes; QA verifies |
| Regression | tool-executor.test.ts | 3 existing | Pre-test baseline | Run as-is to verify no breakage |
| Manual (browser) | N/A — UAT phase | 3 scenarios | Post-deployment to UAT | QA/UAT team executes |

---

## Acceptance Criteria

All of the following must pass before QA → APPROVED:

### Unit Test Gate

- [ ] `npx vitest run src/__tests__/features/chat/tool-executor.test.ts` → all pass (6 new tests + existing tests)
- [ ] `npx vitest run src/__tests__/features/chat/system-prompt.test.ts` → all pass (1 test or similar)
- [ ] No new lint errors (delta-lint on modified files)
- [ ] No new type errors (`npm run type-check`)

### Code Quality Gate

- [ ] Build succeeds (`npm run build`)
- [ ] No regressions in unrelated tests

### Functional Gate (UAT phase)

- [ ] Chatbot "open now" query returns only open providers
- [ ] Chatbot general query returns all providers with status annotations
- [ ] No user-visible errors or crashes in chatbot widget

---

## Key Test Scenarios & Failure Modes

| Scenario | Expected Behavior | Failure Mode | Severity |
|----------|-------------------|--------------|----------|
| User: "open restaurants in Stuttgart" | Only currently-open providers shown, annotated with "✅ Geöffnet" | Closed providers shown without filtering | CRITICAL |
| User: "restaurants in Stuttgart" | All providers shown, each annotated with open/closed/unknown status | Providers shown without status indicator | HIGH |
| Provider has no opening_hours data | Marked as "is_open: null", excluded from "open now" queries | Silently assumed open (type coercion error) | MEDIUM |
| Overnight window (23:00–02:00 close) | Correct open/closed determination at/after midnight | False closure during overlap window | MEDIUM |
| Existing search (no "open" intent) | Works unchanged, RPC returns all columns including new `opening_hours` | 500 error if caller can't handle extra column | HIGH |

---

## Telemetry / Observability

**Optional telemetry additions** (not blocking; advisory for future):

- Log when `open_now: true` filter excludes results (helps diagnose low result counts)
- Log if most providers lack `opening_hours` data (indicates data quality issue)
- Structured log: `{ event: 'search_providers_chat_open_now', query, openNowRequested, resultsBeforeFilter, resultsAfterFilter }`

---

## Known Constraints & Deferrals

1. **Migration 121 must be applied to target environment before functional testing**
   - RPC change requires DB migration execution
   - DevOps/QA gate: confirm migration applied before running browser tests

2. **Server timezone behavior (LOW advisory)**
   - `getOpenStatus()` uses server-local `new Date()`, not explicit timezone param
   - For EU deployment on Hetzner EU, acceptable
   - If drift observed: document for follow-up plan

3. **Data quality dependency**
   - If most Stuttgart providers lack `opening_hours` JSONB, filter will yield very few results
   - Acceptable (correct behavior); LLM will note "limited data"
   - Enrichment pipeline continues populating this field

---

## Test Execution Checklist (Phase 2)

When implementation is complete:

- [ ] Read implementation doc (`agent-output/implementation/199-*.md`)
- [ ] Verify TDD Compliance table is present and complete
- [ ] Identify all new functions/classes requiring test coverage
- [ ] Run: `npm test` (full suite) → record pass/fail
- [ ] Run: `npm run type-check` → 0 errors
- [ ] Run: `npm run lint` → record delta-lint (delta-lint on changed files only)
- [ ] Run: `npm run build` → success
- [ ] Verify migration 121 content (SQL syntax, idempotency, backward compat)
- [ ] Record evidence in QA doc
- [ ] If all gates pass: mark "QA Complete", hand off to UAT
- [ ] If any gate fails: document blocker, hand back to Implementer

---

## Summary

**Plan 199 testing is straightforward**: The feature is surgical (add 1 column to RPC, add 1 parameter to tool, add filtering logic), reuses proven `getOpenStatus()` utility, and has clear acceptance criteria. Unit tests cover all paths (filter on/off, annotation, null handling). Regression tests ensure no breakage. UAT validates user-facing behavior.

**Test infrastructure**: Fully available (Vitest, mocks, config). No new dependencies.

**Timeline**: 15 min QA (unit + regression gates), ~10 min manual UAT validation.

Handing off to **Implementer** to create test files and implement changes. QA will execute Phase 2 (test execution) upon completion.
