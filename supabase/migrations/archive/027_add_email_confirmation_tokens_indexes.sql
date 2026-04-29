-- =====================================================
-- ADD INDEXES FOR EMAIL_CONFIRMATION_TOKENS TABLE
-- =====================================================
-- Purpose: Optimize query performance for magic link verification
-- 
-- The verify-magic-link route queries:
--   .eq('token', token).eq('email', email).eq('type', 'magic_link').eq('used', false)
--
-- Current indexes exist on:
--   - token (single column)
--   - user_id (single column)
--   - email (single column)
--
-- Missing indexes for:
--   - type (filtering by token type)
--   - used (filtering by usage status)
--   - expires_at (cleanup queries)
--   - Composite index for exact query pattern
-- =====================================================

-- Composite index for the exact query pattern used in verify-magic-link
-- This index covers: token + email + type + used
-- Order matters: most selective columns first (token is unique, so first)
CREATE INDEX IF NOT EXISTS idx_email_confirmation_tokens_lookup 
  ON public.email_confirmation_tokens(token, email, type, used);

-- Index for expiration cleanup queries
-- Used by cleanup_expired_tokens() function
CREATE INDEX IF NOT EXISTS idx_email_confirmation_tokens_expires_at 
  ON public.email_confirmation_tokens(expires_at)
  WHERE used = FALSE;

-- Index for type filtering (if querying by type alone)
-- Useful for analytics or type-specific queries
CREATE INDEX IF NOT EXISTS idx_email_confirmation_tokens_type 
  ON public.email_confirmation_tokens(type);

-- =====================================================
-- VERIFY INDEXES WERE CREATED
-- =====================================================
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'email_confirmation_tokens'
  AND schemaname = 'public'
  AND indexname LIKE 'idx_email_confirmation_tokens%'
ORDER BY indexname;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- Added indexes for optimal query performance:
--   1. Composite index for token lookup (token, email, type, used)
--   2. Partial index on expires_at for cleanup queries
--   3. Index on type for type-based filtering
-- =====================================================
