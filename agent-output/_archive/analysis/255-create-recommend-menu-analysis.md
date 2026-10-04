---
ID: 255
Phase: GRILL (investigation + question generation)
Branch: feature/255-create-recommend-menu
Worktree: /Users/NARAFIQ/Projects/uflow-wt/255-create-recommend-menu/
Status: Draft — awaiting user answers
---

# 255: Create / Recommend menu — grill analysis

All file:line citations are from the worktree `/Users/NARAFIQ/Projects/uflow-wt/255-create-recommend-menu/` at `2674b96f` unless stated otherwise. DB facts come from live PostgREST introspection of the Supabase project `qrekonfhaenjdnjhwdum` (commands quoted in area 5).

**Headline**: five of the seven ACs describe code that already exists. The real work is (a) reachability of the "+" entry point, (b) halal questions in the _recommend_ flow, (c) showing the seal at the end, and (d) three latent bugs the grill turned up that will block or silently break the feature.

---

## Findings

### 1. The existing component (AC1)

**There is not one component, there are four overlapping ones, plus two entry routes and a dead redirect.**

| Route                                   | Component                                                             | Lines                                                              | Purpose                                                               |
| --------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `/create`                               | `src/app/(public)/create/page.tsx`                                    | 1–110                                                              | The create-vs-recommend chooser. Already exists.                      |
| `/create/basics` … `/create/media`      | `ProviderCreateForm` (mobile) + `UnifiedProviderCreateForm` (desktop) | `src/app/(public)/create/basics/page.tsx:157–192`                  | 6-step owner flow                                                     |
| `/create/recommend`                     | `StreamlinedRecommendForm`                                            | `src/features/providers/StreamlinedRecommendForm.tsx` (1726 lines) | 1-page recommend flow                                                 |
| `/create-quick`, `/create-quick/review` | `StreamlinedImportForm`                                               | 233 + 370 lines                                                    | Google/Instagram quick import, feature-flagged off in prod            |
| `/recommend-provider`                   | —                                                                     | `src/app/(public)/recommend-provider/page.tsx:7–32`                | Client-side `router.replace('/create/recommend')`. Pure redirect hop. |

`/create` (`page.tsx:21–31`) routes:

- "own provider" → `/create/basics` (owner mode)
- "recommend" → `/recommend-provider` → `/create/recommend` (two hops for no reason)
- "Quick Import (Beta)" → `/create-quick`, gated by `getFeatureFlag('enableQuickImport')` (`page.tsx:19,53`), which is `false` in `env.production.template:91` and `true` in local `.env.local:63`

**Fields collected — owner flow** (`src/providers/form-provider.tsx:7–63`, persisted to `localStorage` key `providerFormData`):
title, category, description, isOnlineBusiness, street, zip, city, country, lat, lng, showAddress, website, instagram, phone, email, offers_ids, needs_ids, images, selectedCommunityServiceIds, tags, socialCategory/Title/Description, no_alcohol, no_pork, no_gambling, verification_method, has_certificate, certificate_file, certificate_url.

**Fields collected — recommend flow** (`StreamlinedRecommendForm.tsx:158–172`): title, category, city, offers_ids, email, phone, website, instagram, userEmail, message. **No halal fields at all.**

**Validation**: no schema library on either public flow. Owner flow validates ad hoc per page. Recommend flow is one `useMemo` boolean (`StreamlinedRecommendForm.tsx:997–1017`): title + category + city selected, AND at least one of email/phone/website/instagram non-empty. Errors surface as `toast.error` on submit (`:1070–1081`). Compare the admin side, which _does_ use Zod (`src/lib/validations/adminSchemas.ts`, used by `src/app/api/admin/review-provider/route.ts:76`).

**Deviations from this repo's own documented standards** (not generic advice):

| Standard                                                                                                                                    | Where it is written                                                        | Violation                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lucide for all icons, no other libraries                                                                                                    | `docs/design/ICON_USAGE_STANDARDS.md:3–7`                                  | `/create` and the halal page use `@iconify/react` `Icon` with `mdi:*` / `material-symbols:*` (`create/page.tsx:5,58`; `create/halal/page.tsx:6,27–32`)                                                                                                                                                                                                             |
| Icon size tokens `w-icon-md` etc.                                                                                                           | `docs/design/ICON_USAGE_STANDARDS.md:15–29`                                | raw `h-5 w-5`, `h-6 w-6` throughout the create flow                                                                                                                                                                                                                                                                                                                |
| No mega-components; extract responsibilities; method > 50 lines is a smell                                                                  | `.opencode/skills/engineering-standards/SKILL.md` (SRP detection patterns) | `StreamlinedRecommendForm.tsx` 1726 lines, `StreamlinedImportForm.tsx` 1519 lines. The two share the OSM autocomplete, city autocomplete, ContactCheckbox and success screen by copy-paste, not extraction.                                                                                                                                                        |
| No hardcoded user-visible strings (the i18n rule Plan 253 calls "rule 6k", `agent-output/planning/253-desktop-header-ownership-plan.md:59`) | —                                                                          | `create/halal/page.tsx` is **entirely German hardcoded**: "Bezeugst du bei Allah…" (:100), "Kein Alkohol" (:68), "Verifizierungsmethode" (:133), "Halal-Zertifikat" (:178), the tier explainer (:250–252). `recommend-provider/page.tsx:28` "Weiterleitung…". `ProviderDetailSections.tsx:264–265` "Not halal" / "Admin only".                                     |
| Semantic colour tokens                                                                                                                      | `docs/design/ICON_USAGE_STANDARDS.md` colour section                       | hex literals throughout: `#7A7A7A`, `#232323`, `#E5E5E5`, `#D4D4D4`, `#272727`, `#999999` (`create/page.tsx:47`, `create/halal/page.tsx:98,109,114,120,124`)                                                                                                                                                                                                       |
| DRY                                                                                                                                         | engineering-standards SKILL.md                                             | `createProviderOrService` is called from **four** places with different argument conventions: `create/contact/page.tsx:97` (recommend mode submits here), `create/media/page.tsx:99` (owner mode submits here), `StreamlinedRecommendForm.tsx:1118`, `StreamlinedImportForm.tsx:928`, `UnifiedProviderCreateForm.tsx:190`. Two live submit endpoints for one flow. |
| Frontend rule: required states loading/error/empty                                                                                          | `.cursor/rules/frontend-expert.mdc:14`                                     | `/create` has no error or loading state at all; the halal page has a bare `<div>Loading</div>` (`create/halal/page.tsx:36`)                                                                                                                                                                                                                                        |

**Three latent bugs in the existing component** (see area 5 for the DB evidence):

1. **`ProviderCreateForm.handleSubmit` writes columns that do not exist.** `src/features/providers/ProviderCreateForm.tsx:213–234` inserts `offers_ids` and `needs_ids` into `providers`. Live schema has no such columns (area 5). It also omits `listing_type` (NOT NULL, no default). This submit path appears mostly unreachable (`/create/basics` passes `onNextStep`, so step 0 navigates away, `ProviderCreateForm.tsx:284–297`) but the code is live and will 400 if ever reached.
2. **`createProviderOrService` omits `listing_type` on the provider branch.** `src/features/providers/services/mutations.ts:257–303` builds `insertData` with no `listing_type`; `resolveListingType()` is only called _after_ the insert, at `:330`, and `listing_type: 'ummah'` is set only on the community-service branch at `:183`. `providers.listing_type` is NOT NULL with no default (`supabase/migrations/0061_phase4_semantic_constraints.sql:95–96`; `085_m7_advisory_comments.sql:7–10`; confirmed live, area 5). **Verify before building: this is either a hard 400 on every public create/recommend submit, or there is an undocumented trigger.** Corroborating evidence that it is broken: `providers.recommender_email` is non-null on **0 of 941** rows, i.e. no anonymous recommendation has ever landed.
3. **`create-quick/review/page.tsx:74–87`** also omits `listing_type` and sets `provider_owner_id: user.id` unconditionally with the comment "Assuming owner mode for quick create", and omits `review_status` (so it relies on the DB default, which happens to be `pending`).

