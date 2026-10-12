\set ON_ERROR_STOP off
\set TUERK '''232c2870-7929-43eb-a909-6cac90203192'''
\set DONER '''9026edb0-490a-4395-a3d7-27c5eacde0e2'''
\set PIZZA '''b4d77198-9f95-4876-aad5-9b53b9b5077b'''
\set ARAB  '''a8d3cf09-b606-4de9-8744-b8c584c5e172'''
\set PERS  '''b39cf9f5-fb5d-4e17-bc1a-2d379e130e82'''
\set BALK  '''d2cef2bf-bd0b-4b54-8606-ac371a1e1588'''
\set MODE  '''49563bf0-6962-4fd8-9147-5e68e9310eb1'''
\set GEM   '''4470c3e0-458f-40a6-a96e-ca0fbdf145d7'''
\set P1    '''7a2f2cb4-709d-4f0a-85ff-933d279ef88a'''
\set P2    '''865b3706-0df6-43c7-9706-d1a66395f2b6'''

BEGIN;

CREATE TABLE public.provider_categories (
  provider_id uuid NOT NULL REFERENCES public.providers(provider_id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(category_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, category_id)
);
CREATE INDEX idx_provider_categories_category_id ON public.provider_categories (category_id);

CREATE OR REPLACE FUNCTION public.provider_categories_sync()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $fn$
BEGIN
  IF NEW.category_id IS NULL THEN
    DELETE FROM public.provider_categories WHERE provider_id = NEW.provider_id;
  ELSE
    DELETE FROM public.provider_categories
      WHERE provider_id = NEW.provider_id AND category_id <> NEW.category_id;
    INSERT INTO public.provider_categories (provider_id, category_id)
      VALUES (NEW.provider_id, NEW.category_id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NULL;
END;
$fn$;

CREATE TRIGGER providers_sync_main_category
AFTER INSERT OR UPDATE OF category_id ON public.providers
FOR EACH ROW EXECUTE FUNCTION public.provider_categories_sync();

CREATE OR REPLACE FUNCTION public.provider_categories_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $fn$
DECLARE
  v_pid uuid; v_main uuid; v_section text; v_count int; v_bad text;
BEGIN
  v_pid := CASE WHEN TG_OP = 'DELETE' THEN OLD.provider_id ELSE NEW.provider_id END;
  SELECT p.category_id INTO v_main FROM public.providers p WHERE p.provider_id = v_pid;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT count(*) INTO v_count FROM public.provider_categories pc WHERE pc.provider_id = v_pid;
  IF v_main IS NULL THEN
    IF v_count > 0 THEN
      RAISE EXCEPTION 'provider % has % category rows but no main category_id', v_pid, v_count
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.provider_categories pc
                 WHERE pc.provider_id = v_pid AND pc.category_id = v_main) THEN
    RAISE EXCEPTION 'provider % main category % missing from provider_categories', v_pid, v_main
      USING ERRCODE = 'check_violation';
  END IF;
  IF v_count > 5 THEN
    RAISE EXCEPTION 'provider % has % categories, maximum is 5', v_pid, v_count
      USING ERRCODE = 'check_violation';
  END IF;
  SELECT c.applicable_section INTO v_section FROM public.categories c WHERE c.category_id = v_main;
  SELECT string_agg(c.name_de, ', ') INTO v_bad
    FROM public.provider_categories pc JOIN public.categories c ON c.category_id = pc.category_id
   WHERE pc.provider_id = v_pid AND pc.category_id <> v_main
     AND (c.applicable_section <> v_section OR c.applicable_section = 'all');
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'additional categories must be in section % and not ''all'': %', v_section, v_bad
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$fn$;

CREATE CONSTRAINT TRIGGER provider_categories_validate
AFTER INSERT OR UPDATE OR DELETE ON public.provider_categories
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION public.provider_categories_validate();

CREATE CONSTRAINT TRIGGER providers_categories_validate
AFTER INSERT OR UPDATE OF category_id ON public.providers
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION public.provider_categories_validate();

INSERT INTO public.provider_categories (provider_id, category_id)
SELECT p.provider_id, p.category_id FROM public.providers p WHERE p.category_id IS NOT NULL
ON CONFLICT DO NOTHING;

\echo '=== T1 backfill count (expect 0: all local providers have category_id NULL)'
SELECT count(*) AS rows_after_backfill FROM public.provider_categories;

\echo '=== T2 unmirrored main categories (expect 0)'
SELECT count(*) AS unmirrored FROM public.providers p WHERE p.category_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.provider_categories pc
                  WHERE pc.provider_id=p.provider_id AND pc.category_id=p.category_id);

\echo '=== T3 PASS: setting main category auto-creates junction row'
SAVEPOINT s3;
UPDATE public.providers SET category_id = :TUERK WHERE provider_id = :P1;
SELECT c.name_de FROM public.provider_categories pc JOIN public.categories c USING (category_id)
 WHERE pc.provider_id = :P1;

