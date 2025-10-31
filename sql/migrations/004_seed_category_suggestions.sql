-- =====================================================
-- SEED DATA FOR CATEGORY SUGGESTIONS
-- =====================================================
-- This migration populates the category_suggested_offers and 
-- category_suggested_needs tables with predefined suggestions

-- =====================================================
-- HELPER: Get category ID by name
-- =====================================================
-- We'll use this in the INSERT statements

-- =====================================================
-- 1. SEED OFFERS FOR EACH CATEGORY
-- =====================================================

-- First, ensure all the offers exist
INSERT INTO public.offers (name_de, name_en) VALUES 
  -- Food & Restaurant offers
  ('Catering', 'Catering'),
  ('Lieferung', 'Delivery'),
  ('Mittagstisch', 'Lunch Table'),
  ('Buffet', 'Buffet'),
  ('Events', 'Events'),
  ('Frühstück', 'Breakfast'),
  ('Brunch', 'Brunch'),
  ('Mittagessen', 'Lunch'),
  ('Abendessen', 'Dinner'),
  
  -- Education offers
  ('Kurse', 'Courses'),
  ('Workshops', 'Workshops'),
  ('Seminare', 'Seminars'),
  ('Nachhilfe', 'Tutoring'),
  ('Training', 'Training'),
  ('Webinare', 'Webinars'),
  ('Coaching', 'Coaching'),
  ('Mentoring', 'Mentoring'),
  ('Vorträge', 'Lectures'),
  ('Arabischkurse', 'Arabic Courses'),
  ('Islamunterricht', 'Islamic Education'),
  
  -- Health offers
  ('Beratung', 'Consultation'),
  ('Therapie', 'Therapy'),
  ('Diagnostik', 'Diagnostics'),
  ('Behandlung', 'Treatment'),
  ('Vorsorge', 'Prevention'),
  ('Fitness', 'Fitness'),
  ('Ernährungsberatung', 'Nutritional Counseling'),
  ('Physiotherapie', 'Physiotherapy'),
  ('Alternative Medizin', 'Alternative Medicine'),
  ('Massage', 'Massage'),
  ('Wellness', 'Wellness'),
  
  -- Technology offers
  ('Webentwicklung', 'Web Development'),
  ('App-Entwicklung', 'App Development'),
  ('IT-Support', 'IT Support'),
  ('Hosting', 'Hosting'),
  ('Softwareentwicklung', 'Software Development'),
  ('Datenanalyse', 'Data Analysis'),
  ('Cybersecurity', 'Cybersecurity'),
  ('Cloud-Lösungen', 'Cloud Solutions'),
  
  -- Clothing offers
  ('Kleidungsverkauf', 'Clothing Sales'),
  ('Maßanfertigung', 'Custom Tailoring'),
  ('Änderungsservice', 'Alteration Service'),
  ('Personal Styling', 'Personal Styling'),
  ('Online-Shop', 'Online Shop'),
  ('Modestrecken', 'Fashion Shows'),
  
  -- Crafts offers
  ('Reparatur', 'Repair'),
  ('Installation', 'Installation'),
  ('Wartung', 'Maintenance'),
  ('Renovierung', 'Renovation'),
  ('Notdienst', 'Emergency Service'),
  
  -- Transport offers
  ('Lieferservice', 'Delivery Service'),
  ('Umzüge', 'Moving'),
  ('Kurierdienst', 'Courier Service'),
  ('Lagerhaltung', 'Storage'),
  ('Expressversand', 'Express Shipping'),
  ('Möbeltransport', 'Furniture Transport'),
  ('Internationale Transporte', 'International Transport'),
  
  -- Real Estate offers
  ('Vermietung', 'Rental'),
  ('Verkauf', 'Sales'),
  ('Hausverwaltung', 'Property Management'),
  ('Immobilienbewertung', 'Property Valuation'),
  ('Finanzierung', 'Financing'),
  ('Maklerservice', 'Brokerage Service'),
  
  -- Donations offers
  ('Spendensammlung', 'Fundraising'),
  ('Wohltätigkeitsprojekte', 'Charity Projects'),
  ('Humanitäre Hilfe', 'Humanitarian Aid'),
  ('Bildungsprojekte', 'Education Projects'),
  ('Gesundheitsprojekte', 'Health Projects'),
  ('Infrastrukturprojekte', 'Infrastructure Projects'),
  
  -- General offers
  ('Support', 'Support'),
  ('Dienstleistungen', 'Services')
ON CONFLICT (name_de) DO NOTHING;