---

### 2. Navigation placement (AC2, AC3)

**There are two mobile bottom navs, and which one renders depends on approved-provider count in the user's city.** In production today, users see the one that _already has a "+"_.

**Mobile nav A — `CityEarlyAccessNavbar`** (`src/components/shared/CityEarlyAccessNavbar.tsx:77–133`). Renders in stage1/stage2. Current order:

| #   | Item                                                       | href                    | Icon                    |
| --- | ---------------------------------------------------------- | ----------------------- | ----------------------- |
| 1   | Home                                                       | `/`                     | `ExploreIcon` (:88)     |
| 2   | **Create**                                                 | **`/create/recommend`** | **`CreateIcon` (:102)** |
| 3   | Saved (stage2 only, `showSaved = stage === 'stage2'`, :51) | `/saved`                | `SavedIcon` (:117)      |
| 4   | Profile (`user ? '/profile' : '/login'`, :129)             |                         | `ProfileIcon` (:132)    |

`CreateIcon` (`src/components/ui/icons/CreateIcon.tsx:44–51`) is **already a "+"**: a vertical stroke and a horizontal stroke, `#777777` inactive / `#589D96` active. **AC3 is already satisfied in this navbar.** Note the item goes straight to `/create/recommend` and skips the `/create` chooser, so AC4's chooser is currently unreachable from mobile nav.

**Mobile nav B — `MobileFooterBar`** (`src/components/common/MobileFooterBar.tsx:14–34`). Renders in stage3 and for authenticated stage1/2 users. Current order: **Home, Saved, Profile. No Create.** It was removed deliberately: commit `38b2794d refactor(176): remove Create tab from mobile footer entirely` (2026-06-15) deleted exactly that nav item and its `CreateIcon` import, as part of "#176 chatbot" work. The preceding commit `c4f07a86` says "restore original Create tab in footer", so this tab has been added and removed twice. `src/__tests__/components/MobileFooterBar.providers-active.test.tsx:37–39` still mocks `CreateIcon`, a leftover.

**Which nav is live in production**: `feature-flags.ts:62` has `isAppLaunched: false`; stage is therefore derived from approved providers in the selected city (`src/hooks/useAppStage.ts:237–243`: `<6` stage1, `<15` stage2, `>=15` stage3). Live approved counts by city (query in area 5): Stuttgart 9, Berlin 6, Frankfurt am Main 4, Wien 2, Hofheim 1, München 1. **No city reaches stage3.** So production mobile users see `CityEarlyAccessNavbar` today, and `MobileFooterBar` only after login in an early-access city.

**Desktop nav — `src/components/layout/Header.tsx`**. Two rows:

- top row grid `[1fr_800px_1fr]` (:210): left Logo + About (About only when `!user`, :225), centre `SectionSelector` (:236–242), right auth block (:244–310)
- bottom row: `SearchBar` centred, `!w-[800px]` (:313–329)

The desktop "Create" is a **text button in the top-right auth cluster, rendered only when `user` is truthy** (`Header.tsx:248–256`, label `t('navigation.create')`, `router.push('/create')`). Anonymous desktop users see Login + Register and have **no** create entry point at all.

**Where "after search" lands — genuinely ambiguous, because there is no Search nav item anywhere.**

- Neither mobile navbar has a Search tab. `/search` is reached from the sliders button inside the inline search field (`HomeSearchBar.tsx:105–112`, `HomeSearchInput.tsx:61–68`) and by submitting an empty query (`HomeSearchBar.tsx:74–76`).
- Both navs are _hidden_ on `/search` (`navigationUtils.ts:206,250` and `:398`).
- On mobile the search affordance is the `searchSlot` of `DiscoveryHeader` (`src/features/search/components/DiscoveryHeader.tsx:70`), filled with `HomeSearchBar` on `/` (`RootPageContent.tsx:281`) and `SearchContextBar` on results (`ProvidersContent.tsx:684`).
- On desktop "after search" could mean after the `SearchBar` in the header's bottom row.

So "place the menu after search" resolves to one of three different changes. This is grilling question Q1.

**Icon pattern to follow**: `src/components/ui/icons/` holds hand-rolled SVG components with the `{ className, isActive }` prop signature and an if/else on `isActive` (`ExploreIcon.tsx:8`, `SavedIcon.tsx:10–15`, `ProfileIcon.tsx:10–15`, `CreateIcon.tsx:8–11`). Recent work on these is `9ca7d6c4 fix(#227): normalize nav icon sizes and remove opacity flash` and `2674b96f fix(#227): crossfade nav icons`. Two guard tests exist and will fail if you change the files carelessly: `src/__tests__/components/mobile-nav-icon-flash.test.ts:13–16` (reads the source of `MobileFooterBar.tsx`, `ExploreIcon.tsx`, `SavedIcon.tsx`, `ProfileIcon.tsx` as text) and `src/__tests__/regression/plan228-providers-food-consolidation.test.ts:178–320` (reads `CityEarlyAccessNavbar.tsx` and `MobileFooterBar.tsx` as text).

**Mobile nav capacity**: `CityEarlyAccessNavbar` already carries 4 items in stage2 with `justify-between` and `gap-4` (`:73–75`); each is `flex-1 h-12`. Adding a 5th is geometrically fine (5 × 40px + gaps inside `max-w-[400px]`). `MobileFooterBar` has 3 items with fixed `gap-10` and `style={{width:40,height:40}}` per item (`:86–91`); at 5 items `gap-10` (40px) overflows a 360px viewport and the gap must shrink. Commit `b5244c59 style: increase mobile footer icon gap (3 tabs)` set that gap for 3 tabs specifically.

**Collision risk**:

- `agent-output/planning/253-desktop-header-ownership-plan.md` rewrites `Header.tsx` layout (M2 "fluid global header", :95–98) and enumerates header states including "authenticated (Create, profile dropdown)" (:81). Any desktop "+" work collides head-on. 253 is Draft, no GitHub issue, and explicitly lists in-flight conflicts with #250 and #247 (:51).
- Worktree `cr/229-desktop-search-chips-unify` (branch `cr/229-…`, 10 commits ahead of main, behind 1) touches `src/components/layout/Header.tsx` (+13/-…), `src/features/search/components/SearchBar.tsx` (573 lines changed), and **rewrites `src/translations/de.ts` (2200 lines) and `en.ts` (2181 lines)**. Any new translation keys added by 255 will conflict badly with 229 on those two files.
- `src/components/layout/MobileNavbar.tsx` is a _different_ thing (a single fixed CTA button, `:17–51`), do not confuse it with the tab bars.

---

### 3. Create vs recommend (AC4)

**The distinction already exists, in the app layer and in the DB, and AC4's chooser page is already built.**

