# Halal Trust Seal Images

This directory holds the wax seal images used by `ProofTierCard`.

## Active tier (single composite image per tier)

| File                     | Tier    | Dimensions | Used by app |
| ------------------------ | ------- | ---------- | ----------- |
| `seals-bronze-active.png` | Bronze  | 320 × 120  | ✅ `ProofTierCard` — active tier |
| `seals-silver-active.png` | Silver  | 320 × 120  | ✅ `ProofTierCard` — active tier |
| `seals-gold-active.png`   | Gold    | 320 × 120  | ✅ `ProofTierCard` — active tier |

## Inactive tier (individual seal fallback images)

| File                       | Tier    | Dimensions |
| -------------------------- | ------- | ---------- |
| `seal-bronze-inactive.webp` | Bronze  | 96 × 96    |
| `seal-silver-inactive.webp` | Silver  | 96 × 96    |
| `seal-gold-inactive.webp`   | Gold    | 96 × 96    |

## Source originals (before WebP conversion)

| File             | Tier    | Dimensions |
| ---------------- | ------- | ---------- |
| `seal-bronze.png` | Bronze  | 96 × 96    |
| `seal-silver.png` | Silver  | 96 × 96    |
| `seal-gold.png`   | Gold    | 96 × 96    |

To regenerate WebP from newer PNGs: `python3 scripts/generate-seal-webp.py`

**Pending delivery from product owner — these are placeholder images.**
