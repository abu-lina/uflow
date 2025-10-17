# Multi-Select Community Services Feature

## 🎯 Change
Updated the community services selection to support **multiple selections** instead of single selection, allowing providers to support multiple social initiatives.

## ✅ What Changed

### 1. Form Data Structure
**File**: `src/providers/form-provider.tsx`

**Before**:
```typescript
// Single selection
donationProject: string | null;
selectedCommunityServiceId: string | null;
```

**After**:
```typescript
// Multiple selection
selectedCommunityServiceIds: string[];
```

### 2. Selection Logic
**File**: `src/app/(public)/create/media/social/page.tsx`

**Before** (Single Select):
```typescript
const selectProject = (serviceId: string) => {
  if (formData.selectedCommunityServiceId === serviceId) {
    // Deselect
    updateFormData({ 
      donationProject: null,
      selectedCommunityServiceId: null
    });
  } else {
    // Select (replaces previous)
    updateFormData({ 
      donationProject: service.community_service_name,
      selectedCommunityServiceId: service.community_service_id
    });
  }
};
```

**After** (Multi-Select):
```typescript
const toggleProject = (serviceId: string) => {
  const currentIds = formData.selectedCommunityServiceIds || [];
  
  if (currentIds.includes(serviceId)) {
    // Remove from selection
    updateFormData({ 
      selectedCommunityServiceIds: currentIds.filter(id => id !== serviceId)
    });
  } else {
    // Add to selection
    updateFormData({ 
      selectedCommunityServiceIds: [...currentIds, serviceId]
    });
  }
};
```

### 3. UI Updates

#### Selection Indicator
**Before**: Single card selected at a time
**After**: Multiple cards can be selected simultaneously

```typescript
// Check if selected
const isSelected = (formData.selectedCommunityServiceIds || []).includes(service.community_service_id);
```

#### Save Button
**Before**: Shows "Speichern"
**After**: Shows count of selected items

```typescript
{(formData.selectedCommunityServiceIds || []).length > 0 
  ? `${(formData.selectedCommunityServiceIds || []).length} ausgewählt` 
  : 'Speichern'}
```

#### Media Page Display
**Before**: "1 Spenden-Projekt"
**After**: "3 Initiativen ausgewählt"

```typescript
{(formData.selectedCommunityServiceIds || []).length > 0 
  ? `${(formData.selectedCommunityServiceIds || []).length} Initiativen ausgewählt` 
  : 'Initiativen auswählen'}
```

### 4. Database Relationships
**Files**: 
- `src/app/(public)/create/media/page.tsx`
- `src/features/providers/ProviderCreateForm.tsx`

**Before** (Single Relationship):
```typescript
if (formData.selectedCommunityServiceId && createdProvider.provider_id) {
  await createProviderCommunityServiceRelationship(
    createdProvider.provider_id,
    formData.selectedCommunityServiceId
  );
}
```

**After** (Multiple Relationships):
```typescript
const selectedServiceIds = formData.selectedCommunityServiceIds || [];
if (selectedServiceIds.length > 0 && createdProvider.provider_id) {
  const results = await Promise.allSettled(
    selectedServiceIds.map(serviceId => 
      createProviderCommunityServiceRelationship(
        createdProvider.provider_id, 
        serviceId
      )
    )
  );
  
  const failedCount = results.filter(
    r => r.status === 'rejected' || 
    (r.status === 'fulfilled' && !r.value.success)
  ).length;
  
  if (failedCount > 0) {
    toast.error(`Anbieter erstellt, aber ${failedCount} Initiative(n) konnten nicht verknüpft werden.`);
  }
}
```

## 🎨 User Experience

### Selection Flow
1. User navigates to `/create/media/social`
2. Sees explanatory text: "Wähle soziale Initiativen aus, die du unterstützt..."
3. Can click multiple community service cards
4. Each selected card shows a checkmark/selection indicator
5. Button shows count: "3 ausgewählt"
6. Click "Speichern" to save selection
7. Returns to media page showing "3 Initiativen ausgewählt"

### Visual Feedback
- ✅ Selected cards are visually highlighted
- ✅ Button shows count of selections
- ✅ Can deselect by clicking again
- ✅ No limit on number of selections
- ✅ Button disabled when nothing selected

## 📊 Database Impact

### Multiple Relationships Created
For each selected community service, a row is created in `provider_community_services`:

```sql
-- Example: Provider supporting 3 initiatives
INSERT INTO provider_community_services (provider_id, community_service_id) VALUES
  ('provider-123', 'service-1'),
  ('provider-123', 'service-2'),
  ('provider-123', 'service-3');
```

### Error Handling
- Uses `Promise.allSettled()` to create all relationships in parallel
- Tracks failed vs successful creations
- Shows specific error message if some relationships fail
- Provider is still created even if relationships fail

## 🧪 Testing

### Test Case 1: Select Multiple Services
1. Go to `/create/media/social`
2. Click on 3 different community services
3. ✅ **Expected**: All 3 cards show as selected
4. ✅ **Expected**: Button shows "3 ausgewählt"
5. Click "Speichern"
6. ✅ **Expected**: Media page shows "3 Initiativen ausgewählt"

### Test Case 2: Deselect Service
1. Select 3 services
2. Click on one of the selected services again
3. ✅ **Expected**: That service is deselected
4. ✅ **Expected**: Button shows "2 ausgewählt"

### Test Case 3: Complete Provider Creation
1. Complete entire provider creation with 3 selected services
2. Click "Angebot registrieren"
3. ✅ **Expected**: Provider created
4. ✅ **Expected**: 3 relationships created in database
5. ✅ **Expected**: All 3 services appear in "Barakah Effect" section

### Test Case 4: Verify in Database
```sql
-- Check all relationships for a provider
SELECT 
  p.provider_name,
  cs.community_service_name
FROM providers p
JOIN provider_community_services pcs ON p.provider_id = pcs.provider_id
JOIN community_services cs ON pcs.community_service_id = cs.community_service_id
WHERE p.provider_id = 'YOUR_PROVIDER_ID';
```

## 📁 Files Modified

1. **`src/providers/form-provider.tsx`**
   - Changed `selectedCommunityServiceId` (single) → `selectedCommunityServiceIds` (array)
   - Removed `donationProject` field
   - Updated initial state

2. **`src/app/(public)/create/media/social/page.tsx`**
   - Changed `selectProject()` → `toggleProject()` for multi-select logic
   - Updated `isSelected` check to use array
   - Updated save button to show count
   - Changed wording to "Initiativen" (plural)

3. **`src/app/(public)/create/media/page.tsx`**
   - Updated display text to show count
   - Changed single relationship creation → multiple relationships with `Promise.allSettled()`
   - Added error handling for partial failures

4. **`src/features/providers/ProviderCreateForm.tsx`**
   - Same multi-relationship logic as above

## ✨ Benefits

- ✅ **More Flexible**: Providers can support multiple initiatives
- ✅ **Better UX**: Clear visual feedback on selections
- ✅ **Scalable**: No limit on number of selections
- ✅ **Robust**: Handles partial failures gracefully
- ✅ **Informative**: Shows count of selections throughout flow
- ✅ **Database Efficient**: Uses `Promise.allSettled()` for parallel inserts

## 🔄 Migration Notes

- **Backwards Compatible**: Existing providers without community services continue to work
- **No Database Changes**: Uses existing `provider_community_services` junction table
- **Form Data Migration**: Old `selectedCommunityServiceId` will be ignored, new field is `selectedCommunityServiceIds`

The feature is complete and ready to use! 🎉

