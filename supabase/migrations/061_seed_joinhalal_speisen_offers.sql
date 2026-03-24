-- Plan 051: Seed missing food offers from JoinHalal Speisen vocabulary.
--
-- Analysis 051 identified 24 unique Speisen values across 13 sampled pages.
-- Only 3/24 (Burger, Döner, Pommes) already exist in the offers catalog.
-- This migration inserts the remaining 21 food terms under the
-- "Essen & Trinken" category to enable high-coverage deterministic matching.
--
-- Idempotent: ON CONFLICT (name_de) DO NOTHING ensures safe re-execution.

INSERT INTO offers (name_de, category_id)
VALUES
  ('Adana',     '20c10efe-404b-4a39-bb81-5089a0332d78'),
  ('Bowl',      '20c10efe-404b-4a39-bb81-5089a0332d78'),
  ('Chicken',   '20c10efe-404b-4a39-bb81-5089a0332d78'),
  ('Dessert',   '20c10efe-404b-4a39-bb81-5089a0332d78'),
  ('Falafel',   '20c10efe-404b-4a39-bb81-5089a0332d78'),
  ('Fisch',     '20c10efe-404b-4a39-bb81-5089a0332d78'),
  ('Grill',     '20c10efe-404b-4a39-bb81-5089a0332d78'),
  ('Hot Dog',   '20c10efe-404b-4a39-bb81-5089a0332d78'),
  ('Köfte',     '20c10efe-404b-4a39-bb81-5089a0332d78'),
  ('Lamm',      '20c10efe-404b-4a39-bb81-5089a0332d78'),
  ('Lokma',     '20c10efe-404b-4a39-bb81-5089a0332d78'),
  ('Manti',     '20c10efe-404b-4a39-bb81-5089a0332d78'),
  ('Pasta',     '20c10efe-404b-4a39-bb81-5089a0332d78'),
  ('Reis',      '20c10efe-404b-4a39-bb81-5089a0332d78'),
  ('Salat',     '20c10efe-404b-4a39-bb81-5089a0332d78'),
  ('Sandwich',  '20c10efe-404b-4a39-bb81-5089a0332d78'),
  ('Steak',     '20c10efe-404b-4a39-bb81-5089a0332d78'),
  ('Sucuk',     '20c10efe-404b-4a39-bb81-5089a0332d78'),
  ('Suppe',     '20c10efe-404b-4a39-bb81-5089a0332d78'),
  ('Waffel',    '20c10efe-404b-4a39-bb81-5089a0332d78'),
  ('Wraps',     '20c10efe-404b-4a39-bb81-5089a0332d78')
ON CONFLICT (name_de) DO NOTHING;