-- Now seed the needs
INSERT INTO public.needs (name_de, name_en) VALUES 
  -- Food & Restaurant needs
  ('Lebensmittellieferanten', 'Food Suppliers'),
  ('Koch', 'Chef'),
  ('Servicepersonal', 'Service Staff'),
  ('Marketing', 'Marketing'),
  ('Reinigungsdienst', 'Cleaning Service'),
  
  -- Education needs
  ('Dozenten', 'Lecturers'),
  ('Räumlichkeiten', 'Facilities'),
  ('Lehrmaterial', 'Teaching Materials'),
  ('IT-Equipment', 'IT Equipment'),
  ('Praktikanten', 'Interns'),
  
  -- Health needs
  ('Medizinische Geräte', 'Medical Equipment'),
  ('Praxisräume', 'Practice Rooms'),
  ('Fachpersonal', 'Skilled Staff'),
  ('Fortbildungen', 'Further Training'),
  ('IT-Lösungen', 'IT Solutions'),
  
  -- Technology needs
  ('Entwickler', 'Developers'),
  ('Designer', 'Designers'),
  ('Projektmanager', 'Project Managers'),
  ('Hardware', 'Hardware'),
  ('Büroräume', 'Office Space'),
  
  -- Clothing needs
  ('Schneider', 'Tailor'),
  ('Stoffe', 'Fabrics'),
  ('Verkaufspersonal', 'Sales Staff'),
  ('Fotografen', 'Photographers'),
  ('Ladenlokal', 'Store Location'),
  
  -- Crafts needs
  ('Material', 'Material'),
  ('Werkzeug', 'Tools'),
  ('Fahrzeuge', 'Vehicles'),
  ('Gesellen', 'Journeymen'),
  ('Lager', 'Warehouse'),
  
  -- Transport needs
  ('Fahrer', 'Drivers'),
  ('Lagerfläche', 'Storage Space'),
  ('Versicherung', 'Insurance'),
  ('GPS-Tracking', 'GPS Tracking'),
  ('Verpackungsmaterial', 'Packaging Material'),
  
  -- Real Estate needs
  ('Objekte', 'Properties'),
  ('Makler', 'Brokers'),
  ('Gutachter', 'Appraisers'),
  ('Renovierungsdienste', 'Renovation Services'),
  
  -- Donations needs
  ('Spender', 'Donors'),
  ('Freiwillige', 'Volunteers'),
  ('Verwaltungspersonal', 'Administrative Staff'),
  ('Transparenz-Tools', 'Transparency Tools'),
  ('Rechtliche Beratung', 'Legal Advice'),
  
  -- General needs
  ('Kooperationspartner', 'Cooperation Partners')
ON CONFLICT (name_de) DO NOTHING;

-- =====================================================
-- 2. CREATE SUGGESTIONS FOR FOOD & BEVERAGES CATEGORY
-- =====================================================

-- Insert suggested offers for "Lebensmittel & Getränke"
INSERT INTO public.category_suggested_offers (category_id, offer_id, priority)
SELECT 
  c.category_id,
  o.offer_id,
  CASE o.name_de
    WHEN 'Catering' THEN 10
    WHEN 'Lieferung' THEN 9
    WHEN 'Mittagstisch' THEN 8
    ELSE 5
  END as priority
FROM public.categories c
CROSS JOIN public.offers o
WHERE c.name_de IN ('Lebensmittel & Getränke', 'Lebensmittel')
  AND o.name_de IN ('Catering', 'Lieferung', 'Mittagstisch', 'Buffet', 'Events', 'Frühstück', 'Brunch', 'Mittagessen', 'Abendessen')
ON CONFLICT (category_id, offer_id) DO NOTHING;

-- Insert suggested needs for "Lebensmittel & Getränke"
INSERT INTO public.category_suggested_needs (category_id, need_id, priority)
SELECT 
  c.category_id,
  n.need_id,
  5 as priority
FROM public.categories c
CROSS JOIN public.needs n
WHERE c.name_de IN ('Lebensmittel & Getränke', 'Lebensmittel')
  AND n.name_de IN ('Lebensmittellieferanten', 'Koch', 'Servicepersonal', 'Marketing', 'Reinigungsdienst')
ON CONFLICT (category_id, need_id) DO NOTHING;

-- =====================================================
-- 3. CREATE SUGGESTIONS FOR EDUCATION CATEGORY
-- =====================================================

INSERT INTO public.category_suggested_offers (category_id, offer_id, priority)
SELECT 
  c.category_id,
  o.offer_id,
  CASE o.name_de
    WHEN 'Kurse' THEN 10
    WHEN 'Workshops' THEN 9
    WHEN 'Seminare' THEN 8
    ELSE 5
  END as priority
FROM public.categories c
CROSS JOIN public.offers o
WHERE c.name_de IN ('Bildung', 'Bildung & Lernen')
  AND o.name_de IN ('Kurse', 'Workshops', 'Seminare', 'Nachhilfe', 'Training', 'Webinare', 'Coaching', 'Mentoring', 'Vorträge', 'Arabischkurse', 'Islamunterricht')
