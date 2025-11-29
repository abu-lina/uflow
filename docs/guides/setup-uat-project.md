# Setting Up UAT Project

## Current Status

✅ **DEV Project** (`qrekonfhaenjdnjhwdum`)
- MCP Supabase connected ✅
- Schema applied ✅
- 14 tables present ✅
- Default data inserted ✅

⏳ **UAT Project** (needs setup)
- Not yet configured
- Needs schema applied

---

## Step 1: Create UAT Supabase Project

If you haven't already:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `uflow-uat` (or your preferred name)
   - **Database Password**: Generate and save it
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine
4. Click **"Create new project"**
5. Wait 2-3 minutes for initialization

---

## Step 2: Get UAT Project Credentials

Once UAT project is ready:

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL**: `https://[your-uat-project-ref].supabase.co`
   - **anon public key**: `sb_publishable_...`
   - **service_role key**: `sb_secret_...`
3. Note the **Project Reference** from the URL

---

## Step 3: Update Environment Files

### Update `.env.uat`

```bash
nano .env.uat
```

Replace placeholders with UAT project credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[your-uat-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-uat-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-uat-service-role-key]
```

### Update `.env.production`

```bash
nano .env.production
```

Use the **SAME** UAT project credentials (UAT and Production share the same project):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[your-uat-project-ref].supabase.co  # Same as UAT!
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-uat-anon-key]  # Same as UAT!
SUPABASE_SERVICE_ROLE_KEY=[your-uat-service-role-key]  # Same as UAT!
```

But set:
```bash
NEXT_PUBLIC_SITE_URL=https://ummahflow.com  # Production URL
NODE_ENV=production
```

---

## Step 4: Apply Schema to UAT

You have **3 options**:

### Option A: Use MCP Supabase (Recommended)

1. **Update MCP Config** to point to UAT project:
   - Edit `~/.cursor/mcp.json`
   - Change `project_ref` to your UAT project reference
   - Restart Cursor

2. **Apply Schema via MCP**:
   - I can help you apply the consolidated schema using MCP
   - Just ask: "Apply schema to UAT using MCP"

### Option B: Use Supabase SQL Editor

1. Go to UAT Supabase Dashboard → **SQL Editor**
2. Open `sql/queries/supabase-schema-consolidated.sql`
3. Copy entire file contents
4. Paste into SQL Editor
5. Click **Run**

### Option C: Use Command Line Script

```bash
./scripts/apply-schema-to-uat.sh sql/queries/supabase-schema-consolidated.sql
```

---

## Step 5: Verify UAT Setup

After applying schema:

```bash
./scripts/verify-environments.sh
```

Or use MCP Supabase to verify:
- Check tables exist
- Verify data is inserted
- Check RLS policies

---

## Quick Checklist

- [ ] Create UAT Supabase project
- [ ] Get UAT project credentials
- [ ] Update `.env.uat` with UAT credentials
- [ ] Update `.env.production` with UAT credentials (same project)
- [ ] Apply schema to UAT (choose one method above)
- [ ] Verify setup with verification script
- [ ] Test: `npm run dev:uat`

---

## MCP Supabase Setup

To use MCP Supabase for UAT:

1. **Update MCP Config** (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=[YOUR-UAT-PROJECT-REF]",
      "apiKey": "[YOUR-UAT-API-KEY]"
    }
  }
}
```

2. **Restart Cursor** to reload MCP config

3. **Then I can help you**:
   - Apply schema via MCP
   - Verify setup
   - Check tables and data
   - Generate TypeScript types

---

## Summary

**Current Setup:**
- ✅ DEV: `qrekonfhaenjdnjhwdum` (schema applied, MCP connected)
- ⏳ UAT: Needs to be created and configured

**Next Steps:**
1. Create UAT project in Supabase
2. Get UAT credentials
3. Update `.env.uat` and `.env.production`
4. Apply schema to UAT
5. (Optional) Update MCP to point to UAT for easier management

