# Ummah Flow

A directory of halal-conscious providers (food, stores, community initiatives) in Germany, discoverable by search, map, and a chat assistant.

## Language

### Providers and categories

**Provider**:
A business or initiative listed in the directory. One row in `providers`, optionally with several physical Locations.

**Listing Type**:
Which of the three top-level sections a Provider belongs to: `food`, `store`, or `ummah`. Exactly one per Provider.
_Avoid_: section, vertical, provider type

**Category**:
A label a Provider can be filed under, such as "Türkisch" or "Kebab / Döner". Scoped to a Listing Type (or to `all`) by its applicable section.
_Avoid_: cuisine, tag, type

**Primary Category**:
The single Category used wherever a Provider is displayed as belonging to one thing: cards, detail pages, gallery images, SEO routes. Held by `providers.category_id`.
_Avoid_: main category, default category

**Secondary Category**:
An additional Category a Provider also belongs to, used for matching in search but never for display. A Turkish restaurant that sells Döner has "Türkisch" as Primary and "Kebab / Döner" as Secondary. The owner-facing edit UI labels these "Additional Categories" (`editAdditionalCategories` i18n keys, `edit/additional-categories` routes); same concept, different surface.
_Avoid_: extra category, sub-category, additional tag

**Category Type**:
The axis a Category sits on: `cuisine`, `dish_type`, `dietary`, `meal`, or `store_type`. Nullable, and a large set of legacy food Categories leave it unset.
_Avoid_: category group, facet

**Applicable Section**:
Which Listing Type a Category may be used for, or `all` for Categories usable everywhere.

### Enrichment and compliance

**Screening**:
An automated pass that checks a Provider's external signals (Google Maps attributes, delivery-platform menu text) for compliance markers such as alcohol and pork. Results are staged as Enrichment Candidates — auto-applied for high-trust fields, or pending Review for compliance fields. Recorded by `food_providers.halal_screened_at`.
_Avoid_: review, check, scan

**Enrichment Candidate**:
A record of a proposed field change produced by an automated pipeline. One row in `enrichment_candidates`. High-trust fields (delivery links, images) are auto-applied; compliance fields (`no_alcohol`, `no_pork`) require human Review before application. The pipeline never writes Provider fields directly — it writes candidates.
_Avoid_: suggestion, proposal, enrichment row

**Review**:
A human decision on a pending Enrichment Candidate. The reviewer sees the evidence (source, matched keywords) and approves or rejects the proposed value. Approval immediately applies the value to the Provider.
_Avoid_: screening, check

**Trust Tier**:
The confidence level assigned to an enrichment field type, determining whether it auto-applies or requires Review. Delivery links and images are high-trust (auto-applied). Compliance fields (`no_alcohol`, `no_pork`) are low-trust (reviewed). See ADR 0003.
_Avoid_: confidence level, risk tier
