-- =====================================================
-- FIX OFFER CATEGORIZATIONS
-- =====================================================
-- This migration reassigns offers that are incorrectly
-- categorized as "Sonstiges" (Other) to their proper categories
-- =====================================================

-- Get category IDs dynamically
DO $$
DECLARE
    v_essen_category_id UUID := (SELECT category_id FROM public.categories WHERE LOWER(name_de) LIKE '%essen%' AND LOWER(name_de) LIKE '%trinken%' LIMIT 1);
    v_bildung_category_id UUID := (SELECT category_id FROM public.categories WHERE LOWER(name_de) LIKE '%bildung%' OR LOWER(name_de) LIKE '%lernen%' LIMIT 1);
    v_kleidung_category_id UUID := (SELECT category_id FROM public.categories WHERE LOWER(name_de) LIKE '%kleidung%' OR LOWER(name_de) LIKE '%mode%' LIMIT 1);
    v_gesundheit_category_id UUID := (SELECT category_id FROM public.categories WHERE LOWER(name_de) LIKE '%gesundheit%' OR LOWER(name_de) LIKE '%sport%' LIMIT 1);
    v_handwerk_category_id UUID := (SELECT category_id FROM public.categories WHERE LOWER(name_de) LIKE '%handwerk%' OR LOWER(name_de) LIKE '%reparatur%' LIMIT 1);
    v_dienstleistungen_category_id UUID := (SELECT category_id FROM public.categories WHERE LOWER(name_de) LIKE '%dienstleistung%' LIMIT 1);
    v_gemeinschaft_category_id UUID := (SELECT category_id FROM public.categories WHERE LOWER(name_de) LIKE '%gemeinschaft%' OR LOWER(name_de) LIKE '%spenden%' LIMIT 1);
    v_sonstiges_category_id UUID := '5e5d910d-d790-4184-a061-9cd74d0950e8'; -- Known ID for Sonstiges
