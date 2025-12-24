# Local iPhone PWA Testing Guide

## Quick Start (Easiest Method)

### Step 1: Install ngrok

```bash
# Install ngrok (if not already installed)
brew install ngrok

# Or download from: https://ngrok.com/download
```

### Step 2: Start Dev Server

**Terminal 1:**
```bash
# Make sure manifest is generated
npm run prebuild

# Start dev server
npm run dev
```

Wait for: `Ready on http://localhost:3000`

### Step 3: Start ngrok Tunnel

**Terminal 2:**
```bash
# Run the test script
./scripts/test-pwa-local-iphone.sh

# Or manually:
ngrok http 3000
```

You'll see output like:
```
Forwarding   https://abc123.ngrok.io -> http://localhost:3000
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### Step 4: Test on iPhone

1. **On your iPhone:**
   - Open Safari
   - Go to the ngrok URL (e.g., `https://abc123.ngrok.io`)
   - Wait for page to load (10 seconds)

2. **Verify manifest:**
   - Add `/manifest.json` to the URL
   - Should see JSON manifest (not 404)

3. **Complete onboarding:**
   - Go through waitlist flow
   - Complete early access steps
   - PWA prompt should appear

4. **Install PWA:**
   - Tap Share button
   - Tap "Add to Home Screen"
   - Confirm installation

5. **Test standalone mode:**
   - Launch from home screen
   - Should open without Safari UI

---

## Alternative: Using mkcert (More Setup)

If you prefer a local HTTPS setup without ngrok:

### Step 1: Install mkcert

```bash
brew install mkcert
mkcert -install
```

### Step 2: Get Your Local IP

```bash
# Get your Mac's local IP address
ipconfig getifaddr en0
# Example output: 192.168.1.100
```

### Step 3: Create SSL Certificate

```bash
# Create certificate for localhost and your IP
mkcert localhost 127.0.0.1 ::1 192.168.1.100

# This creates:
# - localhost+3.pem (certificate)
# - localhost+3-key.pem (private key)
```

### Step 4: Configure Next.js for HTTPS

Create `next.config.local.js`:

```javascript
const fs = require('fs');
const path = require('path');

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'localhost+3-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'localhost+3.pem')),
};

module.exports = {
  // ... your existing config
  // Note: Next.js dev server doesn't support HTTPS directly
  // You'll need to use a proxy or custom server
};
```

**Note:** Next.js dev server doesn't support HTTPS directly. You'll need to:
- Use a custom server with HTTPS
- Or use ngrok (recommended)

---

## Testing Checklist

### Before Testing

- [ ] Dev server running on `http://localhost:3000`
- [ ] ngrok tunnel active (or HTTPS setup complete)
- [ ] Manifest file generated: `public/manifest.json` exists
- [ ] iPhone and Mac on same network (for mkcert method)

### On iPhone Safari

- [ ] Can access site via HTTPS URL
- [ ] Root route (/) shows waitlist content
- [ ] Manifest accessible at `/manifest.json` (returns JSON)
- [ ] Service worker registers (check in console)
- [ ] Can complete onboarding flow
- [ ] PWA prompt appears after onboarding
- [ ] Can add to home screen
- [ ] PWA launches in standalone mode (no Safari UI)

### Debugging with Safari Web Inspector

1. **Enable on iPhone:**
   - Settings → Safari → Advanced → Web Inspector: ON

2. **Connect from Mac:**
   - Safari → Develop → [Your iPhone] → [ngrok URL]

3. **Check Console:**
   ```javascript
   // Check service worker
   navigator.serviceWorker.getRegistrations().then(regs => {
     console.log('Service Workers:', regs.length);
     if (regs.length > 0) {
       console.log('State:', regs[0].active?.state);
     }
   });

   // Check manifest
   fetch('/manifest.json')
     .then(r => r.json())
     .then(m => console.log('Manifest:', m));

   // Check PWA status
   console.log('Standalone:', window.matchMedia('(display-mode: standalone)').matches);
   ```

---

## Common Issues

### Issue: "Not Secure" Warning

**Cause:** ngrok free tier shows warning  
**Solution:** Click "Visit Site" to proceed (ngrok free tier is safe for testing)

### Issue: Manifest Not Found

**Cause:** Manifest not generated  
**Solution:**
```bash
npm run prebuild
# Verify file exists:
ls -lh public/manifest.json
```

### Issue: Service Worker Not Registering

**Cause:** PWA disabled in development  
**Solution:** This is expected - PWA is disabled on localhost. Use ngrok URL (not localhost) to test PWA features.

### Issue: Can't Access from iPhone

**Cause:** Wrong URL or network issue  
**Solution:**
- Verify ngrok is running
- Check ngrok URL is correct
- Ensure iPhone has internet connection
- Try refreshing the page

---

## Quick Test Commands

```bash
# Test manifest generation
npm run prebuild

# Test dev server
npm run dev

# Test ngrok (in separate terminal)
ngrok http 3000

# Verify manifest exists
curl http://localhost:3000/manifest.json
```

---

## Tips

1. **Keep ngrok running** while testing
2. **Use Safari Web Inspector** for debugging
3. **Wait 10 seconds** after page load before adding to home screen
4. **Clear Safari cache** if testing multiple times
5. **Use ngrok URL** (not localhost) for PWA features

---

## Next Steps After Local Testing

Once local testing works:
1. Deploy to UAT
2. Test on UAT with real domain
3. Verify Cloudflare doesn't block static manifest
4. Deploy to production

---

**Ready to test?** Run `./scripts/test-pwa-local-iphone.sh` and follow the prompts!

