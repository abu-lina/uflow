-- Plan 113: add structured opening hours storage for provider detail open/closed status.
ALTER TABLE public.providers
ADD COLUMN IF NOT EXISTS opening_hours JSONB;