App layer: `export type ProviderCreationMode = 'owner' | 'recommendation'` (`src/providers/form-provider.tsx:5`), stored inside `formData` and persisted to `localStorage.providerFormData`. Set by `/recommend-provider` (`:18`), by `/create/recommend` on mount (`:31`), by `StreamlinedRecommendForm` on mount (`:454`), and defaulted to `'owner'` by `/create/basics` (`:48–52`) which also re-reads localStorage as a fallback (`:33–46`, `:64–77`) because the provider load is async.

**Same table, two columns — not separate entities.** Live `providers` table (area 5) has both:

- `user_created_id uuid` — who typed it in
- `provider_owner_id uuid` — the claimed business owner
- `recommender_email text` — comment on the column: _"Email address of the person who recommended this provider (for anonymous recommendations). Stored with user consent for GDPR compliance."_

The mapping is in `mutations.ts:280–298`:

- anonymous recommendation → `user_created_id = null`, `provider_owner_id = null`, `recommender_email = formData.userEmail`
- authenticated → `user_created_id = user.id`, `provider_owner_id = isOwner ? user.id : null`

Read side: `getCreatedProviders(userId)` filters `user_created_id = userId` (`src/services/providers/crud.ts:180–198`); `getRecommendations(userId)` filters the same column then **excludes rows where `provider_owner_id === userId`** (`crud.ts:202–230`). So "recommendation" is defined as _"I created it and I do not own it"_. Profile renders these as two sections, "Deine Inhalte" and "Empfehlungen" (`src/app/(public)/profile/ProfileContent.tsx:227–270` queries, `:536–600` render).

**Field differences between the two flows today**: owner collects 6 steps including address, lat/lng, images, offers+needs, tags, and the full halal block. Recommend collects 10 fields on one page and **zero halal fields**; `/create/halal` actively `router.replace('/create/media')` when `creationMode === 'recommendation'` (`src/app/(public)/create/halal/page.tsx:34,38–45`), and the recommend flow never visits `/create/halal` at all (it submits from inside `StreamlinedRecommendForm.handleSubmit`, `:1118`).

**Ownership / claiming implications — a whole outreach subsystem already exists and nobody mentioned it.** Live tables:

- `provider_owner_outreach` — `status` enum `public.outreach_status` = `pending_approval | approved | pending_dispatch | dispatched | failed | claimed | removed | kept | expired`, default `pending_approval`; `selected_channel` enum `email | phone | instagram`; `attempt_count`, `max_attempts` default 3, `dispatch_after` default `now() + 24h`
- `provider_owner_action_tokens` — `action_scope` enum `decision | claim | remove`, default `decision`; `token_hash`, `expires_at`
- `provider_outreach_tasks` — `task_status` enum `pending | in_progress | completed | cancelled`
- Routes: `/owner-decision` (`src/app/(public)/owner-decision/OwnerDecisionContent.tsx`, 332 lines), `src/app/api/outreach/claim`, `src/app/api/outreach/action`, RPC `validate_outreach_token`

So the intended lifecycle is: a user _recommends_ a place → uflow reaches out to the real owner → the owner _claims_ it and becomes `provider_owner_id`. A "recommend" flow that captures no owner contact channel feeds nothing into that machinery. `provider_owner_id` is currently non-null on **1 of 941** rows.

---

### 4. Halal Check vs Halal Label (AC6), and branch 228

**Halal Check questions** live in one place, `src/app/(public)/create/halal/page.tsx`:

- three attestations, `no_alcohol` / `no_pork` / `no_gambling`, as toggle cards (`:65–81`, `:104–128`), German hardcoded
- verification method radio, `online` | `onsite` (`:136–171`)
- optional certificate upload toggle + file input (`:175–241`)
- an info box that _states the label derivation in words_: "Online = Bronze, Vor Ort = Silber, Mit Zertifikat = Gold" (`:250–252`)

Persisted to `food_providers` / `store_providers` by `mutations.ts:328–349` (chosen from `resolveListingType(category)`, `:74–87`). Live columns on both tables (area 5): `provider_id, no_alcohol, no_pork, no_gambling, verification_method (text, default 'online'), has_certificate, certificate_url`. `verification_method` is **text with default `'online'`, not an enum**, and is NOT NULL.

Admin can also edit these at `/dashboard/providers/[id]/edit/halal`.

**Halal Label** = the bronze/silver/gold **seal**, two renderers:

- `ProofTierCard` + `computeSealTier()` (`src/features/providers/components/ProofTierCard.tsx:16–31`): `hasCertificate → gold`; no method and no cert → `null`; all three attestations falsy → `null`; `onsite → silver`; else `bronze`. Images from `/images/seals/seals-{bronze,silver,gold}-active.png` (`:55–58`).
- Rendered **only** on the provider detail page, inside an `ExpandSection`, via `ProviderDetailSections.tsx:233–256`. There is an admin-only "Not halal" red banner when a provider was reviewed but failed attestation (`:234–235`, `:262–268`).
- Card/list surfaces use a second, parallel derivation: `computeHalalStars()` 0–4 stars (`src/utils/sectionBadges.ts:31–59`), consumed by `ProviderCard.tsx:21`. Two independent tier algorithms for the same data.

**So the first half of AC6 is already true**: the Halal Label is _not_ rendered anywhere in the create flow. The only leak is the textual explainer at `create/halal/page.tsx:250–252`. The new work in AC6 is the second half, showing the seal at the end, plus bringing the halal questions into the _recommend_ flow where they do not exist.

**Branch `feature/228-halal-attestation-gate`** (worktree `/Users/NARAFIQ/Projects/uflow-wt/228-halal-attestation-gate`, 6 commits, 12 files, +741/-172):

```
cecf022e feat(228): wire halal attestation gate + backfill migration
cacd2d16 fix: close approval bypass via edit-provider route
fd8fbefc feat(edit-provider): auto-reject/approve based on halal attestation gate
844534ad fix: use router.replace after save to prevent edit-detail loop
bd3f54f6 fix: cancel button on edit form uses router.back()
09007cbe fix: address code review findings for halal attestation gate
```

What it does:

- `src/services/admin/halal-gate.ts` — `checkHalalAttestation(providerId)`, reads `food_providers`/`store_providers`, returns `{allAttested, missing, missingLabels, sourceTable}`; treats a missing extension row as "all missing" (`:77–85`)
- `src/app/api/admin/review-provider/route.ts:99–110` — **blocks** `reviewStatus === 'approved'` with 422 when attestation incomplete
- `src/app/api/admin/edit-provider/route.ts` — same gate on the edit path, plus auto-reject/auto-approve
- `supabase/migrations/128_halal_gate_backfill.sql` — reverts already-approved food/store providers to `pending` when attestation is incomplete

**Verdict: 228 is admin-side only. It is neither a duplicate of nor a blocker for 255, but they are coupled in one direction.**

- 228 touches zero public create/recommend files. It never renders a seal, never asks the questions, never changes label visibility. AC6 is **not** implemented by 228, in whole or in part.
- The coupling: 228 makes "all three attestations true" a _precondition for ever being approved_. If 255 adds halal questions to the recommend flow, every honest "no, they serve alcohol" answer produces a provider that can never be approved, only rejected. And if 255 does **not** add the questions to the recommend flow, every recommended restaurant is permanently unapprovable once 228 lands, because the gate treats a missing extension row as all-missing.
- **Recommendation: treat 228 as a hard dependency, merge it first, and make 255 build on top of it.** Concretely: 255 must guarantee that both flows write a `food_providers`/`store_providers` row, and the spec must state what "not halal" means to a recommender (see Q6). If 228 stalls, 255 should still write the extension row and the 128 backfill stays 228's problem.
- Practical merge note: 228 also edits `src/lib/validations/adminSchemas.ts` (100 lines) and `src/features/providers/pages/ProviderEditForm.tsx`; 255 is unlikely to touch either.

