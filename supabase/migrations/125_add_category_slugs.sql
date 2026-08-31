-- Add slug column to categories for SEO-friendly URLs
ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug) WHERE slug IS NOT NULL;

UPDATE categories
SET slug = LOWER(
  TRIM(BOTH '-' FROM
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
          COALESCE(name_en, name_de),
          'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss'), 'Ä', 'ae'), 'Ö', 'oe'),
      'Ü', 'ue'),
    '[^a-zA-Z0-9]+', '-', 'g')
  )
)
WHERE slug IS NULL;
