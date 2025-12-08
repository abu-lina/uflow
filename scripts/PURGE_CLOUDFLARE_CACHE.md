# Cloudflare Cache Purge Script

## Quick Start

### 1. Get Cloudflare API Token

**Recommended: API Token**
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use "Edit zone DNS" template or create custom token with:
   - Permissions: `Zone` → `Cache Purge` → `Purge`
   - Zone Resources: Include → `ummahflow.com`
4. Copy the token

### 2. Set Environment Variable

```bash
export CLOUDFLARE_API_TOKEN='your-token-here'
```

### 3. Run the Script

```bash
./scripts/purge-cloudflare-cache.sh
```

## Alternative: Using Global API Key

If you prefer using Global API Key:

```bash
export CLOUDFLARE_EMAIL='your-email@example.com'
export CLOUDFLARE_API_KEY='your-global-api-key'
```

Then run the script.

## What It Does

The script will:
1. Look up your Cloudflare zone ID automatically
2. Ask what to purge:
   - **Option 1**: Everything (all cached content)
   - **Option 2**: Only production static files
   - **Option 3**: Both production and UAT static files (recommended for MIME type fixes)
3. Purge the cache via Cloudflare API
4. Provide next steps

## Manual Purge (If Script Doesn't Work)

### Via Cloudflare Dashboard

1. Go to: https://dash.cloudflare.com/
2. Select `ummahflow.com`
3. Go to **Caching** → **Configuration**
4. Click **Purge Everything** or **Custom Purge**
5. For custom purge, enter:
   - `https://uat.ummahflow.com/_next/static/*`
   - `https://ummahflow.com/_next/static/*`

### Via Cloudflare API (curl)

```bash
# Set your credentials
export CLOUDFLARE_API_TOKEN='your-token'

# Get zone ID
ZONE_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=ummahflow.com" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" | \
  grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# Purge static files
curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "files": [
      "https://uat.ummahflow.com/_next/static/*",
      "https://ummahflow.com/_next/static/*"
    ]
  }'
```

## Troubleshooting

### "Could not find zone ID"
- Check that your API token has access to `ummahflow.com`
- Verify the domain is in your Cloudflare account
- Try using Global API Key instead

### "Failed to purge cache"
- Check API token permissions (needs Cache Purge permission)
- Verify zone ID is correct
- Check Cloudflare API status: https://www.cloudflarestatus.com/

### Script hangs
- Check internet connection
- Verify Cloudflare API is accessible
- Try manual purge via dashboard

## After Purging

1. **Wait 10-30 seconds** for changes to propagate
2. **Clear browser cache**: `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
3. **Hard refresh**: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
4. **Test the site** - MIME type errors should be gone

## Security Note

Never commit your Cloudflare API token to git. Always use environment variables or a secure secrets manager.



