# Unified Provider/Community Service Creation Implementation

## 🎯 **Overview**
This implementation allows users to create both providers and community services through a unified form, with the entity type determined by the selected category.

## 📋 **Implementation Steps**

### **1. Database Schema Updates** ✅ **REQUIRED FIRST**

Run these SQL scripts in order:

#### **A. Standardize Image Storage**
```sql
-- File: standardize-image-storage.sql
-- Converts community_services.community_service_images from text[] to jsonb
-- This ensures consistency with providers.provider_images
```

#### **B. Add Missing Fields to Community Services**
```sql
-- File: add-missing-fields-community-services.sql
-- Adds offers_ids, needs_ids, show_address, user_created_id to community_services
-- This enables unified form fields
```

### **2. Code Changes** ✅ **COMPLETED**

#### **A. New Utility Functions**
- **File**: `src/utils/categoryUtils.ts`
- **Purpose**: Detects if a category should create community services
- **Key Function**: `shouldCreateCommunityService(categoryId)`

#### **B. Updated Form Provider**
- **File**: `src/providers/form-provider.tsx`
- **Changes**: Added `entityType: 'provider' | 'community_service'` field
- **Purpose**: Tracks whether to create provider or community service

#### **C. Updated Category Selection**
- **File**: `src/app/(public)/create/basics/category/page.tsx`
- **Changes**: Automatically sets `entityType` based on selected category
- **Logic**: "Gemeinschaft & Spenden" → `community_service`, others → `provider`

#### **D. Updated Media Upload Page**
- **File**: `src/app/(public)/create/media/page-new.tsx`
- **Changes**: Handles both entity types in creation logic
- **Features**:
  - Different image storage buckets
  - Different database tables
  - Different success messages
  - Hides community services selection for community service creation

## 🔧 **Key Features**

### **Category-Based Entity Detection**
- **"Gemeinschaft & Spenden"** (ID: `4470c3e0-458f-40a6-a96e-ca0fbdf145d7`) → Creates `community_service`
- **All other categories** → Creates `provider`

### **Unified Form Fields**
Both entity types use the same form fields:
- Title/Name
- Description
- Location (street, zip, city, country)
- Contact (email, phone, website, instagram)
- Offers & Needs
- Images
- Tags (barakah_effects)

### **Differentiated Behavior**
- **Community Services**: Auto-approved, different image bucket, no community services selection
- **Providers**: Manual approval, different image bucket, community services selection available

## 🚀 **Deployment Steps**

### **1. Database Migration**
```bash
# Run in Supabase SQL Editor
1. Execute standardize-image-storage.sql
2. Execute add-missing-fields-community-services.sql
```

### **2. Code Deployment**
```bash
# Replace the media page
mv src/app/(public)/create/media/page.tsx src/app/(public)/create/media/page-old.tsx
mv src/app/(public)/create/media/page-new.tsx src/app/(public)/create/media/page.tsx
```

### **3. Update TypeScript Interfaces**
Update `src/services/community_services.ts`:
```typescript
// Change from:
community_service_images?: string[];
// To:
community_service_images?: Record<string, unknown>;
```

## 🧪 **Testing**

### **Test Cases**
1. **Provider Creation**: Select any category except "Gemeinschaft & Spenden"
   - Should create in `providers` table
   - Should show community services selection
   - Should use `provider-images` bucket

2. **Community Service Creation**: Select "Gemeinschaft & Spenden"
   - Should create in `community_services` table
   - Should hide community services selection
   - Should use `community-service-images` bucket
   - Should be auto-approved

### **Verification**
- Check database tables for correct data insertion
- Verify image uploads go to correct buckets
- Confirm form behavior changes based on category selection

## 🔄 **Future Enhancements**

### **Dynamic Category Detection**
Instead of hardcoded category ID, use database field:
```sql
ALTER TABLE categories ADD COLUMN entity_type VARCHAR(20) DEFAULT 'provider';
UPDATE categories SET entity_type = 'community_service' WHERE category_id = '4470c3e0-458f-40a6-a96e-ca0fbdf145d7';
```

### **Category-Specific Fields**
Add category-specific form fields:
- Community services: donation goals, verification status
- Providers: business hours, service areas

## 📝 **Notes**

- **Backward Compatibility**: Existing providers and community services remain unchanged
- **Image Migration**: Existing community service images will be converted from text[] to jsonb format
- **Form Persistence**: Form data is saved to localStorage and persists across page refreshes
- **Error Handling**: Comprehensive error handling for both entity types
