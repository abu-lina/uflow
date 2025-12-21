# Feature Flag: Provider Selection Modal

## Overview

Added a feature flag `enableProviderSelectionModal` to control whether users are asked if they're joining as a provider during the waitlist signup process.

## Feature Flag Details

**Name**: `enableProviderSelectionModal`  
**Default Value**: `false` (disabled)  
**Location**: `src/config/feature-flags.ts`

### Enabling the Feature

To enable the provider selection modal:

1. **Via Code**: Change the default value in `src/config/feature-flags.ts`:
   ```typescript
   enableProviderSelectionModal: true
   ```

2. **Via Environment Variable**: Set in your `.env` file:
   ```bash
   NEXT_PUBLIC_FEATURE_ENABLEPROVIDERSELECTIONMODAL=true
   ```

## Behavior

### When Disabled (default: `false`)
1. User fills out waitlist form (email + consent)
2. Form submits directly to `/api/waitlist/join` with `isProvider: null`
3. User sees success screen
4. User sees early access screen
5. Token is stored in HTTP-only cookie

**Flow**:
```
Waitlist Form → API Submit → Success Screen → Early Access Screen
```

### When Enabled (`true`)
1. User fills out waitlist form (email + consent)
2. Provider selection modal appears asking "Are you joining as a provider?"
3. User selects "I want to offer something" or "I'm here as a user"
4. Form submits to `/api/waitlist/join` with `isProvider: true/false`
5. User sees success screen
6. User sees early access screen
7. Token is returned in response and stored in cookie

**Flow**:
```
Waitlist Form → Provider Modal → API Submit → Success Screen → Early Access Screen
```

## Implementation Changes

### Modified Files

1. **`src/config/feature-flags.ts`**
   - Added `enableProviderSelectionModal: boolean` to `FeatureFlags` interface
   - Set default to `false`
   - Added to `getAllFeatureFlags()` function

2. **`src/components/shared/WaitlistScreen.tsx`**
   - Added feature flag check in `handleSubmit()`
   - When disabled: submits directly to API
   - When enabled: shows provider modal (original behavior)
   - Added token handling for both flows

3. **`src/components/shared/MobileSplashScreen.tsx`**
   - Added `handleWaitlistSuccess()` for direct submission flow
   - Updated `WaitlistScreen` props to use new handler
   - Handles token passing in both flows

4. **`src/app/api/waitlist/update/route.ts`**
   - Enhanced to accept token from body OR HTTP-only cookie
   - Prioritizes body token, falls back to cookie
   - Validates token exists after trying both sources

5. **`src/components/shared/EarlyAccessScreen.tsx`**
   - Updated to handle empty `waitlistToken` prop
   - Only sends token in body if provided
   - Relies on cookie fallback in API

6. **`src/components/shared/CitySelectionModal.tsx`**
   - Updated to handle empty `waitlistToken` prop
   - Only sends token in body if provided
   - Relies on cookie fallback in API

## Token Handling

### Two Token Sources

1. **Response Body** (when provider modal is enabled)
   - Token returned in API response
   - Stored in React state
   - Passed to child components

2. **HTTP-only Cookie** (always set by API)
   - Set by `/api/waitlist/join` endpoint
   - 30-day expiration
   - Secure in production
   - SameSite=Lax

### Fallback Strategy

The API update route accepts tokens from two sources:

```typescript
// Try body first
const tokenFromBody = body.waitlistToken;

// Fall back to cookie
const tokenFromCookie = cookies().get('waitlist_token')?.value;

// Use whichever is available
const finalToken = tokenFromBody || tokenFromCookie;
```

This ensures the early access flow works regardless of whether the provider modal was shown.

## Security Considerations

### With Provider Modal Disabled
- Token still generated and stored in HTTP-only cookie
- Token NOT accessible via JavaScript
- API accepts token from cookie (no XSS risk)
- Same security level as enabled state

### Benefits of HTTP-only Cookie
- Prevents XSS attacks
- Automatically sent with API requests
- No need to manage token in client state
- Persists across page refreshes

## Testing

### Test Case 1: Feature Disabled (Default)
1. Go to waitlist screen
2. Enter email and accept terms
3. Click "Warteliste beitreten"
4. **Verify**: No provider modal appears
5. **Verify**: Success screen shows immediately
6. **Verify**: Early access screen appears after success
7. **Verify**: Can select city (uses cookie token)
8. **Verify**: Can suggest provider (uses cookie token)

### Test Case 2: Feature Enabled
1. Set `NEXT_PUBLIC_FEATURE_ENABLEPROVIDERSELECTIONMODAL=true`
2. Go to waitlist screen
3. Enter email and accept terms
4. Click "Warteliste beitreten"
5. **Verify**: Provider modal appears
6. Select "I want to offer something" or "I'm here as a user"
7. **Verify**: Success screen shows
8. **Verify**: Early access screen appears after success
9. **Verify**: Can select city (uses response token)
10. **Verify**: Can suggest provider (uses response token)

### Test Case 3: Token Cookie Fallback
1. Feature disabled (provider modal skipped)
2. Complete waitlist signup
3. Open DevTools → Application → Cookies
4. **Verify**: `waitlist_token` cookie exists
5. **Verify**: Cookie is HTTP-only
6. **Verify**: Cookie expires in 30 days
7. On early access screen, select a city
8. **Verify**: API call succeeds (using cookie)
9. Check Network tab → Request Payload
10. **Verify**: Token NOT in request body (using cookie)

## Rollback Plan

If issues arise, disable the feature immediately:

1. Set environment variable:
   ```bash
   NEXT_PUBLIC_FEATURE_ENABLEPROVIDERSELECTIONMODAL=false
   ```

2. Or change default in code:
   ```typescript
   enableProviderSelectionModal: false
   ```

3. Restart application
4. Provider modal will be skipped for all new signups

## Data Impact

### With Feature Disabled
- `is_provider` field in database will be `NULL` for new signups
- Cannot segment users by provider intent
- Simpler onboarding flow

### With Feature Enabled
- `is_provider` field captures user intent
- Can segment users (providers vs. customers)
- Can send targeted emails based on intent
- Can prioritize provider onboarding

## Recommendations

### When to Enable
- Running a targeted campaign to recruit providers
- Need to segment users for email campaigns
- Want to collect provider/customer data
- Have resources to follow up with providers

### When to Disable (Current Default)
- Want simplest possible onboarding
- Don't need provider segmentation yet
- Avoiding extra friction in signup flow
- Focusing on growing waitlist numbers first

## Future Enhancements

### Potential Improvements
1. A/B test both flows to measure conversion rates
2. Add analytics tracking for modal interactions
3. Conditional modal based on referral source
4. Time-based feature flag (enable during campaigns)
5. Geo-based feature flag (enable in certain cities)

### Analytics to Track
- Waitlist conversion rate (with vs. without modal)
- Provider vs. customer ratio
- Time to complete signup
- Modal abandonment rate
- Early access engagement by user type

## Summary

The `enableProviderSelectionModal` feature flag provides flexibility in the waitlist onboarding flow. By default, it's disabled to reduce friction and maximize conversions. When enabled, it captures valuable user intent data but adds an extra step to the signup process.

The implementation ensures secure token handling in both flows through HTTP-only cookies, maintaining consistent security regardless of feature flag state.
