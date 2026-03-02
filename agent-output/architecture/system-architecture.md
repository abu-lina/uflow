# UFlow System Architecture (Evergreen)

**Last Updated**: 2026-02-23
**Status**: Active

## Changelog

| Date       | Change                                                 | Rationale                                                                 | Related             |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------------------------- | ------------------- |
| 2026-01-27 | Initialized evergreen architecture doc in agent-output | Architect-mode requires a single source of truth for current system state | Plan 001 (Epic 2.1) |
| 2026-02-22 | App Router best-practices audit findings captured      | Document current Next.js boundary/caching risks for planned refactor      | Arch 010            |
| 2026-02-23 | Repo-structure review findings captured                | Reduce boundary drift; keep folder responsibilities crisp                 | Arch 011            |
| 2026-02-23 | Root-level file placement guidance captured            | Reduce root clutter; align files to docs/scripts/sql/imports conventions  | Arch 012            |
| 2026-03-02 | Agent memory tooling decision captured                | Flowbaby reliability issues; record local-first replacement direction     | Arch 032            |

---

## Purpose

UFlow (Ummah Flow) is a community services marketplace that connects Muslims with halal businesses and community services. The platform prioritizes **trust-first discovery** and **city-based community building** to strengthen the Ummah.

---

## High-Level Architecture

### Runtime Topology

- **Client**: Browser + PWA
- **Edge**: Cloudflare (CDN, security) → Nginx (reverse proxy)
- **App**: Next.js 15 (App Router) in Docker (Hetzner)
- **Backend**: Supabase (Auth, Postgres, Storage)
- **External**: Resend (email), OpenStreetMap/Nominatim (geocoding)

### Key Architectural Principle

**Postgres-first**: Prefer Postgres-native capabilities (RLS, views, indexes, triggers, full-text search) before adding external services.

---

## Core Components

### Next.js Application (src/)

- **App Router**: Route-driven features, server components by default
- **API Routes**: Server-side boundaries for privileged operations
- **Services Layer**: All Supabase queries go through src/services/

### Supabase (Auth + Postgres + Storage)

- **Auth**: Email/password + cookie session handling
- **Postgres**: Domain tables + RLS (privacy + tenancy)
- **Storage**: Provider images and media

---

## Key Runtime Flows

### 1) Discovery (Search → Provider Detail)

1. User searches by query/category/location.
2. Next.js queries Postgres via services.
3. Results render provider cards; user opens provider detail.

### 2) Early Access / City-based Community Mode

1. Unlaunched app routes gate users through early-access flow.
2. User selects city / recommends providers.
3. City interest captured for unlock strategy.

---

## Trust & Verification Subsystem (Epic 2.1 Target)

### Current State (Already Present)

A badge/trust schema exists in Postgres (migration 016) with:

- Badge types
- Badges attached to providers/community_services
- Community confirmations
- Admin verification audit trail
- Config-driven confirmation threshold

A services module exists for badge operations.

### Architectural Intent

Use badges as the primitive for trust signals:

- **Self-declared**: provider claims
- **Community confirmed**: community endorsements reach threshold
- **UFlow verified**: admin/authority verification

### Required Read Model Boundary (Recommended)

For performance and privacy, the UI should consume:

- **Aggregated trust summary** (per provider): highest trust level, total confirmations, top badges
- Full confirmation rows should not be broadly exposed

---

## Data Boundaries & RLS

### Privacy & PII

- Public pages should not expose user identifiers for endorsements.
- RLS must enforce that:
  - Users can create/delete their own confirmations.
  - Public consumers can only see **aggregates** (counts), not confirmer identities.

### Roles & Authorization

The system currently uses multiple role sources:

- `public.users.role` (app DB table)
- `auth.users.raw_user_meta_data.role` (Supabase auth metadata)
- `user.user_metadata.role` (client metadata fallback)

This is a known architecture risk; roles must be normalized behind a single authority.

---

## Observability (Architecture Requirement)

### Normal (Always-on, low volume)

