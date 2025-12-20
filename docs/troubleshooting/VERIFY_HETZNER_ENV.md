# Verify Hetzner Server Environment Files

Before proceeding with the deployment fixes, you need to verify and configure environment files on your Hetzner server.

## Step 1: SSH into Hetzner Server

```bash
ssh root@91.98.207.106
# Or use hostname: ssh root@uflow-production
```

## Step 2: Navigate to Project Directory

```bash
# Try common locations:
cd /var/www/uflow || cd /root/uflow

# If neither exists, find it:
find / -name "uflow" -type d 2>/dev/null | grep -E "(var/www|root)"
```

## Step 3: Check for Environment Files

```bash
ls -la .env.*
```

**Expected files**:
- `.env.production`
- `.env.uat`

## Step 4: Verify Required Variables Exist

### For Production:
```bash
grep -c "NEXT_PUBLIC_SUPABASE_URL" .env.production
grep -c "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.production
grep -c "SUPABASE_SERVICE_ROLE_KEY" .env.production
```

### For UAT:
```bash
grep -c "NEXT_PUBLIC_SUPABASE_URL" .env.uat
grep -c "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.uat
grep -c "SUPABASE_SERVICE_ROLE_KEY" .env.uat
```

Each command should return `1` or higher, indicating the variable exists in the file.

## Step 5: Validate Supabase Credentials Format

### Check URL format (should output the URL):
```bash
grep "NEXT_PUBLIC_SUPABASE_URL" .env.production | head -1
```

**Expected format**: `NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co`

### Check anon key format (should start with eyJ):
```bash
grep "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.production | cut -d'=' -f2 | cut -c1-3
```

**Expected output**: `eyJ` (start of JWT token)

## If Files Don't Exist

### Create .env.production:

1. Copy the template from your local machine:
```bash
# On your local machine
scp env.production.template root@91.98.207.106:/var/www/uflow/.env.production
# or if project is in /root/uflow:
scp env.production.template root@91.98.207.106:/root/uflow/.env.production
```

2. Edit the file on the server:
```bash
nano .env.production
```

3. Fill in your actual Supabase credentials from:
   - Supabase Dashboard → Your Production Project → Settings → API
   - Copy the "Project URL" as `NEXT_PUBLIC_SUPABASE_URL`
   - Copy the "anon/public" key as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy the "service_role" key as `SUPABASE_SERVICE_ROLE_KEY`

### Create .env.uat:

Same process as above, but use `env.uat.template` and `.env.uat`

## Step 6: Secure the Files

```bash
chmod 600 .env.production .env.uat
```

This ensures only the owner can read/write these sensitive files.

## Verification Checklist

- [ ] `.env.production` exists and has correct Supabase URL
- [ ] `.env.production` has valid anon key (starts with eyJ)
- [ ] `.env.production` has service role key
- [ ] `.env.uat` exists and has correct Supabase URL
- [ ] `.env.uat` has valid anon key
- [ ] `.env.uat` has service role key
- [ ] Both files have permissions set to 600
- [ ] URLs match format: `https://[project-ref].supabase.co`
- [ ] Both UAT and production use the SAME Supabase project (as per your config)

## Next Steps

Once you've verified the environment files are properly configured on the Hetzner server, return to complete the deployment script fixes.

**Action Required**: Please run the above commands on your Hetzner server and confirm the files are properly configured before proceeding with deployment.

