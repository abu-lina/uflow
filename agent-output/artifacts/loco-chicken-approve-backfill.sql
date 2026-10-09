-- Loco Chicken brand backfill + bulk approval
-- Source of truth: ~/Downloads/providers_rows(1).sql  (export taken 2026-10-09 08:56)
-- Reference row (the one you approved):
--   85bcba36-fcfa-4572-ac7c-8293a7134372  Loco Chicken | Chemnitz Süd
--
-- UPDATE only. There is no INSERT, no UPSERT and no ON CONFLICT anywhere in
-- this file, so it cannot create a row. It is scoped to an explicit list of
-- 42 provider_ids AND a provider_name guard, so a mistyped UUID cannot reach
-- an unrelated provider.
--
-- What it writes (brand-level content, from the reference):
--   review_status, reviewed_by, reviewed_at, provider_description,
--   social_instagram, social_website, listing_type, show_address,
--   enrichment_eligible, and the 8 attribute flags.
--
-- What it deliberately does NOT touch:
--   provider_name                            -- carries the location, kept as-is
--   address_*, location_latitude/longitude   -- per-location, kept as-is
--   created_at, user_created_id, import_source, import_source_id,
--   import_source_url, last_enriched_at      -- provenance
--   updated_at                               -- set by trigger_providers_updated_at
--   provider_images, category_id, contact_email, contact_phone,
--   provider_owner_id, recommender_email, opening_hours, review_feedback
--       The reference is NULL on every one of these. Writing its NULLs would
--       wipe anything added since the 08:56 export and gain nothing.
--
-- One substitution, flagged: social_website is NULL on the reference, but the
-- joinhalal Muenchen row carries the real brand URL https://loco-chicken.com/.
-- Backfilling that across all 42 is the non-destructive reading of "backfill
-- everything"; copying the reference's NULL would have destroyed a real URL.
-- Delete that single line if you would rather leave websites untouched.
--
-- reviewed_at / reviewed_by are copied from the reference rather than set to
-- now(), which makes this file idempotent: re-running changes nothing except
-- the trigger-managed updated_at.


-- ===========================================================================
-- STEP 1 - pre-flight. Read-only. Run these and check the output.
-- ===========================================================================

