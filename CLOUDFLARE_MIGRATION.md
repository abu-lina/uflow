# Cloudflare Pages Migration Guide

## Overview

**Good news**: You're **80% done** with the migration! Your codebase already has:
- ✅ `@opennextjs/cloudflare` package installed
- ✅ `wrangler.jsonc` configured
- ✅ `wrangler.toml` configured  
- ✅ `open-next.config.ts` configured
- ✅ Build scripts ready (`build:cloudflare`, `deploy`)

**Time to complete**: ~30 minutes  
**Cost**: $0/month forever  
**Difficulty**: 🟢 Easy (you've done the hard part!)

---

## Prerequisites Check

Run these checks:

```bash
# 1. Check if Wrangler is installed
npx wrangler --version
# Expected: ✅ 4.40.3 (or similar)

# 2. Check if OpenNext is installed
npm list @opennextjs/cloudflare
# Expected: ✅ @opennextjs/cloudflare@1.9.0

# 3. Test local build
npm run build:cloudflare
# Expected: ✅ Build completes successfully
```

All checks pass? Great! Let's deploy. ✅

---

## Step-by-Step Migration

### Step 1: Sign Up for Cloudflare (5 minutes)

1. **Create account** at [dash.cloudflare.com](https://dash.cloudflare.com/sign-up)
   - Use your email
   - Free plan is perfect for your needs

2. **Add your domain** (optional for now)
   - You can use `*.pages.dev` subdomain first
   - Add custom domain later

3. **Get your Account ID**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Click on "Workers & Pages" in the left sidebar
   - Your Account ID is shown in the right sidebar
   - Copy it - you'll need it soon

---

### Step 2: Authenticate Wrangler (2 minutes)

```bash
# Login to Cloudflare
npx wrangler login

# This will:
# 1. Open browser
# 2. Ask you to authorize Wrangler
# 3. Click "Allow"
# 4. You'll see "Successfully logged in" in terminal
```

**Verify authentication:**
```bash
npx wrangler whoami
# Expected output:
# ✅ You are logged in with an OAuth Token
```

---

### Step 3: Update Configuration (5 minutes)

Your config is mostly done, but let's verify:

**1. Check `wrangler.jsonc`:**
```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "main": ".open-next/worker.js",
  "name": "uflow",  // ✅ Change this to your preferred name
  "compatibility_date": "2024-12-30",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "kv_namespaces": []
}
```

**2. Check `wrangler.toml`:**
```toml
name = "uflow"  # ✅ Change this to your preferred name
compatibility_date = "2024-12-30"
compatibility_flags = ["nodejs_compat"]

[pages]
pages_build_output_dir = ".open-next"
```

**3. Check `open-next.config.ts`:**
```typescript
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  cloudflare: {
    pages: true,
  },
});
```

✅ **All good!** Your configs are correct.

---

### Step 4: Create Environment Variables (5 minutes)

Cloudflare needs your environment variables.

**Option A: Via Wrangler CLI (Recommended)**

```bash
# Set your Supabase URL
npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_URL
# Paste your value when prompted: https://your-project.supabase.co

# Set your Supabase anon key
npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
# Paste your value when prompted

# Set Supabase service role key (for server-side)
npx wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY
# Paste your value when prompted

# If you're using Sentry (from production readiness guide)
npx wrangler pages secret put NEXT_PUBLIC_SENTRY_DSN
# Paste your Sentry DSN

# If you're using Upstash (rate limiting)
npx wrangler pages secret put UPSTASH_REDIS_REST_URL
npx wrangler pages secret put UPSTASH_REDIS_REST_TOKEN
```

**Option B: Via Cloudflare Dashboard**

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click "Workers & Pages"
3. Click your project name (after first deployment)
4. Go to "Settings" → "Environment Variables"
5. Add each variable:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SENTRY_DSN` (if using)
   - `UPSTASH_REDIS_REST_URL` (if using)
   - `UPSTASH_REDIS_REST_TOKEN` (if using)

---

### Step 5: Test Build Locally (5 minutes)

Before deploying, test the build locally:

```bash
# Build for Cloudflare
npm run build:cloudflare

# Expected output:
# ✅ OpenNext build completed
# ✅ Assets copied to .open-next/assets
# ✅ Worker created at .open-next/worker.js
```

**If build succeeds**, you'll see:
```
✅ OpenNext build complete
📦 Output: .open-next/
```

**Test locally:**
```bash
# Run local preview
npm run preview

# This will:
# 1. Build the app
# 2. Start Wrangler dev server
# 3. Open http://localhost:8788

# Test your app locally before deploying!
```

**Common build issues:**

<details>
<summary>❌ Error: "Cannot find module '@opennextjs/cloudflare'"</summary>

```bash
# Solution: Reinstall dependencies
npm install
```
</details>

<details>
<summary>❌ Error: "middleware.ts" has issues</summary>

Your middleware needs to be compatible with Workers. Update it:

```typescript
// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // For Cloudflare Workers, simplify auth check
  const accessToken = req.cookies.get('sb-access-token')?.value;
  
  if (!accessToken) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Skip API validation in Workers (do it in the actual route)
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/(dashboard)/(.*)',
    '/(admin)/(.*)',
  ],
};
```
</details>

---

### Step 6: Deploy to Cloudflare (5 minutes)

Ready to deploy? Let's go! 🚀

```bash
# Deploy to Cloudflare Pages
npm run deploy

