-- Add categories for Bäckerei and Uigurisch
-- Uses WHERE NOT EXISTS for idempotency (no unique constraint on name_de)

INSERT INTO public.categories (name_de, name_en, description_de, description_en, applicable_section)
SELECT 'Bäckerei', 'Bakery', 'Bäckereien, Konditoreien und Cafés', 'Bakeries, pastry shops and cafés', 'food'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name_de = 'Bäckerei');

INSERT INTO public.categories (name_de, name_en, description_de, description_en, applicable_section)
SELECT 'Uigurisch', 'Uyghur', 'Uigurische Küche – Laghman, Polo, Samsa und mehr', 'Uyghur cuisine – Laghman, Polo, Samsa and more', 'food'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name_de = 'Uigurisch');

-- Add "Desserts & Süßspeisen" (Desserts & Sweets) category under food section
INSERT INTO public.categories (name_de, name_en, description_de, description_en, applicable_section)
SELECT 'Desserts & Süßspeisen', 'Desserts & Sweets', 'Baklava, Eis, Pudding und andere Süßspeisen', 'Baklava, ice cream, pudding and other desserts', 'food'
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name_de = 'Desserts & Süßspeisen');
