-- Migration 108: Chatbot conversations + messages tables with RLS
-- Plan 176: Chatbot Feature

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active     BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_conversations_user_id ON public.conversations(user_id, updated_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
    ON public.conversations FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own conversations"
    ON public.conversations FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own conversations"
    ON public.conversations FOR DELETE
    USING (user_id = auth.uid());

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
    content         TEXT NOT NULL,
    tool_calls      JSONB,
    token_count     INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
    ON public.messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM public.conversations WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own messages"
    ON public.messages FOR INSERT
    WITH CHECK (
        conversation_id IN (
            SELECT id FROM public.conversations WHERE user_id = auth.uid()
        )
    );

-- Migration 109: Enhanced search RPC for chatbot (fixed v2)
-- Plan 176: Chatbot Feature
-- Fixed: removed halal_level (column doesn't exist on remote), fixed param prefix collision
-- Updated v3 (Plan 199): added opening_hours for open-now filtering

CREATE OR REPLACE FUNCTION search_providers_chat(
    p_search_query      TEXT DEFAULT '',
    p_category_filter   UUID DEFAULT NULL,
    p_city_filter       TEXT DEFAULT NULL,
    p_listing_type_filter TEXT DEFAULT NULL,
    p_muslim_owned      BOOLEAN DEFAULT NULL,
    p_has_prayer_space  BOOLEAN DEFAULT NULL,
    p_family_friendly   BOOLEAN DEFAULT NULL,
    p_women_friendly    BOOLEAN DEFAULT NULL,
    p_children_friendly BOOLEAN DEFAULT NULL,
    p_has_parking       BOOLEAN DEFAULT NULL,
    p_economic_solidarity BOOLEAN DEFAULT NULL,
    p_makes_donations   BOOLEAN DEFAULT NULL,
    p_limit_count       INTEGER DEFAULT 5,
    p_offset_count      INTEGER DEFAULT 0
)
RETURNS TABLE(
    provider_id          UUID,
    provider_name        TEXT,
    provider_description TEXT,
    address_city         TEXT,
    category_name        TEXT,
    listing_type         TEXT,
    muslim_owned         BOOLEAN,
    has_prayer_space     BOOLEAN,
    family_friendly      BOOLEAN,
    women_friendly       BOOLEAN,
    children_friendly    BOOLEAN,
    has_parking          BOOLEAN,
    economic_solidarity  BOOLEAN,
    makes_donations      BOOLEAN,
    opening_hours        JSONB,
    rank                 REAL
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.provider_id,
        p.provider_name,
        p.provider_description,
        p.address_city,
        c.name_de AS category_name,
        p.listing_type::TEXT,
        p.muslim_owned,
        p.has_prayer_space,
        p.family_friendly,
        p.women_friendly,
        p.children_friendly,
        p.has_parking,
        p.economic_solidarity,
        p.makes_donations,
        p.opening_hours,
        CASE
            WHEN p_search_query = '' THEN 0.0
            ELSE ts_rank(
                to_tsvector('german', p.provider_name || ' ' || COALESCE(p.provider_description, '')),
                plainto_tsquery('german', p_search_query)
            )
        END AS rank
    FROM public.providers p
    LEFT JOIN public.categories c ON p.category_id = c.category_id
    WHERE p.review_status = 'approved'
      AND (
          p_search_query = ''
          OR to_tsvector('german', p.provider_name || ' ' || COALESCE(p.provider_description, ''))
             @@ plainto_tsquery('german', p_search_query)
      )
      AND (p_category_filter IS NULL OR p.category_id = p_category_filter)
      AND (p_city_filter IS NULL OR p.address_city ILIKE p_city_filter || '%')
      AND (p_listing_type_filter IS NULL OR p.listing_type::TEXT = p_listing_type_filter)
      AND (p_muslim_owned IS NULL OR p.muslim_owned = p_muslim_owned)
      AND (p_has_prayer_space IS NULL OR p.has_prayer_space = p_has_prayer_space)
      AND (p_family_friendly IS NULL OR p.family_friendly = p_family_friendly)
      AND (p_women_friendly IS NULL OR p.women_friendly = p_women_friendly)
      AND (p_children_friendly IS NULL OR p.children_friendly = p_children_friendly)
      AND (p_has_parking IS NULL OR p.has_parking = p_has_parking)
      AND (p_economic_solidarity IS NULL OR p.economic_solidarity = p_economic_solidarity)
      AND (p_makes_donations IS NULL OR p.makes_donations = p_makes_donations)
    ORDER BY
        CASE WHEN p_search_query = '' THEN 0.0 ELSE 1.0 END,
        rank DESC,
        p.created_at DESC
    LIMIT p_limit_count
    OFFSET p_offset_count;
END;
$$;

COMMENT ON FUNCTION search_providers_chat IS 'Chatbot search with boolean flag filtering. v3 (Plan 199): added opening_hours for open-now filtering in tool executor.';

-- Migration 110: Add redirect_count to conversations for Tier 2 guardrail escalation
-- Plan 176: Chatbot Feature — Fix G2 (UAT blocker)

ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS redirect_count INTEGER NOT NULL DEFAULT 0;
