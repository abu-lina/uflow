# Ummah Flow Database Schema

This document outlines the database schema for the Ummah Flow application, explaining each table, its purpose, and how the RLS (Row Level Security) policies work.

## Tables Overview

### 1. Profiles Table
Extends the Supabase auth users table with additional user information.

**Key Fields:**
- `id`: UUID (linked to auth.users)
- `full_name`: User's full name
- `avatar_url`: Profile image
- `website`: Optional website URL
- `about`: Optional bio text

**RLS Policies:**
- Anonymous users can read profiles
- Only authenticated users can update their own profile
- Anonymous users are blocked from updating profiles (using RESTRICTIVE policies)

### 2. Services Table
Stores services offered by providers.

**Key Fields:**
- `id`: UUID
- `provider_id`: User ID of the service provider
- `title`: Service title
- `description`: Detailed description
- `category`: Service category
- `image_urls`: Array of image URLs
- `status`: Current status ('active', 'inactive', 'pending')
- `price`: Optional price
- `location`: Optional location
- `availability`: JSON structure for availability times
- `rating_avg`, `rating_count`, `view_count`: Statistics

**RLS Policies:**
- Anyone can view active services
- Providers can see all their own services
- Providers can only create/update/delete their own services

### 3. Bookmarks Table
Allows users to bookmark services they're interested in.

**Key Fields:**
- `id`: UUID
- `user_id`: User who created the bookmark
- `service_id`: Service being bookmarked
- `note`: Optional note about the bookmark

**RLS Policies:**
- Users can only view/create/update/delete their own bookmarks

## Foreign Key Relationships

1. `profiles.id` → `auth.users.id` (one-to-one)
2. `services.provider_id` → `auth.users.id` (many-to-one)
3. `bookmarks.user_id` → `auth.users.id` (many-to-one)
4. `bookmarks.service_id` → `services.id` (many-to-one)

## How to Verify the Schema

1. Run the SQL scripts in the Supabase SQL Editor:
   - First apply the RLS fixes for the profiles table
   - Then run the `COMPLETE-SCHEMA.sql` script

2. Verify tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'services', 'bookmarks');
```

3. Check RLS is enabled:
```sql
SELECT tablename, relrowsecurity FROM pg_tables 
JOIN pg_class ON pg_tables.tablename = pg_class.relname
WHERE schemaname = 'public' AND tablename IN ('profiles', 'services', 'bookmarks');
```

4. Check policies are in place:
```sql
SELECT tablename, policyname, permissive, cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
```

## Testing RLS Policies

After setting up the schema, you can test RLS policies using the test-rls page:
1. Go to http://localhost:3000/test-rls
2. Run the tests to verify:
   - Anonymous users can read profiles but not update them
   - Authenticated users can update their own profile but not others'

For services and bookmarks, you can use similar testing patterns to ensure the security policies are working as expected.

## Database Types

The database schema is fully typed in TypeScript - see `src/lib/database.types.ts` for the type definitions that can be used with the Supabase client. 