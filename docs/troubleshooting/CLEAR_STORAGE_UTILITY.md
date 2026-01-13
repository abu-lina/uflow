# Clear Storage Utility

**Purpose:** Quick utility to clear cookies, localStorage, sessionStorage, and IndexedDB for the application domain  
**Location:** `http://localhost:3000/clear-storage.html` (or your domain + `/clear-storage.html`)  
**File:** `public/clear-storage.html`

---

## Overview

This utility provides a web-based interface to clear browser storage data for the current domain. It's useful for:

- Debugging authentication issues
- Clearing stale data during development
- Resetting application state
- Testing with fresh storage
- Troubleshooting PWA issues
- Resolving cache-related problems

---

## Accessing the Utility

### Local Development
```
http://localhost:3000/clear-storage.html
```

### Production/UAT
```
https://ummahflow.com/clear-storage.html
https://uat.ummahflow.com/clear-storage.html
```

---

## Features

The utility provides four clearing options:

1. **Clear All Storage** - Clears everything (cookies, localStorage, sessionStorage, IndexedDB)
2. **Clear Cookies Only** - Removes only cookies for the domain
3. **Clear LocalStorage Only** - Removes only localStorage data
4. **Clear SessionStorage Only** - Removes only sessionStorage data

---

## What Gets Cleared

### Cookies
- All cookies for the current domain
- Cleared for root path (`/`)
- Cleared for domain and subdomain variations

### LocalStorage
- All key-value pairs stored in `localStorage`
- Persistent across browser sessions

### SessionStorage
- All key-value pairs stored in `sessionStorage`
- Cleared when browser tab/window closes

### IndexedDB
- All IndexedDB databases for the current domain
- Includes any PWA-related databases

---

## Limitations

**Important:** This utility only clears storage for the **web application domain**. It does NOT clear:

- Browser cache (cached files, images, CSS, JS)
- Browser history
- Other domains' storage
- Service Worker cache
- HTTP cache

To clear browser cache, use your browser's settings:
- **Chrome/Edge:** Settings → Privacy → Clear browsing data
- **Firefox:** Settings → Privacy & Security → Clear Data
- **Safari:** Develop → Empty Caches

---

## Usage Examples

### Development Workflow
1. Make changes to authentication logic
2. Navigate to `/clear-storage.html`
3. Click "Clear All Storage"
4. Return to your app and test with fresh state

### Debugging Authentication
1. User reports login issues
2. Navigate to `/clear-storage.html`
3. Clear cookies and localStorage
4. Test login flow again

### PWA Testing
1. Testing PWA installation
2. Clear IndexedDB and localStorage
3. Test fresh installation flow

---

## Technical Details

### Cookie Clearing
The utility attempts to clear cookies in multiple ways:
- Root path cookies
- Domain-specific cookies
- Subdomain cookies

### IndexedDB Clearing
Uses the `indexedDB.databases()` API to enumerate all databases and delete them individually.

### Browser Compatibility
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- IndexedDB clearing requires browser support (all modern browsers)

---

## Related Documentation

- [Clear Browser Cache Guide](../action-items/CLEAR_BROWSER_CACHE.md) - For clearing browser cache
- [PWA Installation Testing Guide](../deployment/PWA_INSTALLATION_TESTING_GUIDE.md) - PWA-related troubleshooting

---

## Quick Reference

**URL:** `/clear-storage.html`  
**File:** `public/clear-storage.html`  
**Last Updated:** 2025-01-21

---

## Notes

- The utility is safe to use - it only affects the current domain
- No server-side changes are made
- All operations are client-side only
- Results are displayed immediately after clearing
