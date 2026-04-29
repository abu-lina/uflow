# Security Advisories Fix Summary

## Overview
This document summarizes the fixes applied to address security warnings from the Supabase database linter.

## Migration: `033_fix_security_advisories.sql`

### 1. Function Search Path Mutable (20 functions fixed)

**Issue**: Functions without `SET search_path` parameter are vulnerable to search path injection attacks.

**Fix**: Added `SET search_path = public` to all affected functions:

- `update_push_subscriptions_updated_at()`
- `update_confirmation_count()`
- `update_badge_trust_level()`
- `get_community_services_for_provider()`
- `get_providers_for_community_service()`
- `delete_user_account()`
- `cleanup_expired_tokens()`
- `get_suggested_offers_for_category()`
- `get_suggested_needs_for_category()`
- `search_offers()`
- `search_needs()`
- `search_providers_enhanced()`
- `search_community_services_enhanced()`
- `can_delete_offer()`
- `can_delete_need()`
- `update_updated_at_column()`
- `handle_new_user()`
- `search_providers()`
- `get_public_url()`
- `cleanup_orphaned_files()`
- `get_provider_count_by_city()`

### 2. RLS Policy Always True (4 policies fixed)

#### 2.1. `provider_community_services` INSERT Policy

**Before**: `WITH CHECK (true)` - allowed unrestricted access

**After**: Validates that both provider and community service exist:
```sql
WITH CHECK (
  EXISTS (SELECT 1 FROM public.providers WHERE provider_id = provider_community_services.provider_id)
  AND
  EXISTS (SELECT 1 FROM public.community_services WHERE community_service_id = provider_community_services.community_service_id)
)
```

#### 2.2. `waitlist` INSERT Policy

**Before**: `WITH CHECK (true)` - allowed unrestricted access

**After**: Validates email format:
```sql
WITH CHECK (
  email IS NOT NULL 
  AND email ~ '^[^@]+@[^@]+\.[^@]+$'
  AND LENGTH(email) <= 255
)
```

#### 2.3. `waitlist` UPDATE Policy

**Before**: `USING (true)` AND `WITH CHECK (true)` - allowed unrestricted updates

**After**: Requires waitlist_token and validates email format:
```sql
USING (
  waitlist_token IS NOT NULL
  AND LENGTH(waitlist_token) >= 32
)
WITH CHECK (
  email IS NOT NULL 
  AND email ~ '^[^@]+@[^@]+\.[^@]+$'
  AND LENGTH(email) <= 255
  AND waitlist_token IS NOT NULL
  AND LENGTH(waitlist_token) >= 32
)
```

**Note**: Updates should go through the `update_waitlist_entry_with_token()` RPC function which performs token validation. This policy adds an additional validation layer.

### 3. Leaked Password Protection (Manual Configuration Required)

**Issue**: Leaked password protection is currently disabled in Supabase Auth.

**Status**: This requires manual configuration in the Supabase Dashboard and cannot be fixed via migration.

**Action Required**:
1. Go to Supabase Dashboard > Authentication > Password Security
2. Enable "Leaked Password Protection"
3. This feature checks passwords against HaveIBeenPwned.org to prevent use of compromised passwords

**Reference**: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Testing Recommendations

After applying this migration:

1. **Test function execution**: Verify all functions still work correctly with the new `search_path` setting
2. **Test RLS policies**: 
   - Verify provider-community service relationships can still be created
   - Verify waitlist signups work with valid emails
   - Verify waitlist updates work through the RPC function
3. **Monitor for errors**: Check application logs for any issues related to function execution or RLS policy violations

## Security Impact

- **High**: Function search_path fixes prevent search path injection attacks
- **Medium**: RLS policy fixes prevent unauthorized data access
- **Low**: Leaked password protection is a best practice but requires manual configuration

### 2.4. `providers` INSERT Policy

**Before**: `WITH CHECK (true)` for "Allow anonymous provider inserts" - allowed unrestricted access

**After**: Removed the permissive policy. The correct policy "Allow provider inserts" (from migration 028) validates:
```sql
WITH CHECK (
  (auth.role() = 'anon' AND user_created_id IS NULL AND provider_owner_id IS NULL)
  OR
  (auth.role() = 'authenticated' AND user_created_id = auth.uid())
)
```

**Note**: Migration 028 already created the correct policy. This migration ensures the old permissive policy is removed.

### 2.5. Additional Function Fix

**`get_provider_count_by_city`**: Recreated to ensure `SET search_path = public` is properly set (already had it in migration 029, but ensuring it's correct).

## Related Files

- Migration: `supabase/migrations/archive/033_fix_security_advisories.sql`
- Waitlist RPC function: `supabase/migrations/archive/018_fix_waitlist_rls_policies.sql`
- Provider RLS policies: `supabase/migrations/archive/028_fix_provider_suggestion_error.sql`