-- 1a. Current state of the 42 targets. Expect: pending 41, approved 1.
SELECT review_status, count(*) AS rows
FROM public.providers
WHERE provider_id IN (
    '85bcba36-fcfa-4572-ac7c-8293a7134372',  -- Loco Chicken | Chemnitz Süd
    '8af29c32-8c29-40b2-aa2d-c77b16f484b5',  -- Loco Chicken | München
    '5b4c0d4c-5c2d-46a0-9d21-592fdcea53b4',  -- Loco Chicken | Würzburg
    '60acf669-1e6a-4376-825e-b865bcb7ac45',  -- Loco Chicken | Wiesbaden Kirchgasse
    '41ae4c3d-5ed9-4ffe-9b1f-9a2af865fec1',  -- Loco Chicken | Warschauer Brücke
    'b9a095dc-4b86-45e9-9782-e87cff994b4f',  -- Loco Chicken | Ulm
    '24ca917d-fc0c-4316-b59e-2bffafb65180',  -- Loco Chicken | Osnabrück Mitte
    '664d6540-1fc6-43f1-bec7-4c028c6aa94b',  -- Loco Chicken | Offenbach Waldstraße
    'b2db8db2-f52f-44d1-8169-99d92ab00193',  -- Loco Chicken | Bielefeld
    'ebe3155f-b8ba-4983-a1e7-d9071590928a',  -- Loco Chicken | Oberhausen
    '95a20c16-e2ca-42a3-a0b1-e6825aa0e537',  -- Loco Chicken | Nürnberg Gartenstadt
    'bce3e2ff-bc6d-4921-b601-487fa123ec92',  -- Loco Chicken Nürnberg
    'e86acfb6-f085-4868-a1db-34713d783bf1',  -- Loco Chicken |  München Giesing
    'f50c2444-b4d9-44db-ba1d-5bbe48eff9c3',  -- Loco Chicken Moenchengladbach
    '96e0a46a-ae50-4045-aaff-bb3c3abb20f8',  -- Loco Chicken Mannheim
    'c1f2b056-3201-45b3-a99a-5084f88ae086',  -- Loco Chicken | Madgeburg-Stadtfeld Ost
    '4f2e40ce-04bd-4e80-92de-fc53d0183ffb',  -- Loco Chicken Magdeburg Alte-Neustadt
    '5f16892e-d4a8-47c9-8dc6-71a1d9ce6726',  -- Loco Chicken | Ludwigshafen-Süd
    '4af06329-9742-4a78-96ac-80469a93ceab',  -- Loco Chicken | Leipzig HBF
    '98892f29-da37-4576-8b2f-491230d03c36',  -- Loco Chicken | Leipzig-Connewitz
    '02c7f30f-95ec-46c2-83ee-87dfc782db02',  -- Loco Chicken | Krefeld Mitte
    '9ad20a7a-e152-4799-afc2-8d9600de3055',  -- Loco Chicken Köln Bickendorf
    'a9b1aec9-0f86-40e6-921d-c8b90fa5fc1e',  -- Loco Chicken | Kiel Mitte
    '19cbf181-f4fc-4d45-bd2e-073c6dff4283',  -- Loco Chicken Heilbronn
    'df62d4af-05d7-4eb5-bd1b-56ae10c5c4e0',  -- Loco Chicken | Hannover Linden
    '540de30a-1e29-45c3-bf92-2d46e29d3db9',  -- Loco Chicken Hannover
    'bdc02b9d-47e5-4b0e-af38-76526b3ffd88',  -- Loco Chicken | Hamburg Dulsberg
    '22465f1d-dbc0-44ff-b7b8-ef9c635bf8a7',  -- Loco Chicken | Potsdam-Babelsberg
    'f1fab2a3-4f96-4a51-9d6a-9e983adfaa2e',  -- Loco Chicken Freiburg Nord
    '43beedda-9a7d-48ec-936c-7c8fcab4a83c',  -- Loco Chicken Frankfurt Bergerstr.
    'f21b67a9-6671-4c89-a1b7-7f9ac7214b86',  -- Loco Chicken | Frankfurt am Main Westhafen
    'ade9cc99-7b8a-412c-a0da-0e4673573bc1',  -- Loco Chicken Erfurt
    '5b22b5ac-acae-4410-90a3-cdc84e1e5333',  -- Loco Chicken Düsseldorf Altstadt
    '38f873f5-2958-4723-bc4d-583f946778d0',  -- Loco Chicken | Dresden Vorstadt
    '81666ba6-a051-4704-a61a-87c4862a9f87',  -- Loco Chicken Dortmund
    '85ce325c-3f59-4639-87da-cb0c38b36873',  -- Loco Chicken | Chemnitz Nord
    '49d6dbef-239f-4aa6-99d2-bd0fcce0b6a3',  -- Loco Chicken | Bremen Findorff
    '4fcae773-5569-4a71-a394-9c26a865b409',  -- Loco Chicken | Bremen
    '6c76e40e-af79-4449-a07a-f7ae10d373ce',  -- Loco Chicken | Bonn Zentrum
    '46bcdc34-4faa-4a02-8b32-cb4015530580',  -- Loco Chicken | Bochum
    '5b21c9f5-bf40-4b22-8b83-0699da0fb6cb',  -- Loco Chicken Berlin Mitte
    '673091fe-a9fb-45e9-b4a2-0b13136005a7'  -- Loco Chicken | Aachen Adalbertstraße
)
GROUP BY review_status
ORDER BY review_status;

