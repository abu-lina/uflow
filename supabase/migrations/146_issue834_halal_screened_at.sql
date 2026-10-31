-- #834: remember when the halal compliance pipeline last screened a provider so
-- reruns skip it for 90 days. NULL = never screened.
ALTER TABLE public.food_providers
  ADD COLUMN IF NOT EXISTS halal_screened_at timestamptz DEFAULT NULL;
