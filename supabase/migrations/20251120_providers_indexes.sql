-- Add indexes for provider review queries
-- These indexes improve performance for admin panel queries

-- Index on review_status (most common filter)
CREATE INDEX IF NOT EXISTS idx_providers_review_status ON providers(review_status);

-- Composite index for common query pattern: review_status + created_at
CREATE INDEX IF NOT EXISTS idx_providers_review_status_created_at ON providers(review_status, created_at DESC);

-- Index on user_created_id for filtering by creator
CREATE INDEX IF NOT EXISTS idx_providers_user_created_id ON providers(user_created_id);

-- Add comment
COMMENT ON INDEX idx_providers_review_status IS 'Index for filtering providers by review status (used in admin panel)';
COMMENT ON INDEX idx_providers_review_status_created_at IS 'Composite index for common admin query: status filter + date sorting';