ON CONFLICT (category_id, offer_id) DO NOTHING;

INSERT INTO public.category_suggested_needs (category_id, need_id, priority)
SELECT 
  c.category_id,
  n.need_id,
  5 as priority
FROM public.categories c
CROSS JOIN public.needs n
WHERE c.name_de IN ('Bildung', 'Bildung & Lernen')
  AND n.name_de IN ('Dozenten', 'Räumlichkeiten', 'Lehrmaterial', 'IT-Equipment', 'Marketing', 'Praktikanten')
ON CONFLICT (category_id, need_id) DO NOTHING;

-- =====================================================
-- 4. CREATE SUGGESTIONS FOR HEALTH CATEGORY
-- =====================================================

INSERT INTO public.category_suggested_offers (category_id, offer_id, priority)
SELECT 
  c.category_id,
  o.offer_id,
  5 as priority
FROM public.categories c
CROSS JOIN public.offers o
WHERE c.name_de IN ('Gesundheit', 'Gesundheit & Wellness', 'Gesundheitswesen')
  AND o.name_de IN ('Beratung', 'Therapie', 'Diagnostik', 'Behandlung', 'Vorsorge', 'Fitness', 'Ernährungsberatung', 'Physiotherapie', 'Alternative Medizin', 'Massage', 'Wellness')
ON CONFLICT (category_id, offer_id) DO NOTHING;

INSERT INTO public.category_suggested_needs (category_id, need_id, priority)
SELECT 
  c.category_id,
  n.need_id,
  5 as priority
FROM public.categories c
CROSS JOIN public.needs n
WHERE c.name_de IN ('Gesundheit', 'Gesundheit & Wellness', 'Gesundheitswesen')
  AND n.name_de IN ('Medizinische Geräte', 'Praxisräume', 'Fachpersonal', 'Fortbildungen', 'IT-Lösungen', 'Reinigungsdienst')
ON CONFLICT (category_id, need_id) DO NOTHING;

-- =====================================================
-- 5. CREATE SUGGESTIONS FOR TECHNOLOGY CATEGORY
-- =====================================================

INSERT INTO public.category_suggested_offers (category_id, offer_id, priority)
SELECT 
  c.category_id,
  o.offer_id,
  5 as priority
FROM public.categories c
CROSS JOIN public.offers o
WHERE c.name_de IN ('Technologie', 'Technologie & IT')
  AND o.name_de IN ('Webentwicklung', 'App-Entwicklung', 'IT-Support', 'Hosting', 'Beratung', 'Training', 'Softwareentwicklung', 'Datenanalyse', 'Cybersecurity', 'Cloud-Lösungen')
ON CONFLICT (category_id, offer_id) DO NOTHING;

INSERT INTO public.category_suggested_needs (category_id, need_id, priority)
SELECT 
  c.category_id,
  n.need_id,
  5 as priority
FROM public.categories c
CROSS JOIN public.needs n
WHERE c.name_de IN ('Technologie', 'Technologie & IT')
  AND n.name_de IN ('Entwickler', 'Designer', 'Projektmanager', 'Hardware', 'Büroräume', 'Marketing')
ON CONFLICT (category_id, need_id) DO NOTHING;

-- =====================================================
-- 6. CREATE SUGGESTIONS FOR OTHER CATEGORIES
-- =====================================================

-- Clothing & Fashion
INSERT INTO public.category_suggested_offers (category_id, offer_id, priority)
SELECT c.category_id, o.offer_id, 5
FROM public.categories c
CROSS JOIN public.offers o
WHERE c.name_de IN ('Kleidung', 'Kleidung & Mode')
  AND o.name_de IN ('Kleidungsverkauf', 'Maßanfertigung', 'Änderungsservice', 'Beratung', 'Personal Styling', 'Online-Shop', 'Modestrecken')
ON CONFLICT (category_id, offer_id) DO NOTHING;

INSERT INTO public.category_suggested_needs (category_id, need_id, priority)
SELECT c.category_id, n.need_id, 5
FROM public.categories c
CROSS JOIN public.needs n
WHERE c.name_de IN ('Kleidung', 'Kleidung & Mode')
  AND n.name_de IN ('Schneider', 'Stoffe', 'Verkaufspersonal', 'Marketing', 'Fotografen', 'Ladenlokal')
ON CONFLICT (category_id, need_id) DO NOTHING;

-- Crafts & Repair
INSERT INTO public.category_suggested_offers (category_id, offer_id, priority)
SELECT c.category_id, o.offer_id, 5
FROM public.categories c
CROSS JOIN public.offers o
WHERE c.name_de IN ('Handwerk', 'Handwerk & Reparatur')
  AND o.name_de IN ('Reparatur', 'Installation', 'Wartung', 'Beratung', 'Renovierung', 'Maßanfertigung', 'Notdienst')
