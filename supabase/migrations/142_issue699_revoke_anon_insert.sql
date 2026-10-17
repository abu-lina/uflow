-- #699: anon never inserts into offers/needs; RLS was the only barrier.
-- REVOKE is idempotent. authenticated/service_role grants and policies are untouched.
--
-- Owner verification after deploy (must return no rows):
-- SELECT table_name, grantee, privilege_type FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name IN ('offers','needs') AND grantee = 'anon' AND privilege_type = 'INSERT';

REVOKE INSERT ON public.offers, public.needs FROM anon;
