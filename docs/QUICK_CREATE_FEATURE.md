# Quick Create Feature - Documentation

## Overview

The **Quick Create** feature dramatically reduces the time it takes users to add businesses to UFlow by auto-importing data from Google Places or Instagram.

**Time Savings:**
- Traditional form: ~5-10 minutes
- Quick Create: ~30 seconds - 1 minute

## Features

### 1. Google Places Import ⭐
Auto-fills business data from Google's database:
- Business name
- Full address (street, city, ZIP, country)
- Phone number
- Website
- Business category/type
- Geographic coordinates
- Photos (up to 5 images)

### 2. Instagram Import ⭐
Scrapes public Instagram profile data:
- Business name
- Bio/description
- Website link from bio
- Profile picture
- Recent posts (up to 12 images)
- Business contact info (if business account)
- Follower count

## File Structure

```
src/
├── app/
│   ├── (public)/
│   │   ├── create/                    # Original multi-step flow
│   │   └── create-quick/              # NEW: Quick import flow
│   │       ├── page.tsx              # Main page (choose method)
│   │       └── review/
│   │           └── page.tsx          # Review & edit page
│   └── api/
│       └── instagram/
│           └── scrape/
│               └── route.ts          # Instagram scraping API
└── components/
    └── create/
        ├── BusinessSearch.tsx         # NEW: Google Places search
        ├── InstagramImport.tsx        # NEW: Instagram import
        └── ProviderOptionCard.tsx     # Existing
```

## User Flow

### Flow Diagram

```
/create (Main page)
    │
    ├─> Try Quick Import (NEW)
    │       │
    │       ├─> /create-quick
    │       │       │
    │       │       ├─> Choose: Google or Instagram
    │       │       │
    │       │       ├─> Google Places Search
    │       │       │       └─> Auto-fill data
    │       │       │
    │       │       └─> Instagram Import
    │       │               └─> Auto-fill data
    │       │
    │       └─> /create-quick/review
    │               ├─> Edit fields
    │               └─> Publish
    │
    ├─> I own this business (Existing)
    │       └─> /create/basics (4-step form)
    │
    └─> Recommend a business (Existing)
            └─> /recommend-provider
```

## Setup Instructions

### 1. Google Maps API (Optional)

**Cost:** ~$17 per 1,000 searches (generous free tier: $200 credit/month)

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable APIs:
   - **Places API** (required)
   - **Geocoding API** (required)
4. Create credentials (API key)
5. Restrict API key (recommended):
   - HTTP referrers: `ummahflow.com/*`, `localhost/*`
   - API restrictions: Places API, Geocoding API
6. Add to `.env.local`:
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

**Without API key:** Google Places search will show an error, but Instagram import will still work.

### 2. Instagram Scraping (No API Key Needed)

Instagram scraping uses public data and requires **no authentication or API keys**.

**How it works:**
- Fetches public Instagram profile page
- Parses JSON-LD or HTML data
- Extracts business information

**Limitations:**
- Only works with **public profiles**
- May be rate-limited by Instagram (handle gracefully)
- No access to private account data

**Rate Limiting:**
The scraper includes fallback methods if Instagram blocks requests. Consider adding caching or proxies for production.

## Technical Implementation

### Google Places Search

```typescript
import { Loader } from '@googlemaps/js-api-loader';

// Initialize Google Maps
const loader = new Loader({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  libraries: ['places'],
});

// Autocomplete returns full business data
const autocomplete = new google.maps.places.Autocomplete(input, {
  types: ['establishment'],
  fields: ['name', 'address_components', 'phone', 'website', 'photos'],
});
```

### Instagram Scraping

```typescript
// Server-side API route
POST /api/instagram/scrape
Body: { username: "business_handle" }

// Returns:
{
  username, name, biography, website,
  profilePicUrl, recentImages, followersCount,
  businessEmail, businessPhone, businessCategory
}
```

**Methods used:**
1. Instagram's public GraphQL endpoint (`?__a=1`)
2. HTML scraping with JSON-LD extraction
3. Fallback to `window._sharedData` parsing

## Testing the Feature

### Test Flow

1. **Start the app:**
```bash
npm run dev
```

2. **Navigate to:** `http://localhost:3000/create`

3. **Click:** "Try Quick Import" button

4. **Test Google Places:**
   - Click "Google" tab
   - Search for: "Starbucks Berlin"
   - Verify auto-filled data
   - Review and publish

5. **Test Instagram:**
   - Click "Instagram" tab
   - Enter: `natgeo` (or any public business account)
   - Verify imported data
   - Review and edit
   - Publish

