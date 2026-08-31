# Database Migration: Offers and Needs Tables

This migration creates separate tables for offers and needs to improve scalability and data integrity.

## What's Changed

### New Tables Created:
1. **`offers`** - Stores available offers/services
2. **`needs`** - Stores available needs/requirements  
3. **`provider_offers`** - Junction table linking providers to offers (many-to-many)
4. **`provider_needs`** - Junction table linking providers to needs (many-to-many)

### Benefits:
- ✅ **Better scalability** - Separate tables for offers/needs
- ✅ **Data integrity** - Foreign key constraints
- ✅ **Flexibility** - Easy to add new offers/needs
- ✅ **Performance** - Proper indexing for queries
- ✅ **Relationships** - Many-to-many relationships between providers and offers/needs

## How to Apply the Migration

### Option 1: Using Supabase CLI (Recommended)
```bash
# Navigate to your project directory
cd /Users/NARAFIQ/Projects/uflow

# Apply the migration
supabase db push

# Or if you want to reset and apply all migrations
supabase db reset
```

### Option 2: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/archive/001_create_offers_and_needs_tables.sql`
4. Run the SQL script

### Option 3: Using psql (if you have direct database access)
```bash
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/archive/001_create_offers_and_needs_tables.sql
```

## Sample Data

The migration includes sample offers and needs:
- Beratung (Consultation)
- Coaching
- Kurse (Courses)
- Workshops
- Mentoring
- Networking
- Support
- Training
- Seminare (Seminars)
- Webinare (Webinars)

## Security

Row Level Security (RLS) is enabled with appropriate policies:
- **Public read access** for offers and needs
- **Authenticated users** can create/update/delete offers and needs
- **Users can only manage** their own provider-offer and provider-need relationships

## Backward Compatibility

The existing `provider_offers` and `provider_needs` text fields in the providers table are kept for backward compatibility but are no longer used in the new system.

## Testing

After applying the migration, test the following:
1. Create a new provider with offers and needs
2. Verify data is saved in the junction tables
3. Check that offers and needs can be created dynamically
4. Ensure proper relationships are maintained

## Rollback (if needed)

If you need to rollback this migration:
```sql
-- Drop the new tables (in reverse order due to foreign keys)
DROP TABLE IF EXISTS provider_needs;
DROP TABLE IF EXISTS provider_offers;
DROP TABLE IF EXISTS needs;
DROP TABLE IF EXISTS offers;
```

