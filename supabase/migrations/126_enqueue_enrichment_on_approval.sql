-- Migration 126: Auto-enqueue enrichment when provider is approved
-- Plan 225: When review_status transitions to 'approved', insert a row
-- into pending_enrichments so the next enrichment run picks it up.
-- Only fires for enrichment_eligible providers (discovery imports).

-- Trigger function
CREATE OR REPLACE FUNCTION public.enqueue_enrichment_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire on status change to 'approved'
  IF OLD.review_status IS DISTINCT FROM 'approved'
     AND NEW.review_status = 'approved'
     AND NEW.enrichment_eligible = true
  THEN
    -- source=NULL means enrich from all available sources
    INSERT INTO public.pending_enrichments (provider_id, source, status)
    VALUES (NEW.provider_id, NULL, 'pending');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists for idempotent migration
DROP TRIGGER IF EXISTS trigger_enqueue_enrichment_on_approval ON public.providers;

-- Create trigger on UPDATE (approval is always an update, not insert)
CREATE TRIGGER trigger_enqueue_enrichment_on_approval
  AFTER UPDATE OF review_status ON public.providers
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_enrichment_on_approval();

COMMENT ON FUNCTION public.enqueue_enrichment_on_approval() IS
  'Auto-enqueues enrichment for newly approved providers with enrichment_eligible=true (Plan 225).';

COMMENT ON TRIGGER trigger_enqueue_enrichment_on_approval ON public.providers IS
  'Fires when review_status changes to approved, enqueuing enrichment for discovery-imported providers.';
