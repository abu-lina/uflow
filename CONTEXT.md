# Ummah Flow — Domain Glossary

The canonical vocabulary for this codebase. Use these terms in code, tests, issues, and conversation. Full definitions live in `GLOSSARY.md`.

---

## Directory

**Provider** — a business or initiative in the directory. One row in `providers`.

**Listing Type** — which top-level section a Provider belongs to: `food`, `store`, or `ummah`. Exactly one per Provider.

**Category** — a label a Provider can be filed under, scoped to a Listing Type (or `all`).

**Primary Category** — the single Category used for display: cards, detail pages, gallery images, SEO routes.

**Secondary Category** — an additional Category used for search matching only, never shown as the Provider's identity.

**Category Type** — the axis a Category sits on: `cuisine`, `dish_type`, `dietary`, `meal`, or `store_type`.

**Applicable Section** — which Listing Type a Category may be used for, or `all`.

**Location** — a physical address belonging to a Provider. One Provider may have many Locations.

---

## Enrichment and compliance

**Screening** — an automated pass that checks a Provider's external signals for compliance markers (alcohol, pork). Produces Enrichment Candidates.

**Enrichment Candidate** — a proposed field change from the automated pipeline. Never applied directly; goes through auto-apply or Review depending on Trust Tier.

**Review** — a human decision on a pending Enrichment Candidate: approve (apply immediately) or reject.

**Trust Tier** — the confidence level for an enrichment field type. High-trust fields auto-apply; low-trust compliance fields (`no_alcohol`, `no_pork`) require Review. See ADR 0003.

---

## Development workflow

**Lane** — one GitHub issue worked in its own git worktree by one agent. Never shares an `area:*` label with a concurrent lane.

**Foreman** — an optional orchestrating agent that proposes and monitors lanes. Run one when working three or more parallel lanes across different areas.

**Issue Maturation** — the upstream step before a lane starts: a `/grill-with-docs` session that sharpens a rough idea into a GitHub issue with user-visible acceptance criteria and explicit out-of-scope boundaries.

**Owner** — the solo product owner who validates features. Validates on the lane's localhost port (before merge) and on UAT (after merge) before authorising a production deploy.