-- 1b. Any Loco Chicken row in the DB that is NOT in your approved export.
--     Expect zero rows. Anything returned here was created after the 08:56
--     export and is intentionally out of scope.
SELECT provider_id, provider_name, review_status, import_source, created_at
FROM public.providers
WHERE provider_name ILIKE '%loco chicken%'
  AND provider_id NOT IN (
    '85bcba36-fcfa-4572-ac7c-8293a7134372',  -- Loco Chicken | Chemnitz Süd
    '8af29c32-8c29-40b2-aa2d-c77b16f484b5',  -- Loco Chicken | München
    '5b4c0d4c-5c2d-46a0-9d21-592fdcea53b4',  -- Loco Chicken | Würzburg
    '60acf669-1e6a-4376-825e-b865bcb7ac45',  -- Loco Chicken | Wiesbaden Kirchgasse
    '41ae4c3d-5ed9-4ffe-9b1f-9a2af865fec1',  -- Loco Chicken | Warschauer Brücke
    'b9a095dc-4b86-45e9-9782-e87cff994b4f',  -- Loco Chicken | Ulm
    '24ca917d-fc0c-4316-b59e-2bffafb65180',  -- Loco Chicken | Osnabrück Mitte
    '664d6540-1fc6-43f1-bec7-4c028c6aa94b',  -- Loco Chicken | Offenbach Waldstraße
    'b2db8db2-f52f-44d1-8169-99d92ab00193',  -- Loco Chicken | Bielefeld
    'ebe3155f-b8ba-4983-a1e7-d9071590928a',  -- Loco Chicken | Oberhausen
    '95a20c16-e2ca-42a3-a0b1-e6825aa0e537',  -- Loco Chicken | Nürnberg Gartenstadt
    'bce3e2ff-bc6d-4921-b601-487fa123ec92',  -- Loco Chicken Nürnberg
    'e86acfb6-f085-4868-a1db-34713d783bf1',  -- Loco Chicken |  München Giesing
    'f50c2444-b4d9-44db-ba1d-5bbe48eff9c3',  -- Loco Chicken Moenchengladbach
    '96e0a46a-ae50-4045-aaff-bb3c3abb20f8',  -- Loco Chicken Mannheim
    'c1f2b056-3201-45b3-a99a-5084f88ae086',  -- Loco Chicken | Madgeburg-Stadtfeld Ost
    '4f2e40ce-04bd-4e80-92de-fc53d0183ffb',  -- Loco Chicken Magdeburg Alte-Neustadt
    '5f16892e-d4a8-47c9-8dc6-71a1d9ce6726',  -- Loco Chicken | Ludwigshafen-Süd
    '4af06329-9742-4a78-96ac-80469a93ceab',  -- Loco Chicken | Leipzig HBF
    '98892f29-da37-4576-8b2f-491230d03c36',  -- Loco Chicken | Leipzig-Connewitz
    '02c7f30f-95ec-46c2-83ee-87dfc782db02',  -- Loco Chicken | Krefeld Mitte
    '9ad20a7a-e152-4799-afc2-8d9600de3055',  -- Loco Chicken Köln Bickendorf
    'a9b1aec9-0f86-40e6-921d-c8b90fa5fc1e',  -- Loco Chicken | Kiel Mitte
    '19cbf181-f4fc-4d45-bd2e-073c6dff4283',  -- Loco Chicken Heilbronn
    'df62d4af-05d7-4eb5-bd1b-56ae10c5c4e0',  -- Loco Chicken | Hannover Linden
    '540de30a-1e29-45c3-bf92-2d46e29d3db9',  -- Loco Chicken Hannover
    'bdc02b9d-47e5-4b0e-af38-76526b3ffd88',  -- Loco Chicken | Hamburg Dulsberg
    '22465f1d-dbc0-44ff-b7b8-ef9c635bf8a7',  -- Loco Chicken | Potsdam-Babelsberg
    'f1fab2a3-4f96-4a51-9d6a-9e983adfaa2e',  -- Loco Chicken Freiburg Nord
    '43beedda-9a7d-48ec-936c-7c8fcab4a83c',  -- Loco Chicken Frankfurt Bergerstr.
    'f21b67a9-6671-4c89-a1b7-7f9ac7214b86',  -- Loco Chicken | Frankfurt am Main Westhafen
    'ade9cc99-7b8a-412c-a0da-0e4673573bc1',  -- Loco Chicken Erfurt
    '5b22b5ac-acae-4410-90a3-cdc84e1e5333',  -- Loco Chicken Düsseldorf Altstadt
    '38f873f5-2958-4723-bc4d-583f946778d0',  -- Loco Chicken | Dresden Vorstadt
    '81666ba6-a051-4704-a61a-87c4862a9f87',  -- Loco Chicken Dortmund
    '85ce325c-3f59-4639-87da-cb0c38b36873',  -- Loco Chicken | Chemnitz Nord
    '49d6dbef-239f-4aa6-99d2-bd0fcce0b6a3',  -- Loco Chicken | Bremen Findorff
    '4fcae773-5569-4a71-a394-9c26a865b409',  -- Loco Chicken | Bremen
    '6c76e40e-af79-4449-a07a-f7ae10d373ce',  -- Loco Chicken | Bonn Zentrum
    '46bcdc34-4faa-4a02-8b32-cb4015530580',  -- Loco Chicken | Bochum
    '5b21c9f5-bf40-4b22-8b83-0699da0fb6cb',  -- Loco Chicken Berlin Mitte
    '673091fe-a9fb-45e9-b4a2-0b13136005a7'  -- Loco Chicken | Aachen Adalbertstraße
)
ORDER BY created_at;


