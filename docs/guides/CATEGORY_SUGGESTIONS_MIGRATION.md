# Category Suggestions Migration Guide

## Overview

This guide explains the migration from hardcoded category suggestions to a database-driven approach for managing predefined offers and needs suggestions per category.

## Why Database Approach?

### ✅ Advantages
1. **Dynamic Management** - Update suggestions without code deployment
2. **Scalability** - Easy to add/remove/modify suggestions
3. **Multi-language Support** - Leverage existing translation infrastructure
4. **Data Integrity** - Foreign key relationships ensure valid references
5. **Future Admin Panel** - Non-developers can manage suggestions
6. **Analytics Ready** - Track which suggestions are most used
7. **A/B Testing** - Experiment with different suggestion sets

### ⚠️ What Changed
- Moved from `src/constants/category-suggestions.ts` (hardcoded) to database tables
- Created new service layer (`src/services/category-suggestions.ts`) for fetching data
- Updated offers/needs pages to fetch suggestions asynchronously

## Database Schema

### New Tables

#### 1. `category_suggested_offers`
Stores predefined offer suggestions for each category.

```sql
CREATE TABLE category_suggested_offers (
  id UUID PRIMARY KEY,
  category_id UUID REFERENCES categories(category_id),
  offer_id UUID REFERENCES offers(offer_id),
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(category_id, offer_id)
);
```

#### 2. `category_suggested_needs`
Stores predefined need suggestions for each category.

```sql
CREATE TABLE category_suggested_needs (
  id UUID PRIMARY KEY,
  category_id UUID REFERENCES categories(category_id),
  need_id UUID REFERENCES needs(need_id),
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(category_id, need_id)
);
```

### Helper Functions

Two PostgreSQL functions are created for efficient querying:

1. `get_suggested_offers_for_category(p_category_id UUID)` - Returns suggested offers ordered by priority
2. `get_suggested_needs_for_category(p_category_id UUID)` - Returns suggested needs ordered by priority

## Migration Steps

### Step 1: Apply Schema Migration

Run the migration to create the new tables:

```bash
# If using Supabase CLI
supabase db push

# Or apply manually
psql $DATABASE_URL -f supabase/migrations/003_create_category_suggestions_tables.sql
```

### Step 2: Seed Data

Populate the tables with predefined suggestions:

```bash
psql $DATABASE_URL -f sql/migrations/004_seed_category_suggestions.sql
```

