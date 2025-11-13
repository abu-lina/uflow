# Signup Security Implementation

## Overview

This document describes the security measures implemented to prevent bots and hackers from signing up to the platform.

**Related Documentation:**
- [CSP Best Practices](./CSP_BEST_PRACTICES.md) - Content Security Policy configuration and rationale

## Security Features Implemented

### 1. **Cloudflare Turnstile CAPTCHA**
- **Purpose**: Verify that signups are from real humans, not bots
- **Implementation**: 
  - Client-side widget in signup form
  - Server-side verification in API route
  - Privacy-friendly (no cookies, GDPR compliant)
- **Setup**: Requires Cloudflare Turnstile keys (see Environment Variables)

### 2. **Honeypot Field**
- **Purpose**: Catch automated bots that fill all form fields
- **Implementation**: 
  - Hidden input field that humans won't see
  - If filled, request is rejected and IP is blocked
- **Location**: Invisible field in signup form

### 3. **Rate Limiting**
- **Purpose**: Prevent brute-force signup attempts
- **Limits**: 
  - 3 signups per hour per IP address
  - Automatic IP blocking after limit exceeded
- **Implementation**: Uses existing rate limiting utility

### 4. **IP-Based Blocking**
- **Purpose**: Temporarily block suspicious IPs
- **Triggers**:
  - Rate limit exceeded (1 hour block)
  - Honeypot triggered (24 hour block)
  - CAPTCHA verification failed (1 hour block)
  - Suspicious request timing (1 hour block)

### 5. **Enhanced Password Requirements**
- **Minimum Length**: 8 characters (increased from 6)
- **Complexity**: Must contain:
  - At least one letter (a-z, A-Z)
  - At least one number (0-9)
- **Validation**: Both client-side and server-side

### 6. **Disposable Email Blocking**
- **Purpose**: Prevent signups with temporary email addresses
- **Blocked Domains**: 30+ known disposable email services
- **List**: Includes tempmail.com, 10minutemail.com, mailinator.com, etc.

### 7. **Request Timing Analysis**
- **Purpose**: Detect automated submissions
- **Detection**: Requests completed in < 100ms are flagged as suspicious
- **Action**: IP is marked as suspicious and temporarily blocked

### 8. **Email Format Validation**
- **Purpose**: Ensure valid email addresses
- **Validation**: Regex pattern matching standard email format

## Environment Variables

Add these to your `.env.local` file:

```bash
# Cloudflare Turnstile (CAPTCHA)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key_here
TURNSTILE_SECRET_KEY=your_secret_key_here
```

### Getting Cloudflare Turnstile Keys

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Turnstile** section
3. Click **Add Site**
4. Configure:
   - **Site Name**: Your app name
   - **Domain**: Your domain (e.g., `ummahflow.com`)
   - **Widget Mode**: Managed (recommended)
5. Copy the **Site Key** (public) and **Secret Key** (private)
6. Add to your environment variables

**Note**: In development, CAPTCHA is optional. In production, it's required.

## Security Flow

```
User submits signup form
    ↓
1. Honeypot check (if filled → block IP for 24h)
    ↓
2. Rate limit check (if exceeded → block IP for 1h)
    ↓
3. IP block check (if blocked → reject)
    ↓
4. CAPTCHA verification (if failed → block IP for 1h)
    ↓
5. Request timing check (if < 100ms → mark suspicious)
    ↓
6. Email format validation
    ↓
7. Disposable email check (if disposable → reject)
    ↓
8. Password complexity validation
    ↓
9. User creation (if all checks pass)
```

## Files Modified

### New Files
- `src/utils/security.ts` - Security utility functions

### Modified Files
- `src/app/api/auth/signup/route.ts` - Added all security checks
- `src/app/(public)/signup/SignupPageContent.tsx` - Added CAPTCHA and honeypot
- `src/lib/auth.ts` - Updated to accept CAPTCHA token and honeypot
- `env.template` - Added Turnstile environment variables

## Testing

### Development Mode
- CAPTCHA is optional (won't block if keys are not set)
- All other security measures are active

### Production Mode
- CAPTCHA is required
- All security measures are enforced

### Testing Security Features

1. **Test Rate Limiting**:
   - Try to sign up 4 times within an hour from the same IP
   - Should be blocked after 3 attempts

2. **Test Honeypot**:
   - Use browser dev tools to fill the hidden "website" field
   - Submit form → should be rejected

3. **Test Disposable Email**:
   - Try signing up with `test@tempmail.com`
   - Should be rejected

4. **Test Password Requirements**:
   - Try password with only letters → should fail
   - Try password with only numbers → should fail
   - Try password < 8 characters → should fail

## Monitoring

All security events are logged with:
- IP address
- Timestamp
- Event type (rate limit, honeypot, CAPTCHA failure, etc.)

Check server logs for entries prefixed with `[SIGNUP API]` or `[SECURITY]`.

## Future Enhancements

Consider implementing:
1. **Redis-based rate limiting** (for multi-instance deployments)
2. **Database-backed IP blocking** (persistent across restarts)
3. **Email domain reputation API** (more comprehensive disposable email detection)
4. **Device fingerprinting** (track suspicious devices)
5. **Progressive delays** (increase wait time for repeated failures)
6. **Admin dashboard** (view blocked IPs and security events)

## Support

If legitimate users are being blocked:
1. Check server logs for the specific IP
2. Review the security event that triggered the block
3. Manually remove IP from block list (requires code change or database access)
4. Consider adjusting rate limits if too strict