-- ===========================================================================
-- STEP 2 - the write. ROLLBACK instead of COMMIT if the count is not 42.
-- ===========================================================================

BEGIN;

UPDATE public.providers AS p
SET
  -- approval
  review_status        = 'approved'::public.review_status,
  reviewed_by          = 'e0f70c7c-7532-458c-b591-f23212c777ea'::uuid,
  reviewed_at          = '2026-10-09 06:33:38.4601+00'::timestamptz,

  -- brand content
  provider_description = 'Halal, extra big, 3 different flavors - SO LOCO🍗',
  social_instagram     = 'https://www.instagram.com/locochicken/',
  social_website       = 'https://loco-chicken.com/',

  -- listing config
  listing_type         = 'food'::public.listing_type_enum,
  show_address         = true,
  enrichment_eligible  = true,

  -- attribute flags
  muslim_owned         = false,
  has_prayer_space     = false,
  family_friendly      = false,
  women_friendly       = false,
  children_friendly    = false,
  makes_donations      = false,
  has_parking          = false,
  economic_solidarity  = false
WHERE p.provider_name ILIKE '%loco chicken%'
  AND p.provider_id IN (
    '85bcba36-fcfa-4572-ac7c-8293a7134372',  -- Loco Chicken | Chemnitz Süd
    '8af29c32-8c29-40b2-aa2d-c77b16f484b5',  -- Loco Chicken | München
    '5b4c0d4c-5c2d-46a0-9d21-592fdcea53b4',  -- Loco Chicken | Würzburg
    '60acf669-1e6a-4376-825e-b865bcb7ac45',  -- Loco Chicken | Wiesbaden Kirchgasse
    '41ae4c3d-5ed9-4ffe-9b1f-9a2af865fec1',  -- Loco Chicken | Warschauer Brücke
    'b9a095dc-4b86-45e9-9782-e87cff994b4f',  -- Loco Chicken | Ulm
    '24ca917d-fc0c-4316-b59e-2bffafb65180',  -- Loco Chicken | Osnabrück Mitte
    '664d6540-1fc6-43f1-bec7-4c028c6aa94b',  -- Loco Chicken | Offenbach Waldstraße
    'b2db8db2-f52f-44d1-8169-99d92ab00193',  -- Loco Chicken | Bielefeld
    'ebe3155f-b8ba-4983-a1e7-d9071590928a',  -- Loco Chicken | Oberhausen
    '95a20c16-e2ca-42a3-a0b1-e6825aa0e537',  -- Loco Chicken | Nürnberg Gartenstadt
    'bce3e2ff-bc6d-4921-b601-487fa123ec92',  -- Loco Chicken Nürnberg
    'e86acfb6-f085-4868-a1db-34713d783bf1',  -- Loco Chicken |  München Giesing
    'f50c2444-b4d9-44db-ba1d-5bbe48eff9c3',  -- Loco Chicken Moenchengladbach
    '96e0a46a-ae50-4045-aaff-bb3c3abb20f8',  -- Loco Chicken Mannheim
    'c1f2b056-3201-45b3-a99a-5084f88ae086',  -- Loco Chicken | Madgeburg-Stadtfeld Ost
    '4f2e40ce-04bd-4e80-92de-fc53d0183ffb',  -- Loco Chicken Magdeburg Alte-Neustadt
    '5f16892e-d4a8-47c9-8dc6-71a1d9ce6726',  -- Loco Chicken | Ludwigshafen-Süd
    '4af06329-9742-4a78-96ac-80469a93ceab',  -- Loco Chicken | Leipzig HBF
    '98892f29-da37-4576-8b2f-491230d03c36',  -- Loco Chicken | Leipzig-Connewitz
    '02c7f30f-95ec-46c2-83ee-87dfc782db02',  -- Loco Chicken | Krefeld Mitte
    '9ad20a7a-e152-4799-afc2-8d9600de3055',  -- Loco Chicken Köln Bickendorf
    'a9b1aec9-0f86-40e6-921d-c8b90fa5fc1e',  -- Loco Chicken | Kiel Mitte
    '19cbf181-f4fc-4d45-bd2e-073c6dff4283',  -- Loco Chicken Heilbronn
    'df62d4af-05d7-4eb5-bd1b-56ae10c5c4e0',  -- Loco Chicken | Hannover Linden
    '540de30a-1e29-45c3-bf92-2d46e29d3db9',  -- Loco Chicken Hannover
    'bdc02b9d-47e5-4b0e-af38-76526b3ffd88',  -- Loco Chicken | Hamburg Dulsberg
    '22465f1d-dbc0-44ff-b7b8-ef9c635bf8a7',  -- Loco Chicken | Potsdam-Babelsberg
    'f1fab2a3-4f96-4a51-9d6a-9e983adfaa2e',  -- Loco Chicken Freiburg Nord
    '43beedda-9a7d-48ec-936c-7c8fcab4a83c',  -- Loco Chicken Frankfurt Bergerstr.
    'f21b67a9-6671-4c89-a1b7-7f9ac7214b86',  -- Loco Chicken | Frankfurt am Main Westhafen
    'ade9cc99-7b8a-412c-a0da-0e4673573bc1',  -- Loco Chicken Erfurt
    '5b22b5ac-acae-4410-90a3-cdc84e1e5333',  -- Loco Chicken Düsseldorf Altstadt
    '38f873f5-2958-4723-bc4d-583f946778d0',  -- Loco Chicken | Dresden Vorstadt
    '81666ba6-a051-4704-a61a-87c4862a9f87',  -- Loco Chicken Dortmund
    '85ce325c-3f59-4639-87da-cb0c38b36873',  -- Loco Chicken | Chemnitz Nord
    '49d6dbef-239f-4aa6-99d2-bd0fcce0b6a3',  -- Loco Chicken | Bremen Findorff
    '4fcae773-5569-4a71-a394-9c26a865b409',  -- Loco Chicken | Bremen
    '6c76e40e-af79-4449-a07a-f7ae10d373ce',  -- Loco Chicken | Bonn Zentrum
    '46bcdc34-4faa-4a02-8b32-cb4015530580',  -- Loco Chicken | Bochum
    '5b21c9f5-bf40-4b22-8b83-0699da0fb6cb',  -- Loco Chicken Berlin Mitte
    '673091fe-a9fb-45e9-b4a2-0b13136005a7'  -- Loco Chicken | Aachen Adalbertstraße
);

