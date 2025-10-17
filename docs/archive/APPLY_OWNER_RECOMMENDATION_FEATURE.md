# Apply Provider Ownership & Recommendation Feature

## Quick Setup Guide

### 1. Apply Database Migration

Run this SQL in your Supabase SQL Editor:

```sql
-- Add user_created_id column to providers table
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS user_created_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.providers.provider_owner_id IS 'The actual owner of the provider business';
COMMENT ON COLUMN public.providers.user_created_id IS 'The user who recommended/created this provider entry (when not the owner)';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_providers_user_created_id ON public.providers(user_created_id);
```

Or run the migration file:
```bash
psql -h your-supabase-host -U postgres -d postgres -f add-user-created-id.sql
```

### 2. Verify Changes

All code changes are already in place:
- ✅ Form provider updated with creation mode tracking
- ✅ Provider creation form updated with conditional logic
- ✅ New route `/recommend-provider` created
- ✅ Type definitions updated
- ✅ Service functions added (`getRecommendedProviders`)
- ✅ Account deletion service updated

### 3. Test the Feature

#### Test Owner Flow:
1. Go to `http://localhost:3001/create`
2. Click "Ich bin der Anbieter"
3. Complete the form
4. Verify in database:
   - `user_created_id` = your user ID ✓ (you created it)
   - `provider_owner_id` = your user ID ✓ (you own it)

#### Test Recommendation Flow:
1. Go to `http://localhost:3001/create`
2. Click "Ich kenne einen Anbieter"
3. Complete the form (same form!)
4. Verify in database:
   - `user_created_id` = your user ID ✓ (you created it)
   - `provider_owner_id` = NULL ✓ (you don't own it)

### 4. Expected Behavior

**Owner Mode:**
- User creates their own business profile
- Can claim full ownership
- `user_created_id` = user ID (tracks who created the entry)
- `provider_owner_id` = user ID (tracks who owns the business)

**Recommendation Mode:**
- User recommends someone else's business
- No ownership claim
- `user_created_id` = user ID (tracks who created the entry)
- `provider_owner_id` = NULL (no owner claimed yet)

### Files Modified

```
✅ add-user-created-id.sql (NEW - migration file)
✅ PROVIDER_OWNERSHIP_FEATURE.md (NEW - documentation)
✅ src/providers/form-provider.tsx
✅ src/features/providers/ProviderCreateForm.tsx
✅ src/app/(public)/create/basics/page.tsx
✅ src/app/(public)/recommend-provider/page.tsx (NEW)
✅ src/services/providers.ts
✅ src/app/(public)/create/media/page.tsx
✅ src/services/account.ts
✅ supabase-schema.sql
```

## Done! 🎉

The feature is now ready to use. Users can choose to create their own provider profile or recommend someone else's, and the data will be persisted correctly based on their choice.

