# Managing Blocked IPs

This guide explains how to view and manage IP addresses that have been blocked due to rate limiting violations or suspicious activity.

## Overview

The application automatically blocks IP addresses when they:
- Exceed rate limits (e.g., 10 magic link requests per hour)
- Show suspicious activity patterns (e.g., bot-like behavior)
- Attempt to abuse authentication endpoints

Blocked IPs are stored in-memory and automatically expire after their block duration (currently 15 minutes for magic link rate limit violations).

---

## Prerequisites

### Admin Key Setup

To manage blocked IPs, you need to set up an admin key:

1. **Generate a secure admin key:**
   ```bash
   # Option 1: Using OpenSSL
   openssl rand -hex 16
   
   # Option 2: Using Node.js
   node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
   ```

2. **Add to your environment file:**
   
   **For local development** (`.env.local`):
   ```bash
   ADMIN_DEBUG_KEY=your-generated-key-here
   ```
   
   **For UAT** (`.env.uat`):
   ```bash
   ADMIN_DEBUG_KEY=your-generated-key-here
   ```
   
   **For production** (`.env.production`):
   ```bash
   ADMIN_DEBUG_KEY=your-generated-key-here
   ```

3. **Restart your server** after adding the key.

> **Note:** If `ADMIN_DEBUG_KEY` is not set, the system defaults to `'debug-key-change-in-production'` (not secure for production).

---

## Viewing Blocked IPs

### List All Blocked IPs

**Endpoint:** `GET /api/auth/debug-ip-status?list=all`

**Headers Required:**
```
x-admin-key: <your-admin-key>
```

**Example Request:**
```bash
curl -H "x-admin-key: your-admin-key-here" \
  "https://uat.ummahflow.com/api/auth/debug-ip-status?list=all"
```

**Response Format:**
```json
{
  "success": true,
  "count": 2,
  "blockedIPs": [
    {
      "ip": "85.216.121.245",
      "count": 1,
      "blockedUntil": 1704900000000,
      "blockedUntilDate": "2024-01-10T18:00:00.000Z",
      "timeRemaining": 900000,
      "timeRemainingMinutes": 15,
      "attempts": [1704896100000]
    },
    {
      "ip": "192.168.1.100",
      "count": 2,
      "blockedUntil": 1704903000000,
      "blockedUntilDate": "2024-01-10T18:50:00.000Z",
      "timeRemaining": 1800000,
      "timeRemainingMinutes": 30,
      "attempts": [1704896100000, 1704900000000]
    }
  ],
  "timestamp": "2024-01-10T17:45:00.000Z",
  "note": "This list only shows currently blocked IPs. Expired blocks are automatically removed."
}
```

**Response Fields:**
- `count`: Number of currently blocked IPs
- `blockedIPs`: Array of blocked IP details
  - `ip`: The blocked IP address
  - `count`: Number of times this IP has been blocked
  - `blockedUntil`: Unix timestamp when block expires
  - `blockedUntilDate`: ISO date string of expiration
  - `timeRemaining`: Milliseconds until block expires
  - `timeRemainingMinutes`: Minutes until block expires (rounded up)
  - `attempts`: Array of timestamps when blocking occurred

**Note:** The list is sorted by time remaining (shortest first), so IPs expiring soon appear at the top.

---

## Unblocking IPs

### Unblock a Single IP

**Method 1: Query Parameter**

**Endpoint:** `POST /api/auth/debug-ip-status?action=unblock&ip=<ip-address>`

```bash
curl -X POST \
  -H "x-admin-key: your-admin-key-here" \
  "https://uat.ummahflow.com/api/auth/debug-ip-status?action=unblock&ip=85.216.121.245"
```

**Method 2: JSON Body**

```bash
curl -X POST \
  -H "x-admin-key: your-admin-key-here" \
  -H "Content-Type: application/json" \
  -d '{"action": "unblock", "ip": "85.216.121.245"}' \
  "https://uat.ummahflow.com/api/auth/debug-ip-status"
```