-- Expect: UPDATE 42
COMMIT;


-- ===========================================================================
-- STEP 3 - verification. Read-only.
-- ===========================================================================

-- 3a. All 42 approved and sharing one description / instagram / website.
--     Expect exactly ONE row back, with rows = 42.
SELECT review_status,
       provider_description,
       social_instagram,
       social_website,
       listing_type,
       count(*) AS rows
FROM public.providers
WHERE provider_id IN (
    '85bcba36-fcfa-4572-ac7c-8293a7134372',  -- Loco Chicken | Chemnitz Süd
    '8af29c32-8c29-40b2-aa2d-c77b16f484b5',  -- Loco Chicken | München
    '5b4c0d4c-5c2d-46a0-9d21-592fdcea53b4',  -- Loco Chicken | Würzburg
    '60acf669-1e6a-4376-825e-b865bcb7ac45',  -- Loco Chicken | Wiesbaden Kirchgasse
    '41ae4c3d-5ed9-4ffe-9b1f-9a2af865fec1',  -- Loco Chicken | Warschauer Brücke
    'b9a095dc-4b86-45e9-9782-e87cff994b4f',  -- Loco Chicken | Ulm
    '24ca917d-fc0c-4316-b59e-2bffafb65180',  -- Loco Chicken | Osnabrück Mitte
    '664d6540-1fc6-43f1-bec7-4c028c6aa94b',  -- Loco Chicken | Offenbach Waldstraße
    'b2db8db2-f52f-44d1-8169-99d92ab00193',  -- Loco Chicken | Bielefeld
    'ebe3155f-b8ba-4983-a1e7-d9071590928a',  -- Loco Chicken | Oberhausen
    '95a20c16-e2ca-42a3-a0b1-e6825aa0e537',  -- Loco Chicken | Nürnberg Gartenstadt
    'bce3e2ff-bc6d-4921-b601-487fa123ec92',  -- Loco Chicken Nürnberg
    'e86acfb6-f085-4868-a1db-34713d783bf1',  -- Loco Chicken |  München Giesing
    'f50c2444-b4d9-44db-ba1d-5bbe48eff9c3',  -- Loco Chicken Moenchengladbach
    '96e0a46a-ae50-4045-aaff-bb3c3abb20f8',  -- Loco Chicken Mannheim
    'c1f2b056-3201-45b3-a99a-5084f88ae086',  -- Loco Chicken | Madgeburg-Stadtfeld Ost
    '4f2e40ce-04bd-4e80-92de-fc53d0183ffb',  -- Loco Chicken Magdeburg Alte-Neustadt
    '5f16892e-d4a8-47c9-8dc6-71a1d9ce6726',  -- Loco Chicken | Ludwigshafen-Süd
    '4af06329-9742-4a78-96ac-80469a93ceab',  -- Loco Chicken | Leipzig HBF
    '98892f29-da37-4576-8b2f-491230d03c36',  -- Loco Chicken | Leipzig-Connewitz
    '02c7f30f-95ec-46c2-83ee-87dfc782db02',  -- Loco Chicken | Krefeld Mitte
    '9ad20a7a-e152-4799-afc2-8d9600de3055',  -- Loco Chicken Köln Bickendorf
    'a9b1aec9-0f86-40e6-921d-c8b90fa5fc1e',  -- Loco Chicken | Kiel Mitte
    '19cbf181-f4fc-4d45-bd2e-073c6dff4283',  -- Loco Chicken Heilbronn
    'df62d4af-05d7-4eb5-bd1b-56ae10c5c4e0',  -- Loco Chicken | Hannover Linden
    '540de30a-1e29-45c3-bf92-2d46e29d3db9',  -- Loco Chicken Hannover
    'bdc02b9d-47e5-4b0e-af38-76526b3ffd88',  -- Loco Chicken | Hamburg Dulsberg
    '22465f1d-dbc0-44ff-b7b8-ef9c635bf8a7',  -- Loco Chicken | Potsdam-Babelsberg
    'f1fab2a3-4f96-4a51-9d6a-9e983adfaa2e',  -- Loco Chicken Freiburg Nord
    '43beedda-9a7d-48ec-936c-7c8fcab4a83c',  -- Loco Chicken Frankfurt Bergerstr.
    'f21b67a9-6671-4c89-a1b7-7f9ac7214b86',  -- Loco Chicken | Frankfurt am Main Westhafen
    'ade9cc99-7b8a-412c-a0da-0e4673573bc1',  -- Loco Chicken Erfurt
    '5b22b5ac-acae-4410-90a3-cdc84e1e5333',  -- Loco Chicken Düsseldorf Altstadt
    '38f873f5-2958-4723-bc4d-583f946778d0',  -- Loco Chicken | Dresden Vorstadt
    '81666ba6-a051-4704-a61a-87c4862a9f87',  -- Loco Chicken Dortmund
    '85ce325c-3f59-4639-87da-cb0c38b36873',  -- Loco Chicken | Chemnitz Nord
    '49d6dbef-239f-4aa6-99d2-bd0fcce0b6a3',  -- Loco Chicken | Bremen Findorff
    '4fcae773-5569-4a71-a394-9c26a865b409',  -- Loco Chicken | Bremen
    '6c76e40e-af79-4449-a07a-f7ae10d373ce',  -- Loco Chicken | Bonn Zentrum
    '46bcdc34-4faa-4a02-8b32-cb4015530580',  -- Loco Chicken | Bochum
    '5b21c9f5-bf40-4b22-8b83-0699da0fb6cb',  -- Loco Chicken Berlin Mitte
    '673091fe-a9fb-45e9-b4a2-0b13136005a7'  -- Loco Chicken | Aachen Adalbertstraße
)
GROUP BY 1, 2, 3, 4, 5;

