# Setting Up UAT with MCP Supabase

This guide shows how to use MCP Supabase to set up your UAT database.

## Current MCP Connection

MCP Supabase is currently connected to:
- **Project URL**: `https://qrekonfhaenjdnjhwdum.supabase.co`

**Question**: Is this your DEV project or UAT/PROD project?

---

## What MCP Supabase Can Do

MCP Supabase provides these tools:

### 1. **Check Current State**
- ✅ List tables: `mcp_supabase_list_tables`
- ✅ List migrations: `mcp_supabase_list_migrations`
- ✅ Check extensions: `mcp_supabase_list_extensions`
- ✅ Get project URL: `mcp_supabase_get_project_url`
- ✅ Security advisors: `mcp_supabase_get_advisors`

### 2. **Apply Migrations**
- ✅ Apply migration: `mcp_supabase_apply_migration`
- ✅ Execute SQL: `mcp_supabase_execute_sql`

### 3. **Verify Setup**
- ✅ Check tables exist
- ✅ Verify RLS policies
- ✅ Check for security issues

---

## Current Database Status

Based on MCP Supabase check:

### ✅ Tables Present (14 tables)
- users
- categories (10 rows)
- providers (1 row)
- community_services
- bookmarks
- offers (10 rows)
- needs (10 rows)
- provider_community_services
- category_suggested_offers
- category_suggested_needs
- email_confirmation_tokens
- push_subscriptions
- consent_logs
- admin_audit_logs

### ⚠️ Security Warnings
- 12 functions have mutable search_path (security best practice)
- These are warnings, not critical errors
- Can be fixed later if needed

---

## Using MCP Supabase for UAT Setup

### Option 1: If MCP is Connected to UAT Project

If the current MCP connection (`qrekonfhaenjdnjhwdum`) is your UAT/PROD project:

1. **Verify Schema is Complete**
   - ✅ Already done - all tables exist
   - ✅ Default data inserted (10 categories, 10 offers, 10 needs)

2. **Check for Missing Pieces**
   ```bash
   # MCP can check:
   - Missing tables
   - Missing RLS policies
   - Security issues
   ```

3. **Apply Any Missing Migrations**
   - If you have new migrations, use `mcp_supabase_apply_migration`

### Option 2: If MCP is Connected to DEV Project

If the current MCP connection is your DEV project:

1. **Switch MCP to UAT Project**
   - Update MCP Supabase configuration to point to UAT project
   - Get UAT project URL from `.env.uat`

2. **Apply Schema to UAT**
   - Use `mcp_supabase_apply_migration` to apply consolidated schema
   - Or use `mcp_supabase_execute_sql` to run the full schema

---

## Quick Setup Steps

### Step 1: Identify Which Project MCP is Connected To

Check your `.env.local`:
```bash
grep "NEXT_PUBLIC_SUPABASE_URL" .env.local
```

If it matches `qrekonfhaenjdnjhwdum`, then MCP is connected to your local/DEV project.

### Step 2: Set Up UAT Project

**If UAT needs schema applied:**

1. Update MCP Supabase config to point to UAT project
2. Use MCP to apply schema:
   ```typescript
   // MCP will apply the consolidated schema
   mcp_supabase_apply_migration({
     name: "setup_uat_schema",
     query: "<consolidated schema SQL>"
   })
   ```

**If UAT already has schema:**
- ✅ You're done! Just verify with MCP tools

### Step 3: Verify Both Projects

Use MCP to verify:
- ✅ Tables exist
- ✅ RLS policies are set
- ✅ Default data is inserted
- ✅ No critical security issues

---

## MCP Supabase Commands Reference

### Check Tables
```typescript
mcp_supabase_list_tables({ schemas: ['public'] })
```

### Apply Migration
```typescript
mcp_supabase_apply_migration({
  name: "setup_complete_schema",
  query: "<SQL from supabase-schema-consolidated.sql>"
})
```

### Execute SQL
```typescript
mcp_supabase_execute_sql({
  query: "SELECT COUNT(*) FROM public.categories;"
})
```

### Check Security
```typescript
mcp_supabase_get_advisors({ type: "security" })
```

### Get Project Info
```typescript
mcp_supabase_get_project_url()
mcp_supabase_get_anon_key()
```

---

## Next Steps

1. **Identify which project MCP is connected to**
   - Check `.env.local` vs current MCP project URL

2. **If MCP is on DEV, switch to UAT**
   - Update MCP Supabase configuration
   - Point to UAT project from `.env.uat`

3. **Apply schema to UAT (if needed)**
   - Use MCP to apply consolidated schema
   - Or verify it's already applied

4. **Verify setup**
   - Use MCP tools to check tables, policies, data

---

## Benefits of Using MCP Supabase

✅ **No manual SQL Editor** - Apply migrations programmatically  
✅ **Verify setup** - Check tables, policies, security automatically  
✅ **Consistent** - Same process for DEV and UAT  
✅ **Automated** - Can be scripted and repeated  

---

**Note**: MCP Supabase needs to be configured with the correct project credentials. Check your MCP configuration to ensure it's pointing to the right Supabase project.

