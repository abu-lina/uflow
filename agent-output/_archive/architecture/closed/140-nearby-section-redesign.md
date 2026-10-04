---
ID: 140
Origin: 140
UUID: d2f25299
Status: Released
---

## Changelog
| 2026-06-04 | DevOps | Document closed | Status: Released |

# Architecture Review: Nearby Section Redesign

## Verdict: APPROVED

## Findings

### 1. DetailListItem Reuse (Separation of Concerns)

**No violation.** `DetailListItem` is defined locally in the same file (`src/features/providers/components/ProviderDetailSections.tsx:129-138`) and already used by the Amenities and Menu sections. Reusing it for the Nearby section is a direct application of DRY — the alternative would be duplicating the same layout markup. No SRP concern: the component has a single responsibility (render an icon + label list item).

### 2. Icon Choice (MapPin)

`MapPin` from lucide-react is semantically appropriate for a "nearby providers" context (geographic proximity). It matches the established pattern of section-specific lucide-react icons: `UtensilsCrossed` (menu), `Moon`/`PrayerRug`/`CircleParking` (amenities).

### 3. Existing Pattern Conflicts

None identified. The change is confined to one file, adds no new dependencies, and alters no data flow or query logic. The nearby data query (`provider-nearby-city`) remains unchanged.

### 4. Consistency with Other Sections

Fully consistent. Both the Menu and Amenities sections render their items via `DetailListItem` with an icon and label. The proposed Nearby section follows the identical pattern:

| Section | Pattern | Icon Component |
|---------|---------|----------------|
| Amenities | `DetailListItem` | Feature-specific (`Moon`, `PrayerRug`, etc.) |
| Menu | `DetailListItem` | `UtensilsCrossed` |
| Nearby (proposed) | `DetailListItem` | `MapPin` |

The icon sizing (`h-6 w-6`) and `aria-hidden` usage match existing implementations.

## Recommendations

None. This is a low-risk, purely presentational change that improves visual consistency. Proceed with implementation.
