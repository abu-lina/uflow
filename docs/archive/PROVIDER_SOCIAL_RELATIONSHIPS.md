# Provider-Social Project Relationships

This document explains how to set up the many-to-many relationship between providers and social projects (community services).

## 🎯 **Problem Solved**

Previously, there was no proper relationship between providers and social projects, making it impossible to show which social projects a provider supports in the "Barakah Effect" section.

## 🔧 **Solution**

Created a many-to-many relationship using a junction table `provider_community_services` that allows:
- **One provider** to support **multiple social projects**
- **One social project** to be supported by **multiple providers**

## 📁 **Files Created**

1. **`supabase/migrations/archive/002_create_provider_community_services_relationship.sql`** - Database migration
2. **`setup-provider-social-relationships.sql`** - Setup script with sample data
3. **Updated `src/services/community_services.ts`** - Service functions for the new relationship

## 🚀 **How to Apply**

### Option 1: Using Supabase CLI (Recommended)
```bash
# Navigate to your project directory
cd /Users/NARAFIQ/Projects/uflow

# Apply the migration
supabase db push

# Or reset and apply all migrations
supabase db reset
```

### Option 2: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/archive/002_create_provider_community_services_relationship.sql`
4. Run the SQL script

### Option 3: Using the setup script
1. Run the setup script in your database:
```sql
\i setup-provider-social-relationships.sql
```

## 🗄️ **Database Schema**

### New Table: `provider_community_services`
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

### Helper Functions
- `get_community_services_for_provider(provider_uuid)` - Get all social projects for a provider
- `get_providers_for_community_service(service_uuid)` - Get all providers supporting a social project

## 🔧 **Updated Service Functions**

### New Functions in `community_services.ts`:
- `createProviderCommunityServiceRelationship()` - Link provider to social project
- `removeProviderCommunityServiceRelationship()` - Unlink provider from social project
- `getProvidersForCommunityService()` - Get providers supporting a social project
- Updated `getCommunityServicesForProvider()` - Uses new relationship

## 📊 **Sample Data**

The migration includes sample social projects:
- **Wüstenkind e.V.** - Donation project with +10 donations
- **Umma Moschee** - Mosque project with +10 initiatives supported

## 🔒 **Security**

Row Level Security (RLS) is enabled with policies:
- **Public read access** for relationships
- **Authenticated users** can create relationships
- **Users can only manage** their own provider's relationships

## 🧪 **Testing**

After applying the migration:

1. **Check the relationship table:**
```sql
SELECT * FROM public.provider_community_services;
```

2. **Test the helper function:**
```sql
SELECT * FROM get_community_services_for_provider('f5cf7a57-74a8-4528-8aac-f4d773567adc');
```

3. **Visit the provider detail page:**
```
http://localhost:3000/providers/f5cf7a57-74a8-4528-8aac-f4d773567adc
```

## 🔄 **Migration Strategy**

The service functions include fallback logic:
- **Primary**: Uses new `provider_community_services` table
- **Fallback**: Uses old `community_services.provider_id` if new table doesn't exist

This ensures backward compatibility during the transition.

## 🎯 **Expected Result**

After applying this migration, the "Barakah Effect" section on provider detail pages will show:
- ✅ **Real social projects** connected to the provider
- ✅ **Impact metrics** (donation counts, initiatives supported)
- ✅ **Proper categorization** (Spenden, Moschee, etc.)
- ✅ **Dynamic content** based on actual database relationships

## 🚨 **Important Notes**

1. **Backup your database** before applying migrations
2. **Test in development** before applying to production
3. **Remove mock data** from `ProviderDetailPage.tsx` after confirming real data works
4. **Update your application** to use the new relationship functions

## 🔧 **Troubleshooting**

### If relationships don't show up:
1. Check if the migration was applied successfully
2. Verify sample data was inserted
3. Check browser console for any errors
4. Ensure the provider ID exists in the database

### If you get permission errors:
1. Check RLS policies are correctly applied
2. Ensure user has proper authentication
3. Verify the user owns the provider or has admin access