BEGIN
    -- =====================================================
    -- ESSEN & TRINKEN (Food & Beverages)
    -- =====================================================
    UPDATE public.offers
    SET category_id = v_essen_category_id
    WHERE offer_id IN (
        'd998eeea-69d1-4e8f-a2d1-c3977a30fc81', -- Abendessen
        '959bd7eb-a2a2-47d9-8fd5-59b618fa1de0', -- Brunch
        '8b2a9ac4-ff26-44d0-8726-741b43ac94ce', -- Buffet
        '492259b1-a497-4524-84f6-1afe7b37e3c8', -- Burger
        '7aa29f85-461f-4859-9d58-c40bb7558c23', -- Catering
        '83328c89-2078-4d5e-a545-6027cccc88f4', -- Essen
        '79f70da0-b22f-4dae-9dad-1547e33f3be7', -- Frühstück
        'c9e16e26-f5f0-4eff-924f-a3866fa7ec64', -- Gebäck
        '02d949ef-db9a-4648-8be9-ab8988be4004', -- Gegrilltes
        '339b384c-a02d-4deb-8d86-d11582f0b231', -- Kaffe
        '2a100add-c500-48e1-8ceb-00f5fccfb224', -- Kaffee
        '062e52dc-057f-4c9b-8598-364bb24164a5', -- Kuchen
        'b0cd7afd-65fa-4964-a1b1-acf5ef39e530', -- Mittagessen
        '550d3830-f088-409d-8f66-e3ca890e999f', -- Mittagstisch
        '9dcfdf69-9fb7-497f-a278-d135faa77ae5', -- Metzgerei (Halal)
        '18918572-0959-4ab0-be61-31aec842f0bd', -- Obst/Gemüse
        '6bb25cc1-862e-4755-a64f-b6a8c4b7b250', -- Pide/Pizza
        'db8cb613-d65d-4bbe-ad40-a8939fa95fd3'  -- Pommes
    )
    AND category_id = v_sonstiges_category_id;

    -- =====================================================
    -- BILDUNG & LERNEN (Education)
    -- =====================================================
    UPDATE public.offers
    SET category_id = v_bildung_category_id
    WHERE offer_id IN (
        '7eb47122-1572-47d1-b068-7bd3e701179a', -- 5 Gebete
        'db3e43a2-4a52-45b9-aa70-a089e3ace5c4', -- Arabischkurse
        '9474d796-b061-4665-8998-a21b164b8d58', -- Coaching
        '8ebb4b6d-afcf-4114-a639-faeb92798664', -- Kurse
        '988b903c-3043-4741-870b-1492fbbff82f', -- Mentoring
        '1da34e33-8fc5-4031-bb98-b50d7eaee8fc', -- Nachhilfe
        '43a66b36-42a5-484b-a6a1-27b34754f8dc', -- Seminare
        '03c2921c-d601-4195-9663-fd604fef9b74', -- Training
        '082398b7-955b-4699-9af6-602deaf625c5', -- Vorträge
        '232e7829-b781-4dfc-8e1c-cac89813e837', -- Webinare
        '0065a204-5573-42d3-a1ea-e6e43188c8be', -- Islamunterricht
        'b706e4aa-2269-44e6-ace0-6e8651c6fb45'  -- Quran-Unterricht
    )
    AND category_id = v_sonstiges_category_id;

    -- =====================================================
    -- KLEIDUNG & MODE (Clothing & Fashion)
    -- =====================================================
    UPDATE public.offers
    SET category_id = v_kleidung_category_id
    WHERE offer_id IN (
        '6ab647ef-635b-4338-b47f-6d8714ab4405', -- Änderungsservice
        'fca1c404-3602-490e-a255-14d904e2b93e', -- Kleidungsverkauf
        '45dd485e-288f-4507-bcbc-f56764f1abc9', -- Modestrecken
        'a231672b-7c7d-44be-9979-e6c5d65f671d', -- Maßanfertigung
        'ae76ff6b-dfb3-43f7-b6b8-d5043ff204b5'  -- Personal Styling
    )
    AND category_id = v_sonstiges_category_id;
    
    -- Note: "Beratung" is generic and should stay in Dienstleistungen
    -- Note: "Online-Shop" could be clothing or general - keeping in Dienstleistungen for now

    -- =====================================================
    -- GESUNDHEIT & SPORT (Health & Sports)
    -- =====================================================
    UPDATE public.offers
    SET category_id = v_gesundheit_category_id
    WHERE offer_id IN (
        '4d60532f-ce61-4ce1-a3e5-8582ce3949ec', -- Alternative Medizin
        '8a930b21-0685-4d15-aaec-b65a34f7c373', -- Behandlung
        'abc47263-73c9-4312-ad8f-a47085b05f10', -- Chiropraktiker
        'cb1f9479-8dfb-4046-949a-52058ad89fb1', -- Diagnostik
        '4ee43f40-4ff9-42a8-9f88-3bf5b5f0a45f', -- Ernährungsberatung
        'e14ecdeb-0afa-4718-963d-34fdc32ed433', -- Fitness
        'd49ebd7f-86a5-4330-b2e7-8eed4d636dbe', -- Gesundheitsprojekte
        '91344474-7895-40e7-b81d-e750263b04ce', -- Heilpraktiker
        '55a48039-3182-4799-8dcf-ba3adc134ee4', -- Hijama (Schröpfen)
        '024bc403-0d31-4b00-ba0a-8e146448e8ac', -- Massage
        '70bb192d-82e3-4faf-9564-b894d2db2a69', -- Physiotherapie
        '752df867-5e9d-4b19-be04-4c442dea5c16', -- Therapie
        'd71bb98a-e2c6-4e52-bd76-09af5a7e46bb', -- Vorsorge
        'aa7cf98c-e8e0-43e5-9226-4fbf6a3f2610'  -- Wellness
    )
    AND category_id = v_sonstiges_category_id;

    -- =====================================================
    -- HANDWERK & REPARATUR (Crafts & Repair)
    -- =====================================================
    UPDATE public.offers
    SET category_id = v_handwerk_category_id
    WHERE offer_id IN (
        'e84b5a0e-4d78-4ad7-8e97-d4dfee474875', -- Austausch Fenster und Türen
        '9096be37-bd0d-4c5f-9a4e-4adf104790a9', -- Installation
        '6229535c-0a7b-4642-b803-a459bcc4adf5', -- Notdienst
        '5c5637b0-fc68-4594-b937-488c37563743', -- Renovierung
        'df4090e3-6fbf-4082-bf83-60ef6585a9db', -- Reparatur
        'ac46d1fa-d9c4-4dbb-9a41-50a638fef6b9', -- Rolläden
        '67db182e-c43c-485e-9c24-23a61869d854'  -- Wartung
    )
    AND category_id = v_sonstiges_category_id;

    -- =====================================================
    -- DIENSTLEISTUNGEN (Services)
    -- =====================================================
    UPDATE public.offers
    SET category_id = v_dienstleistungen_category_id
    WHERE offer_id IN (
        '76d38091-2da9-4821-94ba-3400780f9dce', -- Beratung (Generic consultation service)
        '896bdc0f-a61c-4785-8956-964a25794a08', -- App-Entwicklung
        '7ee293b5-5eed-4e8c-b5c2-c02cf568f07f', -- Cloud-Lösungen
        '310f55f7-20ab-48cc-8dec-14b64e9e53ce', -- Cybersecurity
        '165ac56c-0273-4edd-836b-aa0bf41957fc', -- Datenanalyse
        '2f29f0e1-eae6-40cf-ba05-d9c0416c062b', -- Dienstleistungen
        '3c82deb5-0694-41eb-8de9-99e7fe920cc3', -- Expressversand
        '923b6d1a-f9ad-4c53-b8fa-c12360eebeed', -- Finanzierung
        'b9a28088-1fb7-49df-b2ce-fa3bae22a101', -- Hausverwaltung
        'b70e7ec4-3e14-47b9-b631-0b575892b99d', -- Hosting
        'ef034f91-d63a-4ffd-9d32-ab4efed1de56', -- Immobilien
        '24bc8fad-5289-4564-9748-5af4e2c7dd0a', -- Immobilien Verkauf
        '9395c8d9-35b4-404d-a090-5344a546df9b', -- Immobilien Vermietung
        '0faff36b-7ddc-47a5-8d26-13d8d684ca94', -- Immobilienbewertung
        'aca26df3-2ca4-4b34-9b41-f77044dddf4b', -- Infrastrukturprojekte
        'bd0adb9c-5512-4cef-ba00-a6384383a1ef', -- Internationale Transporte
        '44136216-1d21-4172-bf46-1a75646de4c3', -- IT-Support
        '6da1dced-8218-4fe1-bfed-45f6d19e3448', -- Lagerhaltung
        '8318d745-387f-4139-8f1a-d526120f7ca1', -- Lieferservice
        '1cb6e7e3-55db-4222-a807-e0db6476144d', -- Lieferung
        'eaf9acfd-36ee-4038-8de3-8225c06f1bff', -- Logo-Design
        '6d5a92ba-59da-4c7b-b258-fbf50e28c65d', -- Maklerservice
        'a89a34e6-cc19-4f26-af93-d725574bd6bc', -- Networking
        'ede80678-ec8a-4529-b717-0e30ae4f60f4', -- Kurierdienst
        '8205e0d0-6b29-4a69-8d89-6f0edf653326', -- Softwareentwicklung
        '4887ca52-a17b-49c3-b418-1a5b89e0bd18', -- Support
        'c06c12fc-95dc-44e0-9b61-2baa857e564e', -- Transport
        'b7f97ca5-0fee-49e9-9c9d-216032e6331d', -- Umzüge
        '4a0638c3-4498-497b-87b0-3b63b5bd2464', -- Verkauf
        '32402ad2-0fa3-40ea-aaf3-7ebebbf0fd7b', -- Vermietung
        'df87baea-53e7-48ed-9d33-69ab17944d3d', -- Webentwicklung
        '38eb6ccb-ac6d-4182-9b89-6c5835a4743f'  -- Online-Shop (Generic, could be any product)
    )
    AND category_id = v_sonstiges_category_id;

    -- =====================================================
    -- GEMEINSCHAFT & SPENDEN (Community Support)
    -- =====================================================
    UPDATE public.offers
    SET category_id = v_gemeinschaft_category_id
    WHERE offer_id IN (
        '3739972c-cc55-4b74-9ad8-397152946b9f', -- Möglichkeit zum Beten
        'c3163354-963d-4fae-a3ae-a5e9e5cdda20', -- Dhikr
        '20107ab5-6d6e-48fa-83f6-a7e37246b567', -- Events
        'f9f6f4e5-9840-49d7-9bbf-065e7f8abaaf', -- Islamische Postkarten
        'b48abebb-5c87-4806-83ba-094655f180df', -- Postkarten
        '46222d01-255a-4fd1-9982-4c728bbdba09', -- Palestine
        'ab41159e-46bf-4b0e-ab58-1477bd8ca7ab', -- Spendensammlung
        '97183fe5-e4d1-45d9-9a96-45af05536dae', -- Wohltätigkeitsprojekte
        'b1e683d9-2f78-4323-90ac-02aa5014a290', -- Bildungsprojekte
        'f3d3478f-c18e-432c-9451-5f8a703a2666'  -- Humanitäre Hilfe (Note: This could be Services, but community support makes more sense)
    )
    AND category_id = v_sonstiges_category_id;

    -- Note: Some offers like "Beratung" (Consultation) could be in multiple categories
    -- Keeping it in its current category or assigning to Dienstleistungen if needed
    -- "Beratung" is currently in Kleidung category - consider moving to Dienstleistungen
    -- "Online-Shop" depends on what's being sold - keeping as Kleidung but could be Services
    
    -- Check for any remaining "Sonstiges" that should be categorized
    RAISE NOTICE 'Migration completed. Check for any remaining offers in Sonstiges category.';
END $$;

-- =====================================================
-- VERIFICATION QUERIES (Optional - uncomment to run)
-- =====================================================

-- See how many offers are in each category now
-- SELECT 
--     c.name_de as category_name,
--     COUNT(o.offer_id) as offer_count
-- FROM public.categories c
-- LEFT JOIN public.offers o ON c.category_id = o.category_id
-- GROUP BY c.category_id, c.name_de
-- ORDER BY offer_count DESC;

-- See remaining offers in Sonstiges (should be minimal)
-- SELECT 
--     o.offer_id,
--     o.name_de,
--     o.name_en
-- FROM public.offers o
-- WHERE o.category_id = '5e5d910d-d790-4184-a061-9cd74d0950e8'
-- ORDER BY o.name_de;

