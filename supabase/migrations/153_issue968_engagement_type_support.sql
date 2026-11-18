-- Migration 153: Add 'support' to engagement_type CHECK constraint (#968)
--
-- The CHECK on provider_engagements.engagement_type was created in migration
-- 083 with four values but the app now uses 'support' (added in the
-- ProviderEditForm). DROP + recreate is the only way to ALTER a CHECK.

ALTER TABLE public.provider_engagements
  DROP CONSTRAINT IF EXISTS provider_engagements_engagement_type_check;

ALTER TABLE public.provider_engagements
  ADD CONSTRAINT provider_engagements_engagement_type_check
  CHECK (engagement_type IN ('endorsement', 'financial', 'supply_chain', 'community_referral', 'support'));
