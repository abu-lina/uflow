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
   - Go to the ngrok URL (e.g., `https://abc123.ngrok-free.app`). Get the full URL from the terminal or from the ngrok Web Interface: http://127.0.0.1:4040
   - **If you're on office/corporate WiFi:** the network may block ngrok. Use **cellular data** (turn off WiFi on the phone) and open the ngrok URL; the tunnel from your Mac to ngrok still works, so the phone can reach your app via the internet.
   - On first visit, ngrok free tier may show a "Visit Site" / "Continue" page; tap through to reach your app.
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

### Issue: LAN URL doesn't load on iPhone (same WiFi)

When opening `http://<your-mac-ip>:3000` on the phone, the page never loads (timeout or "can't connect").

**Checks:**
1. **Use the mobile dev server** so the app listens on all interfaces:
   ```bash
   npm run dev:mobile
   ```
   Use the **Network** URL shown in the terminal (e.g. `http://192.168.178.48:3000`). If your Mac's IP is different, use that IP on the phone.

2. **Confirm the IP** – When you run `npm run dev` or `npm run dev:mobile`, Next.js prints a "Network:" line. That is the URL to open on the iPhone. If your router gave the Mac a new IP (e.g. after sleep), update `allowedDevOrigins` and `images.remotePatterns` in `next.config.js` to use the new IP, then restart the dev server.

3. **macOS Firewall** – If the firewall is on, it may block incoming connections to port 3000:
   - System Settings → Network → Firewall → Options
   - Ensure "Block all incoming connections" is off, or add an allow rule for **Node** (or the terminal app you use to run `npm run dev:mobile`).

4. **Restart after config changes** – After changing `next.config.js` (e.g. `allowedDevOrigins` or image hostname), stop the dev server (Ctrl+C) and run `npm run dev:mobile` again.

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

