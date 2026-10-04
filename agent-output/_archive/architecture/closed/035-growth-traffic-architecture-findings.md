---
ID: 035
Origin: 035
UUID: 10b4766e
Status: Released
---

# 035 — Growth (v0.7.0): Architecture Findings (City SSR/ISR, Plausible, UTMs)

**Date**: 2026-03-07
**Trigger**: Plan 035 approved; architectural decisions required before implementation (M2 SSR refactor, analytics, referral attribution).

> Memory note: Flowbaby memory tools are not available in this environment; operating in **no-memory mode**.

## Outcome Summary

Plan 035 is architecturally feasible and consistent with UFlow’s App Router direction, but implementation MUST make explicit choices for:

1. **City pages rendering strategy** (SSR vs ISR vs static) to ensure SEO and predictable caching.
2. **Analytics deployment boundary** (self-hosted Plausible vs managed) to avoid accidental ops burden.
3. **UTM/referral query-string semantics** to avoid cache fragmentation and SEO duplicate URLs.

**Verdict**: **APPROVED_WITH_CHANGES** — proceed once the decisions below are adopted as implementation constraints.

---

## Evidence (Current State)

- `src/app/(public)/city/[cityName]/page.tsx` is route-level `'use client'`.
- It performs client-side Supabase reads in `useEffect` (cities + provider counts), and uses `localStorage`/`sessionStorage` side-effects.

This prevents crawlers from seeing complete initial HTML and creates avoidable hydration/bundle cost for a key acquisition surface.

---

## Decision 1 — City Pages: Use ISR (not fully dynamic SSR)

**Choice**: Implement `/city/[cityName]` as a **Server Component route** with **ISR**.

- Use `generateStaticParams()` for the known cities table (Germany seed list).
- Keep `searchParams` out of the server route so query strings (UTMs) don’t force dynamic rendering.
- Set `revalidate` for freshness; recommended starting point: **300s** (5 minutes).

**Why ISR over dynamic SSR?**

- City pages are high-traffic acquisition surfaces; SSR on every request increases origin load and raises tail latency risk.
- Provider counts don’t require second-by-second accuracy; 5-minute freshness is acceptable for stage thresholds.
- Germany-only cities list is small (seeded list), making static params practical.

**Alternatives**:

- **Dynamic SSR** (`force-dynamic`): accurate counts but higher origin load and less predictable caching.
- **Pure static** (no revalidate): too stale for stage transitions and supply growth.

**Implementation constraints**:

- Stage selection (`stage1/2/3`) must be computed on the server from provider_count.
- Keep local/session storage side-effects in a tiny client island (e.g., “remember selected city” effect) so HTML remains indexable.
- Unknown city slugs should not create thin pages. Prefer `notFound()` / redirect to city selection unless explicitly supported.

---

## Decision 2 — Caching Authority & ADR-004 Scope

**ADR-004 remains API-only** (route handlers own Cache-Control for `/api/*`).

However, city pages introduce **HTML caching concerns** that are adjacent but distinct:

- Next.js App Router caching is controlled via segment config (`revalidate`, `dynamic`, `fetch` caching).
- Edge caching (Cloudflare) should not accidentally treat `utm_*` variants as distinct cache keys if HTML caching is enabled later.

**Required addendum**: Create a new ADR for **public page caching + query string canonicalization** (see ADR-005 in `system-architecture.md`).

---

## Decision 3 — Plausible Analytics: Managed-first, Self-host allowed with guardrails

**Primary recommendation (lowest risk)**: **Plausible Cloud (EU region)** for v0.7.0.

- Minimal ops burden; avoids maintaining ClickHouse/Postgres stacks.
- Still GDPR-aligned and cookie-less by default.

**If self-hosted on Hetzner (acceptable)**, require these guardrails:

- Run Plausible as a **separate container stack** with:
  - dedicated persistent storage (volume backups)
  - health checks + restart policies
  - basic monitoring (CPU/disk; ClickHouse disk growth is the usual failure mode)
- Put the Plausible admin behind strong access controls (at least strong credentials; ideally IP allowlist or SSO if available).
- Ensure analytics failure is non-fatal: script loads `defer`, app works with analytics down.
- Ensure privacy posture is explicit: no PII in event props; avoid high-cardinality identifiers unless needed.

**Docs impact**: privacy policy should add Plausible as a processor (even if cookie-less).

---

## Decision 4 — Referral Attribution: UTMs OK, but must not cause SEO/caching issues

**No codebase conflicts found** with `utm_*` patterns.

**Constraints**:

- Canonical URLs for indexable pages must exclude query strings (UTMs).
- Avoid using `searchParams` in Server Components for these routes (keeps ISR viable).
- If edge HTML caching is added later, configure Cloudflare to **ignore `utm_*`** in cache key to prevent cache bloat.

**Recommended UTM standard**:

- `utm_source=referral|partner`
- `utm_medium=invite|community`
- `utm_campaign=city-builder|partner-kit`
- Optional `utm_content=` for creative variant

---

## Next Steps (for Implementer)

1. Implement M2 refactor using the Server Component + client island pattern (aligns with App Router best practices).
2. Confirm decision: Plausible Cloud vs self-host; if self-host, add infra ticket for container + backups.
3. Ensure metadata/canonicals strip UTMs; ensure noindex for thin/empty pages if needed.
