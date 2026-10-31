---
status: accepted
---

# Enrichment candidates use trust tiers: high-trust fields auto-apply, compliance fields require human review

Automated pipelines stage proposed field changes as enrichment candidates. Not all fields carry the same risk if wrong: a bad delivery link is inconvenient, but an incorrect `no_alcohol=false` on a halal restaurant erodes user trust in the platform's core promise. We split enrichment into two trust tiers: **high-trust** fields (delivery links, images) auto-apply with status `auto-applied`; **compliance** fields (`no_alcohol`, `no_pork`) stay `pending` and require human review before application.

Both tiers write a row to `enrichment_candidates` so the admin has a complete audit trail per provider.

## Considered options

### Auto-apply everything

Eliminates admin friction entirely. Rejected because halal compliance detection uses keyword matching on German menu text, which produces false positives (e.g. "Biergarten Salat" contains "Bier" but is a salad). A false `no_alcohol=false` going live without review violates the product's core value proposition.

### Full human review for all candidates (status quo)

Maximum control but forces admins to approve every Wolt link and image one by one. Delivery link and image matches are high-confidence and low-stakes if wrong — the admin burden isn't justified.

### Trust tiers (chosen)

High-trust fields auto-apply; compliance fields require review. Keeps the human checkpoint where it matters most (halal accuracy) while removing friction where it doesn't (links, images). The admin sees everything in one unified enrichment tab per provider: pending halal findings at the top ("Needs review"), auto-applied and historical items collapsed below ("History").

## Consequences

- Migration adds `auto-applied` to the `enrichment_status` CHECK constraint.
- Migration adds `evidence JSONB` column to `enrichment_candidates` for storing matched keywords, Maps attributes, and other pipeline reasoning.
- Pipelines for delivery links (`search-platform-delivery-links.ts`, `screen-provider-google-maps.ts`) and images (`enrich-images.ts`) write candidates with status `auto-applied` instead of `pending`.
- `enrich-halal-compliance.ts` writes matched keywords to `evidence` when staging.
- The provider edit page header shows "Pending review" instead of the derived halal tier (Gold/Silver/Bronze) when unreviewed halal candidates exist. The tier is not trustworthy until a human has reviewed the pipeline's findings.
- The halal edit page shows a banner linking to the enrichment tab when pending halal findings exist.
- The enrichment tab is restructured as a split view: "Needs review" (pending, with evidence) at top, "History" (auto-applied, applied, rejected) collapsed below.
- Approving a halal candidate immediately applies the value to `food_providers` (no separate apply step). Bulk approve-and-apply is available per provider.
- The `approved` status becomes unused for new candidates — pending goes directly to `applied` on approval.