ON CONFLICT (category_id, offer_id) DO NOTHING;

INSERT INTO public.category_suggested_needs (category_id, need_id, priority)
SELECT c.category_id, n.need_id, 5
FROM public.categories c
CROSS JOIN public.needs n
WHERE c.name_de IN ('Handwerk', 'Handwerk & Reparatur')
  AND n.name_de IN ('Material', 'Werkzeug', 'Fahrzeuge', 'Gesellen', 'Lager', 'Fortbildungen')
ON CONFLICT (category_id, need_id) DO NOTHING;

-- Transport & Logistics
INSERT INTO public.category_suggested_offers (category_id, offer_id, priority)
SELECT c.category_id, o.offer_id, 5
FROM public.categories c
CROSS JOIN public.offers o
WHERE c.name_de IN ('Transport', 'Transport & Logistik')
  AND o.name_de IN ('Lieferservice', 'Umzüge', 'Kurierdienst', 'Lagerhaltung', 'Expressversand', 'Möbeltransport', 'Internationale Transporte')
ON CONFLICT (category_id, offer_id) DO NOTHING;

INSERT INTO public.category_suggested_needs (category_id, need_id, priority)
SELECT c.category_id, n.need_id, 5
FROM public.categories c
CROSS JOIN public.needs n
WHERE c.name_de IN ('Transport', 'Transport & Logistik')
  AND n.name_de IN ('Fahrzeuge', 'Fahrer', 'Lagerfläche', 'Versicherung', 'GPS-Tracking', 'Verpackungsmaterial')
ON CONFLICT (category_id, need_id) DO NOTHING;

-- Real Estate
INSERT INTO public.category_suggested_offers (category_id, offer_id, priority)
SELECT c.category_id, o.offer_id, 5
FROM public.categories c
CROSS JOIN public.offers o
WHERE c.name_de IN ('Immobilien', 'Immobilien & Wohnen')
  AND o.name_de IN ('Vermietung', 'Verkauf', 'Beratung', 'Hausverwaltung', 'Immobilienbewertung', 'Finanzierung', 'Maklerservice')
ON CONFLICT (category_id, offer_id) DO NOTHING;

INSERT INTO public.category_suggested_needs (category_id, need_id, priority)
SELECT c.category_id, n.need_id, 5
FROM public.categories c
CROSS JOIN public.needs n
WHERE c.name_de IN ('Immobilien', 'Immobilien & Wohnen')
  AND n.name_de IN ('Objekte', 'Makler', 'Gutachter', 'Marketing', 'Renovierungsdienste', 'Fotografen')
ON CONFLICT (category_id, need_id) DO NOTHING;

-- Donations
INSERT INTO public.category_suggested_offers (category_id, offer_id, priority)
SELECT c.category_id, o.offer_id, 5
FROM public.categories c
CROSS JOIN public.offers o
WHERE c.name_de IN ('Spenden', 'Spenden-Projekte')
  AND o.name_de IN ('Spendensammlung', 'Wohltätigkeitsprojekte', 'Humanitäre Hilfe', 'Bildungsprojekte', 'Gesundheitsprojekte', 'Infrastrukturprojekte')
ON CONFLICT (category_id, offer_id) DO NOTHING;

INSERT INTO public.category_suggested_needs (category_id, need_id, priority)
SELECT c.category_id, n.need_id, 5
FROM public.categories c
CROSS JOIN public.needs n
WHERE c.name_de IN ('Spenden', 'Spenden-Projekte')
  AND n.name_de IN ('Spender', 'Freiwillige', 'Marketing', 'Verwaltungspersonal', 'Transparenz-Tools', 'Rechtliche Beratung')
ON CONFLICT (category_id, need_id) DO NOTHING;

-- Other / General
INSERT INTO public.category_suggested_offers (category_id, offer_id, priority)
SELECT c.category_id, o.offer_id, 5
FROM public.categories c
CROSS JOIN public.offers o
WHERE c.name_de = 'Sonstiges'
  AND o.name_de IN ('Beratung', 'Support', 'Dienstleistungen')
ON CONFLICT (category_id, offer_id) DO NOTHING;

INSERT INTO public.category_suggested_needs (category_id, need_id, priority)
SELECT c.category_id, n.need_id, 5
FROM public.categories c
CROSS JOIN public.needs n
WHERE c.name_de = 'Sonstiges'
  AND n.name_de IN ('Kooperationspartner', 'Marketing', 'Beratung')
ON CONFLICT (category_id, need_id) DO NOTHING;

