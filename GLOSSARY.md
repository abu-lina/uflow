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