---

### 5. Pending approval (AC7) — live DB state

Per `.cursor/rules/workflow.mdc`, this was verified against the actual Supabase database, **not** local types or migrations. `supabase db dump --local` and `psql "$SUPABASE_DB_URL"` were both unavailable (no local Supabase running, no DB password/connection string in `.env.local` — only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Fallback used: **live PostgREST OpenAPI introspection with the service-role key**, which reflects real catalog state including enum labels, defaults and NOT NULL.

Commands run:

```bash
cd /Users/NARAFIQ/Projects/uflow
SUPA_URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2-)
KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2-)
curl -s -H "apikey: $KEY" -H "Authorization: Bearer $KEY" "$SUPA_URL/rest/v1/" -o /tmp/postgrest-spec.json
# HTTP 200, 241739 bytes
```

**`providers.review_status` — actual state:**

```json
{
  "default": "pending",
  "enum": ["pending", "approved", "rejected", "needs_revision", "removed_by_owner"],
  "format": "public.review_status",
  "type": "string"
}
```

- column: `review_status`, type `public.review_status` (Postgres enum)
- values: `pending`, `approved`, `rejected`, `needs_revision`, `removed_by_owner`
- default: `pending`
- nullability: **NOT NULL** — it appears in the table's `required` list:
  `['provider_id','provider_name','review_status','created_at','updated_at','show_address','enrichment_eligible','listing_type','muslim_owned','has_prayer_space','family_friendly','women_friendly','children_friendly','makes_donations','has_parking','economic_solidarity']`

**`providers.listing_type` — actual state** (this is the bug from area 1):

```json
{
  "description": "Listing type enum (food, store, ummah). NO DEFAULT by design — every INSERT must explicitly set listing_type. App-layer validation is required on all provider creation paths.",
  "enum": ["food", "store", "ummah"],
  "format": "public.listing_type_enum",
  "type": "string"
}
```

NOT NULL (in `required`), no default. Source migrations: `supabase/migrations/0061_phase4_semantic_constraints.sql:95–96` (landed on main 2026-04-30, `d742ee77`), advisory comment `085_m7_advisory_comments.sql:7–10`.

**Full live `providers` column list** (38 columns — note there is **no** `offers_ids` and **no** `needs_ids`, which `ProviderCreateForm.tsx:231–232` writes):
`address_city, address_country, address_street, address_zip, category_id, children_friendly, contact_email, contact_phone, created_at, economic_solidarity, enrichment_eligible, family_friendly, has_parking, has_prayer_space, import_source, import_source_id, import_source_url, last_enriched_at, listing_type, location_latitude, location_longitude, makes_donations, muslim_owned, opening_hours, provider_description, provider_id, provider_images, provider_name, provider_owner_id, recommender_email, review_feedback, review_status, show_address, social_instagram, social_website, updated_at, user_created_id, women_friendly`

**Row counts by status** (`Prefer: count=exact`, `Range: 0-0`, reading `content-range`):

```
pending            content-range: 0-804/805
approved           content-range: 0-23/24
rejected           content-range: 0-111/112
needs_revision     content-range: */0
removed_by_owner   content-range: */0
total providers    content-range: 0-940/941
food_providers     content-range: 0-913/914
user_created_id not null      0-920/921
provider_owner_id not null    0-0/1
recommender_email not null    */0
import_source is null         0-30/31
```

Approved by city:
`Counter({'Stuttgart': 9, 'Berlin': 6, 'Frankfurt am Main': 4, 'Wien': 2, 'Hofheim am Taunus': 1, 'München': 1, None: 1})`

**Interpretation**: `pending` is not a new state with no consumer, it is the overwhelming state — **805 of 941 providers (86%) are already pending**, against 24 approved. AC7 is already implemented in code (`mutations.ts:197` and `:272`, both literal `review_status: 'pending' as const`) and enforced by the column default. What AC7 actually needs is not a new state, it is a moderation throughput story.

**Approval path — exists, three pieces:**

1. API: `PATCH /api/admin/review-provider` (`src/app/api/admin/review-provider/route.ts:26–145`). Admin/moderator only (`isAdminOrModerator`, :37); Zod-validated (`providerReviewUpdateSchema`, :76); rate-limited 20/hour and 5/minute (`:49–64`); optimistic-concurrency via `expectedUpdatedAt` → 409 (`:148–152`); audit-logged (`logAdminAction`, `:122–136`). Accepts only `approved | rejected | needs_revision`, so `removed_by_owner` is unreachable from the admin UI.
2. UI: there is **no dedicated moderation queue page**. Admins moderate inline on the discovery surfaces: `AdminStatusFilter` in the desktop header (`Header.tsx:316–323`) and in `DiscoveryFilterBar` on mobile (`ProvidersContent.tsx:668–675`), plus `useProviderReview`, `RejectModal`, `AdminProviderDetailButtons`. `/dashboard/providers/[id]/edit/*` is edit-only; there is no `/dashboard/providers` index page.
3. RLS: `supabase/migrations/001_baseline.sql:3736–3738`, policy _"Public can view approved, users can view own, admins can view a…"_:
   `review_status = 'approved' OR provider_owner_id = auth.uid() OR (user is admin/moderator)`

**The RLS read policy is a hole for AC7.** It grants self-visibility on `provider_owner_id`, **not** on `user_created_id`. So:

- an owner who registers their own business can see their pending row
- a **recommender** (`user_created_id` set, `provider_owner_id` null) **cannot read their own pending recommendation**
- consequence: `getRecommendations()` (`crud.ts:202–230`) returns nothing for pending items, and Profile's "Empfehlungen" section shows the empty state (`ProfileContent.tsx:560–600`) even though the row exists
- an anonymous recommender has no identity at all, only `recommender_email`

Insert policy, same file, `:3620–3622`, _"Allow provider inserts"_:
`(admin/moderator) OR (auth.role() = 'authenticated' AND user_created_id = auth.uid()) OR (auth.role() = 'anon' AND user_created_id IS NULL AND provider_owner_id IS NULL)`

Neither the insert policy nor any trigger pins `review_status`, so a client could in principle insert `review_status: 'approved'` directly. The app always sends `'pending'`, but nothing at the DB layer stops it. `mutations.ts:300` deliberately inserts **without** `.select()` "to avoid SELECT policy blocking pending reviews", which confirms the read hole is known.

**Also missing**: no notification anywhere when a provider moves out of `pending`. `review_feedback` is written by the admin (`review-provider/route.ts:117`) and read by nothing on the public side. Rejected recommenders are never told.

---

### 6. Auth requirements

| Flow                                  | Auth required today                             | Where enforced                                                                                                                                                                                                                     |
| ------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reach `/create`                       | no                                              | `middleware-utils.ts:164–166` explicitly allows `/create` and `/create/*` in early access even without a waitlist token; `/create` and `/recommend-provider` are in both `APP_ROUTES` (:9–27) and `EARLY_ACCESS_ROUTES` (:106–113) |
| Own-provider flow (`/create/basics`)  | **yes**                                         | `create/basics/page.tsx:81–134`: if `!user && !isRecommendationMode`, renders a lock screen with a CTA to `/login?returnUrl=%2Fcreate%2Fbasics`                                                                                    |
| `/create/contact`                     | yes for owner mode                              | `create/contact/page.tsx:80–89`, same lock screen pattern                                                                                                                                                                          |
| `/create/media`                       | yes                                             | `create/media/page.tsx:89–93`, `if (!user) toast.error(...); return;`                                                                                                                                                              |
| Recommend flow (`/create/recommend`)  | **no**                                          | anonymous allowed end to end; `createProviderOrService(formData, user \|\| null, true)` (`StreamlinedRecommendForm.tsx:1118–1122`); `isAnonymous = (user == null) && isRecommendationMode` (`mutations.ts:165`)                    |
| `/create-quick/review`                | yes                                             | `create-quick/review/page.tsx:85` dereferences `user.id`                                                                                                                                                                           |
| Desktop "Create" button               | **yes, and it is the only desktop entry point** | `Header.tsx:248–256` renders it inside the `user ? (...)` branch                                                                                                                                                                   |
| Mobile "+" in `CityEarlyAccessNavbar` | no                                              | `:92–103`, plain `Link href="/create/recommend"`, no gate                                                                                                                                                                          |

Anonymous recommenders provide `userEmail` which lands in `providers.recommender_email` "with user consent for GDPR compliance" (column comment) — but grep shows **no consent checkbox** in `StreamlinedRecommendForm`; the email field is one of the `ContactCheckbox` group. `consent_logs` exists as a table and is not written by this flow.

Contrast with the Profile nav item, which _does_ gate: `MobileFooterBar.tsx:98,103–109` sends unauthenticated users to `/login`; `CityEarlyAccessNavbar.tsx:129` uses `href={user ? '/profile' : '/login'}`.

**On AC6's "only in the end after registration"**: "registration" is ambiguous between (a) the restaurant's submission completing, and (b) the user creating an account. The existing German UI uses "registriert" for the business (`ProviderCreateForm.tsx:278` `toast.success('Anbieter erfolgreich registriert!')`), which favours reading (a). But the sentence "_only_ in the end after registration" reads like a gate, which favours (b). The distinction decides whether anonymous recommenders ever see a seal. This is Q4.

---

## Ambiguities / grilling questions for the user

Ranked by how hard they block implementation. Each has a recommendation.

---

❓ **Q1 — "Place the menu after search": after _what_ exactly?**

There is no Search item in either mobile bottom nav, and both navs are hidden on `/search` (`navigationUtils.ts:206,250,398`). So "after search" can mean three different builds. **This blocks everything: it decides which files change and whether 253/229 collide.**

- **(a) Mobile bottom nav, add a Search tab then the "+" after it** → order Home, Search, +, Saved, Profile. New `SearchIcon` needed; `MobileFooterBar`'s `gap-10` must shrink for 5 items; two source-reading guard tests must be updated.
- **(b) Mobile bottom nav, "+" in position 2, immediately after Home** → this is _already shipped_ in `CityEarlyAccessNavbar:92–103` and the change reduces to restoring the tab in `MobileFooterBar` (revert of `38b2794d`).
- **(c) Inside the search header row, a "+" button next to the sliders button** → touches `HomeSearchBar.tsx:105–112` and `HomeSearchInput.tsx:61–68`; on desktop, a "+" after the `SearchBar` in `Header.tsx:313–329`, which collides directly with Plan 253 M2 and with `cr/229-desktop-search-chips-unify`.

➡️ **(b), extended.** The "+" already sits right after Home in the navbar production users actually see, and `CreateIcon` is already a "+". Do the minimum: restore the Create tab to `MobileFooterBar` in position 2 so both navs match, repoint `CityEarlyAccessNavbar`'s "+" from `/create/recommend` to the `/create` chooser (AC4 requires the chooser to be reachable), and on desktop keep the existing top-right Create control but change its label to a "+" icon and **let Plan 253 own its position**. Defer a Search tab to its own request.

---

❓ **Q2 — What does "recommend" mean as a distinct flow, and does it capture owner contact?**

The DB already models it (`user_created_id` vs `provider_owner_id` vs `recommender_email`) and a full owner-outreach subsystem exists (`provider_owner_outreach` with a 9-value status enum, `provider_owner_action_tokens` with `claim`/`remove` scopes, `/owner-decision`, `/api/outreach/claim`). Today's recommend flow feeds **none** of it: `provider_owner_id` is non-null on 1 of 941 rows and no outreach row is created on submit. **This blocks the field list for Q3 and the whole point of "enrich uflow with more content".**

- **(a) Recommend = tip only.** Minimum fields, no owner contact, admin does everything downstream. Cheapest; leaves outreach dead.
- **(b) Recommend = tip + one owner contact channel** (email, phone, or Instagram, matching the `outreach_channel` enum `email|phone|instagram`), and submitting creates a `provider_owner_outreach` row with `status = 'pending_approval'`. Wires the existing machinery.
- **(c) Recommend = tip, and separately let a recommender flag "I am the owner"**, collapsing the two flows into one form with a checkbox.

➡️ **(b).** The outreach tables, tokens, RPC and `/owner-decision` page are already built and idle. One extra required field ("how can we reach them: email / phone / Instagram", which the form _already collects_ as optional contacts, `StreamlinedRecommendForm.tsx:997–1004`) turns a dead-end tip into a claimable listing. Keep (b) scoped to _writing the outreach row_; actually dispatching outreach is a separate request.

---

❓ **Q3 — Minimum required fields per flow?**

Current state: recommend requires title + category + city + **any one** of email/phone/website/instagram (`StreamlinedRecommendForm.tsx:997–1017`); owner requires whatever each of six pages happens to check, with no schema anywhere. Neither writes `listing_type`, which is NOT NULL (area 5). **This blocks the validation layer and the DB write.**

- **(a) Keep today's sets, add `listing_type` derivation and a Zod schema per flow.**
- **(b) Recommend: name + city + category + one contact + three halal answers.** Owner: today's set + address + at least one image.
- **(c) Recommend: name + city only**, maximum funnel, everything else optional.

➡️ **(b)**, with these hard requirements regardless of answer: derive and write `listing_type` from `categories.applicable_section` **before** the insert (fix `mutations.ts:257–303`), never write `offers_ids`/`needs_ids` to `providers` (fix `ProviderCreateForm.tsx:231–232`), always insert the `food_providers`/`store_providers` row so branch 228's gate has something to read, and put both flows behind Zod schemas in `src/lib/validations/` mirroring `adminSchemas.ts`.

---

❓ **Q4 — "Halal Label only after registration": registration of the restaurant, or of the user account?**

Decides whether an anonymous recommender ever sees a seal, and whether the recommend flow gains an auth wall it does not have today (`mutations.ts:165`, anonymous supported end to end).

- **(a) Restaurant submission.** Seal appears on the success screen (`RecommendSuccessScreen.tsx:112–127`) right after submit, for everyone including anonymous. Also remove the tier explainer leak at `create/halal/page.tsx:250–252`.
- **(b) User account.** The "+" flows require login; the seal is revealed post-signup. Kills anonymous recommendations and contradicts `middleware-utils.ts:164–166` and the anon RLS insert policy (`001_baseline.sql:3622`).
- **(c) Admin approval.** Seal only visible once `review_status = 'approved'`, i.e. never on the success screen. Matches how the seal actually renders today (detail page only) but means the user sees nothing "at the end", which contradicts AC6's wording.

➡️ **(a).** It is the only reading that preserves anonymous recommending, it needs no new auth wall, and there is an obvious place to put it (`RecommendSuccessScreen`, which is already shared by the recommend and import forms). Add one note in the spec: the seal shown on the success screen must be labelled provisional, because 228's gate can still reject it.

---

❓ **Q5 — What happens after a submission enters `pending`, and who moderates it?**

805 of 941 providers are already pending against 24 approved (area 5). There is no moderation queue page, only inline `AdminStatusFilter` on the discovery lists. `review_feedback` is written but read by nothing public. Nobody is notified of anything. **This blocks whether AC7 is "already done" or "the actual work".**

- **(a) Nothing new.** AC7 is satisfied by `review_status: 'pending'` (already true) and the request ships without touching moderation.
- **(b) Add a moderation queue page** at `/dashboard/providers` listing pending items with approve/reject, on top of the existing `PATCH /api/admin/review-provider`.
- **(c) Add submitter feedback**: email the recommender on approve/reject using `recommender_email`, and surface `review_status` + `review_feedback` in Profile.
- **(d) (b) + (c).**

➡️ **(a) for this request, and file (b)+(c) as a separate "moderation throughput" request.** AC7 as written is already implemented; an 805-item backlog and a notification system are a different feature with a different owner. But the 255 spec **must** say so explicitly, otherwise "shouldn't be auto-approved but sit in pending" ships as a no-op and reads as a regression.

---

❓ **Q6 — What does a "no" answer to a halal question mean for a recommendation?**

Branch 228 makes all three attestations being true a precondition for ever being approved (`review-provider/route.ts:99–110`). If the recommend flow asks the questions honestly, "no, they serve alcohol" creates a permanently unapprovable row. If it does not ask, 228 makes **every** recommended restaurant unapprovable, because a missing extension row counts as all-missing (`halal-gate.ts:77–85`).

- **(a) Block submission** when any answer is "no", with an explanatory message.
- **(b) Accept the submission**, write the row honestly, and let it sit in `pending` forever until an admin rejects it.
- **(c) Reframe the questions** as "do you know whether…" with an explicit "not sure" third state, and treat "not sure" as unanswered rather than false. Needs a nullable column change; `no_alcohol`/`no_pork`/`no_gambling` are currently boolean-and-`required` on `food_providers`.
- **(d) Don't ask in the recommend flow at all** and have the admin fill them in during review.

➡️ **(c) conceptually, (b) as the shippable version.** A recommender genuinely does not know whether a kitchen handles pork; forcing a boolean makes them guess. But changing three NOT NULL booleans to tri-state is a migration and a change to 228's gate, both out of scope here. Ship (b) now, write "no" answers truthfully, and state in the spec that such rows are expected to be rejected. File tri-state as a follow-up on 228.

---

❓ **Q7 — Does the user see their own pending submission, and under what identity?**

The RLS read policy grants self-visibility on `provider_owner_id` only, **not** `user_created_id` (`001_baseline.sql:3736–3738`). So a recommender cannot read back their own pending recommendation, and Profile's "Empfehlungen" section renders its empty state even though the row exists. Anonymous recommenders have no identity at all.

- **(a) Leave it.** Accept that "Empfehlungen" is empty until approval. Zero DB change.
- **(b) Widen the RLS policy** to `OR user_created_id = auth.uid()` and show a "pending review" badge on the Profile cards (`ProfileContent.tsx:536–560`, which currently renders no status).
- **(c) (b) plus** show the pending item on the success screen only, held in client state, with nothing persisted to read back.

➡️ **(b).** It is a one-clause RLS change, it makes the existing Profile sections honest, and it is a precondition for ever telling a user why their submission was rejected. Anonymous submitters stay invisible by design; that is the trade-off for not requiring an account.

---

❓ **Q8 — Mobile nav capacity: what gives?**

Depends on Q1. `CityEarlyAccessNavbar` already carries 4 items in stage2 and takes a 5th comfortably (`flex-1`, `justify-between`, `max-w-[400px]`, `:71–76`). `MobileFooterBar` uses a fixed `gap-10` sized for exactly 3 tabs (commit `b5244c59`) and fixed 40×40 items (`:86–91`); at 5 items it overflows a 360px viewport.

- **(a) 4 items max**, so no Search tab: Home, +, Saved, Profile.
- **(b) 5 items**, switch `MobileFooterBar` from `gap-10` to `justify-between` with `flex-1`, matching `CityEarlyAccessNavbar`.
- **(c) Drop Saved from the bottom nav** and move it into Profile.

➡️ **(a).** Keeps both navbars at 4 items, keeps the geometry the #227 icon-sizing work just stabilised, and needs no `SearchIcon`. If Q1 lands on (a) instead, then (b) is the answer and the `gap-10` change must be regression-tested against `src/__tests__/components/mobile-nav-icon-flash.test.ts`.

---

❓ **Q9 — Do the two mobile navbars stay forked?**

`CityEarlyAccessNavbar` (4 items, "+", stage-gated Saved, active underline) and `MobileFooterBar` (3 items, no "+", no underline) are separate components with duplicated gradient/shadow/safe-area styling, and the choice between them is made by two 80-line predicate functions in `navigationUtils.ts:186–423`. Adding a "+" means editing both, or unifying them.

- **(a) Edit both.** Smallest diff, keeps the duplication.
- **(b) Unify into one nav component** with a stage-driven item list.

➡️ **(a) for this request.** Unification is a refactor that would collide with #227, #247, #250 and Plan 253. Note the duplication in the spec as known debt and add a test asserting both navbars expose the same "+" target.

---

❓ **Q10 — Is `/create-quick` in or out of scope?**

`/create-quick` + `/create-quick/review` (603 lines, `StreamlinedImportForm` 1519 lines) is a third creation path behind `enableQuickImport`, off in prod (`env.production.template:91`) and on locally (`.env.local:63`). Its submit omits `listing_type` and hardcodes `provider_owner_id: user.id` with the comment "Assuming owner mode for quick create" (`create-quick/review/page.tsx:74–87`).

- **(a) Out of scope**, leave the flag off.
- **(b) In scope**, surface it as a third option on the `/create` chooser (it is currently mobile-only and visually bolted on, `create/page.tsx:53–77`).
- **(c) Delete it** and fold OSM/Instagram import into the recommend flow, which already has OSM autocomplete (`StreamlinedRecommendForm.tsx:1451–1505`).

➡️ **(a) now, (c) as a follow-up.** `StreamlinedImportForm` and `StreamlinedRecommendForm` are ~3200 lines of near-duplicate code; merging them is its own request.

---

## Draft enriched ACs

Marked **[BLOCKED: Qn]** where an unanswered question changes the AC.

### AC1 — Reuse the existing create/recommend surface, brought up to repo standard

1.1 `/create` remains the single chooser page; no new chooser is built.
1.2 `/recommend-provider` is deleted and its two callers (`create/page.tsx:26`, `middleware-utils.ts:16,107`) point at `/create/recommend` directly. The redirect hop, and its hardcoded German "Weiterleitung…" (`recommend-provider/page.tsx:28`), disappear.
1.3 Every user-visible string on `/create`, `/create/recommend` and `/create/halal` comes from `t()` and exists in all six locales (`de, en, ar, tr, ur, ps`). Baseline: `create/halal/page.tsx` currently has **zero** translated strings.
1.4 Every icon on the touched pages is Lucide with a `w-icon-*`/`h-icon-*` size token (`docs/design/ICON_USAGE_STANDARDS.md:3–29`). No `@iconify/react` and no `mdi:*` on touched files.
1.5 No hex colour literals on touched files; semantic tokens only. Baseline: 6 distinct hex literals across `create/page.tsx` and `create/halal/page.tsx`.
1.6 Both flows have explicit loading, error and submitting states. The submit button is disabled while submitting and a failed submit keeps the user's input.
1.7 `ProviderCreateForm.tsx:213–234` no longer writes `offers_ids`/`needs_ids` to `providers` (columns do not exist, area 5). Either the path is fixed or the dead path is deleted.
1.8 There is exactly one submit call site per flow. Baseline: `createProviderOrService` has five call sites, two of which (`create/contact/page.tsx:97`, `create/media/page.tsx:99`) are both live submits for the same owner/recommend pair.
1.9 Nothing in `StreamlinedRecommendForm`/`StreamlinedImportForm` is newly duplicated; shared pieces (OSM autocomplete, city autocomplete, `ContactCheckbox`) are extracted or left untouched, never copied again.
1.10 A regression test asserts that a create and a recommend submission each produce exactly one `providers` row with `review_status = 'pending'` and a non-null `listing_type`.

**Notes**: the "existing component" is four components, not one. Full reunification is out of scope; AC1 is about the entry point, i18n, tokens and the duplicate-submit bug, not a rewrite.

### AC2 — Menu placement **[BLOCKED: Q1, Q8, Q9]**

2.1 The "+" entry is reachable in both mobile navbars, `CityEarlyAccessNavbar` and `MobileFooterBar`, at the same ordinal position, and both target the same route.
2.2 Its position relative to search is whatever Q1 settles.
2.3 The active state follows the existing convention: `CreateIcon isActive` plus, in `CityEarlyAccessNavbar`, the `border-b-[2.4px] border-primary` underline (`:97`). Active when `pathname === '/create' || pathname.startsWith('/create')`.
2.4 Adding the item does not overflow the nav at 320px, 360px and 430px viewport widths, and does not change icon sizes (protects `#227`, commits `9ca7d6c4`, `2674b96f`).
2.5 The item has an `aria-label` sourced from `t()`, is keyboard reachable, and has a ≥44px touch target.
2.6 On desktop the create control stays in the global `Header`. Its position is Plan 253's to own; 255 only changes its presentation (AC3) and its label source.
2.7 The two guard tests that read nav source as text still pass: `src/__tests__/components/mobile-nav-icon-flash.test.ts` and `src/__tests__/regression/plan228-providers-food-consolidation.test.ts:178–320`.

### AC3 — "+" icon

3.1 Mobile uses the existing `src/components/ui/icons/CreateIcon.tsx`, which is already a "+" (`:44–51`). No new asset.
3.2 `CreateIcon` is brought in line with its siblings after `#227`: same size normalisation and crossfade behaviour as `ExploreIcon`/`SavedIcon`/`ProfileIcon`.
3.3 Desktop replaces the `t('navigation.create')` text button (`Header.tsx:250–256`) with a "+" affordance carrying an accessible name from `t()`. **[BLOCKED: Q1 for whether it also moves]**
3.4 `CreateIcon` has no hardcoded `#777777`/`#589D96` stroke literals; it uses `currentColor` plus token classes, matching how the other icons will look post-#227.

### AC4 — The "+" page offers create or recommend

4.1 Tapping "+" lands on `/create`, which offers exactly two primary options: "register my own business" and "recommend a place". `/create/page.tsx` already does this (`:80–95`).
4.2 The mobile "+" no longer deep-links past the chooser. Baseline: `CityEarlyAccessNavbar.tsx:99` goes straight to `/create/recommend`.
4.3 "Register my own" → `/create/basics` in `owner` mode; "Recommend" → `/create/recommend` in `recommendation` mode. `creationMode` is set before navigation, not on arrival, removing the localStorage race currently worked around in `create/basics/page.tsx:33–52,64–77`.
4.4 An anonymous user choosing "register my own" sees the existing login gate (`create/basics/page.tsx:81–134`) with a `returnUrl`. An anonymous user choosing "recommend" is **not** gated. **[BLOCKED: Q4 if answer is (b)]**
4.5 The quick-import card stays behind `enableQuickImport` and is unchanged. **[BLOCKED: Q10]**
4.6 The chooser has a visible back affordance and is keyboard navigable.

### AC5 — Subpages collect the required data **[BLOCKED: Q2, Q3]**

5.1 Each flow has a documented required-field set, enforced by a Zod schema in `src/lib/validations/`, mirroring the admin pattern in `adminSchemas.ts`. Baseline: no schema on either public flow.
5.2 Required fields are marked in the UI, and a failed validation names the specific field rather than firing a generic toast.
5.3 `listing_type` is derived from `categories.applicable_section` and written **in** the insert, not after it. Fixes `mutations.ts:257–303` against the NOT NULL, no-default column (area 5).
5.4 Every food/store submission writes a `food_providers`/`store_providers` row in the same logical operation, so branch 228's gate has data to read (`halal-gate.ts:77–85`).
5.5 The recommend flow captures at least one owner contact channel drawn from the live `outreach_channel` enum (`email`, `phone`, `instagram`) and creates a `provider_owner_outreach` row with `status = 'pending_approval'`. **[BLOCKED: Q2]**
5.6 If `recommender_email` is captured from an anonymous user, an explicit consent checkbox is shown and the consent is written to `consent_logs`. The column's own comment claims consent is obtained; today no consent UI exists.
5.7 Partial progress survives a reload, as it does now via `localStorage.providerFormData`, and is cleared on success (`clearFormData()`).
5.8 Submitting twice does not create two providers.

### AC6 — Halal Check answerable, Halal Label deferred **[BLOCKED: Q4, Q6]**

6.1 The three halal attestations (`no_alcohol`, `no_pork`, `no_gambling`) and the verification method are answerable in **both** flows. Baseline: the recommend flow never sees them; `create/halal/page.tsx:38–45` redirects recommendation mode straight past the page.
6.2 No bronze/silver/gold seal, star rating, or tier name is rendered at any point during either flow. Currently true for the imagery, but the textual leak at `create/halal/page.tsx:250–252` ("Online = Bronze, Vor Ort = Silber, Mit Zertifikat = Gold") must go.
6.3 The seal appears once, at the end. **[BLOCKED: Q4]** Under the recommended reading: on the success screen (`RecommendSuccessScreen.tsx:112–127`), rendered by the existing `ProofTierCard` so there is no third tier algorithm. Baseline: there are already two (`computeSealTier` in `ProofTierCard.tsx:16–31` and `computeHalalStars` in `sectionBadges.ts:31–59`).
6.4 The end-of-flow seal is labelled provisional, because branch 228's gate can still block approval.
6.5 A "no" answer is accepted and written truthfully; the submission stays `pending`. **[BLOCKED: Q6]**
6.6 All halal question text and the verification-method labels are translated in all six locales. Baseline: 100% hardcoded German.
6.7 The certificate upload stays optional and validates type and size before upload.

### AC7 — Submissions sit in pending

7.1 Every provider created through either flow is written with `review_status = 'pending'`. **Already implemented** at `mutations.ts:197` and `:272`, and guaranteed by the column default (area 5). AC7 becomes a regression test, not new code.
7.2 A created or recommended provider does not appear in any public list or detail view until approved. Enforced today by `.eq('review_status','approved')` in `crud.ts:23,245`, `cities.ts:71,132`, `categories.ts:26,36,93,109,178`, `filters.ts:49`, `map-pins.ts:49`.
7.3 The client cannot set `review_status` to anything other than `pending`. Today nothing at the DB layer enforces this; the insert RLS policy (`001_baseline.sql:3620–3622`) does not constrain the column.
7.4 The submitter sees an explicit "awaiting review" message at the end of the flow, not a bare success. `RecommendSuccessScreen` currently says only "BarakAllahu feek".
7.5 The submitter can see their own pending submission in Profile with a pending badge. **[BLOCKED: Q7]** Requires widening the RLS read policy to include `user_created_id = auth.uid()`; today `ProfileContent.tsx:536–600` renders no status at all and pending rows are invisible to their creator.
7.6 Moderation throughput, a queue UI, and approve/reject notifications are explicitly **out of scope** and filed separately. **[BLOCKED: Q5]**

### Notes the user asked for

- **805 of 941 providers (86%) are already `pending`; 24 are approved.** AC7 changes nothing about the code and everything about the backlog. Whatever 255 ships, more content will not become visible until moderation throughput is addressed.
- **Branch 228 is a dependency, not a duplicate.** Merge it first. Once it lands, any food/store provider without a complete `food_providers`/`store_providers` row can never be approved, so 255 must always write that row.
- **A recommender currently cannot read back their own pending recommendation** (RLS grants self-read on `provider_owner_id`, not `user_created_id`). Profile's "Empfehlungen" section is dead for pending items.
- **`providers.listing_type` is NOT NULL with no default, and the main public insert path does not set it.** Verify this first; it may mean the recommend flow has been failing silently. `recommender_email` is non-null on 0 of 941 rows.
- **The "+" already exists** in the navbar production users actually see, pointing at `/create/recommend` and bypassing the chooser AC4 asks for.
- **The owner-outreach/claiming subsystem is fully built and completely idle** (`provider_owner_outreach`, `provider_owner_action_tokens`, `/owner-decision`, `/api/outreach/claim`). `provider_owner_id` is set on 1 of 941 rows.
- **`create/halal/page.tsx` is 100% hardcoded German**, including a religious oath ("Bezeugst du bei Allah…"). Translating it needs a human reviewer per locale, not a machine pass.
- **No city reaches stage3**, so `MobileFooterBar` is only reached by authenticated early-access users. Test both navbars.

---

## Risks and collisions

| #   | Risk                                                                                                                                                                   | Evidence                                                                                                                                                                                                                                                                                                  | Mitigation                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | `providers.listing_type` NOT NULL, no default, and `mutations.ts:257–303` omits it. The public create/recommend insert may be failing today.                           | `0061_phase4_semantic_constraints.sql:95–96`; live `required` list (area 5); `recommender_email` non-null on 0/941 rows. Counter-evidence: user-created rows dated 2026-06-16 do carry `listing_type='food'`, so an undocumented trigger may exist. No trigger found in `supabase/migrations/` or `sql/`. | **Verify first.** Attempt one anon insert against a non-prod project, or get a DB connection string and `\d+ providers`. Then fix `mutations.ts` to derive `listing_type` pre-insert regardless. |
| R2  | Branch `feature/228-halal-attestation-gate` makes every provider without a complete attestation row unapprovable.                                                      | `halal-gate.ts:77–85`; `review-provider/route.ts:99–110`; `128_halal_gate_backfill.sql`                                                                                                                                                                                                                   | Merge 228 first. Make "write the extension row" a hard AC (5.4).                                                                                                                                 |
| R3  | Plan 253 rewrites `Header.tsx` desktop layout, including the authenticated Create control.                                                                             | `agent-output/planning/253-desktop-header-ownership-plan.md:39,81,95–98`; status Draft, no issue                                                                                                                                                                                                          | Confine 255's desktop change to the control's _presentation_. Let 253 own position and fluidity. Sequence 253 first if it is close.                                                              |
| R4  | Worktree `cr/229-desktop-search-chips-unify` rewrites `src/translations/de.ts` (2200 lines) and `en.ts` (2181) and edits `Header.tsx` and `SearchBar.tsx` (573 lines). | `git diff --stat main...cr/229-desktop-search-chips-unify`                                                                                                                                                                                                                                                | Rebase 255 after 229 merges, or add new keys at the end of each locale file and expect a manual merge. Do not touch `SearchBar.tsx`.                                                             |
| R5  | `#227` nav-icon work just landed on `MobileFooterBar` and the icons (`9ca7d6c4`, `2674b96f`, `28226ab0`). Adding a tab risks reintroducing the size pop / flash.       | `src/__tests__/components/mobile-nav-icon-flash.test.ts` reads nav source as text                                                                                                                                                                                                                         | Do not touch icon sizing. Run that test plus `plan228-providers-food-consolidation.test.ts` before and after.                                                                                    |
| R6  | `ProviderCreateForm.tsx:231–232` writes non-existent `providers.offers_ids`/`needs_ids`.                                                                               | live column list (area 5)                                                                                                                                                                                                                                                                                 | Fix or delete the path. Confirm reachability first.                                                                                                                                              |
| R7  | `create-quick/review/page.tsx:74–87` omits `listing_type` and sets `provider_owner_id` unconditionally. Flag is off in prod, on locally.                               | `env.production.template:91` vs `.env.local:63`                                                                                                                                                                                                                                                           | Keep the flag off; note as known debt (Q10).                                                                                                                                                     |
| R8  | Anonymous `recommender_email` capture with no consent UI, while the column comment claims GDPR consent. `consent_logs` unwritten.                                      | column comment (area 5); no consent checkbox in `StreamlinedRecommendForm`                                                                                                                                                                                                                                | AC 5.6. Flag to compliance.                                                                                                                                                                      |
| R9  | RLS read policy hides pending rows from their own creator, so any "see your submission" feature silently returns nothing.                                              | `001_baseline.sql:3736–3738`                                                                                                                                                                                                                                                                              | Q7. If (b), the policy change needs its own migration and a QA pass on `getRecommendations`/`getCreatedProviders`.                                                                               |
| R10 | Two independent halal tier algorithms already exist; the success-screen seal could become a third.                                                                     | `ProofTierCard.tsx:16–31` vs `sectionBadges.ts:31–59`                                                                                                                                                                                                                                                     | Reuse `ProofTierCard` / `computeSealTier`. AC 6.3.                                                                                                                                               |

### Scope that should be split out

1. **Moderation throughput** — queue UI, bulk approve, the 805-item backlog, approve/reject notifications using `recommender_email` and `review_feedback`. Q5.
2. **Merge `StreamlinedRecommendForm` + `StreamlinedImportForm`** — ~3245 lines, near-duplicate OSM/city autocomplete and success screen. Q10.
3. **Unify the two mobile navbars** and simplify `navigationUtils.ts:186–423`. Q9.
4. **Tri-state halal answers** ("yes / no / not sure") — needs nullable columns and a change to 228's gate. Q6.
5. **Activate owner outreach dispatch** — the tables and tokens exist; nothing sends. 255 should only _write_ the outreach row (Q2b).
6. **A Search tab in the bottom nav**, if Q1 lands on (a).
