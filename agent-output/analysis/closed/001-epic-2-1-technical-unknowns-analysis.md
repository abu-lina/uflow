---
ID: 001
Origin: 001
UUID: bf1ae598
Status: Planned
---

## Change Log

| Date       | Agent   | Change            | Rationale |
| ---------- | ------- | ----------------- | --------- |
| 2026-02-21 | planner | Marked as Planned | Analysis has been incorporated into Plan 001 replan and implementation gates are already completed |

# 001 — Epic 2.1 Trust System: Technical Unknowns Analysis

**Date**: 2026-01-27
**Trigger**: User requested deep investigation due to technical unknowns before implementing architecture-gated work (F1–F3).
**Scope**: Trust/badges privacy posture (F1), role authority unification (F2), DB-side ranking + pagination stability (F3), and related performance/UX implications.

## Value Statement and Business Objective

As a **service seeker**, I want **trust signals that are credible and privacy-safe**, so that **I can confidently choose providers and UFlow earns durable trust within the Ummah**.

## Current Evidence (Repo Facts)

### Trust/badges RLS posture (F1)

- The badge trust schema exists and has RLS enabled in supabase/migrations/016_create_badge_trust_system.sql.
- That migration currently defines **public SELECT** access for:
  - `public.badge_confirmations` (explicitly “viewable by everyone”).
  - `public.badge_verifications` (explicitly “viewable by everyone”).
- The app’s badge read API (`src/app/api/badges/entity/route.ts`) is intentionally public and returns badge details + `user_has_confirmed`, but currently **omits `confirmation_count`**.

**Why this matters**

- `badge_confirmations` contains `user_id` and is inherently linkable personal data. Public SELECT enables identity leakage and linkage attacks.
- `badge_verifications` contains `verified_by_user_id` and is audit-trail data; public read may unintentionally expose staff/admin identities.

### Role authority fragmentation (F2)

- App logic already treats `public.users.role` as authoritative in server code (`src/lib/auth/roles.ts` queries `public.users` via admin client).
- Multiple SQL/RLS policies outside the badge system also use `public.users.role` (see sql/queries/supabase-schema.sql).
- Badge migration 016 uses `auth.users.raw_user_meta_data->>'role' = 'admin'` for admin checks.

**Why this matters**

- The system currently has **two competing sources** of “admin”: app DB roles vs auth metadata roles.
- Even if both are “correct sometimes,” inconsistency creates high-severity authorization bugs.

### Search ranking & pagination stability (F3)

- Current provider search (`src/services/providers.ts`):
  - Orders providers by `created_at`.
  - Performs badge fetching via **N+1** calls: `getBadgesForEntity()` per provider.
  - Sorts combined results by creation date after fetch.

**Why this matters**

- Trust-based ranking cannot be reliably applied client-side without breaking pagination stability.
- N+1 badge lookups will become a performance bottleneck as provider count increases.

## Key Technical Unknowns (Need Investigation)

### U1 — What is the intended public trust read contract?

Open questions:

- Should public consumers see per-badge `confirmation_count`?
- If yes, should counts be returned on search cards, provider detail pages, or both?

Why it’s unknown:

- Current API response explicitly hides `confirmation_count`, which conflicts with Epic 2.1 AC2 (endorsement counts as social proof).

### U2 — How should we safely support “user_has_confirmed” after locking down confirmations?

Options to validate:

- Keep `user_has_confirmed` by adding a **SELECT policy** for authenticated users to read only their own confirmation rows (while removing public SELECT).
- Avoid exposing confirmation rows entirely to public endpoints by splitting:
  - public endpoint returns aggregate trust data
  - authenticated endpoint returns user-specific confirmation flags

Unknowns:

- Which endpoints/components depend on confirmation-row visibility today beyond the badge service layer.

### U3 — The correct DB artifact for `provider_trust_summary`

We need to choose:

- View vs materialized view vs RPC function (or combination).

Unknowns:

- Expected scale (providers, badges/provider, confirmations/badge).
- Whether the search path needs to union providers + community services into one ranked feed.
- Whether Supabase PostgREST requirements force an RPC for ranking (e.g., if ordering by computed scores is awkward in query builder).

### U4 — Role normalization migration path

Unknowns:

- What percentage of admin/moderator identities live only in auth metadata vs in `public.users.role`.
- Whether we need a backfill/sync job (one-off SQL) before changing policies.

### U5 — Public visibility rules for unapproved entities

Unknowns:

- Should badges/trust data for unapproved providers/community services be visible publicly?
- Current badge RLS uses `USING (true)` for provider_badges, which may expose badges for entities not publicly selectable under their own table RLS.

## Design Options (Evaluated)

### Option A (Recommended): Aggregate-only public reads + per-user confirmation reads

- Remove public SELECT on `badge_confirmations`.
- Add SELECT for authenticated users restricted to `user_id = auth.uid()`.
- Make public UI consume:
  - `provider_badges.confirmation_count` and `trust_level`, and/or
  - a `provider_trust_summary` aggregate read model that does not touch raw confirmation rows.

Pros:

- Strong privacy posture.
- Supports “user_has_confirmed” without leaking other users.
- Aligns with Postgres-first and existing triggers that maintain `confirmation_count`.

Cons / Unknowns:

- Requires clarity on what the public contract is (counts vs no counts).

### Option B: Public aggregate view that still references confirmations

- Create a view that aggregates confirmations but does not expose identity columns.

Pros:

- Centralizes aggregation.

Cons / Unknowns:

- Privilege/RLS interaction for views must be handled carefully to avoid reintroducing leakage.

### Option C: Materialized view for ranking + read performance

- Materialize trust summary for fast ordering at scale.

Pros:

- Good performance at large scale.

Cons / Unknowns:

- Adds operational complexity (refresh strategy, staleness, failure modes).
- Likely unnecessary early unless scale is already high.

### Option D: RPC function for ranked search results

- Create a database function that returns ranked search results with stable tie-breakers.

Pros:

- Ensures deterministic ordering and pagination.
- Simplifies client query patterns.

Cons / Unknowns:

- More DB work up-front.
- Needs a careful contract for “both providers and community services.”

## Recommended Investigation Plan (REQUIRES ANALYSIS)

1. **Policy impact scan**
   - Confirm all app/code paths that read `badge_confirmations` and `badge_verifications`.
   - Verify whether any public endpoint currently returns confirmer identities.

2. **Define public trust contract**
   - Decide whether public responses include `confirmation_count` (per-badge) and/or only aggregate provider-level trust.

3. **DB read model selection**
   - Choose Option A as baseline.
   - Decide whether ranking requires an RPC (Option D) depending on search UX needs and Supabase query limitations.

4. **Role normalization preflight**
   - Validate where “admin” currently lives (auth metadata vs `public.users.role`).
   - Decide migration/backfill approach.

5. **Visibility constraints for unapproved entities**
   - Decide whether badge/trust data should be restricted to approved providers/services when unauthenticated.

## Outputs (What this analysis unblocks)

- A confirmed, privacy-safe public read contract for trust/endorsements.
- A concrete DB-side ranking approach that preserves pagination stability.
- A clear path to unify roles across RLS and server routes.

## Decisions (Pending)

- **OPEN QUESTION**: Should public consumers see `confirmation_count`? If yes, where (search cards, provider page, both)?
- **OPEN QUESTION**: Do we need an RPC-based unified ranked search across providers + community services, or is provider-only ranking sufficient for v0.2.0?
- **OPEN QUESTION**: Should badge/trust data be public for unapproved entities?
