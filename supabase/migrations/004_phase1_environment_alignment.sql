-- Plan 114 / Phase 1: Environment alignment (F-9)
-- Reconciles consent_logs/consent_type/deletion_logs across local, dev, and prod.
-- Must be idempotent because environments currently have different subsets.

-- 1) consent_type enum (required by consent_logs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'consent_type'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.consent_type AS ENUM (
      'terms_of_service',
      'privacy_policy'
    );
  END IF;
END;
$$;

-- 2) consent_logs table
CREATE TABLE IF NOT EXISTS public.consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type public.consent_type NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT true,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reconcile columns for environments where consent_logs already exists
ALTER TABLE public.consent_logs
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS consent_type public.consent_type,
  ADD COLUMN IF NOT EXISTS accepted BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.consent_logs
  ALTER COLUMN accepted SET DEFAULT true,
  ALTER COLUMN accepted_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'consent_logs'
      AND column_name = 'user_id'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.consent_logs ALTER COLUMN user_id SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'consent_logs'
      AND column_name = 'consent_type'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.consent_logs ALTER COLUMN consent_type SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'consent_logs'
      AND column_name = 'accepted'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.consent_logs ALTER COLUMN accepted SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'consent_logs'
      AND column_name = 'accepted_at'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.consent_logs ALTER COLUMN accepted_at SET NOT NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'consent_logs_pkey'
      AND n.nspname = 'public'
      AND t.relname = 'consent_logs'
  ) THEN
    ALTER TABLE public.consent_logs
      ADD CONSTRAINT consent_logs_pkey PRIMARY KEY (id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'consent_logs_user_id_fkey'
      AND n.nspname = 'public'
      AND t.relname = 'consent_logs'
  ) THEN
    ALTER TABLE public.consent_logs
      ADD CONSTRAINT consent_logs_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_consent_logs_user_id
  ON public.consent_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_consent_logs_consent_type
  ON public.consent_logs(consent_type);

CREATE INDEX IF NOT EXISTS idx_consent_logs_accepted_at
  ON public.consent_logs(accepted_at DESC);

-- 3) deletion_logs table
CREATE TABLE IF NOT EXISTS public.deletion_logs (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  user_id UUID NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.deletion_logs
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.deletion_logs
  ALTER COLUMN deleted_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'deletion_logs'
      AND column_name = 'user_id'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.deletion_logs ALTER COLUMN user_id SET NOT NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'deletion_logs_pkey'
      AND n.nspname = 'public'
      AND t.relname = 'deletion_logs'
  ) THEN
    ALTER TABLE public.deletion_logs
      ADD CONSTRAINT deletion_logs_pkey PRIMARY KEY (id);
  END IF;
END;
$$;

-- 4) RLS
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deletion_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'consent_logs'
      AND policyname = 'Users can view their own consent logs'
  ) THEN
    CREATE POLICY "Users can view their own consent logs"
      ON public.consent_logs FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'consent_logs'
      AND policyname = 'Users can create their own consent logs'
  ) THEN
    CREATE POLICY "Users can create their own consent logs"
      ON public.consent_logs FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'consent_logs'
      AND policyname = 'Users can update their own consent logs'
  ) THEN
    CREATE POLICY "Users can update their own consent logs"
      ON public.consent_logs FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'consent_logs'
      AND policyname = 'Admins can view all consent logs'
  ) THEN
    CREATE POLICY "Admins can view all consent logs"
      ON public.consent_logs FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.user_id = auth.uid()
            AND users.role = 'admin'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'deletion_logs'
      AND policyname = 'Only admins can read deletion logs'
  ) THEN
    CREATE POLICY "Only admins can read deletion logs"
      ON public.deletion_logs FOR SELECT
      USING (((SELECT auth.jwt()) ->> 'role') = 'admin');
  END IF;
END;
$$;

-- 5) Grants (baseline-consistent; RLS remains access boundary)
GRANT ALL ON TABLE public.consent_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.deletion_logs TO anon, authenticated, service_role;

-- 6) Comments
COMMENT ON TABLE public.consent_logs IS
  'Stores user consent records for Terms of Service and Privacy Policy. Required for GDPR compliance and audit trail.';
COMMENT ON COLUMN public.consent_logs.consent_type IS
  'Type of consent: terms_of_service or privacy_policy';
COMMENT ON COLUMN public.consent_logs.accepted IS
  'Whether consent was accepted (true) or revoked (false)';
COMMENT ON COLUMN public.consent_logs.accepted_at IS
  'Timestamp when consent was given';
COMMENT ON COLUMN public.consent_logs.revoked_at IS
  'Timestamp when consent was revoked (if applicable)';
COMMENT ON COLUMN public.consent_logs.ip_address IS
  'IP address from which consent was given (for audit trail)';
COMMENT ON COLUMN public.consent_logs.user_agent IS
  'User agent from which consent was given (for audit trail)';

COMMENT ON TABLE public.deletion_logs IS
  'Audit log of user account deletions for GDPR Article 17 compliance.';
COMMENT ON COLUMN public.deletion_logs.reason IS
  'Reason recorded during account deletion flow.';
