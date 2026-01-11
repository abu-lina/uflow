# Provider RLS Update Policy Consolidation

## Issue Summary

**Title:** Multiple Permissive Policies  
**Entity:** `public.providers` table  
**Role:** `dashboard_user` (via `public` role)  
**Action:** UPDATE  
**Severity:** Performance impact

### Problem

Two permissive RLS policies exist for the UPDATE action on the `providers` table:

1. **"Admins can manage all providers"** - `FOR ALL` (includes UPDATE)
2. **"Users can update their own providers"** - `FOR UPDATE`

Both policies are permissive and apply to the same role (`public`), causing PostgreSQL to evaluate both policies for every UPDATE operation. This creates unnecessary overhead:

- Each policy predicate is evaluated for every row considered by the UPDATE
- Performance impact increases with table size and update frequency
- More complex predicates (subqueries) are evaluated multiple times

### Root Cause

The `FOR ALL` policy includes UPDATE operations, and there's also a specific `FOR UPDATE` policy. When a `dashboard_user` performs an UPDATE, PostgreSQL must evaluate both permissive policies and merge their results (OR operation).

## Solution

### Approach: Consolidate Policies

1. **Split the admin policy** into separate policies for SELECT, INSERT, and DELETE
2. **Create a single consolidated UPDATE policy** that combines both conditions (admin OR owner)

### Benefits

- **Single policy evaluation** per UPDATE operation
- **Clearer intent** - one policy explicitly handles UPDATE permissions
- **Better performance** - reduced predicate evaluations
- **Easier maintenance** - centralized UPDATE logic

## Implementation

### Migration Files

1. **`030_consolidate_provider_update_policies.sql`**
   - Drops conflicting policies
   - Creates separate admin policies (SELECT, INSERT, DELETE)
   - Creates consolidated UPDATE policy

2. **`031_optimize_provider_update_policy_index.sql`** (Optional)
   - Creates composite index for faster admin role checks

### Consolidated Policy Structure

```sql
CREATE POLICY "Users can update their own providers or admins can update any" 
  ON public.providers
  FOR UPDATE
  TO public
  USING (
    provider_owner_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );
```

### Index Usage

The consolidated policy leverages existing indexes:
- `idx_providers_owner_id` - for owner check
- `idx_users_user_id` - for admin user lookup
- `idx_users_role` - for role filtering

Optional composite index (`idx_users_user_id_role`) further optimizes the admin check.

## Validation Steps

After applying the migration:

1. **Test admin updates:**
   ```sql
   -- As admin user, verify UPDATE works
   UPDATE providers SET provider_name = 'Test' WHERE provider_id = '...';
   ```

2. **Test owner updates:**
   ```sql
   -- As owner user, verify UPDATE works
   UPDATE providers SET provider_name = 'Test' WHERE provider_id = '...';
   ```

3. **Test unauthorized updates:**
   ```sql
   -- As regular user, verify UPDATE is blocked for non-owned providers
   UPDATE providers SET provider_name = 'Test' WHERE provider_id = '...';
   ```

4. **Check policy count:**
   ```sql
   SELECT COUNT(*) 
   FROM pg_policies 
   WHERE tablename = 'providers' 
     AND cmd = 'UPDATE';
   -- Should return 1
   ```

5. **Performance comparison:**
   ```sql
   EXPLAIN ANALYZE 
   UPDATE providers 
   SET updated_at = now() 
   WHERE provider_owner_id = auth.uid();
   ```

## Performance Impact

### Before
- 2 permissive policies evaluated per UPDATE
- Each policy runs subquery for admin check
- Total: 2 subqueries per row

### After
- 1 permissive policy evaluated per UPDATE
- Single subquery with OR condition
- Total: 1 subquery per row (with short-circuit evaluation)

### Expected Improvement
- ~50% reduction in policy evaluations
- Faster UPDATE operations, especially on large tables
- Reduced CPU usage during high-update workloads

## Related Policies

After consolidation, the `providers` table has:

- **SELECT:** "Allow public read of providers" (public)
- **SELECT:** "Admins can view all providers" (admin/moderator)
- **INSERT:** "Allow anonymous provider inserts" (anon)
- **INSERT:** "Allow authenticated provider inserts" (authenticated)
- **INSERT:** "Admins can insert providers" (admin/moderator)
- **UPDATE:** "Users can update their own providers or admins can update any" (consolidated)
- **DELETE:** "Users can delete their own providers" (owners)
- **DELETE:** "Admins can delete providers" (admin/moderator)

## Notes

- The consolidated policy maintains the same access semantics as before
- No functional changes to application behavior
- All existing UPDATE operations continue to work
- The migration is backward compatible
