# Quick Create - Testing Guide

## ✅ Implementation Complete!

I've created a **parallel creation flow** that lets you test Google Places and Instagram import without affecting your existing creation process.

## 🚦 Feature Flag Status

The Quick Import feature is currently **DISABLED by default** via feature flag.

To enable it for testing, add to your `.env.local`:
```bash
NEXT_PUBLIC_FEATURE_ENABLEQUICKIMPORT=true
```

Then restart your dev server.

## 📁 What Was Created

### New Files
```
src/
├── app/
│   ├── (public)/
│   │   └── create-quick/              ← NEW: Quick import flow
│   │       ├── page.tsx               (Choose import method)
│   │       └── review/page.tsx        (Review & publish)
│   └── api/
│       └── instagram/scrape/route.ts  ← NEW: Instagram API
└── components/
    └── create/
        ├── BusinessSearch.tsx         ← NEW: Google Places
        └── InstagramImport.tsx        ← NEW: Instagram import

docs/
└── QUICK_CREATE_FEATURE.md            ← Full documentation
```

### Modified Files
- `/src/app/(public)/create/page.tsx` - Added "Try Quick Import" button
- `/env.template` - Added Google Maps API key documentation
- `/package.json` - Added `@googlemaps/js-api-loader`

## 🚀 Quick Start (Testing Without API Keys)

### Step 0: Enable the Feature Flag

```bash
# Add to .env.local
echo "NEXT_PUBLIC_FEATURE_ENABLEQUICKIMPORT=true" >> .env.local

# Restart your dev server
npm run dev
```

### Option 1: Test Instagram Only (No setup needed!)

```bash
# 1. Navigate to:
http://localhost:3000/create

# 2. Click "Try Quick Import" button

# 4. Click "Instagram" tab

# 5. Enter a public Instagram username:
#    Try: natgeo, nike, starbucks, or any public business account

# 6. Click "Search" and watch the magic! ✨
```

**Instagram works immediately** - no API keys or configuration needed!

---

## 🗺️ Option 2: Test Google Places (Requires API Key)

### Get Google Maps API Key (5 minutes)

1. **Go to:** https://console.cloud.google.com/

2. **Create/Select Project:**
   - Click "Select a project" → "New Project"
   - Name it: "UFlow Development"

3. **Enable APIs:**
   - Go to "APIs & Services" → "Library"
   - Search and enable:
     - ✅ **Places API**
     - ✅ **Geocoding API**

4. **Create API Key:**
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Copy the API key

5. **Restrict API Key (Recommended):**
   - Click on your API key
   - Under "Application restrictions":
     - Choose "HTTP referrers"
     - Add: `localhost:*` and `http://localhost:*`
   - Under "API restrictions":
     - Choose "Restrict key"
     - Select: Places API, Geocoding API
   - Click "Save"

6. **Add to your project:**
   ```bash
   # Create or edit .env.local
   echo "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE" >> .env.local
   ```

7. **Restart your dev server:**
   ```bash
   npm run dev
   ```

### Test Google Places

1. Navigate to: `http://localhost:3000/create`
2. Click "Try Quick Import"
3. Click "Google" tab
4. Search for: "Starbucks Berlin" or any business
5. Watch it auto-fill everything! 🎉

---

## 📱 Test Flow Overview

```
/create (Main page)
    │
    │ [NEW BUTTON: "Try Quick Import (Beta)"]
    │
    └─> /create-quick
            │
            ├─> [Google Tab]  → Search business → Auto-fill → Review → Publish
            │
            └─> [Instagram Tab] → Enter @username → Import data → Review → Publish
```

**Original flow still intact:**
- "I own this business" → Original 4-step form
- "Recommend a business" → Original recommendation flow

---

## 🧪 Suggested Test Cases

### Test 1: Instagram Import (Public Account)
- Username: `natgeo`, `nike`, `starbucks`
- ✅ Should import: name, bio, photos, website
- ✅ Should show follower count

### Test 2: Instagram Import (Business Account)
- Try a local business with Instagram business profile
- ✅ Should import: email, phone if available

### Test 3: Instagram Import (Private Account)
- Try any private account
- ✅ Should show error: "Profile not found or is private"

### Test 4: Google Places Search
- Search: "McDonald's Berlin Alexanderplatz"
- ✅ Should auto-fill: name, full address, phone, website
- ✅ Should show photos in future versions

### Test 5: Review Page Editing
- Import from Instagram or Google
- Edit any field in review page
- ✅ Changes should save
- ✅ Submit should create provider

### Test 6: Manual Fallback
- Click "Create manually instead"
- ✅ Should redirect to original /create/basics

---

## 💰 Cost Information

### Instagram Scraping
- **Cost:** FREE ✅
- **Limit:** ~100-200 requests/hour (Instagram rate limiting)
- **No API key needed**

### Google Places API
- **Free tier:** $200 credit/month = ~10,000 searches free
- **Cost per search:** ~$0.02 (after free tier)
- **For testing:** Completely free (you won't hit limits)

---

## 🎯 Expected Results

### Time Comparison
- **Traditional form:** ~5-10 minutes per provider
- **Instagram import:** ~1 minute (search, review, publish)
- **Google import:** ~30 seconds (search, auto-fills everything)

### Success Metrics
- ✅ 80-90% reduction in form completion time
- ✅ Higher completion rate (less drop-off)
- ✅ Better data accuracy (from verified sources)

---

## 🐛 Troubleshooting

### "Google Maps API key not configured"
- **Solution:** Add API key to `.env.local` and restart server

### "Failed to fetch Instagram data"
- **Cause:** Rate limiting or private account
- **Solution:** Wait a minute and try again, or try different username

### Review page is empty
- **Solution:** Check browser console for errors
- Make sure you clicked "Import" button after search

### Instagram photos not loading
- **Cause:** Instagram may have changed their API
- **Note:** This is expected occasionally with scraping

---

## 📊 What's Next?

After testing, you can decide:

1. **Keep both flows** (traditional + quick create)
2. **Make quick create the primary flow** (move traditional to "advanced")
3. **Iterate on quick create** (add more features)

### Possible Improvements
- [ ] Auto-map Google categories to your categories
- [ ] Upload imported photos to Supabase storage
- [ ] Add website scraping as third option
- [ ] Add OpenStreetMap as Google-free alternative
- [ ] Bulk import via CSV

---

## 🎨 User Experience

### Before (Traditional)
```
Step 1: Basics (name, category, description)
Step 2: Location (street, city, ZIP, country)
Step 3: Contact (phone, email, website, Instagram)
Step 4: Media (upload photos)
TOTAL: 4 pages, 15+ fields, 5-10 minutes
```

### After (Quick Create)
```
Step 1: Search (Google or Instagram)
Step 2: Review & Edit (optional tweaks)
TOTAL: 2 pages, 0-3 fields, 30 seconds - 1 minute
```

---

## 📞 Need Help?

- **Full documentation:** `/docs/QUICK_CREATE_FEATURE.md`
- **Check logs:** Browser console for errors
- **Test environment:** Use incognito mode to rule out caching

---

## ✨ Ready to Test!

```bash
# Start the server
npm run dev

# Open your browser
open http://localhost:3000/create

# Click "Try Quick Import (Beta)"
# Choose Instagram or Google
# Import a business in seconds! 🚀
```

**Your existing creation flow is untouched** - this is completely parallel for safe testing!

