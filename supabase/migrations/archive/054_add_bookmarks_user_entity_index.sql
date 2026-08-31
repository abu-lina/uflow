-- =====================================================
-- ADD BOOKMARKS COMPOSITE INDEX FOR BOOKMARK LOOKUPS
-- =====================================================
-- Optimizes bookmark status checks in useOptimisticBookmark and
-- "get bookmarks for user" queries.
-- Query pattern: WHERE user_id = ? AND bookmarkable_type = ? AND bookmarkable_id = ?
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_entity
  ON public.bookmarks(user_id, bookmarkable_type, bookmarkable_id);

COMMENT ON INDEX idx_bookmarks_user_entity IS 'Composite index for bookmark lookups by user and entity (used in useOptimisticBookmark and bookmark lists)';
