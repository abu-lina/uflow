# Deploy to Netlify - Run These Commands

You're already logged in! ✅ Now let's deploy.

## Option 1: Quick Deploy via CLI (Recommended)

Run these commands in your terminal:

```bash
# Make sure you're in the project directory
cd /Users/NARAFIQ/Projects/uflow

# Initialize Netlify site
netlify init
```

**When prompted:**
1. Choose: **"Create & configure a new project"** (press Enter)
2. Team: **"abu-lina's team"** (press Enter)
3. Site name: Type **"uflow-app"** (or leave blank for random name)
4. Build command: **Already configured in netlify.toml** ✅
5. Directory to deploy: **Already configured in netlify.toml** ✅
6. Netlify functions folder: **Press Enter** (leave blank)

Then:

```bash
# Deploy to production
netlify deploy --prod
```

---

## Option 2: Deploy via GitHub (Easier, Auto-Deploy)

This is actually easier for ongoing deployments!

### Step 1: Commit netlify.toml to Git

```bash
cd /Users/NARAFIQ/Projects/uflow

# Add netlify.toml
git add netlify.toml

# Commit
git commit -m "Add Netlify configuration"

# Push to GitHub
git push origin main
```

### Step 2: Connect on Netlify Dashboard

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **"Deploy with GitHub"**
4. Authorize Netlify to access your GitHub
5. Select your repository: **uflow**
6. Netlify will auto-detect Next.js! ✅
7. Settings will be:
   - **Build command**: `npm run build:raw` ✅ (from netlify.toml)
   - **Publish directory**: `.next` ✅ (from netlify.toml)
8. **Don't click "Deploy" yet!** First, add environment variables...

### Step 3: Add Environment Variables

Before deploying, add these in the Netlify dashboard:

1. Scroll down to **"Environment variables"**
2. Click **"Add environment variables"** → **"Add a single variable"**
3. Add these one by one:

```
Key: NEXT_PUBLIC_SUPABASE_URL
Value: (copy from your .env.local file)

Key: NEXT_PUBLIC_SUPABASE_ANON_KEY  
Value: (copy from your .env.local file)

Key: SUPABASE_SERVICE_ROLE_KEY
Value: (copy from your .env.local file)
```

**Optional (if you're using these):**
```
Key: NEXT_PUBLIC_SENTRY_DSN
Value: (your Sentry DSN if using)

Key: UPSTASH_REDIS_REST_URL
Value: (if using rate limiting)

Key: UPSTASH_REDIS_REST_TOKEN
Value: (if using rate limiting)
```

### Step 4: Deploy!

Click **"Deploy uflow-app"** button.

**Netlify will:**
- ✅ Clone your repo
- ✅ Install dependencies
- ✅ Run `npm run build:raw`
- ✅ Deploy to global CDN
- ✅ Give you a URL: `https://uflow-app.netlify.app`

**Build time: ~2-3 minutes**

---

## Step 5: Get Your Environment Variable Values

Quick way to copy your values:

```bash
# In your terminal, run:
cd /Users/NARAFIQ/Projects/uflow

# Show Supabase URL
grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d '=' -f2

# Show Supabase Anon Key
grep "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local | cut -d '=' -f2

# Show Service Role Key
grep "SUPABASE_SERVICE_ROLE_KEY" .env.local | cut -d '=' -f2
```

Copy each value and paste into Netlify.

---

## What Happens Next?

### After First Deploy

1. **Build starts** - Watch the logs in Netlify dashboard
2. **Build completes** (~2-3 min)
3. **Site goes live** at: `https://uflow-app.netlify.app`
4. **You get email** confirming deployment

### Test Your Site

Visit your Netlify URL and test:
- [ ] Homepage loads
- [ ] Navigate to /providers
- [ ] Try searching
- [ ] Test login/signup
- [ ] Create a provider
- [ ] Check images load

### Future Deploys

Every time you `git push` to `main`:
- ✅ Netlify auto-deploys
- ✅ No manual commands needed
- ✅ Preview for each PR

---

## Troubleshooting

### Build Fails with "Module not found"

**Solution**: Make sure all dependencies are in `package.json`:

```bash
# In your terminal
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

Netlify will auto-rebuild.

### Environment Variables Not Working

**Solution**: 
1. Go to Netlify dashboard
2. Site settings → Environment variables
3. Verify all variables are there
4. Click "Trigger deploy" to rebuild

### 404 Errors on Pages

**Solution**: This shouldn't happen with netlify.toml! But if it does:

1. Check `netlify.toml` has the redirects section
2. Redeploy

### Images Not Loading

**Solution**: Check Supabase environment variables are correct:
```bash
# Test your Supabase connection
echo $NEXT_PUBLIC_SUPABASE_URL
```

---

## Next Steps After Deployment

### 1. Set Up Custom Domain (Optional)

In Netlify dashboard:
1. Go to **Domain settings**
2. Click **"Add custom domain"**
3. Follow instructions

### 2. Enable Analytics (Optional)

```bash
netlify analytics:enable
```

Or in dashboard: **Analytics** → **Enable analytics**

### 3. Set Up Auto-Deploys

Already done if you used GitHub method! ✅

Every PR gets a preview URL like:
```
https://deploy-preview-123--uflow-app.netlify.app
```

---

## Quick Command Reference

```bash
# Check status
netlify status

# View site info
netlify sites:list

# Open site in browser
netlify open:site

# View deploy logs
netlify watch

# Manual deploy
netlify deploy --prod

# Link to existing site (if needed)
netlify link
```

---

## My Recommendation

**Use Option 2 (GitHub Integration)** because:
- ✅ Easier to set up
- ✅ Auto-deploys on every push
- ✅ Preview URLs for PRs
- ✅ Better long-term workflow

**Steps:**
1. Commit `netlify.toml`: `git add netlify.toml && git commit -m "Add Netlify config" && git push`
2. Go to [app.netlify.com](https://app.netlify.com)
3. Import from GitHub
4. Add environment variables
5. Click Deploy
6. ☕ Wait 2-3 minutes
7. 🎉 Your site is live!

---

## Need Help?

If you run into issues:

1. Check the Netlify deploy logs (shown in dashboard)
2. Common error: Missing environment variables
3. Common error: Build command fails → Check `package.json` scripts

**Want me to help debug?** Share:
- Netlify deploy log
- Error message
- What step failed

---

**Ready? Start with Option 2 (GitHub method) - it's easier!** 🚀

