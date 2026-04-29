# Database-Driven Category Suggestions

## Executive Summary

We've migrated the category-based suggestions system from **hardcoded constants** to a **database-driven approach** for better scalability, flexibility, and maintainability.

## What Changed

### Before (Hardcoded)
```typescript
// src/constants/category-suggestions.ts
export const CATEGORY_SUGGESTIONS = {
  'Restaurant': {
    offers: ['Catering', 'Lieferung', ...],
    needs: ['Koch', 'Servicepersonal', ...]
  },
  // ... more categories
};
```

**Problems:**
- ❌ Required code deployment to update
- ❌ No dynamic management
- ❌ Not scalable
- ❌ No admin interface possible

### After (Database)
```sql
-- New tables
category_suggested_offers (category_id, offer_id, priority)
category_suggested_needs (category_id, need_id, priority)
```

```typescript
// src/services/category-suggestions.ts
const offers = await getSuggestedOffersForCategory(categoryId);
```

**Benefits:**
- ✅ Update without redeployment
- ✅ Dynamic management
- ✅ Highly scalable
- ✅ Admin panel ready
- ✅ Analytics ready
- ✅ A/B testing capable

## Quick Start

### 1. Apply Migrations

```bash
# Create tables
supabase db push

# Or manually
psql $DATABASE_URL -f supabase/migrations/archive/003_create_category_suggestions_tables.sql

# Seed data
psql $DATABASE_URL -f sql/migrations/004_seed_category_suggestions.sql
```

### 2. Verify

```sql
SELECT c.name_de, COUNT(cso.offer_id) as offers, COUNT(csn.need_id) as needs
FROM categories c
LEFT JOIN category_suggested_offers cso ON c.category_id = cso.category_id
LEFT JOIN category_suggested_needs csn ON c.category_id = csn.category_id
GROUP BY c.name_de;
```

### 3. Test

1. Start dev server
2. Go to provider creation
3. Select "Restaurant" category
4. Check offers/needs pages - suggestions appear at top with ✨ icon

## Architecture

### Database Schema

```
categories
  └─ category_suggested_offers ─> offers
  └─ category_suggested_needs  ─> needs
```

### Service Layer

```
src/services/category-suggestions.ts
  ├─ getSuggestedOffersForCategory()
  ├─ getSuggestedNeedsForCategory()
  ├─ getSuggestionsForCategory()     // Batch fetch
  ├─ addCategorySuggestion()         // Admin
  └─ removeCategorySuggestion()      // Admin
```

### Frontend Integration

```typescript
// Pages automatically fetch suggestions based on selected category
useEffect(() => {
  const suggestions = await getSuggestedOffersForCategory(categoryId);
  setSuggestedOffers(suggestions);
}, [categoryId]);
```

## Priority System

Suggestions use a priority field to control ordering:

- **10** - Highest priority (most important offers)
- **5-9** - Medium priority
- **0-4** - Lower priority
- **Default**: 0

Within same priority, items are sorted alphabetically.

## Managing Suggestions

### Add New Suggestion

```sql
INSERT INTO category_suggested_offers (category_id, offer_id, priority)
VALUES (
  (SELECT category_id FROM categories WHERE name_de = 'Restaurant'),
  (SELECT offer_id FROM offers WHERE name_de = 'Tagesmenü'),
  8  -- Priority
);
```

### Update Priority

```sql
UPDATE category_suggested_offers
SET priority = 10
WHERE category_id = (SELECT category_id FROM categories WHERE name_de = 'Restaurant')
  AND offer_id = (SELECT offer_id FROM offers WHERE name_de = 'Catering');
```

### Remove Suggestion

```sql
DELETE FROM category_suggested_offers
WHERE category_id = (SELECT category_id FROM categories WHERE name_de = 'Restaurant')
  AND offer_id = (SELECT offer_id FROM offers WHERE name_de = 'OldOffer');
```

## Seeded Categories

The migration seeds suggestions for:

| Category | Offers | Needs |
|----------|--------|-------|
| Lebensmittel & Getränke | 9 | 5 |
| Bildung | 11 | 6 |
| Gesundheit | 11 | 6 |
| Technologie | 10 | 6 |
| Kleidung | 7 | 6 |
| Handwerk | 7 | 6 |
| Transport | 7 | 6 |
| Immobilien | 7 | 6 |
| Spenden | 6 | 6 |
| Sonstiges | 3 | 3 |

## Future Enhancements

### Phase 1: Admin Panel (Recommended Next)
Build an admin interface to manage suggestions via UI:
- View all suggestions by category
- Add/remove/reorder suggestions
- Drag-and-drop priority adjustment
- Preview mode

### Phase 2: Analytics
Track suggestion usage:
- Most selected suggestions
- Conversion rates per suggestion
- Category-specific insights

### Phase 3: Personalization
- User history-based suggestions
- Location-based suggestions
- Time/seasonal suggestions

## Performance

### Current Implementation
- ✅ Indexed queries on all foreign keys
- ✅ Component-level caching (fetched once per category)
- ✅ Graceful fallback if no suggestions exist
- ✅ Minimal network overhead (single query per page)

### Future Optimizations
- React Query for advanced caching
- Server-side Redis cache
- Service Worker offline support

## Migration Checklist

- [x] Create database tables
- [x] Add RLS policies
- [x] Create helper functions
- [x] Seed initial data
- [x] Create service layer
- [x] Update offers page
- [x] Update needs page
- [x] Test end-to-end
- [x] Write documentation
- [ ] **Optional**: Remove old constants file (`src/constants/category-suggestions.ts`)
- [ ] **Optional**: Build admin panel
- [ ] **Optional**: Add analytics

## Files

### New Files
- `supabase/migrations/archive/003_create_category_suggestions_tables.sql` - Schema
- `sql/migrations/004_seed_category_suggestions.sql` - Data
- `src/services/category-suggestions.ts` - Service layer
- `docs/guides/CATEGORY_SUGGESTIONS_MIGRATION.md` - Detailed guide
- `docs/DATABASE_DRIVEN_SUGGESTIONS.md` - This file

### Modified Files
- `src/app/(public)/create/basics/offers/page.tsx` - Uses database service
- `src/app/(public)/create/basics/needs/page.tsx` - Uses database service

### Deprecated Files
- `src/constants/category-suggestions.ts` - Can be safely deleted after testing

## Rollback

If needed, rollback is simple:

```typescript
// Change imports from service to constants
import { getSuggestedOffersForCategory } from '@/constants/category-suggestions';
```

Keep the constants file temporarily until fully confident in the migration.

## Support

For detailed information:
- **Migration Guide**: `docs/guides/CATEGORY_SUGGESTIONS_MIGRATION.md`
- **Database Schema**: `supabase/migrations/archive/003_create_category_suggestions_tables.sql`
- **Seed Data**: `sql/migrations/004_seed_category_suggestions.sql`

## Conclusion

This migration provides a solid foundation for:
1. ✅ Dynamic suggestion management
2. ✅ Future admin features
3. ✅ Analytics and insights
4. ✅ A/B testing capabilities
5. ✅ Better user experience

The system is now more maintainable, scalable, and flexible for future growth.

