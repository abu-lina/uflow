-- =====================================================
-- ADD CREATED_BY FIELD TO OFFERS AND NEEDS
-- =====================================================
-- This allows users to delete offers/needs they created
-- but haven't used yet in any provider

-- Add created_by to offers table
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add created_by to needs table
ALTER TABLE public.needs 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_offers_created_by ON public.offers(created_by);
CREATE INDEX IF NOT EXISTS idx_needs_created_by ON public.needs(created_by);

-- Add comments
COMMENT ON COLUMN public.offers.created_by IS 'User who created this offer. NULL means system/admin created.';
COMMENT ON COLUMN public.needs.created_by IS 'User who created this need. NULL means system/admin created.';

-- =====================================================
-- UPDATE RLS POLICIES FOR DELETION
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can delete their own offers" ON public.offers;
DROP POLICY IF EXISTS "Users can delete their own needs" ON public.needs;

-- Users can only delete offers they created AND that aren't used in any provider
CREATE POLICY "Users can delete their own unused offers" 
ON public.offers FOR DELETE 
USING (
  auth.uid() = created_by 
  AND NOT EXISTS (
    SELECT 1 FROM public.providers 
    WHERE offer_id = ANY(offers_ids)
  )
);

-- Users can only delete needs they created AND that aren't used in any provider
CREATE POLICY "Users can delete their own unused needs" 
ON public.needs FOR DELETE 
USING (
  auth.uid() = created_by 
  AND NOT EXISTS (
    SELECT 1 FROM public.providers 
    WHERE need_id = ANY(needs_ids)
  )
);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if an offer can be deleted
CREATE OR REPLACE FUNCTION can_delete_offer(p_offer_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.offers
    WHERE offer_id = p_offer_id
      AND created_by = p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM public.providers 
        WHERE p_offer_id = ANY(offers_ids)
      )
  );
END;
$$;

-- Function to check if a need can be deleted
CREATE OR REPLACE FUNCTION can_delete_need(p_need_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.needs
    WHERE need_id = p_need_id
      AND created_by = p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM public.providers 
        WHERE p_need_id = ANY(needs_ids)
      )
  );
END;
$$;

COMMENT ON FUNCTION can_delete_offer IS 'Checks if a user can delete an offer (must be creator and offer must be unused)';
COMMENT ON FUNCTION can_delete_need IS 'Checks if a user can delete a need (must be creator and need must be unused)';

