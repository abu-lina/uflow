---
ID: 081
Origin: 081
UUID: c7e3a91d
Status: Resolved
---

# Critique — Plan 081: Fix Community Service Detail Page Server Component Crash

**Artifact**: `agent-output/planning/081-community-service-detail-crash-plan.md`
**Analysis**: `agent-output/analysis/closed/081-community-service-detail-crash-analysis.md`
**Date**: 2026-04-05
**Status**: Initial Review

## Changelog

| Date | Handoff | Request | Summary |
|------|---------|---------|---------|
| 2026-04-05T19:00Z | planner → critic | Initial critique | Reviewed plan; 1 MEDIUM, 2 LOW findings |
| 2026-04-05T19:10Z | planner revision | F1+F2 addressed | Risk #1 corrected (offers/needs), Assumption 3+4 reworded |

## Value Statement Assessment

Clear, well-formed user story. Directly addresses a broken core workflow in production. The "so that" clause captures tangible value (owner can view/edit content). No drift from master product objective.

## Overview

The plan is well-scoped for a production bugfix: 4 milestones, 2-file import fix, regression test, build verification. RCA is L1 Proven and the fix is straightforward — switching from client Supabase module to the existing `.server.ts` module. Decision Record is fully resolved. Duration estimates are reasonable and appropriately bounded. The plan respects the WHAT/WHY boundary and avoids prescribing implementation details beyond the targeted import changes.

## Architectural Alignment

Correct approach: the plan uses the existing `.server.ts` module pattern that is already established in the codebase. No new patterns introduced. No migrations, no RLS changes, no infrastructure changes. Clean rollback path.

The plan's scope is intentionally limited to the crashing route (M1) plus one hardening target (M2). This is appropriate for a production bugfix — broader systemic fixes belong in a follow-up plan.

## Scope Assessment

M1 (crashing page) — minimal, correct, no concerns.
M2 (provider hardening) — appropriate scope expansion, but carries a type-compatibility risk that is misdescribed (see F1 below).
M3 (regression tests) — TDD pre-fix/post-fix pattern appropriate for bugfix.
M4 (build verification) — standard gate.

## Technical Debt Risks

None introduced. The import fix reduces existing technical debt (wrong module used in Server Component). The systemic risk of other Server Components using client modules is acknowledged as a future concern (Risk #2), not deferred debt from this plan.

## Findings

### F1 — Risk #1 description is inverted: offers/needs missing, not badges (MEDIUM)

| Field | Value |
|-------|-------|
| **Status** | RESOLVED |

**Issue**: Assumption 3 and Risk #1 state the server `getProviderById` "may not fetch badges." This is incorrect. The server version (`providers.server.ts` line 23–55) DOES fetch badges via `getBadgesForEntityServer`. However, it does NOT resolve offer/need names — compare:

- **Client** (`providers.ts`): Fetches offers, needs, AND badges in parallel → returns `{ ...data, offers, needs, badges }`
- **Server** (`providers.server.ts`): Fetches only badges → returns `{ ...data, badges }`

The `ProviderDetailPageClient` uses `useProvider` with `initialData` from SSR and `refetchOnMount: false` + `staleTime: 5min`. If M2 switches to the server module, the initial render (up to 5 minutes) would display the provider without resolved offer/need names until React Query refetches from the client module.

**Impact**: M2 could introduce a visible regression — offer/need labels absent on initial page load for up to 5 minutes. This contradicts M2's acceptance criteria: "No runtime regressions on provider detail view."

**Recommendation**: Correct Risk #1 description to reference offers/needs (not badges). Instruct the implementer to either:
- (a) Add parallel offers/needs fetching to `providers.server.ts` `getProviderById` (aligning with the client version), OR
- (b) Accept the regression as minor and document it, OR
- (c) If fixing is out of scope, defer M2 to a follow-up plan rather than introducing a regression while "hardening."

### F2 — Assumption 4 is broader than verified (LOW)

| Field | Value |
|-------|-------|
| **Status** | RESOLVED |
| **Severity** | LOW |

**Issue**: Assumption 4 states: "No other Server Component pages import runtime functions from client service modules beyond the two identified files." The analyst audit only checked `communityServices` imports. Five additional Server Component files import from the client `providers.ts` module:
- `src/app/(public)/providers/page.tsx`
- `src/app/(public)/profile/providers/[provider_id]/edit/page.tsx`
- `src/app/(public)/profile/providers/[provider_id]/page.tsx`
- `src/app/(public)/providers/[provider_id]/page.tsx` (covered by M2)
- `src/app/api/providers/search/route.ts`

**Impact**: Assumption stated as fact when only partially verified. These files work today only because providers has a permissive `USING(true)` SELECT policy. No immediate risk, but the assumption should be corrected.

**Recommendation**: Reword Assumption 4 to: "For `communityServices`, no other Server Component pages import beyond the two identified. For `providers`, additional server-side imports exist but are not in scope for this bugfix (covered by Risk #2)."

### F3 — Planner chatmode file missing (LOW — process)

| Field | Value |
|-------|-------|
| **Status** | OPEN |
| **Severity** | LOW |

**Issue**: `.github/chatmodes/planner.chatmode.md` does not exist. Critic protocol requires reading it at review start.

**Impact**: Process compliance only. No impact on plan quality.

**Recommendation**: No action needed for this plan. Consider creating the chatmode file as a housekeeping task.

## Questions

None blocking.

## Risk Assessment

Overall risk is LOW for M1. M2 carries a MEDIUM risk due to the misdescribed type compatibility gap (F1). The plan's rollback strategy is clean (single commit revert).

## Recommendations

1. **Required before implementation**: Correct Risk #1 description so implementer checks the right thing (offers/needs, not badges). This is the only finding that could cause a regression if unaddressed.
2. **Nice-to-have**: Correct Assumption 4 wording for accuracy.
3. M1 can proceed independently of M2 corrections if needed — the crashing bug fix is clean.

## Verdict

**APPROVED** — all conditions met. F1 and F2 resolved in plan revision 2026-04-05T19:10Z. F3 acknowledged (process, no action). Ready for Implementer.
