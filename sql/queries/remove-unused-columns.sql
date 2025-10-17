-- Remove unused singular ID columns from providers table
-- These columns were likely added manually and are not used by the application

-- Remove the unused singular columns
ALTER TABLE public.providers 
DROP COLUMN IF EXISTS offers_id,
DROP COLUMN IF EXISTS needs_id;

-- Verify the remaining columns are correct
-- You should have:
-- - offers_ids (UUID[] array) - for multiple offer selections
-- - needs_ids (UUID[] array) - for multiple need selections
-- - All other columns as expected

-- Optional: Add a comment to document this cleanup
COMMENT ON TABLE public.providers IS 'Providers table with array-based offers_ids and needs_ids for multiple selections';
