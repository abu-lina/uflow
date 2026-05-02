-- Plan 119: category section alignment + provider/category consistency fixes
-- Date: 2026-05-02
-- Purpose:
-- 1) Scope legacy category "Gesundheit & Sport" to store-only (if still all-scoped).
-- 2) Correct provider/category section mismatches in a data-driven way.

begin;

-- RC-3: Legacy category currently backfilled to 'all' should be store-scoped.
-- Uniqueness-safe targeting: only apply when exactly one row matches the legacy display name.
do $$
declare
  v_match_count int;
  v_category_id uuid;
begin
  select count(*), min(category_id)
  into v_match_count, v_category_id
  from public.categories
  where name_de = 'Gesundheit & Sport';

  if v_match_count = 1 then
    update public.categories
    set applicable_section = 'store'
    where category_id = v_category_id
      and applicable_section = 'all';
  end if;
end $$;

-- RC-1: Align all mismatched provider listing_type values to their category section.
-- Applies only to explicitly scoped categories; all-scoped categories are intentionally excluded.
update public.providers p
set listing_type = c.applicable_section::public.listing_type_enum
from public.categories c
where p.category_id = c.category_id
  and c.applicable_section in ('food', 'store', 'ummah')
  and p.listing_type::text <> c.applicable_section;

commit;
