# Signup Security Implementation

## Overview

This document describes the security measures implemented to prevent bots and hackers from signing up to the platform.

**Related Documentation:**
- [CSP Best Practices](./CSP_BEST_PRACTICES.md) - Content Security Policy configuration and rationale

## Security Features Implemented

### 1. **Honeypot Field**
- **Purpose**: Catch automated bots that fill all form fields
- **Implementation**: 
  - Hidden input field that humans won't see
  - If filled, request is rejected and IP is blocked
- **Location**: Invisible field in signup form

### 2. **Rate Limiting**
- **Purpose**: Prevent brute-force signup attempts
- **Limits**: 
  - 3 signups per hour per IP address
  - Automatic IP blocking after limit exceeded
- **Implementation**: Uses existing rate limiting utility

### 3. **IP-Based Blocking**
- **Purpose**: Temporarily block suspicious IPs
- **Triggers**:
  - Rate limit exceeded (1 hour block)
  - Honeypot triggered (24 hour block)
  - Suspicious request timing (1 hour block)

### 4. **Enhanced Password Requirements**
- **Minimum Length**: 8 characters (increased from 6)
- **Complexity**: Must contain:
  - At least one letter (a-z, A-Z)
  - At least one number (0-9)
- **Validation**: Both client-side and server-side

### 5. **Disposable Email Blocking**
- **Purpose**: Prevent signups with temporary email addresses
- **Blocked Domains**: 600+ known disposable email services
- **List**: Includes tempmail.com, 10minutemail.com, mailinator.com, dunefee.com, and many others

### 6. **Request Timing Analysis**
- **Purpose**: Detect automated submissions
- **Detection**: Requests completed in < 100ms are flagged as suspicious
- **Action**: IP is marked as suspicious and temporarily blocked

### 7. **Email Format Validation**
- **Purpose**: Ensure valid email addresses
- **Validation**: Regex pattern matching standard email format

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
4. Request timing check (if < 100ms → mark suspicious)
    ↓
5. Email format validation
    ↓
6. Disposable email check (if disposable → reject)
    ↓
7. Password complexity validation
    ↓
8. User creation (if all checks pass)
```

## Files Modified

### New Files
- `src/utils/security.ts` - Security utility functions

### Modified Files
- `src/app/api/auth/signup/route.ts` - Added all security checks
- `src/app/(public)/signup/SignupPageContent.tsx` - Added honeypot field
- `src/lib/auth.ts` - Updated to accept honeypot parameter
- `src/utils/security.ts` - Security utility functions

## Testing

### Development Mode
- All security measures are active

### Production Mode
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
- Event type (rate limit, honeypot, suspicious timing, etc.)

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