-- 3b. Proof nothing was created: still exactly 42 Loco Chicken rows.
SELECT count(*) AS total_loco_chicken_rows
FROM public.providers
WHERE provider_name ILIKE '%loco chicken%';

-- 3c. Names and real addresses untouched. Expect the same 4 rows as before,
--     now approved, with streets and zips intact.
SELECT provider_name, address_street, address_zip, address_city, review_status
FROM public.providers
WHERE provider_id IN (
    '85bcba36-fcfa-4572-ac7c-8293a7134372',  -- Loco Chicken | Chemnitz Süd
    '8af29c32-8c29-40b2-aa2d-c77b16f484b5',  -- Loco Chicken | München
    '5b4c0d4c-5c2d-46a0-9d21-592fdcea53b4',  -- Loco Chicken | Würzburg
    '60acf669-1e6a-4376-825e-b865bcb7ac45',  -- Loco Chicken | Wiesbaden Kirchgasse
    '41ae4c3d-5ed9-4ffe-9b1f-9a2af865fec1',  -- Loco Chicken | Warschauer Brücke
    'b9a095dc-4b86-45e9-9782-e87cff994b4f',  -- Loco Chicken | Ulm
    '24ca917d-fc0c-4316-b59e-2bffafb65180',  -- Loco Chicken | Osnabrück Mitte
    '664d6540-1fc6-43f1-bec7-4c028c6aa94b',  -- Loco Chicken | Offenbach Waldstraße
    'b2db8db2-f52f-44d1-8169-99d92ab00193',  -- Loco Chicken | Bielefeld
    'ebe3155f-b8ba-4983-a1e7-d9071590928a',  -- Loco Chicken | Oberhausen
    '95a20c16-e2ca-42a3-a0b1-e6825aa0e537',  -- Loco Chicken | Nürnberg Gartenstadt
    'bce3e2ff-bc6d-4921-b601-487fa123ec92',  -- Loco Chicken Nürnberg
    'e86acfb6-f085-4868-a1db-34713d783bf1',  -- Loco Chicken |  München Giesing
    'f50c2444-b4d9-44db-ba1d-5bbe48eff9c3',  -- Loco Chicken Moenchengladbach
    '96e0a46a-ae50-4045-aaff-bb3c3abb20f8',  -- Loco Chicken Mannheim
    'c1f2b056-3201-45b3-a99a-5084f88ae086',  -- Loco Chicken | Madgeburg-Stadtfeld Ost
    '4f2e40ce-04bd-4e80-92de-fc53d0183ffb',  -- Loco Chicken Magdeburg Alte-Neustadt
    '5f16892e-d4a8-47c9-8dc6-71a1d9ce6726',  -- Loco Chicken | Ludwigshafen-Süd
    '4af06329-9742-4a78-96ac-80469a93ceab',  -- Loco Chicken | Leipzig HBF
    '98892f29-da37-4576-8b2f-491230d03c36',  -- Loco Chicken | Leipzig-Connewitz
    '02c7f30f-95ec-46c2-83ee-87dfc782db02',  -- Loco Chicken | Krefeld Mitte
    '9ad20a7a-e152-4799-afc2-8d9600de3055',  -- Loco Chicken Köln Bickendorf
    'a9b1aec9-0f86-40e6-921d-c8b90fa5fc1e',  -- Loco Chicken | Kiel Mitte
    '19cbf181-f4fc-4d45-bd2e-073c6dff4283',  -- Loco Chicken Heilbronn
    'df62d4af-05d7-4eb5-bd1b-56ae10c5c4e0',  -- Loco Chicken | Hannover Linden
    '540de30a-1e29-45c3-bf92-2d46e29d3db9',  -- Loco Chicken Hannover
    'bdc02b9d-47e5-4b0e-af38-76526b3ffd88',  -- Loco Chicken | Hamburg Dulsberg
    '22465f1d-dbc0-44ff-b7b8-ef9c635bf8a7',  -- Loco Chicken | Potsdam-Babelsberg
    'f1fab2a3-4f96-4a51-9d6a-9e983adfaa2e',  -- Loco Chicken Freiburg Nord
    '43beedda-9a7d-48ec-936c-7c8fcab4a83c',  -- Loco Chicken Frankfurt Bergerstr.
    'f21b67a9-6671-4c89-a1b7-7f9ac7214b86',  -- Loco Chicken | Frankfurt am Main Westhafen
    'ade9cc99-7b8a-412c-a0da-0e4673573bc1',  -- Loco Chicken Erfurt
    '5b22b5ac-acae-4410-90a3-cdc84e1e5333',  -- Loco Chicken Düsseldorf Altstadt
    '38f873f5-2958-4723-bc4d-583f946778d0',  -- Loco Chicken | Dresden Vorstadt
    '81666ba6-a051-4704-a61a-87c4862a9f87',  -- Loco Chicken Dortmund
    '85ce325c-3f59-4639-87da-cb0c38b36873',  -- Loco Chicken | Chemnitz Nord
    '49d6dbef-239f-4aa6-99d2-bd0fcce0b6a3',  -- Loco Chicken | Bremen Findorff
    '4fcae773-5569-4a71-a394-9c26a865b409',  -- Loco Chicken | Bremen
    '6c76e40e-af79-4449-a07a-f7ae10d373ce',  -- Loco Chicken | Bonn Zentrum
    '46bcdc34-4faa-4a02-8b32-cb4015530580',  -- Loco Chicken | Bochum
    '5b21c9f5-bf40-4b22-8b83-0699da0fb6cb',  -- Loco Chicken Berlin Mitte
    '673091fe-a9fb-45e9-b4a2-0b13136005a7'  -- Loco Chicken | Aachen Adalbertstraße
)
  AND address_street <> 'This is a virtual venue'
ORDER BY provider_name;
