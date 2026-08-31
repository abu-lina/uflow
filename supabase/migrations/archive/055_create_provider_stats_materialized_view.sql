-- =====================================================
-- PROVIDER STATS MATERIALIZED VIEW (FUTURE USE)
-- =====================================================
-- Use when dashboard stats queries exceed ~500ms or
-- admin dashboard is slow with 1,000+ providers.
-- Refresh via: REFRESH MATERIALIZED VIEW provider_stats;
-- Consider pg_cron or trigger for periodic refresh.
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.provider_stats AS
SELECT
  COUNT(*)::bigint AS total_providers,
  COUNT(*) FILTER (WHERE review_status = 'approved')::bigint AS approved_count,
  COUNT(*) FILTER (WHERE review_status = 'pending')::bigint AS pending_count,
  COUNT(*) FILTER (WHERE review_status = 'needs_revision')::bigint AS needs_revision_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::bigint AS new_this_month,
  COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - created_at))), 0)::double precision AS avg_age_seconds
FROM public.providers;

-- Allow REFRESH CONCURRENTLY (requires unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_stats_singleton
  ON public.provider_stats ((true));

COMMENT ON MATERIALIZED VIEW public.provider_stats IS 'Cached provider aggregations for dashboard; refresh when stats are stale (e.g. REFRESH MATERIALIZED VIEW provider_stats;)';