**Response:**
```json
{
  "success": true,
  "message": "Unblocked 1 IP address(es)",
  "results": [
    {
      "ip": "85.216.121.245",
      "unblocked": true,
      "wasBlocked": true
    }
  ]
}
```

### Unblock Multiple IPs

**Endpoint:** `POST /api/auth/debug-ip-status`

```bash
curl -X POST \
  -H "x-admin-key: your-admin-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "unblock",
    "ips": ["85.216.121.245", "192.168.1.100", "10.0.0.1"]
  }' \
  "https://uat.ummahflow.com/api/auth/debug-ip-status"
```

**Response:**
```json
{
  "success": true,
  "message": "Unblocked 3 IP address(es)",
  "results": [
    {
      "ip": "85.216.121.245",
      "unblocked": true,
      "wasBlocked": true
    },
    {
      "ip": "192.168.1.100",
      "unblocked": true,
      "wasBlocked": true
    },
    {
      "ip": "10.0.0.1",
      "unblocked": true,
      "wasBlocked": false
    }
  ]
}
```

### Unblock All IPs

**Method 1: Query Parameter**

```bash
curl -X POST \
  -H "x-admin-key: your-admin-key-here" \
  "https://uat.ummahflow.com/api/auth/debug-ip-status?action=unblock-all"
```

**Method 2: JSON Body**

```bash
curl -X POST \
  -H "x-admin-key: your-admin-key-here" \
  -H "Content-Type: application/json" \
  -d '{"action": "unblock-all"}' \
  "https://uat.ummahflow.com/api/auth/debug-ip-status"
```

**Response:**
```json
{
  "success": true,
  "message": "Unblocked all 5 blocked IP address(es)",
  "unblockedCount": 5,
  "unblockedIPs": [
    "85.216.121.245",
    "192.168.1.100",
    "10.0.0.1",
    "172.16.0.1",
    "203.0.113.1"
  ]
}
```

---

## Checking a Specific IP Status

### Check Current IP Status

**Endpoint:** `GET /api/auth/debug-ip-status`

This endpoint checks the status of the requesting IP (no admin key required for your own IP):

```bash
curl "https://uat.ummahflow.com/api/auth/debug-ip-status"
```

**Response:**
```json
{
  "ip": "85.216.121.245",
  "identifier": "ip:85.216.121.245",
  "isBlocked": true,
  "rateLimits": {
    "magicLink": {
      "remaining": 0,
      "limit": 10,
      "window": "1 hour"
    },
    "verify": {
      "remaining": 8,
      "limit": 10,
      "window": "1 hour"
    }
  },
  "headers": {
    "x-forwarded-for": null,
    "x-real-ip": null,
    "cf-connecting-ip": "85.216.121.245"
  },
  "environment": {
    "nodeEnv": "production",
    "hasResendKey": true,
    "siteUrl": "https://uat.ummahflow.com"
  },
  "note": "If isBlocked is true, your IP has been temporarily blocked. Contact support or wait for the block to expire. Use ?list=all with admin key to see all blocked IPs."
}
```

### Check Specific IP (Admin Only)

**Endpoint:** `GET /api/auth/magic-link-diagnostic?ip=<ip-address>`

```bash
curl -H "x-admin-key: your-admin-key-here" \
  "https://uat.ummahflow.com/api/auth/magic-link-diagnostic?ip=85.216.121.245"
```

---

## Common Use Cases

### Scenario 1: User Reports Being Blocked

1. **Check if IP is actually blocked:**
   ```bash
   curl -H "x-admin-key: your-key" \
     "https://uat.ummahflow.com/api/auth/debug-ip-status?list=all" | \
     jq '.blockedIPs[] | select(.ip == "85.216.121.245")'
   ```

2. **If blocked, check time remaining:**
   ```bash
   # Look at timeRemainingMinutes in the response
   ```

