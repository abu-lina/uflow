# Quick Import Feature Flag

## 🚦 Current Status: DISABLED

The Quick Import feature is currently **hidden** from the UI and disabled by default.

---

## 🔓 How to Enable (For Testing)

### Option 1: Environment Variable (Recommended)

Add to your `.env.local`:
```bash
NEXT_PUBLIC_FEATURE_ENABLEQUICKIMPORT=true
```

Then restart your dev server:
```bash
npm run dev
```

### Option 2: Quick Command

```bash
# Add the feature flag
echo "NEXT_PUBLIC_FEATURE_ENABLEQUICKIMPORT=true" >> .env.local

# Restart server
npm run dev
```

---

## 🔒 How to Disable

### Option 1: Remove from .env.local

Remove or comment out the line:
```bash
# NEXT_PUBLIC_FEATURE_ENABLEQUICKIMPORT=true
```

### Option 2: Set to false

```bash
NEXT_PUBLIC_FEATURE_ENABLEQUICKIMPORT=false
```

Then restart your dev server.

---

## ✅ Verification

### When Enabled:
You should see a **"Try Quick Import (Beta)"** button on the `/create` page:

```
┌────────────────────────────────┐
│  🚀 Try Quick Import (Beta)    │  ← This button appears
└────────────────────────────────┘

[I own this business]
[Recommend a business]
```

### When Disabled:
The Quick Import button is **hidden**, and you only see:

```
[I own this business]
[Recommend a business]
```

---

## 📍 What Gets Enabled

When the feature flag is `true`:
- ✅ "Try Quick Import" button on `/create` page
- ✅ Access to `/create-quick` route
- ✅ Google Places search
- ✅ Instagram import
- ✅ Review page

When the feature flag is `false` (default):
- ❌ Quick Import button is hidden
- ❌ Users only see traditional flow
- ✅ Direct URL access to `/create-quick` still works (for testing)

---

## 🎯 Production Deployment

### For Hetzner:

1. SSH into your Hetzner server
2. Update environment variables in your deployment configuration
3. Add new variable:
   - **Key:** `NEXT_PUBLIC_FEATURE_ENABLEQUICKIMPORT`
   - **Value:** `true` or `false`
   - **Environments:** Production / Preview / Development
4. Redeploy your application

### For Other Platforms:

Add the environment variable through your platform's dashboard or deployment configuration.

---

## 🔍 Technical Details

### Implementation Location
- **Feature flag config:** `/src/config/feature-flags.ts`
- **Usage:** `/src/app/(public)/create/page.tsx`

### Code Example
```typescript
import { getFeatureFlag } from '@/config/feature-flags';

const isQuickImportEnabled = getFeatureFlag('enableQuickImport');

{isQuickImportEnabled && (
  <div>Quick Import UI</div>
)}
```

---

## 📝 Related Documentation

- **Setup Guide:** `QUICK_CREATE_SETUP.md`
- **Feature Overview:** `QUICK_CREATE_SUMMARY.md`
- **Technical Docs:** `docs/QUICK_CREATE_FEATURE.md`

---

## 🤔 Common Questions

### Q: Why is it disabled by default?
**A:** The feature is in **beta testing phase**. We want to test it internally before rolling out to all users.

### Q: Can users still access /create-quick directly?
**A:** Yes, but they won't see the button in the UI. Direct URL access still works for testing purposes.

### Q: What happens if I enable it without API keys?
**A:** Instagram import works without any API keys. Google Places will show an error message but won't break the app.

### Q: How do I enable it for specific users only?
**A:** Currently it's an all-or-nothing flag. For gradual rollout, you'd need to implement user-based feature flags (e.g., using a service like LaunchDarkly, or custom logic in the feature flag getter).

---

## ⚡ Quick Reference

| Action | Command |
|--------|---------|
| **Enable** | `echo "NEXT_PUBLIC_FEATURE_ENABLEQUICKIMPORT=true" >> .env.local` |
| **Disable** | Remove line from `.env.local` |
| **Check Status** | Look for button on `/create` page |
| **Restart Server** | `npm run dev` |

---

**Last Updated:** October 30, 2025  
**Status:** Beta Feature - Disabled by Default

