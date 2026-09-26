-- Migration 129: Tri-state halal attestation columns
-- Plan 255 / #415: allow NULL so "not sure" is distinguishable from "no".
-- Semantics: true = attested yes, false = submitter said no, NULL = unknown /
-- not answered. The Plan 228 halal gate blocks approval for both false and
-- NULL; the difference is triage information for reviewers.
--
-- The previous DEFAULT false is dropped: an omitted answer must mean
-- "unknown", not "submitter said no".

BEGIN;

ALTER TABLE public.food_providers
  ALTER COLUMN no_alcohol  DROP NOT NULL,
  ALTER COLUMN no_alcohol  DROP DEFAULT,
  ALTER COLUMN no_pork     DROP NOT NULL,
  ALTER COLUMN no_pork     DROP DEFAULT,
  ALTER COLUMN no_gambling DROP NOT NULL,
  ALTER COLUMN no_gambling DROP DEFAULT;

ALTER TABLE public.store_providers
  ALTER COLUMN no_alcohol  DROP NOT NULL,
  ALTER COLUMN no_alcohol  DROP DEFAULT,
  ALTER COLUMN no_pork     DROP NOT NULL,
  ALTER COLUMN no_pork     DROP DEFAULT,
  ALTER COLUMN no_gambling DROP NOT NULL,
  ALTER COLUMN no_gambling DROP DEFAULT;

COMMIT;
