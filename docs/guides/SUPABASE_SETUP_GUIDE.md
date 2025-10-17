# 🗄️ Supabase Database Setup Guide

This guide will help you set up your new Supabase project with the complete database schema for Ummah Flow.

## 📋 Prerequisites

- New Supabase project created
- Access to Supabase Dashboard
- SQL Editor access

## 🚀 Step-by-Step Setup

### 1. **Run the Main Database Schema**

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase-schema.sql`
4. Click **Run** to execute all the SQL commands

This will create:
- ✅ All required tables (users, categories, providers, community_services, bookmarks)
- ✅ Custom enum types (user_role, review_status)
- ✅ Indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Triggers for automatic timestamps
- ✅ Default categories
- ✅ Search functions

### 2. **Set Up Storage Buckets**

1. In the same SQL Editor
2. Copy and paste the contents of `supabase-storage-setup.sql`
3. Click **Run** to execute

This will create:
- ✅ Storage buckets for images (provider-images, zakat-images, avatars)
- ✅ Storage policies for file access
- ✅ Helper functions for file management

### 3. **Update Environment Variables**

Create a `.env.local` file in your project root with:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Optional: External Services
CODECOV_TOKEN=your-codecov-token
SNYK_TOKEN=your-snyk-token
```

**To get your keys:**
1. Go to Supabase Dashboard → Settings → API
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

### 4. **Verify Setup**

Run these commands to test your setup:

```bash
# Install dependencies
npm install

# Run type check
npm run type-check

# Test build
npm run build:raw

# Start development server
npm run dev
```

## 📊 Database Schema Overview

### **Tables Created:**

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `users` | User profiles | Extends auth.users, role-based access |
| `categories` | Provider categories | Multilingual support (DE/EN) |
| `providers` | Marketplace listings | Full-text search, location data |
| `community_services` | Community service projects | Verification system, review workflow |
| `bookmarks` | User saved items | Polymorphic (providers/community_services) |

### **Storage Buckets:**

| Bucket | Purpose | Size Limit | File Types |
|--------|---------|------------|------------|
| `provider-images` | Provider photos | 5MB | JPEG, PNG, WebP, AVIF |
| `zakat-images` | Zakat project images | 5MB | JPEG, PNG, WebP, AVIF |
| `avatars` | User profile pictures | 2MB | JPEG, PNG, WebP |

### **Security Features:**

- ✅ **Row Level Security (RLS)** enabled on all tables
- ✅ **User-based access control** - users can only modify their own data
- ✅ **Admin/moderator roles** for content management
- ✅ **Public read access** for approved content
- ✅ **Secure file uploads** with user-based folder structure

## 🔧 Advanced Configuration

### **Custom Categories**

To add more categories, run:

```sql
INSERT INTO public.categories (category_id, name, name_de, name_en, description) 
VALUES (gen_random_uuid(), 'Category Name', 'German Name', 'English Name', 'Description');
```

### **User Roles**

Available roles:
- `user` - Regular users (default)
- `owner` - Can manage their own providers and community services
- `moderator` - Can review and approve content
- `admin` - Full access to all features

To promote a user to admin:

```sql
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'user@example.com';
```

### **Search Configuration**

The database includes full-text search in German. To search providers:

```sql
SELECT * FROM search_providers('search term', category_id, 'city', 20, 0);
```

## 🚨 Troubleshooting

### **Common Issues:**

1. **"Permission denied" errors**
   - Check that RLS policies are correctly set up
   - Verify user authentication status

2. **Storage upload failures**
   - Ensure storage buckets are created
   - Check file size limits and MIME types

3. **Search not working**
   - Verify German text search configuration
   - Check that indexes are created

4. **Type generation issues**
   - Run: `npx supabase gen types typescript --project-id <project-ref> --schema public > src/types/supabase.ts`

### **Reset Database (if needed):**

```sql
-- WARNING: This will delete all data!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Then re-run the schema setup
```

## 📞 Support

If you encounter issues:

1. Check the Supabase Dashboard logs
2. Verify all SQL commands executed successfully
3. Ensure environment variables are correctly set
4. Test with a simple query first

## ✅ Verification Checklist

- [ ] All tables created successfully
- [ ] Storage buckets configured
- [ ] RLS policies active
- [ ] Environment variables set
- [ ] Application builds without errors
- [ ] Can create and view providers
- [ ] File uploads working
- [ ] Search functionality working

Your Supabase database is now ready for Ummah Flow! 🎉
