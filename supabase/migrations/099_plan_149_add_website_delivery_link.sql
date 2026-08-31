-- ============================================================
-- Migration: Plan 149 — Allow custom website links for delivery/order
-- Date: 2026-06-06
--
-- Problem: Delivery/order links were restricted to Wolt, Lieferando,
-- and UberEats only. Stores need custom website order links (e.g.,
-- the provider's own online shop), and food providers may also want
-- custom order pages beyond the three delivery platforms.
--
-- Changes:
-- 1. Alters the CHECK constraint on provider_delivery_links.platform
--    to allow 'website' in addition to the existing platforms.
-- 2. Updates table/column comments to reflect the broader use.
-- ============================================================

-- Drop the old CHECK constraint
ALTER TABLE public.provider_delivery_links
  DROP CONSTRAINT IF EXISTS provider_delivery_links_platform_check;

-- Add new CHECK constraint with 'website' option
ALTER TABLE public.provider_delivery_links
  ADD CONSTRAINT provider_delivery_links_platform_check
  CHECK (platform IN ('wolt', 'lieferando', 'ubereats', 'website'));

-- Update table comment
COMMENT ON TABLE public.provider_delivery_links IS
  'Provider order/delivery platform links (Wolt, Lieferando, UberEats, or custom website links).';

-- Update column comment
COMMENT ON COLUMN public.provider_delivery_links.platform IS
  'Platform identifier. ''website'' indicates a custom order link outside the known delivery platforms. PK constraint prevents multiple links per platform per provider.';