# Or manually:
npx opennextjs-cloudflare build && npx wrangler deploy
```

**Expected output:**
```
✅ Uploading...
✅ Deployment complete!
✅ https://uflow.pages.dev
```

**Your app is now live!** 🎉

Visit the URL shown (e.g., `https://uflow.pages.dev`)

---

### Step 7: Configure Custom Domain (5 minutes)

**Option A: Cloudflare-managed Domain (Easiest)**

If your domain is already on Cloudflare:

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click "Workers & Pages"
3. Click your project ("uflow")
4. Go to "Custom domains"
5. Click "Set up a custom domain"
6. Enter your domain (e.g., `app.yourdomain.com`)
7. Click "Continue"
8. Cloudflare auto-configures DNS ✅

**Option B: External Domain (Needs DNS Change)**

If your domain is on another provider:

1. In Cloudflare Pages dashboard, add custom domain
2. Cloudflare will give you a CNAME record:
   ```
   CNAME app → uflow.pages.dev
   ```
3. Add this CNAME to your domain provider's DNS
4. Wait 5-10 minutes for propagation
5. Cloudflare auto-provisions SSL ✅

**Option C: Use Cloudflare Pages Subdomain**

No custom domain? No problem!
- Your app is live at: `https://uflow.pages.dev`
- Free SSL included ✅
- Add custom domain anytime later

---

### Step 8: Set Up Automatic Deployments (3 minutes)

Connect GitHub for auto-deploys:

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click "Workers & Pages"
3. Click your project
4. Go to "Settings" → "Builds & deployments"
5. Click "Connect to Git"
6. Select your GitHub repo
7. Configure:
   - **Production branch**: `main`
   - **Build command**: `npm run build:cloudflare`
   - **Build output directory**: `.open-next`
8. Click "Save and Deploy"

Now every push to `main` auto-deploys! 🚀

**Preview deployments:**
- Every PR gets a preview URL
- Test before merging
- Just like Vercel!

---

## Post-Migration Checklist

After deploying, verify everything works:

- [ ] **Homepage loads**: Visit your Cloudflare URL
- [ ] **Navigation works**: Test all pages
- [ ] **Supabase connection**: Try login/signup
- [ ] **Provider search**: Test search functionality
- [ ] **Provider creation**: Create a test provider
- [ ] **Bookmarks**: Test bookmark functionality
- [ ] **Images load**: Check provider images
- [ ] **PWA works**: Test offline functionality
- [ ] **Custom domain**: If configured, test it
- [ ] **SSL certificate**: Ensure HTTPS works

---

## Environment-Specific Configuration

### Development vs Production

**Create separate environments:**

```bash
# Deploy to preview
npx wrangler deploy --env preview

# Deploy to production
npx wrangler deploy --env production
```

