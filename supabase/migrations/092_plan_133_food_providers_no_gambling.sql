BEGIN;

-- Plan 133: Add no_gambling to food_providers for feature parity with store_providers.
-- Previously only store_providers carried this column; food providers can also
-- declare a no-gambling commitment.

ALTER TABLE public.food_providers
  ADD COLUMN IF NOT EXISTS no_gambling BOOLEAN NOT NULL DEFAULT false;

COMMIT;
