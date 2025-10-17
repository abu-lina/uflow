# Online Business Support Feature

## Overview

This feature allows users to create provider entries for online businesses that don't have a physical location. Users can toggle "Online-Geschäft" (Online Business) during the location step of provider creation, which makes all address fields optional and displays the provider as "Online" throughout the application.

## Implementation Details

### 1. Form Data Updates

**File**: `src/providers/form-provider.tsx`

Added new field to `ProviderFormData` interface:
```typescript
isOnlineBusiness: boolean;
```

Default value: `false`

### 2. Location Input Pages

**Files Updated**:
- `src/app/(public)/create/location/page.tsx`
- `src/features/providers/ProviderCreateForm.tsx`

**Changes**:
- Added "Online-Geschäft" toggle before address input fields
- When toggled ON:
  - All address fields are hidden
  - Shows a card with "Online-Geschäft" message and web icon
  - Clears all address fields and sets `showAddress` to false
- When toggled OFF:
  - Shows normal address input fields (Street, ZIP, City, Country)
  - City and Country remain required fields

### 3. Validation Logic

**Updated Files**:
- `src/app/(public)/create/location/page.tsx` - `isFormValid()` function
- `src/features/providers/ProviderCreateForm.tsx` - `isStepValid()` function

**Logic**:
```typescript
// If it's an online business, no location is required
if (formData.isOnlineBusiness) {
  return true;
}
// Otherwise, city and country are required
return formData.city && formData.country;
```

### 4. Database Save Logic

**Files Updated**:
- `src/features/providers/ProviderCreateForm.tsx` - `handleSubmit()`
- `src/app/(public)/create/media/page.tsx` - `handleSave()`

**Changes**:
When `isOnlineBusiness` is true:
- `address_street` = null
- `address_zip` = null
- `address_city` = null
- `address_country` = null
- `show_address` = false

### 5. Display Components

**Files Updated**:
- `src/components/providers/ProviderCard.tsx`
- `src/components/providers/ProviderDetailModal.tsx`
- `src/components/providers/ProviderCardModal.tsx`
- `src/components/providers/ProviderDetailPage.tsx`

**Changes**:
- When no address is present (city is null), displays "Online" instead of empty address
- For ProviderDetailModal: changes header from "Adresse:" to "Standort:" for online businesses
- Address navigation buttons are only shown when a physical address exists

## User Experience

### Creation Flow

1. User reaches the Location step
2. Sees a toggle labeled "Online-Geschäft" with subtitle "Kein physischer Standort"
3. Options:
   - **Toggle OFF (default)**: Enter physical address (Street, ZIP, City*, Country*)
   - **Toggle ON**: See "Online-Geschäft" confirmation card, no address required
4. Can proceed to next step regardless of toggle state

### Display in UI

**With Physical Address**:
```
Restaurant Name
Musterstraße 123, 12345 Berlin
```

**Without Physical Address (Online)**:
```
Online Shop Name
Online
```

## Database Schema

No changes to database schema required. The feature uses existing nullable address fields:
- `address_street` TEXT
- `address_zip` TEXT
- `address_city` TEXT
- `address_country` TEXT
- `show_address` BOOLEAN

When online business is selected, all fields are set to null and `show_address` is set to false.

## Benefits

1. **Inclusivity**: Allows online-only businesses, freelancers, and digital service providers to be listed
2. **Clean UX**: No confusing empty address fields or "N/A" placeholders
3. **Clear Communication**: Users explicitly know when a business is online-only
4. **Flexible**: Users can switch between online and physical during creation
5. **Data Integrity**: Properly handles null addresses throughout the application

## Testing Checklist

- [ ] Create an online business (toggle ON)
- [ ] Create a physical business (toggle OFF)
- [ ] Switch toggle during creation and verify fields clear properly
- [ ] Verify online business shows "Online" in provider cards
- [ ] Verify online business shows "Online" in detail modal
- [ ] Verify online business shows "Online" in detail page
- [ ] Verify navigation button is disabled for online businesses
- [ ] Verify physical businesses still work normally
- [ ] Verify form validation passes for online businesses
- [ ] Verify data saves correctly to database

## Future Enhancements

Potential improvements:
1. Add "Region" or "Service Area" field for online businesses (e.g., "Deutschlandweit")
2. Add filter option to show only online or only physical businesses
3. Add separate icon/badge for online businesses in listings
4. Add analytics to track ratio of online vs physical businesses

