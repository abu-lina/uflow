-- Prerequisite for 0061: add 'ummah' to listing_type_enum in its own transaction
-- (PostgreSQL 14+ blocks using a newly added enum value in the same transaction)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'listing_type_enum'
      AND e.enumlabel = 'ummah'
  ) THEN
    ALTER TYPE public.listing_type_enum ADD VALUE 'ummah';
  END IF;
END
$$;