\echo '=== T4 PASS: add 4 additional food categories (5 total, at the cap)'
INSERT INTO public.provider_categories (provider_id, category_id)
VALUES (:P1,:DONER),(:P1,:PIZZA),(:P1,:ARAB),(:P1,:PERS);
SELECT count(*) AS total FROM public.provider_categories WHERE provider_id = :P1;

\echo '=== T5 FAIL EXPECTED: 6th category exceeds the cap'
SAVEPOINT s5;
INSERT INTO public.provider_categories (provider_id, category_id) VALUES (:P1,:BALK);
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK TO SAVEPOINT s5;

\echo '=== T6 FAIL EXPECTED: cross-section additional (store category on a food main)'
SAVEPOINT s6;
DELETE FROM public.provider_categories WHERE provider_id=:P1 AND category_id=:PERS;
INSERT INTO public.provider_categories (provider_id, category_id) VALUES (:P1,:MODE);
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK TO SAVEPOINT s6;

\echo '=== T7 FAIL EXPECTED: applicable_section=all category as an additional'
SAVEPOINT s7;
DELETE FROM public.provider_categories WHERE provider_id=:P1 AND category_id=:PERS;
INSERT INTO public.provider_categories (provider_id, category_id) VALUES (:P1,:GEM);
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK TO SAVEPOINT s7;

\echo '=== T8 FAIL EXPECTED: deleting the main category row from the junction'
SAVEPOINT s8;
DELETE FROM public.provider_categories WHERE provider_id=:P1 AND category_id=:TUERK;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK TO SAVEPOINT s8;

\echo '=== T9 FAIL EXPECTED: inserting an additional for a provider with NULL main'
SAVEPOINT s9;
INSERT INTO public.provider_categories (provider_id, category_id) VALUES (:P2,:DONER);
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK TO SAVEPOINT s9;

\echo '=== T10 PASS: changing the main category resets the set to just the new main (expect 1 = Pizza)'
SAVEPOINT s10;
UPDATE public.providers SET category_id = :PIZZA WHERE provider_id = :P1;
SELECT count(*) AS total, (SELECT c.name_de FROM public.provider_categories pc
  JOIN public.categories c USING (category_id) WHERE pc.provider_id=:P1) AS only_one
  FROM public.provider_categories WHERE provider_id = :P1;
ROLLBACK TO SAVEPOINT s10;

\echo '=== T11 PASS: clearing the main category empties the set (expect 0)'
SAVEPOINT s11;
UPDATE public.providers SET category_id = NULL WHERE provider_id = :P1;
SELECT count(*) AS total FROM public.provider_categories WHERE provider_id = :P1;
ROLLBACK TO SAVEPOINT s11;

\echo '=== T12 PASS: main-first then replace-additionals ordering works in one statement batch'
SAVEPOINT s12;
UPDATE public.providers SET category_id = :ARAB WHERE provider_id = :P1;
INSERT INTO public.provider_categories (provider_id, category_id) VALUES (:P1,:DONER),(:P1,:TUERK);
SET CONSTRAINTS ALL IMMEDIATE;
SELECT count(*) AS total FROM public.provider_categories WHERE provider_id = :P1;
ROLLBACK TO SAVEPOINT s12;

\echo '=== T13 PASS: deleting the category row cascades and leaves the invariant intact'
SAVEPOINT s13;
SELECT count(*) AS before FROM public.provider_categories WHERE provider_id=:P1;
DELETE FROM public.categories WHERE category_id = :DONER;
SELECT count(*) AS after_doener_delete FROM public.provider_categories WHERE provider_id=:P1;
ROLLBACK TO SAVEPOINT s13;

\echo '=== T14 FAIL EXPECTED?: deleting the MAIN category row (FK SET NULL + junction CASCADE race)'
SAVEPOINT s14;
DELETE FROM public.categories WHERE category_id = :TUERK;
SELECT (SELECT category_id FROM public.providers WHERE provider_id=:P1) AS main_after,
       count(*) AS junction_after FROM public.provider_categories WHERE provider_id=:P1;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK TO SAVEPOINT s14;

\echo '=== T15 PASS: search_providers_chat EXISTS matching + no duplicates'
SAVEPOINT s15;
UPDATE public.providers SET review_status='approved' WHERE provider_id=:P1;
SELECT count(*) AS hits FROM (
  SELECT p.provider_id FROM public.providers p
  WHERE p.review_status='approved'
    AND EXISTS (SELECT 1 FROM public.provider_categories pc
                WHERE pc.provider_id=p.provider_id AND pc.category_id=:DONER)
) q;
\echo '--- a JOIN instead of EXISTS with a 2-category filter would duplicate (demonstration)'
SELECT count(*) AS join_rows FROM public.providers p
  JOIN public.provider_categories pc ON pc.provider_id=p.provider_id
 WHERE pc.category_id IN (:DONER,:TUERK);
ROLLBACK TO SAVEPOINT s15;

ROLLBACK;
\echo '=== DB restored (transaction rolled back)'
SELECT count(*) AS provider_categories_tables FROM information_schema.tables
 WHERE table_schema='public' AND table_name='provider_categories';
