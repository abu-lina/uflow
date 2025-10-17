-- Add category type classification to existing categories table
-- This allows certain categories to be specific to providers or social projects

-- Add the new column
ALTER TABLE public.categories 
ADD COLUMN applicable_to TEXT[] DEFAULT '{provider,community_service}';

-- Add a comment to explain the field
COMMENT ON COLUMN public.categories.applicable_to IS 'Array of entity types that can use this category. Options: provider, community_service';

-- Update existing categories to be available for both (if they should be)
-- This is the default behavior, so no changes needed for general categories

-- Example: Add some provider-specific categories
INSERT INTO public.categories (category_id, name, name_de, name_en, description, applicable_to) 
VALUES 
  (gen_random_uuid(), 'Business Consulting', 'Unternehmensberatung', 'Business Consulting', 'Professional business consulting services', '{provider}'),
  (gen_random_uuid(), 'Personal Coaching', 'Persönliches Coaching', 'Personal Coaching', 'One-on-one personal development coaching', '{provider}'),
  (gen_random_uuid(), 'Technical Services', 'Technische Dienstleistungen', 'Technical Services', 'IT and technical support services', '{provider}');

-- Example: Add some social project-specific categories
INSERT INTO public.categories (category_id, name, name_de, name_en, description, applicable_to) 
VALUES 
  (gen_random_uuid(), 'Emergency Relief', 'Nothilfe', 'Emergency Relief', 'Emergency and disaster relief projects', '{community_service}'),
  (gen_random_uuid(), 'Infrastructure Development', 'Infrastrukturentwicklung', 'Infrastructure Development', 'Building and infrastructure development projects', '{community_service}'),
  (gen_random_uuid(), 'Medical Equipment', 'Medizinische Ausrüstung', 'Medical Equipment', 'Medical equipment and supplies donation', '{community_service}');

-- Example: Keep some categories available for both
INSERT INTO public.categories (category_id, name, name_de, name_en, description, applicable_to) 
VALUES 
  (gen_random_uuid(), 'Education', 'Bildung', 'Education', 'Educational services and projects', '{provider,community_service}'),
  (gen_random_uuid(), 'Healthcare', 'Gesundheitswesen', 'Healthcare', 'Health and medical services and projects', '{provider,community_service}'),
  (gen_random_uuid(), 'Community Support', 'Gemeinschaftsunterstützung', 'Community Support', 'General community support and services', '{provider,community_service}');

-- Create an index for better performance when filtering by applicable_to
CREATE INDEX idx_categories_applicable_to ON public.categories USING GIN(applicable_to);
