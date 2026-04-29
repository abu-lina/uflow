# RPC Function Pattern for Token-Based Operations

## Overview

This document describes the pattern for handling token-based database operations that require bypassing Row Level Security (RLS) while maintaining security through explicit validation.

## Problem Statement

When implementing token-based access (e.g., waitlist tokens), we need to:
1. Allow updates/reads based on tokens (not user authentication)
2. Maintain security by validating tokens
3. Avoid bypassing RLS with admin client in application code
4. Keep security logic auditable and maintainable

## Solution: RPC Functions with SECURITY DEFINER

Use PostgreSQL functions with `SECURITY DEFINER` to:
- Bypass RLS within the function (explicit and documented)
- Validate tokens/parameters inside the function
- Return only necessary data (no PII exposure for aggregated queries)
- Keep security logic in version-controlled migrations

## Pattern Structure

### 1. Database Function (Migration)

```sql
-- Create function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION function_name(
  p_param1 TEXT,
  p_param2 TEXT,
  ...
)
RETURNS JSON -- or TABLE(...) for queries
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  -- Variables
BEGIN
  -- Validate parameters
  -- Perform operation (bypasses RLS)
  -- Return result
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION function_name(...) TO anon;
GRANT EXECUTE ON FUNCTION function_name(...) TO authenticated;
```

### 2. API Endpoint

```typescript
// Use regular Supabase client (not admin)
const supabase = createSupabaseServerClient();

// Call RPC function
const { data, error } = await supabase.rpc('function_name', {
  p_param1: value1,
  p_param2: value2,
});

// Handle response
if (error || !data?.success) {
  // Handle error
}
```

## Examples

### Example 1: Token-Based Update

**Migration:**
```sql
CREATE OR REPLACE FUNCTION update_waitlist_entry_with_token(
  p_email TEXT,
  p_token TEXT,
  p_selected_city TEXT DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Validate token and update
  UPDATE waitlist
  SET selected_city = COALESCE(p_selected_city, selected_city)
  WHERE email = LOWER(TRIM(p_email))
    AND waitlist_token = p_token;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  IF v_updated_count = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid email or token');
  END IF;
  
  RETURN json_build_object('success', true, 'updated', v_updated_count);
END;
$$;
```

**API Endpoint:**
```typescript
const { data: result, error } = await supabase.rpc('update_waitlist_entry_with_token', {
  p_email: email.toLowerCase().trim(),
  p_token: waitlistToken,
  p_selected_city: selectedCity ?? null,
});

if (!result?.success) {
  return NextResponse.json({ error: result?.error }, { status: 404 });
}
```

### Example 2: Aggregated Query (No PII)

**Migration:**
```sql
CREATE OR REPLACE FUNCTION get_city_interest_counts()
RETURNS TABLE (
  city_name TEXT,
  interest_count BIGINT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.city_name,
    COUNT(w.id)::BIGINT as interest_count
  FROM cities c
  LEFT JOIN waitlist w ON w.selected_city = c.city_name
  GROUP BY c.city_name
  ORDER BY interest_count DESC, c.city_name ASC;
END;
$$;
```

**API Endpoint:**
```typescript
const { data: interestCounts, error } = await supabase.rpc('get_city_interest_counts');

// Join with other data
const citiesWithCounts = cities.map(city => ({
  ...city,
  interest_count: interestCounts.find(c => c.city_name === city.city_name)?.interest_count || 0,
}));
```

## Security Considerations

### ✅ Benefits

1. **Explicit Security Boundaries**: Functions clearly define what can be accessed
2. **Defense in Depth**: Validation in both API and database function
3. **No PII Exposure**: Functions return only necessary aggregated data
4. **Auditable**: All security logic is in version-controlled migrations
5. **Maintainable**: Changes to security logic are in one place

### ⚠️ Important Notes

1. **SECURITY DEFINER**: Functions run with creator's privileges (bypasses RLS)
2. **Parameter Validation**: Always validate tokens/parameters inside the function
3. **Limited Grants**: Only grant EXECUTE to anon/authenticated (not public)
4. **No Direct Table Access**: Clients call functions, not tables directly
5. **Search Path**: Always set `SET search_path = public` to prevent injection

## When to Use This Pattern

### ✅ Use RPC Functions When:

- Token-based access (not user authentication)
- Aggregated queries that need to bypass RLS
- Operations that require explicit security boundaries
- Need to maintain auditability of security logic

### ❌ Don't Use RPC Functions When:

- Standard authenticated user operations (use RLS policies)
- Simple CRUD operations with user context
- Operations that can be expressed in RLS policies
- Admin-only operations (use admin client directly)

## Migration Checklist

When creating a new RPC function:

- [ ] Function uses `SECURITY DEFINER`
- [ ] Function sets `SET search_path = public`
- [ ] Function validates all parameters
- [ ] Function returns appropriate error messages
- [ ] Grants are limited to `anon` and `authenticated`
- [ ] Function is documented with comments
- [ ] Migration includes function definition
- [ ] API endpoint uses regular Supabase client
- [ ] No admin client usage in application code

## Testing

### Security Tests

1. **Invalid Token**: Should return error
2. **Wrong Email**: Should return error
3. **Missing Parameters**: Should return error
4. **Valid Request**: Should succeed

### Performance Tests

1. Function execution time
2. Query optimization
3. Index usage

## Related Files

- Migration: `supabase/migrations/archive/018_fix_waitlist_rls_policies.sql`
- API Endpoint: `src/app/api/waitlist/update/route.ts`
- API Endpoint: `src/app/api/cities/route.ts`

## References

- [Supabase RPC Functions](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
- [Row Level Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