- Correlation IDs on API routes
- Trust workflow state transitions:
  - `badge.confirmation.create` (success/fail)
  - `badge.confirmation.delete` (success/fail)
  - `badge.trust_level.changed` (success/fail)
- Dependency boundary metrics:
  - Supabase query name + duration + result category

### Debug (Opt-in)

- Detailed payload fields (still no secrets/PII unless explicitly authorized)
- Temporary per-request verbose tracing for trust workflows

---

## Quality Attributes

- **Security**: RLS correctness, role normalization, least-privilege service role use
- **Privacy**: prevent user_id leakage through public SELECT policies
- **Performance**: avoid N+1 badge lookups; prefer aggregated read models
- **Maintainability**: keep trust logic in Postgres triggers/views + focused services
- **Scalability**: stable pagination and ranking performed in SQL when possible

---

## Problem Areas (Design Debt Registry)

1. **Role authority fragmentation**: multiple sources of truth for role checks across API/RLS.
2. **Potential privacy leak risk**: public read access to confirmation rows can expose user IDs.
3. **Ranking stability risk**: client-side ranking can break pagination consistency; prefer DB-side ordering.
4. **App Router value leakage**: client-heavy data fetching and broad `'use client'` usage reduce streaming SSR and increase bundle/hydration costs.
5. **Caching suppressed by global dynamism**: app-wide `force-dynamic` prevents most static/ISR benefits and increases per-request backend load.
6. **Debug network calls in client code**: unguarded localhost ingest calls risk production noise/failures; debug telemetry must be opt-in.
7. **Agent memory tooling reliability**: Flowbaby memory tools frequently fail due to multi-window daemon ownership/lock contention, forcing NO-MEMORY MODE and reducing workflow quality.

---

## Decisions (ADRs in Master Doc)

### ADR-001: Trust system should expose aggregates publicly

- **Context**: Endorsements require social proof, but confirmer identities are sensitive.
- **Choice**: Public reads should use an aggregated trust read model (view/materialized view).
- **Alternatives**:
  - Publicly readable confirmation rows (rejected: privacy risk)
  - External trust service (rejected: violates Postgres-first)
- **Consequences**:
  - Requires additional DB objects and query refactor
  - Improves privacy, performance, and UX consistency

### ADR-002: Ranking should be computed in SQL

- **Context**: Search paging must be stable and fair.
- **Choice**: Compute trust_score and ordering in SQL to support deterministic pagination.
- **Alternatives**:
  - Client-side weighted ranking (rejected: pagination instability)
- **Consequences**:
  - Requires DB function/view/index support
  - Clearer performance characteristics

### ADR-003: Agent memory should be local-first and multi-window safe

- **Context**: The current agent memory system (Flowbaby) is frequently unavailable due to VS Code multi-window daemon ownership/lock contention, plus cloud authentication coupling. This forces frequent NO-MEMORY MODE operation and leads to repeated decisions and lower-quality output.
- **Choice**: Adopt a local-first agent memory backend that avoids single-owner daemon locks and supports concurrent access from multiple VS Code windows.
- **Alternatives**:
  - Keep Flowbaby and “just fix the lock” (rejected: still couples us to heavy dependencies and cloud auth; high regression risk).
  - Full knowledge-graph rebuild (rejected: overengineered for structured summary storage; violates KISS/YAGNI).
- **Consequences**:
  - Requires a small, maintained tooling extension/library.
  - Improves workflow reliability and reduces repeated work across sessions.

---

## Roadmap Readiness

Epic 2.1 (Provider Trust & Verification) is architecturally feasible because foundational schema exists, but implementation MUST address:

- Privacy-safe reads
- Role authority normalization
- DB-side stable ranking and pagination

---

## Recommendations

1. Normalize admin role checks behind a single function used by both API routes and RLS.
2. Replace public SELECT on confirmation rows with public aggregates.
3. Implement a trust summary read model and DB-side ordering for search.
4. Add minimal trust workflow telemetry (normal + debug) before rollout.
