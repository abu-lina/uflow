---
ID: 036
Origin: 036
UUID: 7e3a6b1c
Status: Active
---

# 036 — Analytics Activation & Event Instrumentation (v0.7.1): Architecture Findings

**Date**: 2026-03-08
**Trigger**: Work chain #036 — activate Plausible + wire north-star events deferred from Plan 035
**Scope**: Plausible CE deployment boundary, analytics safety/availability, privacy constraints, event model stability

---

## Outcome Summary

Plan 036 is architecturally consistent with the existing growth measurement foundation shipped in v0.7.0 (Plan 035):

- Uses the established `trackEvent()` wrapper (SSR-safe and non-fatal)
- Preserves GDPR posture (no cookies, no PII in event props)
- Respects the self-hosting allowance from Arch 035 by requiring guardrails

**Verdict**: **APPROVED** — no new architectural decisions are required beyond codifying the analytics ADR in the evergreen master doc.

---

## Architectural Requirements (Must-Haves)

### R1 — Analytics must be non-fatal

- `trackEvent()` calls MUST be safe when:
  - running in SSR context
  - Plausible script is not injected (env vars unset)
  - Plausible host is down

**Rationale**: Analytics availability must never affect core product paths.

### R2 — Self-hosting boundary: separate stack with persistence

If Plausible CE is self-hosted on Hetzner:

- Run as a **separate container stack** from the Next.js app stack
- Use persistent storage for Postgres + ClickHouse (named volumes)
- Add health checks and restart policies

**Rationale**: Keeps operational failure blast radius contained and enables safe restarts/upgrades.

### R3 — Access controls are mandatory

- Plausible admin MUST be protected by at least one control:
  - strong credentials AND
  - preferably an additional layer (IP allowlist and/or reverse-proxy auth)

**Rationale**: Admin UI exposure is the primary risk surface in self-hosted analytics.

### R4 — Privacy guardrails (strict)

Event properties MUST remain:

- **non-PII**
- **low-cardinality**

Explicitly forbidden in event props: provider IDs, emails, phone numbers, URLs, free-text fields.

**Rationale**: Preserves GDPR posture and prevents high-cardinality dashboard noise.

---

## Event Model Notes (Stability)

- `contact_intent_triggered`
  - props: `{ contact_type: 'call' | 'website', city }`

- `provider_profile_completed`
  - props: `{ city, has_phone: boolean, has_website: boolean }`

These are acceptable as stable north-star metrics.

**Note**: Plan 035 mentioned “email tap” conceptually. The current UI handler set (ProviderActionBar/CardModal/DetailModal) does not expose an email CTA, so keeping `contact_type` to `call|website` is consistent with current UX and avoids speculative instrumentation.

---

## Integration / Deployment Constraints

- CSP allowlists must align with `NEXT_PUBLIC_PLAUSIBLE_HOST` (self-host URL). The current approach of referencing the env var in CSP is architecturally correct; ensure env values are correct in UAT + production.
- If a reverse proxy is used, ensure Plausible’s public `BASE_URL` matches the externally visible hostname.

---

## Next Steps (for Implementer)

1. Deploy Plausible CE with guardrails (persistence, health checks, access controls, backups).
2. Wire `trackEvent()` at the single emission points to avoid double counting.
3. Validate events in UAT first, then production.

---

✅ PHASE COMPLETE: ④ Architect — Verdict: **APPROVED**
📄 Output: agent-output/architecture/036-analytics-activation-architecture-findings.md
➡️ NEXT: Pick "⑤ Implementer" from the Orchestrator handoff suggestions
   Gate: Implementation doc must exist with TDD compliance
