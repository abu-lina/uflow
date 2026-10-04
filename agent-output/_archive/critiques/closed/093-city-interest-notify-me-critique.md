---
ID: 093
Origin: 093
UUID: b5e2a8c4
Status: Resolved
---

# Critique: Plan 093 — City Interest: "Notify Me" for Unavailable Cities

| Field | Value |
|-------|-------|
| Artifact | `agent-output/planning/093-city-interest-notify-me.md` |
| Analysis | None (direct planning from user request) |
| Date | 2026-04-19T14:15Z |
| Status | Initial Review |

## Changelog

| Date/Time | Handoff Context | User Request Summary | Summary |
|-----------|----------------|---------------------|---------|
| 2026-04-19T14:15Z | Planner → Critic (Phase 2) | User asked for better empty-city UX in /search Wo section; option 2 (notify-me feature) chosen over quick fix | Initial critique created; 4 findings (1 MEDIUM process, 1 MEDIUM architectural clarity, 2 LOW spec gaps) |
| 2026-04-19T14:30Z | Critic revision (R1) | F1 RPC verified; plan revised with `getSupabaseAdmin()` upsert approach | F1/F2/F3 resolved in plan revision; F4 accepted as process note; verdict updated to APPROVED |

---

## Value Statement Assessment

**Status**: ✅ **STRONG**

The value statement follows proper user story format and delivers clear, measurable value:

- **Format**: Correct "As a / I want / So that" structure
- **User**: Demand-side user (correct persona for search context)
- **Need**: Register interest and be notified when city becomes available
- **Outcome**: Not left at dead-end + platform captures growth signals
- **Measurability**: Business impact quantified ("40 users → Frankfurt justification")
- **Direct delivery**: User gets actual notification capability, not placeholder
- **Epic alignment**: ✅ Directly implements Epic 2.2 acceptance criterion: "Coming Soon cities show waitlist/interest capture for future expansion"

**Evidence**: The plan explicitly states it avoids the "Sei der Erste" (provider-first) mismatch and focuses on demand-side intent. The business impact section demonstrates strategic alignment with city expansion priorities.

---

## Overview

Plan 093 introduces a city interest notification feature for the `/search` page's Wo (Where) section. When a user searches for a city with no providers, instead of showing a dead-end message, the plan delivers an inline card with a "Notify me" CTA that captures demand signals for future city expansion.

**Architectural approach**: Reuses existing waitlist infrastructure (`waitlist.selected_city`, `get_city_interest_counts()` RPC) rather than creating new tables — strong YAGNI adherence. New `/api/city-interest/subscribe` endpoint handles both authenticated (one-tap, email from session) and anonymous (inline email capture) user paths.

**Scope**: 4 milestones covering empty-city UI card (M1), API endpoint (M2), full i18n across 6 languages (M3), and version artifacts (M4). Estimated 5–9h end-to-end.

---

## Architectural Alignment

**Roadmap Fit**: ✅ **STRONG** — Directly advances Epic 2.2 (City Community Pages & Discovery)

- Epic 2.2 acceptance criterion explicitly requires: "Coming Soon cities show waitlist/interest capture for future expansion"
- Plan 093 delivers exactly this for the search discovery surface
- Complements existing city infrastructure (`cities` table, city selection modal, waitlist system)

**Infrastructure Reuse**: ✅ **EXCELLENT**

- Leverages proven assets: `waitlist.selected_city`, `get_city_interest_counts()`, existing rate-limiting patterns
- No new DB migration required (migrations 017/018 already deployed)
- Follows established API route patterns (`/api/waitlist/*` → `/api/city-interest/*`)

**Consistency**:

- Translation structure: ✅ Adds keys under `suchen.*` namespace (consistent with existing search page structure)
- Auth pattern: ✅ Uses Supabase session for authenticated users (standard pattern)
- Rate limiting: ✅ 20 req/hr per IP (matches `/api/waitlist/*` constraints)

---

## Scope Assessment

**Boundaries**: ✅ **CLEAR**

- **In scope**: Empty-city UI on /search page, new subscription endpoint, 6-language i18n, version artifacts
- **Out of scope**: Admin notification workflow (when to notify users), city page UI beyond search, actual email sending mechanism (assumed existing)
- **Deferred**: None explicitly — all Epic 2.2 work for search surface is delivered here

**Deliverables**: Well-defined across M1–M4 with specific acceptance criteria per milestone.

**Milestone Sequencing**: ✅ Logical — M2 (API) and M3 (translations) are prerequisites for M1 (UI integration); M4 (version) is always last.

**Risk Disclosure**: Plan identifies 4 risks with appropriate severity ratings. RTL layout and RPC behaviour flagged correctly.

---

## Technical Debt Risks

### Short-term (M1–M4 execution)

**LOW** — Contained surface area, no architectural complexity introduced.

- New endpoint follows existing patterns
- UI component is isolated to one page section
- Translation keys are additive (no breaking changes)

### Medium-term (6–12 months)

**LOW** — Minimal ongoing maintenance burden.

**Rationale**:

- Reusing proven infrastructure reduces future refactoring risk
- City interest data is stored in existing `waitlist` table (no schema drift)
- `get_city_interest_counts()` RPC already exists for analytics/admin consumption

**Potential Future Touch Points**:

1. When Epic 2.2 is fully implemented with `/city/[cityname]` pages, the same interest capture UI may need to be surfaced there as well (not a debt, just natural evolution)
2. When notification emails are sent to interested users, the `waitlist.selected_city` data will be consumed (already designed for this)

### Long-term (>12 months)

**LOW** — No anticipated refactoring or migration needed.

---

## Findings

