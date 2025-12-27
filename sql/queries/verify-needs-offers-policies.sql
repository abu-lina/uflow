-- =====================================================
-- VERIFY NEEDS AND OFFERS RLS POLICIES
-- =====================================================
-- This query checks if the RLS policies allow anonymous users
-- to read and insert needs/offers
-- =====================================================

-- Check SELECT policies (should allow everyone)
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('needs', 'offers')
AND cmd = 'SELECT'
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Check INSERT policies (should allow everyone)
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('needs', 'offers')
AND cmd = 'INSERT'
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Summary: What should you see?
-- SELECT policies: Should have "Needs are viewable by everyone" and "Offers are viewable by everyone" with qual = "(true)"
-- INSERT policies: Should have "Anyone can insert needs" and "Anyone can insert offers" with with_check = "(true)"

