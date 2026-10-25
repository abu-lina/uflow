-- #754: remember which Wolt links were already fetched via Apify so the weekly
-- enrichment run can skip them.
ALTER TABLE public.provider_delivery_links
  ADD COLUMN IF NOT EXISTS apify_checked_at timestamptz;

-- Backfill: Wolt links whose provider already has priced menu items.
UPDATE public.provider_delivery_links pdl
SET apify_checked_at = now()
WHERE pdl.platform = 'wolt'
  AND pdl.apify_checked_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.food_menu fm
    WHERE fm.provider_id = pdl.provider_id
      AND fm.price_cents IS NOT NULL
  );
