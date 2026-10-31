-- #836 (ADR 0003): trust tiers for enrichment candidates.
-- 'auto-applied' = applied by the pipeline without human review.
-- evidence = matched keywords, Maps attributes and other pipeline reasoning.
ALTER TYPE enrichment_status ADD VALUE IF NOT EXISTS 'auto-applied';

ALTER TABLE public.enrichment_candidates
  ADD COLUMN IF NOT EXISTS evidence jsonb DEFAULT NULL;