### Test Cases

| Test Case | Expected Result |
|-----------|----------------|
| Google search (existing business) | All fields auto-filled |
| Google search (no results) | Error message shown |
| Instagram (public account) | Profile data imported |
| Instagram (private account) | Error: "Profile not found or is private" |
| Instagram (invalid username) | Error message |
| Review page (edit fields) | Changes saved correctly |
| Submit without required fields | Validation error |
| Submit with complete data | Provider created successfully |

## Comparison: Traditional vs Quick Create

| Metric | Traditional Form | Quick Create (Google) | Quick Create (Instagram) |
|--------|------------------|----------------------|--------------------------|
| **Steps** | 4 pages | 2 pages | 2 pages |
| **Fields to fill** | 15+ fields | 0-3 fields | 1-5 fields |
| **Time** | 5-10 minutes | 30 seconds | 1 minute |
| **Photos** | Manual upload | Auto-imported | Auto-imported |
| **Address** | Manual entry | Auto-filled | Manual entry |
| **Accuracy** | User-dependent | High (Google data) | Medium (bio parsing) |

## Deployment Checklist

### Before deploying to production:

- [ ] Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to Vercel environment variables
- [ ] Test Google Places import on production domain
- [ ] Test Instagram scraping (may need proxy/caching)
- [ ] Add analytics tracking for quick create usage
- [ ] Monitor Instagram rate limiting
- [ ] Add error logging for failed imports
- [ ] Consider adding Sentry for error tracking
- [ ] Test on mobile devices (primary use case)
- [ ] Add loading states and error boundaries

### Optional Improvements

- [ ] Add category auto-mapping (Google types → your categories)
- [ ] Implement image upload from imported photos
- [ ] Add website scraping as third option
- [ ] Cache Instagram profiles (reduce rate limiting)
- [ ] Add "Recently imported" suggestions
- [ ] Implement bulk import (CSV upload)
- [ ] Add preview before publishing
- [ ] Support multiple languages for descriptions

## Cost Analysis

### Google Places API

**Pricing (as of 2024):**
- Place Autocomplete (per session): $2.83 per 1,000
- Place Details: $17 per 1,000
- **Total per import:** ~$0.02

**Free tier:**
- $200 credit/month = ~10,000 imports/month free

### Instagram Scraping

**Cost:** $0 (free)

**Considerations:**
- May need proxy service if scaled ($10-50/month)
- Rate limiting: ~1 request/second (safe)

### Recommendation

Start with **Instagram primary** (free, most relevant for your users) and **Google secondary** (use free tier). Monitor usage and add payment method if needed.

## Troubleshooting

### Google Places not working

**Error:** "Google Maps API key not configured"
- **Solution:** Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to `.env.local`

**Error:** "Failed to load Google Maps"
- **Solution:** Check API is enabled in Google Cloud Console
- Verify API key restrictions (allow your domain)

### Instagram scraping fails

**Error:** "Profile not found or is private"
- **Solution:** Account is private or username is wrong
- Verify username is correct (without @)

**Error:** "Failed to fetch Instagram data"
- **Solution:** Instagram rate limited or changed HTML structure
- Try again in a few minutes
- Consider implementing proxy rotation

### Review page not showing data

- **Check:** Form data is stored in `FormProvider` context
- **Verify:** `updateFormData()` called after import
- **Debug:** Check console logs for imported data

## Future Enhancements

### Phase 2 (Planned)
1. **OpenStreetMap integration** (Google-free alternative)
2. **Website scraping** (Open Graph meta tags)
3. **Bulk CSV import** (for migrations)
4. **AI description generation** (GPT-4 API)

### Phase 3 (Future)
1. **QR code scanning** (business cards)
2. **Email invitation import** (suggest businesses)
3. **Smart category detection** (ML-based)
4. **Multi-language support** (auto-translate)

## Analytics & Metrics

Track these metrics to measure success:

- **Adoption rate:** % of users using Quick Create vs traditional
- **Completion time:** Average time to create provider
- **Success rate:** % of successful imports
- **Error rate:** Failed imports by type
- **Source breakdown:** Google vs Instagram usage
- **Conversion rate:** Import → Published providers

## Support & Feedback

For issues or questions:
1. Check this documentation first
2. Review error logs in browser console
3. Test in incognito mode (rule out caching)
4. Contact development team

---

**Last Updated:** October 30, 2025  
**Version:** 1.0  
**Status:** Beta (Testing Phase)

