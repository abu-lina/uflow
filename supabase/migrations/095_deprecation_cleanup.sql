-- =============================================================================
-- Migration 095: Schema Cleanup — Drop Orphaned Objects
-- =============================================================================
-- Drops objects that reference dropped tables or columns:
--   1. get_community_services_for_provider() — references community_services
--      and provider_community_services tables (both dropped in M-5a / 083)
--   2. get_providers_for_community_service() — same dependency
-- =============================================================================

-- 1. Drop get_community_services_for_provider
--    community_services and provider_community_services were dropped in M-5a.
--    This function would error if called at runtime.
DROP FUNCTION IF EXISTS public.get_community_services_for_provider(uuid);

-- 2. Drop get_providers_for_community_service
--    Same dependency on dropped tables.
DROP FUNCTION IF EXISTS public.get_providers_for_community_service(uuid);
