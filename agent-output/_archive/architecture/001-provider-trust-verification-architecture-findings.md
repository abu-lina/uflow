---
ID: 001
Origin: 001
UUID: ab8a542e
Status: Active
---

# 001 - Epic 2.1 Provider Trust & Verification: Architecture Findings

**Date**: 2026-01-27
**Trigger**: User required architectural assessment before planning
**Related**:

- Plan: agent-output/planning/001-provider-trust-verification-system.md
- Roadmap: agent-output/roadmap/product-roadmap.md

---

## Outcome Summary

Epic 2.1 is **architecturally feasible** and aligns with UFlow’s trust-first strategy. However, the current database RLS posture and role-authority fragmentation introduce **critical privacy/security risks** that must be resolved **before implementation**. Additionally, search ranking should be DB-side for stable pagination.

---

## Current State (Evidence)

### Trust/Badge schema already exists

- Supabase migration `016_create_badge_trust_system.sql` introduces:
  - `badge_types`, `provider_badges`, `badge_confirmations`, `badge_verifications`, `badge_system_config`
  - Triggers for `confirmation_count` and trust-level auto-promotion to `COMMUNITY_CONFIRMED`

### Role checks are fragmented

- Some API paths use `auth.users.raw_user_meta_data.role`
- Others use `public.users.role` (users table)
- Others fall back to `user.user_metadata.role`

This fragmentation is an architectural risk for any admin-verified flow.

---

## Critical Findings (Must Fix)

### F1 (CRITICAL): Privacy leak via public read of `badge_confirmations`

**Issue**: RLS policy allows public SELECT on `badge_confirmations`.

- This can expose `user_id` (and potentially allow linkage attacks) to anonymous users.

**Why it matters**:

- Endorsements are “social proof,” but confirmer identity is sensitive.
- UFlow’s mission and trust stance require privacy-safe defaults.

**Required Change**:

- Remove/replace public SELECT on `badge_confirmations`.
- Public consumers must read **aggregates only**:
  - counts per badge
  - trust_level per badge
  - optionally “has current user confirmed” (for logged-in user only)

**Recommended Pattern (Postgres-first)**:

- Create a view (or materialized view) that exposes only aggregate counts.
- Keep raw `badge_confirmations` selectable only by:
  - the confirmer (own rows)
  - admins (for abuse investigation)

---

### F2 (HIGH): Role-authority fragmentation (admin/moderator)

**Issue**: Admin checks exist in multiple places and use different sources.

**Risk**:

- Inconsistent access control → unauthorized verification actions or broken admin UX.

**Required Change**:

- Define a single role authority:
  - Prefer `public.users.role` as the canonical role table (fits existing patterns).
- Provide a Postgres `SECURITY DEFINER` function like `is_admin()` / `is_admin_or_moderator()` for RLS.
- Ensure Next.js API routes use the same role authority (no ad-hoc metadata checks).

---

### F3 (HIGH): Ranking must be computed DB-side for stable pagination

**Issue**: Client-side ranking on paginated results can cause unstable ordering across pages.

**Why it matters**:

- Users will perceive search as “random” and untrustworthy.
- Pagination correctness is a product-quality requirement.

**Required Change**:

- Compute trust_score and ordering in SQL (view/function), then paginate deterministically.

**Recommended Read Model**:

- `provider_trust_summary` view/materialized view per provider:
  - `highest_trust_level`
  - `trust_score`
  - `verified_badge_count`
  - `community_confirmed_badge_count`
  - `total_confirmations`
  - `top_badges` (optional)

---

## Non-Critical Findings (Should Fix)

### F4 (MED): Observability gap for trust workflows

Trust workflows are business-critical and must be diagnosable.

**Required Telemetry**

**Normal (always-on)**:

- Correlation ID on API requests
- Events:
  - `badge.confirmation.create` (success/fail)
  - `badge.confirmation.delete` (success/fail)
  - `badge.trust_level.changed` (success/fail)
- Fields (safe-by-default):
  - entity_type
  - entity_id
  - provider_badge_id
  - result
  - latency_ms

**Debug (opt-in)**:

- Include user_id only when explicitly authorized and behind a debug gate

---

## Architectural Requirements (Acceptance Gate)

Implementation MUST NOT start until:

1. Public read of confirmer identities is eliminated (F1)
2. Role authority is unified across RLS + API routes (F2)
3. Search ranking & pagination become DB-deterministic (F3)

---

## Alternatives Considered

1. **Keep public access to confirmations**
   - Rejected: violates privacy and increases abuse risk.

2. **Compute ranking on client**
   - Rejected: pagination instability and inconsistent results.

3. **External trust service**
   - Rejected: violates Postgres-first philosophy and adds operational complexity.

---

## Verdict

**APPROVED_WITH_CHANGES**

Epic 2.1 is approved as a direction, but implementation planning must be revised to incorporate the required changes above.

---

## Integration Notes for Planner / Implementer

- UI should consume trust aggregates by default (summary view), and only fetch full badge detail on provider detail pages.
- Avoid exposing confirmer identities in any UI/API response.
- Ensure all admin verification flows share the same authz mechanism used by RLS.

---

## Status

**Status**: Active

Next: implement the gated work (F1–F3) before feature delivery. Plan 001 was revised on 2026-01-27 to incorporate these requirements.
