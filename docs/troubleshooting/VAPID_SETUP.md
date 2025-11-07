# VAPID Key Setup Troubleshooting

## Issue: "Push notifications are not configured"

If you're seeing this error, the VAPID public key is not being detected by Next.js.

## Quick Fix Checklist

### 1. Verify `.env.local` Format

Your `.env.local` file should look like this (NO quotes):

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BOtQfDJZzpBSKnBENMo-xuJraXq8icRMbv6ohkGA3-B_ohSzsy7vgmSSGjZJ2VXcyUTwsRTFvBjNbuArYDkDAsM
VAPID_PRIVATE_KEY=a6NT2IGoytDAIobYo3IWk3-Jwmmlgh36yR_trAM5qo4
VAPID_EMAIL=noreply@ummahflow.com
```

**Common mistakes:**
- ❌ `NEXT_PUBLIC_VAPID_PUBLIC_KEY="key"` (quotes)
- ❌ `NEXT_PUBLIC_VAPID_PUBLIC_KEY = key` (spaces around =)
- ❌ `# NEXT_PUBLIC_VAPID_PUBLIC_KEY=key` (commented out)
- ✅ `NEXT_PUBLIC_VAPID_PUBLIC_KEY=key` (correct)

### 2. Use Real VAPID Keys

"mykey" is a placeholder and won't work. Generate real keys:

```bash
npx web-push generate-vapid-keys
```

Copy the generated keys to your `.env.local`.

### 3. Restart Dev Server

**Critical:** Next.js embeds `NEXT_PUBLIC_*` variables at build/start time.

1. Stop your dev server (Ctrl+C or Cmd+C)
2. Start it again: `npm run dev`
3. Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)

### 4. Verify in Browser Console

After restarting, check the browser console. You should see:

- ✅ `✅ VAPID Public Key is configured` (if working)
- ⚠️ `⚠️ VAPID Public Key not found...` (if not working)

### 5. Debug Endpoint

Visit `http://localhost:3000/api/debug/vapid` to see server-side status.

## Still Not Working?

1. **Check file location**: `.env.local` must be in the project root (same level as `package.json`)

2. **Check for typos**: Variable name must be exactly `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

3. **Check for hidden characters**: Copy-paste the key directly, don't type it

4. **Clear Next.js cache**:
   ```bash
   rm -rf .next
   npm run dev
   ```

5. **Verify key format**: VAPID public keys are typically 87 characters long and base64-encoded

## Example Working Configuration

```env
# .env.local
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BOtQfDJZzpBSKnBENMo-xuJraXq8icRMbv6ohkGA3-B_ohSzsy7vgmSSGjZJ2VXcyUTwsRTFvBjNbuArYDkDAsM
VAPID_PRIVATE_KEY=a6NT2IGoytDAIobYo3IWk3-Jwmmlgh36yR_trAM5qo4
VAPID_EMAIL=noreply@ummahflow.com
```

After updating, restart your dev server and check the console.