| # | Severity | Issue Title | Status | Description | Impact | Recommendation |
|---|----------|-------------|--------|-------------|--------|----------------|
| F1 | MEDIUM | RPC Invocation Ambiguity | OPEN | D6 states "update_waitlist_entry_with_token RPC can be called server-side for auth users" and M2 says "No waitlistToken required", but the RPC signature includes `p_token: string` as a required parameter. The Handoff Notes flag this as OPTIONAL ANALYSIS, but this could block M2 implementation if the RPC fails for missing token or is update-only (not upsert). | Medium — Could cause implementation delay or require mid-stream architectural pivot if RPC behaviour doesn't match assumptions | **Elevate to REQUIRED ANALYSIS** before M2 start: Implementer must verify `update_waitlist_entry_with_token` behaviour for: (a) empty/null `p_token` parameter acceptance, (b) upsert vs update-only semantics for new email addresses. If RPC requires token or is update-only, use direct INSERT/UPSERT on `waitlist` table instead. Document decision in implementation notes. |
| F2 | MEDIUM | Session Auth Pattern Not Specified | OPEN | M2 says to "extract email from session" for authenticated users but doesn't specify the server-side Supabase client pattern to use. UFlow codebase uses `createSupabaseServerClient()` consistently for server-side session access. | Low-Medium — Implementer could use inconsistent pattern or waste time discovering correct approach | Specify in M2 scope: "Use `createSupabaseServerClient()` to retrieve session, then access `session.user.email` (consistent with existing `/api/waitlist/*` patterns)". Reference: `src/lib/supabase/server.ts`. |
| F3 | LOW | Provider Onboarding Link Target Unspecified | OPEN | M1 scope mentions "Bist du Anbieter? Jetzt eintragen →" link but doesn't specify the target route. | Low — Implementer will likely infer correctly (`/recommend`), but explicit specification avoids ambiguity | Add to M1 acceptance criteria: "Provider CTA links to `/recommend` (standard provider onboarding entry point)". |
| F4 | LOW | Duration Estimates Missing Structured Format | OPEN | Plan includes duration estimates (5–9h total), which is ✅ compliant with Process Improvement requirements. However, the estimates table doesn't follow the exact "Planner / Critic / Implementer / QA / UAT / DevOps" row structure seen in some recent plans (e.g., Plan 090). | Very Low — Information is present, just formatted slightly differently | PROCESS NOTE: Confirm whether duration estimates must follow strict phase-by-phase table format or if current "Phase / Estimate / Uncertainty driver" format is acceptable. Current format is readable and informative; this is a consistency question, not a blocker. |

---

## Questions

1. **RPC Token Parameter** (relates to F1): Can `update_waitlist_entry_with_token` accept an empty string or null for `p_token` when called server-side with a valid session? Or should M2 bypass the RPC entirely and use direct `waitlist` table INSERT/UPSERT?

2. **Email Sending Mechanism** (out of scope, but worth clarifying): When a city "goes live" (providers added), who triggers the notification emails to interested users? Is this assumed to be a future manual process, or does Plan 093 need to document a follow-up plan for the notification sender? *(Appears out of scope, but good to confirm no hidden assumption.)*

---

## Risk Assessment

**Overall Risk**: 🟢 **LOW**

| Category | Rating | Rationale |
|----------|--------|-----------|
| Architectural | 🟢 LOW | Reuses proven infrastructure; no new complexity |
| Implementation | 🟡 MEDIUM | F1 (RPC ambiguity) could cause mid-stream pivot; otherwise straightforward |
| Testing | 🟢 LOW | Clear test scenarios; auth vs anonymous paths are testable in isolation |
| Deployment | 🟢 LOW | No DB migration; patch version bump only |
| User Impact | 🟢 LOW | Additive feature; no breaking changes to existing flows |

**Blocking Risks**: None if F1 is resolved before M2 start.

---

## Recommendations

### Immediate (Pre-Implementation)

1. **REQUIRED**: Resolve F1 (RPC behaviour) before M2 implementation starts. Add a checkpoint in the implementation plan: `[CHECKPOINT: Verify update_waitlist_entry_with_token RPC accepts server-side session without token, or pivot to direct waitlist INSERT/UPSERT]`.

2. **RECOMMENDED**: Address F2 (session auth pattern) by adding explicit `createSupabaseServerClient()` reference to M2 scope.

3. **RECOMMENDED**: Address F3 (provider link target) by specifying `/recommend` route in M1 acceptance criteria.

### Strategic (Post-Implementation)

- When Epic 2.2 `/city/[cityname]` pages are built, reuse the M1 empty-city UI component for consistency across discovery surfaces.
- Consider surfacing `get_city_interest_counts()` data in an admin dashboard to prioritise outreach efforts (e.g., "Top 10 cities by interest signals").

---

## Revision History

_No revisions yet. This is the initial critique._

---

## Verdict

**STATUS**: ✅ **APPROVED**

**Rationale**:

- ✅ Value statement is strong, measurable, and Epic-aligned
- ✅ Architectural approach demonstrates excellent YAGNI adherence — reuses waitlist infrastructure with zero new DB schema
- ✅ Scope is clear with well-defined milestones and acceptance criteria
- ✅ Technical debt risk is low; no long-term refactoring concerns
- ✅ **F1 RESOLVED**: RPC confirmed update-only + token-required; M2 updated to use `getSupabaseAdmin()` upsert (established admin pattern)
- ✅ **F2 RESOLVED**: Session auth pattern specified (`createSupabaseServerClient()` → `getUser()` → `email`)
- ✅ **F3 RESOLVED**: Provider CTA route specified (`/recommend`)
- ℹ️ F4 (duration estimates format) accepted as process note — not a blocker

**Handoff to Implementer**: APPROVED — Plan is ready for implementation. No blocking issues remain.