3. **Unblock if legitimate user:**
   ```bash
   curl -X POST \
     -H "x-admin-key: your-key" \
     -H "Content-Type: application/json" \
     -d '{"action": "unblock", "ip": "85.216.121.245"}' \
     "https://uat.ummahflow.com/api/auth/debug-ip-status"
   ```

### Scenario 2: Bulk Cleanup After Rate Limit Adjustment

If you've adjusted rate limits and want to clear all existing blocks:

```bash
curl -X POST \
  -H "x-admin-key: your-key" \
  "https://uat.ummahflow.com/api/auth/debug-ip-status?action=unblock-all"
```

### Scenario 3: Monitor Blocked IPs

Create a simple monitoring script:

```bash
#!/bin/bash
# monitor-blocked-ips.sh

ADMIN_KEY="your-admin-key-here"
API_URL="https://uat.ummahflow.com"

response=$(curl -s -H "x-admin-key: $ADMIN_KEY" \
  "$API_URL/api/auth/debug-ip-status?list=all")

count=$(echo "$response" | jq '.count')
echo "Currently blocked IPs: $count"

if [ "$count" -gt 0 ]; then
  echo "$response" | jq -r '.blockedIPs[] | "\(.ip) - \(.timeRemainingMinutes) minutes remaining"'
fi
```

---

## Rate Limits Reference

Current rate limits that can trigger IP blocking:

| Endpoint | Limit | Window | Block Duration |
|----------|-------|--------|----------------|
| Magic Link | 10 requests | 1 hour | 15 minutes |
| Login | 10 attempts | 15 minutes | Varies |
| Signup | 3 attempts | 1 hour | 1 hour |

---

## Security Notes

1. **Admin Key Security:**
   - Never commit `ADMIN_DEBUG_KEY` to version control
   - Use different keys for different environments
   - Rotate keys periodically
   - Use strong, randomly generated keys

2. **IP Blocking Limitations:**
   - Blocks are stored in-memory (lost on server restart)
   - In production with multiple servers, each server has its own block list
   - Consider using Redis for shared state in multi-server deployments

3. **Best Practices:**
   - Review blocked IPs regularly
   - Unblock legitimate users promptly
   - Monitor for patterns indicating abuse
   - Document unblock decisions for audit purposes

---

## Troubleshooting

### "Unauthorized" Error

**Problem:** Getting 401 Unauthorized when trying to list/unblock IPs.

**Solution:**
1. Verify `ADMIN_DEBUG_KEY` is set in your environment
2. Check that the header is sent correctly: `x-admin-key: <value>`
3. Restart server after setting environment variable

### IP Still Blocked After Unblocking

**Problem:** IP shows as unblocked but still can't access.

**Solution:**
1. Check if multiple servers are running (each has separate block list)
2. Verify the IP was actually blocked (check the list first)
3. Wait a few seconds and try again (cache may need to clear)

### Can't See Blocked IPs

**Problem:** List shows empty but IPs are being blocked.

**Solution:**
1. Verify you're using the correct admin key
2. Check that expired blocks are automatically removed
3. Confirm the server you're querying is the one handling requests

---

## Related Documentation

- [Security Overview](./SECURITY_OVERVIEW.md)
- [Signup Security Implementation](./SIGNUP_SECURITY_IMPLEMENTATION.md)
- [API Keys Setup](./API_KEYS_SETUP.md)

---

## Quick Reference

```bash
# List all blocked IPs
curl -H "x-admin-key: $ADMIN_KEY" \
  "$API_URL/api/auth/debug-ip-status?list=all"

# Unblock single IP
curl -X POST \
  -H "x-admin-key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "unblock", "ip": "IP_ADDRESS"}' \
  "$API_URL/api/auth/debug-ip-status"

# Unblock all IPs
curl -X POST \
  -H "x-admin-key: $ADMIN_KEY" \
  "$API_URL/api/auth/debug-ip-status?action=unblock-all"

# Check specific IP status
curl -H "x-admin-key: $ADMIN_KEY" \
  "$API_URL/api/auth/magic-link-diagnostic?ip=IP_ADDRESS"
```