This will:
- Insert all necessary offers and needs (if they don't exist)
- Create category-to-offer/need mappings for all major categories:
  - Food & Beverages
  - Education (Bildung)
  - Health (Gesundheit)
  - Technology
  - Clothing
  - Crafts
  - Transport
  - Real Estate
  - Donations
  - Other

### Step 3: Verify Migration

Check that suggestions were created:

```sql
-- Count suggestions per category
SELECT 
  c.name_de,
  COUNT(DISTINCT cso.offer_id) as offer_suggestions,
  COUNT(DISTINCT csn.need_id) as need_suggestions
FROM categories c
LEFT JOIN category_suggested_offers cso ON c.category_id = cso.category_id
LEFT JOIN category_suggested_needs csn ON c.category_id = csn.category_id
GROUP BY c.category_id, c.name_de
ORDER BY c.name_de;
```

### Step 4: Test in Development

1. Start your dev server
2. Navigate to the provider creation flow
3. Select a category (e.g., "Restaurant")
4. Click "Was biete ich?" - You should see suggested offers at the top
5. Click "Was suche ich?" - You should see suggested needs at the top

## Usage

### Frontend Service

The new service layer provides these functions:

```typescript
import { 
  getSuggestedOffersForCategory, 
  getSuggestedNeedsForCategory,
  getSuggestionsForCategory 
} from '@/services/category-suggestions';

// Fetch suggested offers
const offers = await getSuggestedOffersForCategory(categoryId);

// Fetch suggested needs
const needs = await getSuggestedNeedsForCategory(categoryId);

// Fetch both at once
const { offers, needs } = await getSuggestionsForCategory(categoryId);
```

### Adding New Suggestions

#### Via SQL (Current)

```sql
-- Add a new offer suggestion for a category
INSERT INTO category_suggested_offers (category_id, offer_id, priority)
VALUES (
  (SELECT category_id FROM categories WHERE name_de = 'Restaurant'),
  (SELECT offer_id FROM offers WHERE name_de = 'Tagesmenü'),
  10 -- Higher priority = shown first
);

-- Add a new need suggestion
INSERT INTO category_suggested_needs (category_id, need_id, priority)
VALUES (
  (SELECT category_id FROM categories WHERE name_de = 'Restaurant'),
  (SELECT need_id FROM needs WHERE name_de = 'Kellner'),
  5
);
```

#### Via Admin Functions (Future)

The service includes admin functions for future use:

```typescript
import { 
  addCategorySuggestion, 
  removeCategorySuggestion 
} from '@/services/category-suggestions';

// Add suggestion
await addCategorySuggestion(categoryId, 'offer', offerId, priority);

// Remove suggestion
await removeCategorySuggestion(categoryId, 'offer', offerId);
```

## Data Management

### Priority System

Suggestions use a priority system:
- **Higher number = Higher priority** (shown first)
- Default priority: 0
- Recommended range: 0-10
- Within same priority, items are sorted alphabetically by `name_de`

### Example Priority Scheme

- **10** - Most important/popular offers
- **5-9** - Common offers
- **0-4** - Less common but relevant offers

### Updating Priority

```sql
UPDATE category_suggested_offers
SET priority = 10
WHERE category_id = (SELECT category_id FROM categories WHERE name_de = 'Restaurant')
  AND offer_id = (SELECT offer_id FROM offers WHERE name_de = 'Catering');
```

## Future Enhancements

### Admin Panel
Build an admin interface to:
- View suggestions by category
- Add/remove suggestions via UI
- Adjust priorities with drag-and-drop
- Preview how suggestions appear to users

### Analytics
Track suggestion usage:
- Which suggestions are selected most often
- Which categories need more/better suggestions
- A/B test different suggestion sets

### Personalization
Extend the system to:
- Show suggestions based on user history
- Region-specific suggestions
- Time-based suggestions (seasonal offers)

## Rollback Plan

If you need to rollback to hardcoded constants:

1. Keep the old constants file temporarily
2. Switch the import in the pages back to constants
3. Remove database service calls

```typescript
// Rollback: Use old constants
import { getSuggestedOffersForCategory } from '@/constants/category-suggestions';

// Current: Use database service
import { getSuggestedOffersForCategory } from '@/services/category-suggestions';
```

## Performance Considerations

### Query Optimization
- Indexes are created on `category_id`, `offer_id`, `need_id`, and `priority`
- Queries use JOIN operations (efficient for small datasets)
- Results are cached in component state (fetched once per category change)

### Caching Strategy
Consider implementing:
- React Query for client-side caching
- Redis for server-side caching
- Service Worker caching for offline support

## Troubleshooting

### Suggestions Not Showing

1. **Check if category is selected:**
   ```typescript
   console.log('Selected category:', formData.category);
   ```

2. **Verify suggestions exist in database:**
   ```sql
   SELECT * FROM category_suggested_offers 
   WHERE category_id = 'YOUR_CATEGORY_ID';
   ```

3. **Check browser console for errors:**
   - Look for Supabase query errors
   - Verify RLS policies allow SELECT

### Empty Suggestions

If a category has no suggestions:
- Add suggestions using SQL (see "Adding New Suggestions")
- Or suggestions will gracefully degrade to showing all offers/needs

## Security

### Row Level Security (RLS)

The tables have RLS enabled:

- **SELECT**: Public (anyone can view suggestions)
- **INSERT/UPDATE/DELETE**: Authenticated users only (for future admin features)

### Future Admin Roles

Consider creating admin-specific policies:

```sql
-- Only admins can modify suggestions
CREATE POLICY "Only admins can modify suggestions"
ON category_suggested_offers
FOR ALL
USING (auth.jwt()->>'role' = 'admin');
```

## Related Files

- **Schema Migration**: `supabase/migrations/003_create_category_suggestions_tables.sql`
- **Data Seed**: `sql/migrations/004_seed_category_suggestions.sql`
- **Service Layer**: `src/services/category-suggestions.ts`
- **Old Constants** (deprecated): `src/constants/category-suggestions.ts`
- **Offers Page**: `src/app/(public)/create/basics/offers/page.tsx`
- **Needs Page**: `src/app/(public)/create/basics/needs/page.tsx`

## Support

For questions or issues:
1. Check the troubleshooting section above
2. Review the migration SQL files for data structure
3. Test queries in Supabase dashboard
4. Contact the development team

