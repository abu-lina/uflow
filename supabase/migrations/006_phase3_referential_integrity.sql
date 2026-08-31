-- Plan 114 Phase 3 (F-2 + F-4)
-- Referential integrity hardening:
-- 1) Replace UUID[] relationship columns with junction tables
-- 2) Replace polymorphic bookmark/provider_badge FKs with typed FK columns

BEGIN;

-- ---------------------------------------------------------------------------
-- 3A: Junction tables for offers/needs relations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.provider_offers (
  provider_id uuid NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.offers(offer_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, offer_id)
);

CREATE TABLE IF NOT EXISTS public.provider_needs (
  provider_id uuid NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  need_id uuid NOT NULL REFERENCES public.needs(need_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, need_id)
);

CREATE TABLE IF NOT EXISTS public.community_service_offers (
  community_service_id uuid NOT NULL REFERENCES public.community_services(community_service_id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.offers(offer_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_service_id, offer_id)
);

CREATE TABLE IF NOT EXISTS public.community_service_needs (
  community_service_id uuid NOT NULL REFERENCES public.community_services(community_service_id) ON DELETE CASCADE,
  need_id uuid NOT NULL REFERENCES public.needs(need_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (community_service_id, need_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_offers_offer_id ON public.provider_offers(offer_id);
CREATE INDEX IF NOT EXISTS idx_provider_needs_need_id ON public.provider_needs(need_id);
CREATE INDEX IF NOT EXISTS idx_community_service_offers_offer_id ON public.community_service_offers(offer_id);
CREATE INDEX IF NOT EXISTS idx_community_service_needs_need_id ON public.community_service_needs(need_id);

INSERT INTO public.provider_offers (provider_id, offer_id)
SELECT DISTINCT p.provider_id, offer_id
FROM public.providers p
CROSS JOIN LATERAL unnest(coalesce(p.offers_ids, '{}'::uuid[])) AS offer_id
ON CONFLICT DO NOTHING;

INSERT INTO public.provider_needs (provider_id, need_id)
SELECT DISTINCT p.provider_id, need_id
FROM public.providers p
CROSS JOIN LATERAL unnest(coalesce(p.needs_ids, '{}'::uuid[])) AS need_id
ON CONFLICT DO NOTHING;

INSERT INTO public.community_service_offers (community_service_id, offer_id)
SELECT DISTINCT cs.community_service_id, offer_id
FROM public.community_services cs
CROSS JOIN LATERAL unnest(coalesce(cs.offers_ids, '{}'::uuid[])) AS offer_id
ON CONFLICT DO NOTHING;

INSERT INTO public.community_service_needs (community_service_id, need_id)
SELECT DISTINCT cs.community_service_id, need_id
FROM public.community_services cs
CROSS JOIN LATERAL unnest(coalesce(cs.needs_ids, '{}'::uuid[])) AS need_id
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3B: Typed foreign keys for bookmarks
-- ---------------------------------------------------------------------------

ALTER TABLE public.bookmarks
  ADD COLUMN IF NOT EXISTS provider_id uuid,
  ADD COLUMN IF NOT EXISTS community_service_id uuid;

UPDATE public.bookmarks b
SET provider_id = b.bookmarkable_id,
    community_service_id = NULL
WHERE b.bookmarkable_type = 'provider'
  AND b.provider_id IS NULL;

UPDATE public.bookmarks b
SET community_service_id = b.bookmarkable_id,
    provider_id = NULL
WHERE b.bookmarkable_type = 'community_service'
  AND b.community_service_id IS NULL;

ALTER TABLE public.bookmarks
  DROP CONSTRAINT IF EXISTS bookmarks_bookmarkable_id_bookmarkable_type_user_id_key;

ALTER TABLE public.bookmarks
  DROP CONSTRAINT IF EXISTS bookmarks_provider_or_community_service_check,
  ADD CONSTRAINT bookmarks_provider_or_community_service_check
    CHECK (num_nonnulls(provider_id, community_service_id) = 1);

ALTER TABLE public.bookmarks
  ADD CONSTRAINT bookmarks_provider_id_fkey
    FOREIGN KEY (provider_id)
    REFERENCES public.providers(provider_id)
    ON DELETE CASCADE,
  ADD CONSTRAINT bookmarks_community_service_id_fkey
    FOREIGN KEY (community_service_id)
    REFERENCES public.community_services(community_service_id)
    ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_user_provider_unique
  ON public.bookmarks(user_id, provider_id)
  WHERE provider_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_user_community_service_unique
  ON public.bookmarks(user_id, community_service_id)
  WHERE community_service_id IS NOT NULL;

DROP INDEX IF EXISTS public.idx_bookmarks_bookmarkable;
DROP INDEX IF EXISTS public.idx_bookmarks_type;
DROP INDEX IF EXISTS public.idx_bookmarks_user_entity;

CREATE INDEX IF NOT EXISTS idx_bookmarks_provider_id ON public.bookmarks(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_community_service_id ON public.bookmarks(community_service_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_provider ON public.bookmarks(user_id, provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_community_service ON public.bookmarks(user_id, community_service_id) WHERE community_service_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3B: Typed foreign keys for provider_badges
-- ---------------------------------------------------------------------------

ALTER TABLE public.provider_badges
  ADD COLUMN IF NOT EXISTS provider_id uuid,
  ADD COLUMN IF NOT EXISTS community_service_id uuid;

UPDATE public.provider_badges pb
SET provider_id = pb.entity_id,
    community_service_id = NULL
WHERE pb.entity_type = 'provider'::public.entity_type
  AND pb.provider_id IS NULL;

UPDATE public.provider_badges pb
SET community_service_id = pb.entity_id,
    provider_id = NULL
WHERE pb.entity_type = 'community_service'::public.entity_type
  AND pb.community_service_id IS NULL;

ALTER TABLE public.provider_badges
  DROP CONSTRAINT IF EXISTS provider_badges_entity_id_entity_type_badge_type_id_key;

ALTER TABLE public.provider_badges
  DROP CONSTRAINT IF EXISTS provider_badges_provider_or_community_service_check,
  ADD CONSTRAINT provider_badges_provider_or_community_service_check
    CHECK (num_nonnulls(provider_id, community_service_id) = 1);

ALTER TABLE public.provider_badges
  ADD CONSTRAINT provider_badges_provider_id_fkey
    FOREIGN KEY (provider_id)
    REFERENCES public.providers(provider_id)
    ON DELETE CASCADE,
  ADD CONSTRAINT provider_badges_community_service_id_fkey
    FOREIGN KEY (community_service_id)
    REFERENCES public.community_services(community_service_id)
    ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_badges_provider_badge_type_unique
  ON public.provider_badges(provider_id, badge_type_id)
  WHERE provider_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_badges_community_service_badge_type_unique
  ON public.provider_badges(community_service_id, badge_type_id)
  WHERE community_service_id IS NOT NULL;

DROP INDEX IF EXISTS public.idx_provider_badges_entity;
CREATE INDEX IF NOT EXISTS idx_provider_badges_provider ON public.provider_badges(provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_provider_badges_community_service ON public.provider_badges(community_service_id) WHERE community_service_id IS NOT NULL;

-- Update badge boolean sync trigger function to typed FK columns.
CREATE OR REPLACE FUNCTION public.sync_provider_badge_to_boolean()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_provider_id uuid;
  v_badge_type_id uuid;
  v_badge_key text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_provider_id := NEW.provider_id;
    v_badge_type_id := NEW.badge_type_id;
  ELSE
    v_provider_id := OLD.provider_id;
    v_badge_type_id := OLD.badge_type_id;
  END IF;

  -- Provider booleans only exist on public.providers.
  IF v_provider_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT bt.badge_key
  INTO v_badge_key
  FROM public.badge_types bt
  WHERE bt.id = v_badge_type_id;

  IF v_badge_key IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    CASE v_badge_key
      WHEN 'MUSLIM_OWNED' THEN
        UPDATE public.providers SET muslim_owned = TRUE WHERE provider_id = v_provider_id;
      WHEN 'PRAYER_FRIENDLY' THEN
        UPDATE public.providers SET has_prayer_space = TRUE WHERE provider_id = v_provider_id;
      WHEN 'SUPPORTS_SADAQAH' THEN
        UPDATE public.providers SET accepts_donations = TRUE WHERE provider_id = v_provider_id;
      ELSE
        NULL;
    END CASE;

    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.provider_badges pb
    WHERE pb.provider_id = v_provider_id
      AND pb.badge_type_id = v_badge_type_id
  ) THEN
    CASE v_badge_key
      WHEN 'MUSLIM_OWNED' THEN
        UPDATE public.providers SET muslim_owned = FALSE WHERE provider_id = v_provider_id;
      WHEN 'PRAYER_FRIENDLY' THEN
        UPDATE public.providers SET has_prayer_space = FALSE WHERE provider_id = v_provider_id;
      WHEN 'SUPPORTS_SADAQAH' THEN
        UPDATE public.providers SET accepts_donations = FALSE WHERE provider_id = v_provider_id;
      ELSE
        NULL;
    END CASE;
  END IF;

  RETURN OLD;
END;
$$;

-- Refresh policy using typed FK ownership checks.
DROP POLICY IF EXISTS "Entity owners can update their badges" ON public.provider_badges;

CREATE POLICY "Entity owners can update their badges"
ON public.provider_badges
FOR UPDATE
USING (
  (
    provider_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.providers p
      WHERE p.provider_id = provider_badges.provider_id
        AND (
          p.provider_owner_id = (SELECT auth.uid())
          OR p.user_created_id = (SELECT auth.uid())
        )
    )
  )
  OR
  (
    community_service_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.community_services cs
      WHERE cs.community_service_id = provider_badges.community_service_id
        AND cs.user_created_id = (SELECT auth.uid())
    )
  )
  OR EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = (SELECT auth.uid())
      AND (u.raw_user_meta_data ->> 'role') = 'admin'
  )
);

-- ---------------------------------------------------------------------------
-- Update dependency policies that referenced array columns
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can delete their own unused needs" ON public.needs;
CREATE POLICY "Users can delete their own unused needs"
ON public.needs
FOR DELETE
USING (
  (SELECT auth.uid()) = created_by
  AND NOT EXISTS (
    SELECT 1 FROM public.provider_needs pn WHERE pn.need_id = needs.need_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.community_service_needs csn WHERE csn.need_id = needs.need_id
  )
);

DROP POLICY IF EXISTS "Users can delete their own unused offers" ON public.offers;
CREATE POLICY "Users can delete their own unused offers"
ON public.offers
FOR DELETE
USING (
  (SELECT auth.uid()) = created_by
  AND NOT EXISTS (
    SELECT 1 FROM public.provider_offers po WHERE po.offer_id = offers.offer_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.community_service_offers cso WHERE cso.offer_id = offers.offer_id
  )
);

-- ---------------------------------------------------------------------------
-- Final cleanup: legacy polymorphic/array columns and indexes
-- ---------------------------------------------------------------------------

DROP INDEX IF EXISTS public.idx_providers_offers_ids;
DROP INDEX IF EXISTS public.idx_providers_needs_ids;
DROP INDEX IF EXISTS public.idx_community_services_offers_ids;
DROP INDEX IF EXISTS public.idx_community_services_needs_ids;

ALTER TABLE public.providers
  DROP COLUMN IF EXISTS offers_ids,
  DROP COLUMN IF EXISTS needs_ids;

ALTER TABLE public.community_services
  DROP COLUMN IF EXISTS offers_ids,
  DROP COLUMN IF EXISTS needs_ids;

ALTER TABLE public.bookmarks
  DROP CONSTRAINT IF EXISTS bookmarks_bookmarkable_type_check,
  DROP COLUMN IF EXISTS bookmarkable_id,
  DROP COLUMN IF EXISTS bookmarkable_type;

ALTER TABLE public.provider_badges
  DROP COLUMN IF EXISTS entity_id,
  DROP COLUMN IF EXISTS entity_type;

DROP TYPE IF EXISTS public.entity_type;

COMMIT;
