-- ==============================================================================
-- Provider Owner Outreach - Observability Queries
-- Feature: 038 - Provider Owner Outreach & Claim System
-- Purpose: SQL queries for monitoring outreach system performance & metrics
-- ==============================================================================

-- ==============================================================================
-- 1. UNCLAIMED PROVIDER COUNT
-- ==============================================================================

-- Total unclaimed providers (eligible for outreach)
SELECT COUNT(*) AS unclaimed_providers
FROM providers
WHERE provider_owner_id IS NULL
  AND review_status = 'approved'
  AND (contact_email IS NOT NULL OR contact_phone IS NOT NULL OR social_instagram IS NOT NULL);

-- Unclaimed providers by contact channel availability
SELECT 
  CASE 
    WHEN contact_email IS NOT NULL THEN 'has_email'
    WHEN contact_phone IS NOT NULL THEN 'has_phone'
    WHEN social_instagram IS NOT NULL THEN 'has_instagram'
    ELSE 'no_contact'
  END AS contact_channel,
  COUNT(*) AS provider_count
FROM providers
WHERE provider_owner_id IS NULL
  AND review_status = 'approved'
GROUP BY 1
ORDER BY provider_count DESC;

-- ==============================================================================
-- 2. OUTREACH FUNNEL METRICS
-- ==============================================================================

-- Outreach by status (funnel view)
SELECT 
  status,
  COUNT(*) AS count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM provider_owner_outreach
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'pending_approval' THEN 1
    WHEN 'approved' THEN 2
    WHEN 'pending_dispatch' THEN 3
    WHEN 'sent' THEN 4
    WHEN 'delivered' THEN 5
    WHEN 'opened' THEN 6
    WHEN 'clicked' THEN 7
    WHEN 'responded' THEN 8
    WHEN 'claimed' THEN 9
    WHEN 'kept' THEN 10
    WHEN 'removed' THEN 11
    WHEN 'failed' THEN 12
    WHEN 'bounced' THEN 13
    ELSE 99
  END;

-- ==============================================================================
-- 3. OUTREACH SENT PER CHANNEL
-- ==============================================================================

-- Channel performance
SELECT 
  channel,
  COUNT(*) AS total_outreach,
  COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'opened', 'clicked', 'responded', 'claimed', 'kept', 'removed')) AS sent,
  COUNT(*) FILTER (WHERE status IN ('claimed')) AS claimed,
  COUNT(*) FILTER (WHERE status IN ('kept')) AS kept,
  COUNT(*) FILTER (WHERE status IN ('removed')) AS removed,
  COUNT(*) FILTER (WHERE status IN ('failed', 'bounced')) AS failed
FROM provider_owner_outreach
GROUP BY channel
ORDER BY total_outreach DESC;

-- ==============================================================================
-- 4. DECISION RATE & CONVERSION
-- ==============================================================================

-- Overall decision rate
SELECT 
  COUNT(*) AS total_sent,
  COUNT(*) FILTER (WHERE status IN ('claimed', 'kept', 'removed')) AS decisions_made,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status IN ('claimed', 'kept', 'removed')) / 
    NULLIF(COUNT(*), 0), 2
  ) AS decision_rate_pct,
  COUNT(*) FILTER (WHERE status = 'claimed') AS claimed_count,
  COUNT(*) FILTER (WHERE status = 'kept') AS kept_count,
  COUNT(*) FILTER (WHERE status = 'removed') AS removed_count
FROM provider_owner_outreach
WHERE status NOT IN ('pending_approval', 'approved', 'pending_dispatch');

-- Decision rate by week
SELECT 
  DATE_TRUNC('week', created_at)::date AS week_start,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status IN ('claimed', 'kept', 'removed')) AS decisions,
  COUNT(*) FILTER (WHERE status = 'claimed') AS claimed,
  COUNT(*) FILTER (WHERE status = 'kept') AS kept,
  COUNT(*) FILTER (WHERE status = 'removed') AS removed
FROM provider_owner_outreach
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week_start DESC;

-- ==============================================================================
-- 5. TOKEN METRICS
-- ==============================================================================

-- Token usage stats
SELECT 
  action_scope,
  COUNT(*) AS total_tokens,
  COUNT(*) FILTER (WHERE is_used = true) AS used_tokens,
  COUNT(*) FILTER (WHERE expires_at < NOW() AND is_used = false) AS expired_unused,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE is_used = true) / NULLIF(COUNT(*), 0), 2
  ) AS usage_rate_pct
FROM provider_owner_action_tokens
GROUP BY action_scope;

-- ==============================================================================
-- 6. MANUAL TASK BACKLOG
-- ==============================================================================

-- Pending manual tasks by channel
SELECT 
  channel,
  COUNT(*) AS pending_tasks,
  MIN(created_at) AS oldest_task,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400)::int AS avg_age_days
FROM provider_outreach_tasks
WHERE status = 'pending'
GROUP BY channel
ORDER BY pending_tasks DESC;

-- Task completion rate
SELECT 
  status,
  COUNT(*) AS count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM provider_outreach_tasks
GROUP BY status;

-- ==============================================================================
-- 7. DISPATCH PERFORMANCE
-- ==============================================================================

-- Dispatch attempts and failures
SELECT 
  DATE_TRUNC('day', last_dispatch_at)::date AS dispatch_date,
  COUNT(*) AS dispatch_attempts,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed,
  COUNT(*) FILTER (WHERE status = 'bounced') AS bounced,
  AVG(dispatch_attempts) AS avg_attempts_per_outreach
FROM provider_owner_outreach
WHERE last_dispatch_at IS NOT NULL
  AND last_dispatch_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', last_dispatch_at)
ORDER BY dispatch_date DESC;

-- ==============================================================================
-- 8. RESPONSE TIME METRICS
-- ==============================================================================

-- Time from sent to decision
SELECT 
  status,
  COUNT(*) AS count,
  ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400), 1) AS avg_days_to_decision,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400), 1) AS median_days,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400), 1) AS p90_days
FROM provider_owner_outreach
WHERE status IN ('claimed', 'kept', 'removed')
GROUP BY status;

-- ==============================================================================
-- 9. DAILY DASHBOARD QUERY
-- ==============================================================================

-- Summary metrics for dashboard
SELECT 
  (SELECT COUNT(*) FROM providers WHERE provider_owner_id IS NULL AND review_status = 'approved') AS unclaimed_providers,
  (SELECT COUNT(*) FROM provider_owner_outreach WHERE status = 'pending_approval') AS pending_approval,
  (SELECT COUNT(*) FROM provider_owner_outreach WHERE status IN ('approved', 'pending_dispatch')) AS ready_to_send,
  (SELECT COUNT(*) FROM provider_owner_outreach WHERE status = 'sent') AS awaiting_response,
  (SELECT COUNT(*) FROM provider_owner_outreach WHERE status = 'claimed') AS claimed_total,
  (SELECT COUNT(*) FROM provider_owner_outreach WHERE status = 'kept') AS kept_total,
  (SELECT COUNT(*) FROM provider_owner_outreach WHERE status = 'removed') AS removed_total,
  (SELECT COUNT(*) FROM provider_outreach_tasks WHERE status = 'pending') AS pending_manual_tasks;
