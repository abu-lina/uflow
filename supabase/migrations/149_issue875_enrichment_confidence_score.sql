-- #875: Add confidence_score to enrichment_candidates for name-matching auto-approval.
ALTER TABLE public.enrichment_candidates
  ADD COLUMN IF NOT EXISTS confidence_score integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'enrichment_candidates_confidence_score_range'
      AND conrelid = 'public.enrichment_candidates'::regclass
  ) THEN
    ALTER TABLE public.enrichment_candidates
      ADD CONSTRAINT enrichment_candidates_confidence_score_range
      CHECK (confidence_score BETWEEN 0 AND 100);
  END IF;
END $$;
