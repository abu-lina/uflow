# Community Service Selection Fix

## 🎯 Issue
**Problem**: When creating a provider and selecting a community service (Spenden-Projekt), the selection was not being saved to the database or displayed on the provider detail card.

## 🔍 Root Cause

During provider creation, the community service selection was:
1. ✅ Stored in form data (`formData.selectedCommunityServiceId`)
2. ✅ Displayed on the selection screen (`/create/media/social`)
3. ❌ **Never saved to the database** when the provider was created

The provider creation code was missing the logic to create the relationship in the `provider_community_services` junction table after creating the provider.

## ✅ Solution

### Changes Made

#### 1. Updated Provider Creation Flow
**Files Modified**:
- `src/app/(public)/create/media/page.tsx`
- `src/features/providers/ProviderCreateForm.tsx`

**Key Changes**:
1. Added import for `createProviderCommunityServiceRelationship` function
2. Modified the provider insert to return the created provider's ID using `.select('provider_id').single()`
3. Added logic to create the relationship after provider creation if a community service was selected

#### Before:
```typescript
const { error: providerError } = await supabase
  .from('providers')
  .insert([insertData]);

if (providerError) {
  console.error('Error creating provider:', providerError);
  throw providerError;
}

console.log('Provider created successfully!');
```

#### After:
```typescript
const { data: createdProvider, error: providerError } = await supabase
  .from('providers')
  .insert([insertData])
  .select('provider_id')
  .single();

if (providerError) {
  console.error('Error creating provider:', providerError);
  throw providerError;
}

if (!createdProvider) {
  throw new Error('Provider created but no data returned');
}

console.log('Provider created successfully with ID:', createdProvider.provider_id);

// Create provider-community service relationship if selected
if (formData.selectedCommunityServiceId && createdProvider.provider_id) {
  console.log('Creating relationship with community service:', formData.selectedCommunityServiceId);
  const relationshipResult = await createProviderCommunityServiceRelationship(
    createdProvider.provider_id,
    formData.selectedCommunityServiceId
  );
  
  if (!relationshipResult.success) {
    console.error('Failed to create community service relationship:', relationshipResult.error);
    toast.error('Anbieter erstellt, aber Spenden-Projekt konnte nicht verknüpft werden.');
  } else {
    console.log('Community service relationship created successfully');
  }
}
```

## 📊 How It Works

### Database Structure

The relationship between providers and community services uses a **many-to-many** relationship via the `provider_community_services` junction table:

```sql
CREATE TABLE public.provider_community_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  community_service_id UUID NOT NULL REFERENCES public.community_services(community_service_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(provider_id, community_service_id)
);
```

### User Flow

1. User creates provider through the form
2. On the "Media" step, clicks "Spenden-Projekt auswählen"
3. Navigates to `/create/media/social`
4. Selects a community service from the list
5. Returns to media page (shows selected service)
6. Clicks "Angebot registrieren"
7. **Provider is created** → Returns `provider_id`
8. **Relationship is created** → Links provider to community service
9. User is redirected to `/create`

### What Gets Saved

**Providers Table** (`providers`):
- All provider information (name, address, contact, etc.)
- `provider_id` is returned after insert

**Junction Table** (`provider_community_services`):
- `provider_id` - The newly created provider
- `community_service_id` - The selected community service
- Creates the link between them

## 🧪 Testing

### Test Case 1: Create Provider with Community Service
1. Navigate to `/create/basics`
2. Fill out provider information
3. On the Media step, click "Spenden-Projekt" button
4. Select a community service (e.g., "Wüstenkind e.V.")
5. Click "Angebot registrieren"
6. ✅ **Expected**: Provider created with success toast
7. ✅ **Expected**: Community service appears in "Barakah Effect" section on detail page

### Test Case 2: Create Provider without Community Service
1. Navigate to `/create/basics`
2. Fill out provider information
3. Skip community service selection
4. Click "Angebot registrieren"
5. ✅ **Expected**: Provider created successfully
6. ✅ **Expected**: No community service shown on detail page

### Test Case 3: Verify in Database
After creating a provider with a community service:

```sql
-- Check the provider exists
SELECT provider_id, provider_name FROM providers WHERE provider_name = 'Your Test Provider';

-- Check the relationship exists
SELECT * FROM provider_community_services 
WHERE provider_id = 'YOUR_PROVIDER_ID';

-- Check the community service details
SELECT cs.* 
FROM community_services cs
JOIN provider_community_services pcs ON cs.community_service_id = pcs.community_service_id
WHERE pcs.provider_id = 'YOUR_PROVIDER_ID';
```

## 🎯 Error Handling

### Graceful Degradation
If the community service relationship fails to create:
- ✅ Provider is still successfully created
- ⚠️ Error toast shown: "Anbieter erstellt, aber Spenden-Projekt konnte nicht verknüpft werden."
- 📝 Error logged to console for debugging
- 🔄 User can manually add the relationship later

### Error Scenarios Handled
1. **Provider creation fails** → Error toast, no relationship attempted
2. **Provider created but no ID returned** → Error toast with clear message
3. **Relationship creation fails** → Warning toast, provider still exists
4. **No community service selected** → Skip relationship creation (expected behavior)

## 📁 Files Modified

1. **`src/app/(public)/create/media/page.tsx`**
   - Added import: `createProviderCommunityServiceRelationship`
   - Modified insert to return `provider_id`
   - Added relationship creation logic
   - Added error handling and user feedback

2. **`src/features/providers/ProviderCreateForm.tsx`**
   - Same changes as above (alternative creation flow)

## 🔗 Related Documentation

- **`PROVIDER_SOCIAL_RELATIONSHIPS.md`** - Database schema and relationship setup
- **`supabase/migrations/archive/002_create_provider_community_services_relationship.sql`** - Migration file
- **`src/services/community_services.ts`** - Service functions including `createProviderCommunityServiceRelationship()`

## ✅ Verification Checklist

After applying this fix:
- [ ] Build passes without errors
- [ ] Can create provider with community service selection
- [ ] Community service appears on provider detail page
- [ ] Can create provider without community service selection
- [ ] Database contains relationship record
- [ ] Error toast appears if relationship fails
- [ ] Provider still created even if relationship fails

## 🚀 Deployment Notes

- No database migrations required (junction table already exists)
- No breaking changes
- Backwards compatible with existing providers
- Existing providers without community services continue to work

The fix is complete and ready for testing! 🎉