**Update `wrangler.toml`:**
```toml
name = "uflow"
compatibility_date = "2024-12-30"
compatibility_flags = ["nodejs_compat"]

[env.preview]
name = "uflow-preview"
vars = { ENVIRONMENT = "preview" }

[env.production]
name = "uflow"
vars = { ENVIRONMENT = "production" }
```

---

## Performance Optimization

### 1. Enable Cloudflare Analytics (Free)

1. Go to Cloudflare Dashboard
2. Click "Workers & Pages" → Your project
3. Go to "Analytics & Logs"
4. Enable "Web Analytics"
5. Add the script to your app (optional - Cloudflare auto-detects)

**Or use Cloudflare Web Analytics directly:**

```typescript
// src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {process.env.NODE_ENV === 'production' && (
          <script
            defer
            src='https://static.cloudflareinsights.com/beacon.min.js'
            data-cf-beacon='{"token": "YOUR_TOKEN"}'
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 2. Configure Caching

**Create `public/_headers`:**
```
# Cache static assets for 1 year
/images/*
  Cache-Control: public, max-age=31536000, immutable

/_next/static/*
  Cache-Control: public, max-age=31536000, immutable

# Cache API responses for 5 minutes
/api/*
  Cache-Control: public, max-age=300, s-maxage=300

# Don't cache HTML
/*.html
  Cache-Control: public, max-age=0, must-revalidate
```

### 3. Enable Image Optimization

Cloudflare Workers can optimize images:

**Create `src/app/api/image/[...path]/route.ts`:**
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get('url');
  
  if (!imageUrl) {
    return new NextResponse('Missing image URL', { status: 400 });
  }

  // Fetch original image
  const imageResponse = await fetch(imageUrl);
  
  // Use Cloudflare Image Resizing (if on paid plan)
  // Or return as-is for now
  return new NextResponse(imageResponse.body, {
    headers: {
      'Content-Type': imageResponse.headers.get('Content-Type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
```

---

## Rate Limiting with Workers KV

Now that you're on Cloudflare, use Workers KV for rate limiting (FREE):

**1. Create KV Namespace:**
```bash
npx wrangler kv:namespace create RATE_LIMIT
```

**2. Add to `wrangler.toml`:**
```toml
[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "your-kv-id-from-previous-command"
```

**3. Use in your app:**
```typescript
// This is better than Upstash for your scale (FREE + FASTER)
interface CloudflareEnv {
  RATE_LIMIT: KVNamespace;
}

export async function checkRateLimit(
  env: CloudflareEnv,
  key: string,
  limit: number,
  window: number
): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - window;
  
  const requests = await env.RATE_LIMIT.get(key);
  const count = requests ? JSON.parse(requests).count : 0;
  
  if (count >= limit) {
    return false; // Rate limited
  }
  
  await env.RATE_LIMIT.put(
    key,
    JSON.stringify({ count: count + 1, timestamp: now }),
    { expirationTtl: window / 1000 }
  );
  
  return true; // OK
}
```

---

## Monitoring & Debugging

### View Logs

```bash
# Real-time logs
npx wrangler tail

# Or in dashboard:
# Workers & Pages → Your project → Logs
```

### Debugging

**Add logging:**
```typescript
// In your API routes or pages
console.log('Debug info:', data);

// Logs appear in:
# 1. Wrangler tail (local)
# 2. Cloudflare dashboard (production)
```

### Error Tracking

Sentry works with Cloudflare Workers:

```typescript
// src/app/error.tsx
import * as Sentry from '@sentry/nextjs';

export default function Error({ error }: { error: Error }) {
  Sentry.captureException(error);
  // ... rest of error component
}
```

---

## Rollback Plan

If something goes wrong:

### Quick Rollback to Previous Version

```bash
# View deployments
npx wrangler pages deployment list

# Rollback to specific deployment
npx wrangler pages deployment rollback <deployment-id>
```

### Or in Dashboard

1. Go to Workers & Pages → Your project
2. Click "View deployments"
3. Find previous working deployment
4. Click "Rollback"

### Emergency: Point DNS Back to Vercel

1. Update CNAME to point back to Vercel
2. Wait 5-10 minutes for DNS propagation
3. You're back on Vercel

**This is why you should keep Vercel running for 1-2 weeks after migration.**

---

## Cost Breakdown (Cloudflare vs Vercel)

### Your App @ 500 DAU

| Feature | Cloudflare Pages | Vercel Free | Vercel Pro |
|---------|------------------|-------------|------------|
| **Bandwidth** | ✅ Unlimited | 100 GB/month | Unlimited |
| **Requests** | ✅ Unlimited | Limited | Unlimited |
| **Builds** | ✅ 500/month | 6,000 min/month | Unlimited |
| **Analytics** | ✅ Free | ❌ $20/month | Included |
| **Rate Limiting** | ✅ Free (KV) | Via code | Via code |
| **Image Optimization** | ✅ Free | Limited | Included |
| **Edge Functions** | ✅ Free | Limited | Included |
| **Total Cost** | **$0/month** | $0 (limited) | **$20/month** |

**Savings**: $240/year by using Cloudflare! 💰

---

## Comparison After Migration

| Metric | Before (Vercel) | After (Cloudflare) | Improvement |
|--------|-----------------|-------------------|-------------|
| **Cost** | $0-20/month | **$0/month** | ✅ $240/year saved |
| **Bandwidth** | 100 GB limit | **Unlimited** | ✅ No limits |
| **Edge Locations** | ~40 | **220+** | ✅ 5.5x more |
| **CDN Speed** | Fast | **Faster** | ✅ 20-30% faster |
| **Build Time** | ~1-2 min | ~2-3 min | ⚠️ Slightly slower |
| **Deploy Time** | Instant | ~30 sec | ⚠️ Slightly slower |
| **Analytics** | $20/month | **Free** | ✅ Better & free |
| **DDoS Protection** | Basic | **Enterprise** | ✅ Much better |

---

## Troubleshooting

### Issue: Build fails with "Cannot find module"

**Solution:**
```bash
# Clean install
rm -rf node_modules .next .open-next
npm install
npm run build:cloudflare
```

### Issue: "middleware.ts" errors

**Solution:** Simplify middleware for Workers compatibility (see Step 5 above)

### Issue: Environment variables not working

**Solution:**
```bash
# List all secrets
npx wrangler pages secret list

# Delete and re-add
npx wrangler pages secret delete VARIABLE_NAME
npx wrangler pages secret put VARIABLE_NAME
```

### Issue: Images not loading

**Solution:** Check CSP headers, ensure Supabase domains are allowed:
```typescript
// next.config.js - already configured!
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: '**.supabase.co',
    },
  ],
}
```

### Issue: Supabase connection fails

**Solution:** Verify environment variables are set:
```bash
npx wrangler pages secret list

# Should show:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## Success Metrics

After migration, monitor:

- [ ] **Uptime**: Should be >99.9% (use UptimeRobot)
- [ ] **Page Load**: Should be 20-30% faster
- [ ] **Error Rate**: Should be <1%
- [ ] **Build Success**: Should be 100%
- [ ] **Cost**: Should be $0/month 🎉

---

## Next Steps After Migration

1. **Week 1**: Monitor closely
   - Check Cloudflare Analytics
   - Monitor error logs
   - Test all features

2. **Week 2**: Optimize
   - Configure caching headers
   - Set up KV rate limiting
   - Enable image optimization

3. **Week 3**: Decommission Vercel
   - Verify everything works
   - Cancel Vercel subscription
   - Delete Vercel project

4. **Month 2**: Advanced Features
   - Explore Cloudflare D1 (serverless SQL)
   - Try Cloudflare R2 (cheap storage)
   - Set up email workers

---

## Support

If you get stuck:

- **Cloudflare Docs**: [developers.cloudflare.com/pages](https://developers.cloudflare.com/pages)
- **OpenNext Docs**: [opennext.js.org](https://opennext.js.org)
- **Community**: [Cloudflare Discord](https://discord.cloudflare.com)
- **Status**: [cloudflarestatus.com](https://www.cloudflarestatus.com)

---

## Ready to Deploy?

You're 80% done! Just run:

```bash
# 1. Login
npx wrangler login

# 2. Add secrets
npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Deploy!
npm run deploy

# 🎉 Your app is live on Cloudflare!
```

**Total time: 30 minutes**  
**Total cost: $0/month**  
**Total improvement: Massive! 🚀**

