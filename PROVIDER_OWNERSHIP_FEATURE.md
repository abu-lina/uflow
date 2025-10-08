# Provider Ownership and Recommendation Feature

## Overview

This feature allows users to create provider entries in two different modes:
1. **Owner Mode**: User is the actual owner of the provider/business
2. **Recommendation Mode**: User is recommending a provider they know but don't own

The data persistence differs based on the mode, allowing proper tracking of both ownership and recommendations.

## Database Changes

### New Column: `user_created_id`

Added a new column to the `providers` table to track who recommended/created a provider entry when they are not the owner.

```sql
ALTER TABLE public.providers 
ADD COLUMN IF NOT EXISTS user_created_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
```

### Column Usage

- **`user_created_id`**: **ALWAYS** set to track who created this database entry
  - References the user who created/submitted this provider entry
  - SET NULL when user is deleted (preserves the provider entry)
  - Set in both Owner and Recommendation modes
  
- **`provider_owner_id`**: Set **only** when user is the actual business owner (Owner Mode)
  - References the actual business owner
  - CASCADE delete when user is deleted
  - NULL for recommended providers (user is not the owner)

### Migration File

Run the migration script: `add-user-created-id.sql`

This will:
- Add the `user_created_id` column
- Add appropriate comments for documentation
- Create an index for performance

## Implementation Details

### 1. Form Provider Updates

**File**: `src/providers/form-provider.tsx`

- Added `ProviderCreationMode` type: `'owner' | 'recommendation'`
- Added `creationMode` field to `ProviderFormData` interface
- Added `setCreationMode()` function to context
- Default mode is 'owner'

### 2. Route Structure

#### Owner Flow
1. User clicks "Ich bin der Anbieter" on `/create`
2. Navigates to `/create/basics`
3. Mode is set to 'owner'
4. On submission: `user_created_id` = user.id, `provider_owner_id` = user.id

#### Recommendation Flow
1. User clicks "Ich kenne einen Anbieter" on `/create`
2. Navigates to `/recommend-provider` (redirect page)
3. Mode is set to 'recommendation'
4. Redirects to `/create/basics` (same form)
5. On submission: `user_created_id` = user.id, `provider_owner_id` = null

### 3. Form Submission Logic

**Files Updated**:
- `src/features/providers/ProviderCreateForm.tsx`
- `src/app/(public)/create/media/page.tsx`

Both files now include logic to determine which ID field to set:

```typescript
const isOwner = formData.creationMode === 'owner';
const insertData = {
  // ... other fields
  user_created_id: user.id, // ALWAYS set - tracks who created the entry
  provider_owner_id: isOwner ? user.id : null, // Only set if user is the owner
  // ... other fields
};
```

### 4. Type Updates

**File**: `src/services/providers.ts`

Updated `Provider` interface to include:
```typescript
provider_owner_id?: string | null;
user_created_id?: string | null;
```

### 5. Service Functions

Added new service function to fetch recommended providers:

```typescript
export async function getRecommendedProviders(userId: string): Promise<Provider[]>
```

Existing function updated with clearer documentation:
```typescript
export async function getCreatedProviders(userId: string): Promise<Provider[]>
// Now explicitly fetches providers where user is the owner
```

### 6. Account Deletion Updates

**File**: `src/services/account.ts`

Updated to handle both types of provider entries:
```typescript
// Delete user's providers (owned by the user)
supabase.from('providers').delete().eq('provider_owner_id', userId),

// Delete providers recommended/created by the user (but not owned)
supabase.from('providers').delete().eq('user_created_id', userId),
```

## User Experience

### Same Form, Different Persistence

The user sees the exact same form regardless of which option they choose. The only difference is:
- The button they clicked on `/create`
- How the data is saved to the database

This provides a seamless experience while maintaining proper data relationships.

### Navigation Flow

```
/create
├── "Ich bin der Anbieter" → /create/basics (owner mode)
└── "Ich kenne einen Anbieter" → /recommend-provider → /create/basics (recommendation mode)
```

## Testing

### Test Owner Mode
1. Navigate to `http://localhost:3001/create`
2. Click "Ich bin der Anbieter"
3. Fill out the form
4. Submit
5. Check database: 
   - `user_created_id` = your user ID ✓
   - `provider_owner_id` = your user ID ✓
   - (Same user is both creator and owner)

### Test Recommendation Mode
1. Navigate to `http://localhost:3001/create`
2. Click "Ich kenne einen Anbieter"
3. Fill out the form (same form as owner mode)
4. Submit
5. Check database:
   - `user_created_id` = your user ID ✓
   - `provider_owner_id` = NULL ✓
   - (You created it but don't own it)

## Future Enhancements

### Potential Features
1. **Claim Provider**: Allow actual owners to claim recommended providers
2. **Recommendation Credits**: Track and display user contribution via recommendations
3. **Verification**: Different verification flows for owner vs recommended providers
4. **Analytics**: Separate analytics for owned vs recommended providers
5. **Permissions**: Different edit permissions based on ownership status

### Data Queries
```sql
-- Get all providers owned by a user (user is the business owner)
SELECT * FROM providers WHERE provider_owner_id = 'user-uuid';

-- Get all providers created by a user (all database entries they submitted)
SELECT * FROM providers WHERE user_created_id = 'user-uuid';

-- Get only providers where user is owner (excludes their recommendations)
SELECT * FROM providers 
WHERE provider_owner_id = 'user-uuid';

-- Get only recommendations by a user (they created it but don't own it)
SELECT * FROM providers 
WHERE user_created_id = 'user-uuid' AND provider_owner_id IS NULL;

-- Get all unclaimed providers (recommendations without an owner)
SELECT * FROM providers WHERE provider_owner_id IS NULL;
```

## Security Considerations

1. **RLS Policies**: Ensure Row Level Security policies are updated to handle both fields
2. **Edit Permissions**: Consider whether recommenders should be able to edit entries
3. **Verification**: Consider additional verification for owner-claimed providers
4. **Abuse Prevention**: Monitor for spam recommendations

## Notes

- The feature reuses the existing form infrastructure
- No additional screens or components were needed
- Minimal changes to existing codebase
- Backward compatible (existing providers will have null `user_created_id`)

