---
ID: 255
Origin: 255
UUID: 255-create-recommend-menu
Status: Active
Type: feature
Branch: feature/255-create-recommend-menu
Worktree: ../uflow-wt/255-create-recommend-menu
Created: 2026-09-25
---

# Request 255: Dedicated "+" menu to create or recommend a restaurant

## Original request

> As a user i want to create/recommend restaurants through a dedicated menu (creation) so that i can enrich uflow with more content.
>
> AC:
>
> 1. Use existing component but ensure it follows best practice
> 2. Place the menu after search
> 3. Icon should be a "+"
> 4. - Page allows a user to either create or recommend
> 5. Subpages of create/recommend allow the user to fill in required data fields.
> 6. User can answer the questions about Halal Check, but not see the Halal Label, only in the end after registration
> 7. Created/recommended restaurants shouldnt not autom. be approved but sit in pending.
>
> Enrich the stories with relevant ACs and notes.

## Classification

- **Type:** feature
- **Route:** Main flow (Grill -> Spec -> [Tickets] -> Implement -> Code Review -> QA -> Done)
- **Confidence:** high

## Scope decisions (from entry gate)

| #   | Question                                             | Answer                                                                     |
| --- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | Deliverable                                          | Full feature build (Grill -> Spec -> Implement -> Code Review -> QA -> PR) |
| 2   | Where enriched ACs land                              | GitHub issue (orchestrator creates it after the spec gate)                 |
| 3   | Relationship to `feature/228-halal-attestation-gate` | Grill phase investigates and reports before the spec gate                  |

## Phases

| #   | Phase                 | Status  | Outcome                                                                                                                                                                                                                                                   |
| --- | --------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | Tracking file created | Done    | This file                                                                                                                                                                                                                                                 |
| 1   | Grill                 | Done    | [255-create-recommend-menu-analysis.md](../analysis/255-create-recommend-menu-analysis.md) (524 lines). 10 ranked questions, draft enriched ACs, 3 latent bugs found                                                                                      |
| 2   | Spec                  | Done    | Approved by user. All 10 grill questions resolved                                                                                                                                                                                                         |
| 2b  | GitHub issue          | Done    | [#415](https://github.com/abu-lina/uflow/issues/415), label `type:feature`                                                                                                                                                                                |
| 3   | Tickets               | N/A     | User chose single branch / one PR. Implementation chunked on one branch with review between chunks                                                                                                                                                        |
| 4   | Implement             | Done    | 12 commits across 2 branches. See chunk table below                                                                                                                                                                                                       |
| 5   | Code Review           | Done    | Independent fresh reviewer vs `main`. 2 Critical + 4 High + 10 Medium. All fixed in `b7ac6f6b`, `078f3fd3`, `2c63e9ab`                                                                                                                                    |
| 6   | QA                    | Done    | Full suite 2488/2488 across 272 files. CI run [36243663373](https://github.com/abu-lina/uflow/actions/runs/36243663373) green on all 6 jobs, after fixing 2 stale test contracts and 2 perf-budget violations in `55eed7e1`                               |
| 7   | Done                  | Blocked | [PR #416](https://github.com/abu-lina/uflow/pull/416) and [#418](https://github.com/abu-lina/uflow/pull/418) both open and awaiting human review. Migrations still unverified against a live DB (credential not provided). Worktrees retained until merge |

## Decisions

Decisions made during grilling, recorded as they land.

| #      | Decision                                                                                    | Choice                                                         | Rationale                                                                                                                                                                                                                                                                                                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1     | Nav placement ("after search")                                                              | "+" in position 2, right after Home                            | No Search nav item exists, so "after search" has no referent. Position 2 is already shipped in `CityEarlyAccessNavbar`; reduces to restoring the tab in `MobileFooterBar` and repointing it. Protects the just-landed #227 icon geometry                                                                                                                                                                 |
| Q8     | Mobile nav capacity                                                                         | 4 items max, no Search tab                                     | Follows from Q1. `MobileFooterBar` goes 3 -> 4 items; `gap-10` was sized for 3 and must be verified at 320/360/430px                                                                                                                                                                                                                                                                                     |
| Q9     | Two forked navbars                                                                          | Edit both, keep forked                                         | Unification collides with #227/#247/#250 and Plan 253. Logged as debt; a test asserts both expose the same "+" target                                                                                                                                                                                                                                                                                    |
| D2     | Sequencing vs 228 halal gate                                                                | **Already merged.** No sequencing needed                       | PR #398 merged 2026-09-20. `halal-gate.ts`, the 422 approval block and `128_halal_gate_backfill.sql` are all in `main`; the 255 branch was cut from it. The stale `feature/228-halal-attestation-gate` worktree is leftover                                                                                                                                                                              |
| Q4     | "Halal Label only after registration"                                                       | Registration of the **restaurant**; seal on the success screen | Shows for everyone including anonymous users, consistent with the existing anon RLS insert policy and middleware carve-out. Labelled provisional because the 228 gate can still reject                                                                                                                                                                                                                   |
| Q2     | What "recommend" captures                                                                   | Tip only. No owner contact, no outreach row                    | Keeps scope tight. The `provider_owner_outreach` subsystem stays idle and is split out                                                                                                                                                                                                                                                                                                                   |
| Q6     | Meaning of a "no" halal answer                                                              | Tri-state: yes / no / not sure                                 | A recommender often does not know. Needs nullable attestation columns. Was a split candidate; user pulled it into scope                                                                                                                                                                                                                                                                                  |
| Q5     | Post-pending moderation                                                                     | Out of scope, split out                                        | AC7 is already satisfied by the column default. Spec states this explicitly so AC7 does not read as a no-op                                                                                                                                                                                                                                                                                              |
| Q7     | Submitter reads own pending row                                                             | Widen RLS with `OR user_created_id = auth.uid()`               | One-clause migration. Makes Profile's existing "Empfehlungen" section honest and is a precondition for ever explaining a rejection                                                                                                                                                                                                                                                                       |
| Q3     | Required fields per flow                                                                    | Recommend lean, owner fuller, Zod on both                      | Recommend = name + city + category + three halal answers. Owner = today's set + address + one image                                                                                                                                                                                                                                                                                                      |
| Q10    | `/create-quick` in scope                                                                    | Out. Flag stays off                                            | Near-duplicate of the recommend form (~3245 lines combined); folding them in is split out                                                                                                                                                                                                                                                                                                                |
| **D3** | **Recommendations require a logged-in user** (reverses AC4.4 and Q4's anonymous assumption) | **Yes, require login**                                         | Raised by the user in response to the `consent_logs` blocker. Dissolves the GDPR problem: no third-party email stored, submitter identified by `user_created_id`, account already covered by existing ToS/privacy consent. No consent migration needed. Cost, flagged to the user and accepted: friction reduces submission volume, working against this request's "enrich uflow with more content" goal |
| D4     | Anonymous insert branch in migration 130's RLS policy                                       | Remove it                                                      | Database enforces the login rule too, not just the UI. Migration 130 has never been applied anywhere, so corrected in place rather than superseded                                                                                                                                                                                                                                                       |
| D5     | Import flow (`StreamlinedImportForm`) bypassing the halal requirement                       | Add attestations to import                                     | User chose the guarantee should hold everywhere. Enables service-boundary enforcement as defence in depth, which was impossible while one path had no halal UI                                                                                                                                                                                                                                           |

### Grill findings that reshape the request

| Finding                                      | Evidence                                                                                                                                                                                               | Consequence for the ACs                                                                                                                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC3 already shipped                          | `CreateIcon.tsx:44-51` renders a "+", used by `CityEarlyAccessNavbar:77-133` (the navbar production actually serves)                                                                                   | AC3 is a no-op on mobile; only desktop presentation changes                                                                                                                                                                   |
| AC4 already shipped                          | `/create` chooser at `src/app/(public)/create/page.tsx:1-110` already offers create vs recommend                                                                                                       | AC4 reduces to making the chooser reachable; the navbar currently deep-links past it to `/create/recommend`                                                                                                                   |
| AC7 already shipped                          | `providers.review_status` enum `pending\|approved\|rejected\|needs_revision\|removed_by_owner`, default `pending` NOT NULL (verified against live DB). 805 pending / 24 approved / 112 rejected of 941 | AC7 is satisfied today. Shipping it as-is reads as a no-op unless moderation throughput is addressed                                                                                                                          |
| AC2 has no referent                          | No Search nav item exists in either navbar; both are hidden on `/search`                                                                                                                               | "After search" is undecidable without a user decision                                                                                                                                                                         |
| The 228 halal gate is already live in `main` | PR #398 merged 2026-09-20. `src/services/admin/halal-gate.ts`, the 422 block at `review-provider/route.ts:99-110`, and `supabase/migrations/128_halal_gate_backfill.sql` are all present in `main`     | No sequencing needed, but the constraint is already binding: a food/store provider with no extension row can never be approved. "Always write the extension row" is therefore a hard requirement, not a forward-compat nicety |
| Create vs recommend already modelled         | `ProviderCreationMode = 'owner' \| 'recommendation'` (`form-provider.tsx:5`); `user_created_id` vs `provider_owner_id` vs `recommender_email`                                                          | No new entity needed                                                                                                                                                                                                          |
| Idle owner-outreach subsystem                | `provider_owner_outreach` (9-value status enum), `provider_owner_action_tokens`, `/owner-decision`, `/api/outreach/claim`. `provider_owner_id` set on 1 of 941 rows                                    | Recommend flow could feed it; currently feeds nothing                                                                                                                                                                         |

### Latent bugs found during the grill

| #   | Bug                                                                                                                       | Location                                                                     | Status                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `providers.listing_type` is NOT NULL with no default, but insert omits it; `resolveListingType()` runs _after_ the insert | `0061_phase4_semantic_constraints.sql:95-96`, `mutations.ts:257-303`, `:330` | **Unconfirmed.** Corroborated by `recommender_email` non-null on 0 of 941 rows; contradicted by user-created rows carrying `listing_type='food'`. Needs a DB connection string to close before implementation |
| R2  | Writes `offers_ids`/`needs_ids` to `providers`; those columns do not exist                                                | `ProviderCreateForm.tsx:231-232`                                             | Confirmed                                                                                                                                                                                                     |
| R3  | Omits `listing_type` and hardcodes `provider_owner_id = user.id`                                                          | `create-quick/review/page.tsx:74-87`                                         | Confirmed                                                                                                                                                                                                     |

## Spec

### Summary

Make the existing create/recommend surface reachable from a "+" tab in both mobile navbars, route it through the existing `/create` chooser instead of deep-linking past it, bring both flows up to repo standard (i18n, icon tokens, Zod validation), let recommenders answer the Halal Check with a tri-state answer, show a provisional halal seal only on the success screen, and let a submitter read back their own pending submission.

Three of the seven original ACs (AC3 "+" icon, AC4 chooser, AC7 pending) are **already implemented**. They become regression tests, not new code. The real work is the entry point, the data-layer correctness bugs, the tri-state halal answers, and i18n.

### Out of scope (split into separate requests)

| #   | Split-out work                                                                                            | Why                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| S1  | Moderation throughput: queue UI, bulk approve, the 805-item pending backlog, approve/reject notifications | Q5. AC7 is already satisfied; content will not become visible until this is addressed, but it is a distinct problem |
| S2  | Merge `StreamlinedRecommendForm` + `StreamlinedImportForm` (~3245 lines, near-duplicate)                  | Q10                                                                                                                 |
| S3  | Unify the two mobile navbars and simplify `navigationUtils.ts:186-423`                                    | Q9. Collides with #227/#247/#250/Plan 253                                                                           |
| S4  | Activate owner-outreach dispatch (`provider_owner_outreach`, action tokens, `/owner-decision`)            | Q2. Tables exist, nothing sends                                                                                     |
| S5  | A Search tab in the bottom nav                                                                            | Q1 chose position 2 instead                                                                                         |
| S6  | Remove the stale `feature/228-halal-attestation-gate` worktree                                            | Its PR #398 is merged; the worktree is leftover. Not removed here because deleting worktrees is the user's call     |

### Enriched acceptance criteria

Derived from the Grill's draft, with every `[BLOCKED]` marker resolved by the decisions above.

#### AC1 — Reuse the existing surface, brought up to repo standard

1.1 `/create` remains the single chooser page. No new chooser is built.
1.2 `/recommend-provider` is deleted and its two callers (`create/page.tsx:26`, `middleware-utils.ts:16,107`) point at `/create/recommend` directly, removing the redirect hop and its hardcoded German "Weiterleitung…".
1.3 Every user-visible string on `/create`, `/create/recommend` and `/create/halal` comes from `t()` and exists in all six locales (`de, en, ar, tr, ur, ps`). Baseline: `create/halal/page.tsx` has **zero** translated strings. See the human-review caveat in Notes.
1.4 Every icon on touched pages is Lucide with a `w-icon-*`/`h-icon-*` token per `docs/design/ICON_USAGE_STANDARDS.md:3-29`. No `@iconify/react`, no `mdi:*`.
1.5 No hex colour literals on touched files; semantic tokens only. Baseline: 6 distinct literals across `create/page.tsx` and `create/halal/page.tsx`.
1.6 Both flows have explicit loading, error and submitting states. Submit is disabled while submitting; a failed submit preserves user input.
1.7 `ProviderCreateForm.tsx:231-232` no longer writes `offers_ids`/`needs_ids` to `providers` (columns do not exist). Fix the path or delete it if unreachable. **[R2]**
1.8 Exactly one submit call site per flow. Baseline: `createProviderOrService` has 5 call sites, two of them live submits for the same owner/recommend pair (`create/contact/page.tsx:97`, `create/media/page.tsx:99`).
1.9 No new duplication in `StreamlinedRecommendForm`/`StreamlinedImportForm`. Shared pieces are extracted or left untouched, never copied.
1.10 A regression test asserts a create and a recommend submission each produce exactly one `providers` row with `review_status = 'pending'` and a non-null `listing_type`.

#### AC2 — Menu placement: "+" in position 2

2.1 The "+" entry is reachable in both `CityEarlyAccessNavbar` and `MobileFooterBar`, at the **same ordinal position (2, directly after Home)**, both targeting `/create`.
2.2 `MobileFooterBar` goes from 3 to 4 items, restoring the tab removed in `38b2794d`. Its `gap-10` was sized for exactly 3 tabs and must be re-verified.
2.3 Active state follows the existing convention: `CreateIcon isActive`, plus the `border-b-[2.4px] border-primary` underline in `CityEarlyAccessNavbar:97`. Active when `pathname === '/create' || pathname.startsWith('/create')`.
2.4 No nav overflow at 320px, 360px and 430px, and **no change to icon sizes** (protects #227, commits `9ca7d6c4`, `2674b96f`).
2.5 The item has an `aria-label` from `t()`, is keyboard reachable, and has a >=44px touch target.
2.6 On desktop the create control stays in the global `Header` at its current position. 255 changes only its presentation (AC3.3) and label source. Position and fluidity remain Plan 253's to own. **[R3]**
2.7 Both nav guard tests still pass: `src/__tests__/components/mobile-nav-icon-flash.test.ts` and `src/__tests__/regression/plan228-providers-food-consolidation.test.ts:178-320`.
2.8 A new test asserts both navbars expose the same "+" target route, so the fork cannot drift. **[Q9 debt mitigation]**

#### AC3 — "+" icon

3.1 Mobile reuses the existing `src/components/ui/icons/CreateIcon.tsx`, already a "+" at `:44-51`. No new asset.
3.2 `CreateIcon` is brought in line with its post-#227 siblings: same size normalisation and crossfade behaviour as `ExploreIcon`/`SavedIcon`/`ProfileIcon`.
3.3 Desktop replaces the `t('navigation.create')` text button (`Header.tsx:250-256`) with a "+" affordance carrying an accessible name from `t()`. Position unchanged.
3.4 `CreateIcon` drops its hardcoded `#777777`/`#589D96` stroke literals in favour of `currentColor` plus token classes.
3.5 Desktop create is currently rendered only when logged in (`Header.tsx:248-256`). Anonymous desktop users therefore have no entry point at all. The "+" is shown to anonymous desktop users too, routing to `/create`, where AC4.4's per-branch gating applies.

#### AC4 — The "+" page offers create or recommend

4.1 Tapping "+" lands on `/create`, offering exactly two primary options: register my own business, or recommend a place. Already implemented at `create/page.tsx:80-95`.
4.2 The mobile "+" no longer deep-links past the chooser. Baseline: `CityEarlyAccessNavbar.tsx:99` goes straight to `/create/recommend`.
4.3 "Register my own" -> `/create/basics` in `owner` mode; "Recommend" -> `/create/recommend` in `recommendation` mode. `creationMode` is set **before** navigation, removing the localStorage race worked around at `create/basics/page.tsx:33-52,64-77`.
4.4 An anonymous user choosing "register my own" hits the existing login gate with a `returnUrl` (`create/basics/page.tsx:81-134`). An anonymous user choosing "recommend" is **not** gated.
4.5 The quick-import card stays behind `enableQuickImport`, unchanged, flag off in production.
4.6 The chooser has a visible back affordance and is keyboard navigable.

#### AC5 — Subpages collect the required data

5.1 Each flow has a Zod schema in `src/lib/validations/`, mirroring the admin pattern in `adminSchemas.ts`. Baseline: no schema on either public flow.
5.2 **Recommend required set:** name, city, category, and the three halal answers. **Owner required set:** today's set plus address and at least one image.
5.3 Required fields are marked in the UI. A failed validation names the specific field rather than firing a generic toast.
5.4 `listing_type` is derived from `categories.applicable_section` and written **in** the insert, not after it. Fixes `mutations.ts:257-303` against the NOT NULL, no-default column. **[R1 — verify empirically first, see Notes]**
5.5 Every food/store submission writes a `food_providers`/`store_providers` row in the same logical operation, so the live 228 gate has data to read (`halal-gate.ts:77-85`). **Hard requirement:** without it the row can never be approved.
5.6 No owner contact channel is captured and no `provider_owner_outreach` row is written. **[Q2: tip only]**
5.7 If `recommender_email` is captured from an anonymous user, an explicit consent checkbox is shown and the consent is written to `consent_logs`. Today the column comment claims consent is obtained but no consent UI exists. **[R8 — flag to compliance]**
5.8 Partial progress survives a reload via `localStorage.providerFormData` and is cleared on success.
5.9 Submitting twice does not create two providers.

#### AC6 — Halal Check answerable, Halal Label deferred

6.1 The three attestations (`no_alcohol`, `no_pork`, `no_gambling`) and the verification method are answerable in **both** flows. Baseline: the recommend flow never sees them; `create/halal/page.tsx:38-45` redirects recommendation mode past the page.
6.2 Each attestation is **tri-state: yes / no / not sure**. Storage: `yes` -> true, `no` -> false, `not sure` -> NULL. Requires the attestation columns to be nullable; verify current nullability before writing the migration. **[Q6]**
6.3 Semantics of each answer, and their interaction with the live 228 gate:

- `yes` on all three -> gate satisfied, admin may approve.
- `no` on any -> written truthfully, row stays `pending`, gate blocks approval. Signals "submitter says this is not halal", so an admin is expected to reject.
- `not sure` on any -> written as NULL, row stays `pending`, gate blocks approval. Signals "unknown, needs verification", distinct from `no`.
  The distinction between `no` and `not sure` must be visible to an admin so the two are triaged differently.
  6.4 No bronze/silver/gold seal, star rating, or tier name is rendered at any point **during** either flow. The textual leak at `create/halal/page.tsx:250-252` ("Online = Bronze, Vor Ort = Silber, Mit Zertifikat = Gold") is removed.
  6.5 The seal appears exactly once, at the end, on the success screen (`RecommendSuccessScreen.tsx:112-127`), rendered by the existing `ProofTierCard`/`computeSealTier`. **No third tier algorithm** is introduced; two already exist (`ProofTierCard.tsx:16-31`, `sectionBadges.ts:31-59`). **[R10]**
  6.6 The success-screen seal is explicitly labelled **provisional**, because the 228 gate can still block approval.
  6.7 All halal question text and verification-method labels are translated in all six locales. See the human-review caveat in Notes.
  6.8 Certificate upload stays optional and validates type and size before upload.

#### AC7 — Submissions sit in pending

7.1 Every provider created through either flow is written with `review_status = 'pending'`. **Already implemented** (`mutations.ts:197`, `:272`) and guaranteed by the NOT NULL column default. This is a regression test, not new code.
7.2 A created or recommended provider does not appear in any public list or detail view until approved. Enforced today by `.eq('review_status','approved')` across `crud.ts:23,245`, `cities.ts:71,132`, `categories.ts:26,36,93,109,178`, `filters.ts:49`, `map-pins.ts:49`. Covered by test, not new code.
7.3 The client cannot set `review_status` to anything other than `pending`. Today nothing at the DB layer enforces this; the insert RLS policy at `001_baseline.sql:3620-3622` does not constrain the column.
7.4 The submitter sees an explicit "awaiting review" message at the end of the flow, not a bare success. `RecommendSuccessScreen` currently says only "BarakAllahu feek".
7.5 The submitter can see their own pending submission in Profile with a pending badge. Requires widening the RLS read policy at `001_baseline.sql:3736-3738` to include `OR user_created_id = auth.uid()`. Today `ProfileContent.tsx:536-600` renders no status and pending rows are invisible to their creator. **[Q7, R9 — needs a migration and a QA pass on `getRecommendations`/`getCreatedProviders`]**
7.6 Moderation throughput, queue UI, and approve/reject notifications are explicitly out of scope (S1).

### Notes

- **AC3, AC4 and AC7 are already implemented.** The "+" already exists in the navbar production serves, the chooser already exists at `/create`, and `pending` is already the NOT NULL default. Shipping 255 will not by itself make more content visible.
- **805 of 941 providers (86%) are already pending; 24 are approved.** Whatever 255 ships, new content stays invisible until moderation throughput (S1) is addressed. This is the single biggest risk to the request's stated goal of "enrich uflow with more content".
- **The 228 halal gate is live in main.** Any food/store provider without a complete extension row can never be approved. AC5.5 is therefore load-bearing.
- **`create/halal/page.tsx` is 100% hardcoded German, including a religious oath** ("Bezeugst du bei Allah…"). Translating it into ar/tr/ur/ps needs a **human reviewer per locale**, not a machine pass. This is a hard dependency on a human and should not block the rest of the feature: ship with German retained plus English, and gate the remaining four locales on review.
- **R1 is unverified.** `providers.listing_type` is NOT NULL with no default and `mutations.ts:257-303` omits it, yet existing user-created rows carry `listing_type='food'`. Either an undocumented trigger exists or the recommend insert has been failing. Corroborating: `recommender_email` is non-null on 0 of 941 rows. The Grill could not reach the DB (`psql` and `supabase db dump --local` both unavailable; both Supabase MCP servers currently fail to connect). **Implementation must verify this empirically as step one.** The fix in AC5.4 is required either way.
- **Anonymous `recommender_email` capture has no consent UI** while the column comment claims GDPR consent, and `consent_logs` is never written. Flag to compliance (AC5.7).
- **No city reaches stage3** (Stuttgart 9, Berlin 6 approved), so `MobileFooterBar` is only reached by authenticated early-access users while production serves `CityEarlyAccessNavbar`. Both must be tested.
- **Merge-conflict risk:** `cr/229-desktop-search-chips-unify` rewrites `de.ts` (2200 lines) and `en.ts` (2181) and edits `Header.tsx`. Add new locale keys at the end of each file and expect a manual merge. Do not touch `SearchBar.tsx`. **[R4]**

## Tickets (multi-session only)

_Filled when the spec is broken into tickets. Omit this section for single-session work._

| #   | Ticket | Branch | Worktree | Status | Handoff doc |
| --- | ------ | ------ | -------- | ------ | ----------- |

## Implementation notes

_Updated during implementation._

- Branch: `feature/255-create-recommend-menu` (pushed, tracking `origin`)
- Issue: [#415](https://github.com/abu-lina/uflow/issues/415)
- Structure: **revised.** Originally single branch / one PR. After C1 confirmed R1 as a live production bug, the user chose to ship C1 immediately as its own PR.
  - C1: `feature/255-create-recommend-menu` -> [PR #416](https://github.com/abu-lina/uflow/pull/416) (open, targets `main`)
  - C2-C6: `feature/255-create-recommend-menu-2`, worktree `../uflow-wt/255-create-recommend-menu-2`, stacked on the C1 branch. Rebase onto `main` once #416 merges.
- Chunk order unchanged (correctness first, UI after), per user decision.

### Chunk plan

| #   | Chunk                                                                                                                        | ACs                                                  | Status                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| C1  | Data-layer correctness + R1 verification                                                                                     | R1, R2, 1.7, 1.8, 5.4, 5.5, 5.9, 7.1, 7.2, 7.3, 1.10 | **Done. Shipped as [PR #416](https://github.com/abu-lina/uflow/pull/416)** |
| C2  | Tri-state halal + migrations (nullable attestations, RLS widening, review_status guard)                                      | 6.1, 6.2, 6.3, 6.4 (text leak), 7.5 (RLS only)       | **Done.** `95d64da3`, `2fd05daf`, `95a9d470`                               |
| C3  | Validation schemas + required fields                                                                                         | 5.1, 5.2, 5.3, 5.8 done; **5.7 partial**             | **Done.** `d052cfcf`. AC5.7 audit-trail write blocked on a schema decision |
| C3b | Login gate on recommend, consent removal, anon RLS branch removal, import attestations, service-boundary enforcement         | 4.4 (revised), 5.7 (dropped)                         | **Done.** `49b2e6cc`                                                       |
| C4  | Nav entry point + icon + chooser routing + migration 130 ownership guard                                                     | 1.1, 1.2, 2.x, 3.x, 4.x                              | **Done.** `614c6657`                                                       |
| C5  | Success screen seal + awaiting-review + Profile pending badge                                                                | 6.5, 6.6, 7.4, 7.5 (UI)                              | **Done.** `be6c0411`                                                       |
| C6  | i18n extraction (de + en; ar/tr/ur/ps gated on human review)                                                                 | 1.3, 1.4, 1.5, 6.7                                   | **Done.** `0823c58d`                                                       |
| R1  | Rework: the six blocking review findings + 3 behavioural tests                                                               | C1, C2, H1, H2, H3, H4                               | **Done.** `b7ac6f6b`                                                       |
| R2  | Rework: certificate upload, JoinHalal NULL defaults, oath variants, seal correctness, admin triage, public-query leak, types | A1, A2, A3, SP1, SP3, SP5, SP6, S5                   | **Done.** `078f3fd3`                                                       |
| R3  | Rework: standards + test hygiene                                                                                             | S1, S2, S3a, S3b, S4, S6, S7, S8                     | **Done.** `2c63e9ab`                                                       |

### Verification commands

- Narrow tests: `npx vitest run <path>`
- `npm run type-check`
- `npm run lint:check`
- `npm run i18n:check` (C6 only)

### Chunk results

#### C1 — Data-layer correctness + R1 verification — **Done**, commit `64cc2255` (not pushed)

**R1: CONFIRMED as a live production bug.** `providers.listing_type` is NOT NULL with no default (confirmed via PostgREST OpenAPI introspection: present in `required`, no `default` key; no trigger or DB default found in `supabase/migrations/` or `sql/`). `createProviderOrService` omitted it, so **every public recommend submission has been failing**. Corroborated by `recommender_email` non-null on 0 of 941 rows. The 4 rows with `listing_type='food'` came from a different RPC path.

**R2: dead code, deleted.** `ProviderCreateForm`'s internal `handleSubmit` wrote the nonexistent `offers_ids`/`needs_ids` columns, but its only caller (`/create/basics`) always passes `onNextStep` and navigates away at step 0, so the internal submit was unreachable. The `'create'` tab in `ProfileContent.tsx` was also unreachable (`UserNavigationTabs` rendered no button for it). All three removed.

**AC1.8 duplicate submit:** `create/contact/page.tsx:97` was the duplicate; the live recommend submit is `StreamlinedRecommendForm` at `/create/recommend`. Contact page is now owner-mode only and redirects stale recommendation state.

| Item          | Result                                                                                                                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files changed | `mutations.ts`, `create/contact/page.tsx`, `ProviderCreateForm.tsx`, `ProfileContent.tsx`, `UserNavigationTabs.tsx`                                                                                       |
| Tests         | New `src/__tests__/regression/255-provider-submit.test.ts` (16 tests); updated `plan228-providers-food-consolidation.test.ts`, `providerService.badges.test.ts`, `providerService.multi-location.test.ts` |
| Verification  | `npx vitest run` on 6 touched files: 79/79 pass. `npm run type-check`: exit 0. `eslint --max-warnings 0`: 0 problems                                                                                      |

**Orchestrator review of C1: accepted.** Checks performed:

| Check                                    | Verdict                                                                                                                                                                                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compensating delete can actually succeed | **Pass.** `locations.provider_id REFERENCES providers(provider_id) ON DELETE CASCADE` (`101_plan_151_multi_location.sql:8`), so the cleanup delete is not blocked by the location row written moments earlier                                         |
| Dedupe Map scope                         | **Pass.** `supabase` is imported from `@/lib/supabase/client` (browser client), so the module-level `inFlightSubmissions` Map is per-tab. No cross-user collision risk                                                                                |
| AC7.3 spoofing genuinely tested          | **Pass.** `insertData` is built field-by-field with no spread from `formData`, and the test at `:209` asserts a spoofed `review_status` cannot reach the payload                                                                                      |
| Commit message accuracy                  | **Minor inaccuracy.** Claims `review_status` "relies on the NOT NULL column default"; it is in fact still set explicitly (`mutations.ts:244`, `:335`). Functionally identical and safe. Corrected in the PR description rather than rewriting history |

Notes carried forward:

- **Non-transactional compensation is debt.** Provider insert, location, badges and extension row are separate statements with best-effort cleanup. The correct fix is a Postgres function doing it in one transaction. Cascade makes the current version safe for AC5.5's failure mode, but uploaded storage images are orphaned when cleanup fires.
- **Deferred to C2:** nothing at the DB layer stops a direct API caller setting `review_status='approved'`; the insert RLS policy (`001_baseline.sql:3620-3622`) does not constrain the column. C2 owns migrations.
- **Deferred:** `ProviderCreateForm`'s multi-step machinery is now dead weight (last-step button calls `requestSubmit()` into a `preventDefault` no-op). Harmless; a fuller cleanup could land later.
- Some tests assert against file source text (repo-existing pattern, e.g. `plan228`). These are brittle under prettier reformatting.

#### C2 — Tri-state halal + migrations — **Done**, commits `95d64da3`, `2fd05daf`, `95a9d470` (not pushed)

23 files, +1410/-564 vs the C1 branch. Took three passes: initial implementation, then two orchestrator-review rounds that each found a real defect.

**Nullability verdict (PostgREST introspection):** `food_providers` had all three attestations NOT NULL DEFAULT false; `store_providers` had only `no_gambling` NOT NULL, but all three defaulted to false. Migration 129 was needed and drops both NOT NULL and `DEFAULT false`, since an omitted answer must mean "unknown", not "submitter said no".

| Migration                              | Purpose                                                                                                                                                                                                                          |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `129_halal_attestation_nullable.sql`   | Drops NOT NULL and `DEFAULT false` on `no_alcohol`/`no_pork`/`no_gambling` for both extension tables                                                                                                                             |
| `130_provider_submission_policies.sql` | Recreates the insert policy with `review_status='pending'` constrained to client branches only (admin `EXISTS` branch untouched and outside the constraint), and widens the SELECT policy with `OR user_created_id = auth.uid()` |

**Gate semantics:** `halal-gate.ts` evaluated `!row[field]`, blocking both `false` and NULL but conflating them. Now split into `denied` (`=== false`) and `unanswered` (`== null`). Gating behaviour unchanged, both still block. Admin-visible via the 422 toast on a blocked approve ("Declared non-compliant: X. Not answered: Y") and the admin-only banner in `ProviderDetailSections`.

**Shared component:** `src/components/shared/HalalAttestationFields.tsx`, one controlled tri-state used by `create/halal/page.tsx`, `StreamlinedRecommendForm`, and both admin edit pages. No duplication, no third tier algorithm.

**Orchestrator review of C2.** What I verified myself, beyond the source-scan tests:

| Check                                                           | Verdict                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Policy names match the baseline so `DROP POLICY` actually drops | **Pass.** `"Allow provider inserts"` and the 63-char truncated `"Public can view approved, users can view own, admins can view a"` both match `001_baseline.sql:3620,3736`. Had either been wrong, the old permissive insert policy would have survived and OR-ed around the new `review_status` guard, silently voiding it |
| Client branches preserved in the rewritten insert policy        | **Pass.** Both original branches verbatim, `review_status='pending'` AND-ed across them, admin branch outside                                                                                                                                                                                                               |
| SELECT widening does not leak anonymous submissions             | **Pass.** `auth.uid()` is NULL for anon and `NULL = NULL` yields NULL, not true, so anon readers gain no access to rows with NULL `user_created_id`                                                                                                                                                                         |
| Migration 129 dropping `DEFAULT false` regresses import paths   | **No.** Those rows previously got `false` ("declared no") and now get NULL ("unknown"). Both block approval, so gating is unchanged and NULL is more honest                                                                                                                                                                 |
| `verification_method='online'` fakes a seal on recommendations  | **No, and no migration needed.** `computeSealTier` (`ProofTierCard.tsx:23-28`) already requires a truthy attestation before awarding a tier, precisely to stop a schema-default verification method faking bronze                                                                                                           |

Two defects found and fixed during review:

1. **NULL silently became "declared no" on admin edit** (`2fd05daf`). Three load sites coalesced `?? false` (`edit/halal/page.tsx:97`, `edit/values/page.tsx:93`, `ProviderEditForm.tsx:175`), so an admin opening and saving an edit form rewrote "unknown" as "submitter said no". Worse, `adminSchemas.ts` typed the fields `z.boolean()`, so NULL could never have reached the API at all: the tri-state was broken end to end. Now `boolean | null` throughout. My initial severity call (that this would auto-reject providers) was wrong and the sidekick corrected it: `edit-provider/route.ts:85-135` only auto-rejects on a `true -> false` flip, which an all-NULL row cannot trigger. The damage was data-level mislabeling, not status changes.
2. **All-NULL providers were awarded an unearned halal star** (`95a9d470`). `computeHalalStars` skipped its attestation guard when every value was NULL, then returned 1 star off the schema-default `verification_method='online'`. So every "not sure" recommendation would have displayed a halal star on discovery cards. This was introduced by migration 129: before it, all-NULL was impossible, so the path only ever saw unjoined rows. Now all-NULL is the default state for the feature. Fixed to require a truthy attestation, matching `computeSealTier`. Safe for existing data because `128_halal_gate_backfill.sql:13-54` uses `IS NOT TRUE`, which covers both `false` and NULL, so no approved row can be all-NULL.

**Verification:** 70/70 on sectionBadges, tri-state, both halal-gate suites and ProviderDetailSections. `npm run type-check` exit 0. Per-file eslint clean.

**Open verification gap:** the RLS policies and the insert guard are **not** exercised against a live database. No local Supabase instance, both Supabase MCP servers fail to connect, and writing to a shared DB to prove a policy works is not acceptable. Coverage is source-scan tests plus my static comparison against the baseline above. **This needs a manual QA step before merge:** confirm an anonymous recommend insert still succeeds, a direct insert with `review_status='approved'` is rejected, and a creator can read back their own pending row while a different user cannot.

Notes carried forward:

- `verification_method` stays `'online'` for recommendations. It is `TEXT NOT NULL DEFAULT 'online'` with `CHECK (... IN ('online','onsite'))` (`091_plan_135_verification_model_upgrade.sql:6,58,69`), so representing "not verified" would need its own migration. Harmless because both tier algorithms now require a truthy attestation. Documented in a code comment.
- The certificate short-circuit still bypasses the attestation guard in both algorithms (`ProofTierCard.tsx:21`, `sectionBadges.ts:39-42`). Consistent between them and defensible, since a certificate is independent evidence.

#### C3 — Validation schemas + required fields — **Done**, commit `d052cfcf` (not pushed)

New `src/lib/validations/submissionSchemas.ts` plus 22 tests. Required sets enforced in each flow's submit handler, with the first failing field mapped through `submissionFieldLabelKeys` to its translated label so the error names the field (AC5.3) rather than firing a generic toast. Required fields marked `*`, following the existing convention.

**Caught a C2 bug I missed in review:** C2 initialised the attestations to `null`, and the component matched `null` to the "not sure" option, so **"not sure" was pre-selected on load**. An untouched form therefore claimed a deliberate answer. Now `no_*` initialise to `undefined` and nothing is pre-selected. The schema uses `z.union([z.boolean(), z.null()])`, which rejects `undefined` while accepting a deliberate "not sure". Draft round-trip verified: `JSON.stringify` drops `undefined` keys, so an untouched answer stays untouched after reload.

**AC5.7 is only partially met.** `consent_logs` does not fit the anonymous-recommender case:

| Blocker               | Detail                                                                               |
| --------------------- | ------------------------------------------------------------------------------------ |
| `user_id` is NOT NULL | An anonymous recommender has no user id                                              |
| `consent_type` enum   | Only `['terms_of_service', 'privacy_policy']`; no value covers email-storage consent |

Shipped: an explicit consent checkbox that appears only when an anonymous user enters a recommender email, gating submit at both UI and schema level (`emailConsent` required iff `userEmail` non-empty), replacing the previous passive "by continuing you agree" paragraph. **Not shipped: the persisted consent record.** A checkbox with no stored record is not demonstrable consent, so AC5.7's compliance intent is unmet until a migration lands. Awaiting user decision.

Notes carried forward:

- **Schema enforcement sits in the submit handlers, not in `createProviderOrService`.** `StreamlinedImportForm` also calls that service in recommend mode and has no halal UI, so enforcing at the service boundary would block every OSM import. Consequence: the "halal answers required" guarantee is bypassable via the import flow. Low urgency, as `/create-quick` is flag-off in production and already split out (S2/Q10), but it is a real hole in the guarantee.
- The global test setup mocks `zod`, so one test needed `vi.unmock('zod')` to exercise real validation. Worth knowing: most suites are not testing real Zod behaviour.
- Owner "address" was interpreted as street + zip + city + country, with online businesses keeping their existing exemption.
- Residual, accepted per spec: a deliberate "not sure" and a never-asked imported row both persist as NULL.

#### C3b — Login gate + consent removal + import attestations — **Done**, commit `49b2e6cc` (not pushed)

Implements decisions D3, D4, D5. No `consent_logs` write anywhere; the C3 compliance gap is dissolved rather than managed.

**Migration 130's final insert policy** (corrected in place, since it has never been applied):

```sql
WITH CHECK (
  (EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = ANY(ARRAY['admin','moderator'])))
  OR (
    review_status = 'pending'
    AND auth.role() = 'authenticated'
    AND user_created_id = auth.uid()
  )
)
```

Anonymous branch gone, admin branch verbatim and outside the constraint, SELECT policy untouched.

**Dead anonymous code removed** from `StreamlinedRecommendForm`, `StreamlinedImportForm`, `mutations.ts` (the `isAnonymous` branch, the null-both-IDs path, the not-anonymous fallback, `userEmail` from the dedupe key and from `ExtendedProviderFormData`), and `submissionSchemas.ts` (`userEmail`/`emailConsent` plus the consent `superRefine`). The C3 `submissionValidation.emailConsent*` locale keys were removed again.

**Defence in depth now three layers:** middleware redirect (early-access mode), a client-side page gate rendering the lock screen before the form mounts, and RLS requiring `auth.role() = 'authenticated'` AND `user_created_id = auth.uid()`. The page gate is UX; RLS is the real enforcement, which is the right split.

**New `importSubmissionSchema`** plus service-boundary enforcement in `createProviderOrService`: a food/store submission with any `undefined` attestation is rejected, explicit `null` ("not sure") is accepted, and the ummah/community-service branch is exempt.

**Verification:** 112/112 across 7 suites. `npm run type-check` exit 0. Per-file eslint clean on all 13 touched files.

**Orchestrator review of C3b: accepted.** One thing I checked and cleared: `isOwner = formData.creationMode === 'owner'` (`mutations.ts:203`) looked like a newly-introduced risk, but it is present in `main` already (`:167`), so C3b introduced nothing. It does mean ownership assignment reads client form state that is subject to the localStorage race, which raises C4's AC4.3 from UX polish to a correctness fix.

New finding, carried into C4:

- **Migration 130 leaves `provider_owner_id` unconstrained on client inserts.** It now constrains `review_status` and `user_created_id`, but a direct API caller can still insert with `provider_owner_id` set to an arbitrary uid, claiming ownership of a business. Existing policies grant UPDATE and DELETE on `provider_owner_id = auth.uid()`, so this is a privilege-escalation path. Proposed fix: add `AND (provider_owner_id IS NULL OR provider_owner_id = auth.uid())` to the client branch. That permits legitimate owner-create (own uid) and recommendations (NULL) while blocking assignment to a third party, and does not touch the admin branch. Cheap, and 130 is still unapplied.
- `/recommend-provider` redirect shim left in place; AC1.2 deletes it in C4.

#### C4 — Entry point + nav + chooser routing — **Done**, commit `614c6657` (not pushed)

**Real overflow caught.** `MobileFooterBar` items are fixed 40px squares with `px-6` padding. At 4 tabs the old `gap-10` needed 160 + 3×40 = 280px against 272px of inner width at a 320px viewport, so restoring the tab would have broken the layout. Changed to `gap-6 sm:gap-10`: 160 + 3×24 = 232px, fits 320/360/430 and keeps the original spacing at >=640px. Verified by arithmetic plus a source-scan test documenting it, not by rendering.

**`creationMode` race fixed on both sides**, which is the ownership correctness fix:

1. `create/page.tsx` calls `setCreationMode(...)` before `router.push` (test asserts source ordering).
2. `create/basics/page.tsx` sets `'owner'` unconditionally on mount, and the localStorage `recommendation` fallback that could skip the login gate and flip `provider_owner_id` semantics is deleted along with `getCreationMode()`/`checkRecommendationMode()`. A stale recommendation draft can no longer survive into an owner submission.

**Migration 130 final client branch**, with the user-approved ownership guard:

```sql
OR (
  review_status = 'pending'
  AND (auth.role() = 'authenticated' AND user_created_id = auth.uid())
  AND (provider_owner_id IS NULL OR provider_owner_id = auth.uid())
)
```

**Other:** `/recommend-provider` deleted entirely (also removed from `APP_ROUTES`, `EARLY_ACCESS_ROUTES`, and its `middleware-utils.ts` special case). `CityEarlyAccessNavbar` "+" repointed from `/create/recommend` to `/create`, so the chooser is no longer bypassed. `Header.tsx` text button replaced by a `+` Link rendered **before** the auth conditional, giving anonymous desktop users an entry point they never had. Chooser got a back affordance and real `<Button>` option cards for keyboard reach.

**Verification:** 393 pass / 2 skipped across `255-create-entry` (13 new tests), both navbar suites, `mobile-nav-icon-flash`, `plan228`, all `255-*` suites and the whole `components/` directory. `npm run type-check` exit 0. Per-file eslint clean.

**Orchestrator review of C4: accepted.** I checked the #227 regression risk specifically, since that learning was "don't change icon sizes": `CreateIcon` was already `49×48` for both active and inactive states in `main` and still is. The rewrite only adopted the sibling crossfade pattern (`absolute inset-0`, `transition-opacity duration-150`), matching `ProfileIcon`. No geometry change.

#### C5 — Success screen + awaiting-review + Profile badge — **Done**, commit `be6c0411` (not pushed)

**The no-seal case is the common case**, and the ACs understated this. `computeSealTier` requires a truthy attestation, so a recommender answering "not sure" to all three earns no tier. The success screen therefore treats "no seal" as the primary state: no placeholder, no greyed seal, no "tier pending" badge that could read as a tier. A seal renders only when actually earned, inside a `ProofTierCard provisional` block with an amber caption, reusing the amber convention `ProofTierCard` already applies to unapproved providers.

**The owner flow has no success screen at all.** It ends in `create/media/page.tsx` with a toast and `router.push('/food')`. Rather than inventing a surface, the misleading "Anbieter erfolgreich erstellt!" toast was replaced with an honest submitted-and-awaiting-review message. Good call: the old copy read as "done and live" when the row is pending.

**No timeline or notification is promised anywhere**, which is correct: there is no notification system, no moderation queue, and the backlog is 805 pending against 24 approved. Any "we'll email you shortly" copy would have been a lie.

**`getRecommendations`/`getCreatedProviders` needed no fix.** Neither filters on `review_status` (`crud.ts:180-229`); they scope by `provider_owner_id`/`user_created_id` and let RLS decide, so migration 130's widened SELECT policy already returns pending rows to their creator. This was the QA risk I flagged (a widened policy does nothing if the query still filters) and it came back clean.

Pending badge (`submissionStatus.pendingBadge`, "Wird geprüft" / "Under review") added via a `statusBadge` prop on `MobileProfileProviderCard` and `SelectableCard`, wired at all four provider lists (mobile and desktop, created and recommended).

**Verification:** new suite 20/20, plus all `255-*` suites, both halal-gate suites, `ProofTierCardQA` and `sectionBadges`: 155/155. `npm run type-check` exit 0. Per-file eslint clean.

**Orchestrator review of C5: accepted.** Two checks:

| Check                                                         | Verdict                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tri-state survives the write path                             | **Pass.** The report described the seal input capture as using "`\|\| 'online'`/`\|\| false` normalization", which would have destroyed the tri-state if applied to attestations. The code uses `?? null` for `no_alcohol`/`no_pork`/`no_gambling`; only `verification_method` and `has_certificate` use `\|\|`, and neither is tri-state |
| The new `provisional` prop cannot leak a seal on public pages | **Pass.** Used only at `RecommendSuccessScreen.tsx:174`, defaults to `false` in `ProofTierCard`, so provider detail pages are unaffected                                                                                                                                                                                                  |

Note carried forward: the success screen derives the seal from form state captured before reset, duplicating the write-time normalization from `mutations.ts:389-390`. Both currently agree, but it is two copies of one rule and will drift. Extracting a single shared normalizer would be the durable fix.

## Review findings

Final independent two-axis review over `git diff main...HEAD` (9 commits, 62 files), run by a **fresh subagent with no prior context on this branch**, deliberately not the sidekick that authored it. That choice paid for itself: it found a Critical regression that both the author's self-verification and my six per-chunk reviews had missed.

**None of the six blocking findings were caught by `npm run type-check`, `npm run lint:check`, `npm run i18n:check`, or any of the 1,459 passing tests.**

### Root cause of the cluster

> The tri-state value survives the TypeScript layer and dies at the two boundaries nobody tested: localStorage on the way in, and the SQL RPC on the way out.

Per-chunk review verified each layer in isolation. Nobody traced a single attestation value end to end. This is the same failure mode as the `i18n:check` break that spanned C2/C3/C5 and only surfaced in C6, one layer down.

### Blocking findings — all fixed in `b7ac6f6b`

| #   | Sev      | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Fix                                                                                                               |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| C1  | Critical | **Desktop owner create impossible for every food/store provider.** `create/basics/page.tsx:115-117` renders `UnifiedProviderCreateForm` at >=`sm`, which submits directly and has **no halal UI**, so attestations stayed `undefined` and C3b's service guard (`mutations.ts:282-291`) threw for every food/store listing, swallowed into a generic toast. A regression we introduced: before these commits `initialFormData` supplied `false`. Only `ummah` still worked | `HalalAttestationFields` rendered in the desktop form; three fields added to `ownerSubmissionSchema`              |
| C2  | Critical | **Tri-state dies in SQL.** The `admin_update_provider` RPC (`124_fix_nullable_string_coalesce.sql:117-128,142-153`) COALESCEs the attestations to `false`, and `EXCLUDED.*` is the already-coalesced value, so NULL can never be written through the admin UI. `2fd05daf` fixed only the TypeScript layer despite its commit message. The value written instead (`false` = "declares not halal") is the one that tells an admin to reject                                 | New migration `131`, replacing all six COALESCE sites with 124's own `CASE WHEN ... ? 'key'` key-presence pattern |
| H1  | High     | `ProviderEditForm.tsx:268-270` used `parsed.noAlcohol ?? prev.noAlcohol`, so "not sure" was a no-op before the RPC even ran. The guard test at `255-tri-state-halal.test.tsx:339` regexed only `?? false` and passed cleanly                                                                                                                                                                                                                                              | `'noAlcohol' in parsed ? ... : ...`; regex test replaced with a behavioural one                                   |
| H2  | High     | `ownerSubmissionSchema` omitted the three attestations and `/create/halal`'s Next had no `disabled`, so a user skipped the questions and dead-ended at `/create/media` with a generic toast two steps from the fields. Violated AC5.3 for exactly the fields AC6.1 makes mandatory                                                                                                                                                                                        | Schema fields added; Next gated on all three answered                                                             |
| H3  | High     | Stale `localStorage.providerFormData` drafts written with the old `false` defaults restore as three deliberate "No" answers and submit as declared non-halal. High likelihood, not low: the pre-C1 flow failed at submit for everyone, so abandoned drafts are the normal state                                                                                                                                                                                           | Storage key bumped to `providerFormData_v2`                                                                       |
| H4  | High     | The compensating delete **cannot run for recommendations**: the DELETE policy (`001_baseline.sql:3784`) keys on `provider_owner_id = auth.uid()`, which is `null` for a recommendation. And `.delete()` returns `{ error }` rather than throwing, so the `try/catch` never fired and the failure was silent                                                                                                                                                               | Error now read and surfaced as a loud combined error naming the orphaned provider id                              |

**My own miss on H4:** I accepted the compensating delete in the C1 review on the strength of `locations.provider_id` cascading. The cascade was never the binding constraint; the DELETE policy was. I verified the wrong precondition and moved on.

### What held up under scrutiny

- **Migration 130 is correct as written.** Verified line by line against `001_baseline.sql:3620,3736`: `DROP POLICY` names match byte for byte including the 63-char truncation, the admin/moderator branch is preserved verbatim and sits outside the `review_status` constraint, and an anonymous caller cannot satisfy the client branch, insert `approved`, or set another user's `provider_owner_id`. The SELECT widening adds only `user_created_id = auth.uid()`, and `auth.uid()` is NULL for anon so no comparison evaluates true.
- **The login gate holds at the RLS layer**, not just in the UI. Even with every client gate bypassed, `mutations.ts:342` writes `user_created_id: user?.id ?? null`, which fails 130's WITH CHECK for an anonymous caller.
- **The C4 ownership race is genuinely gone** (all four call sites traced; no path leaves a recommendation with `provider_owner_id` set).
- `halal-gate.ts`'s denied/unanswered split is clean.

### Verification-quality finding

Five of the six blocking findings were invisible to every automated check because a large share of this branch's tests assert **file source text** rather than behaviour. Specific tests that would pass while their own target bug is live: the `?? false` regex (blind to `?? prev`), the nav-overflow test that never renders at any width, the migration-substring tests, and the seal-leak test that scans a file which renders the leaking component indirectly. Three real behavioural tests were added with the fixes, each confirmed red with its fix stashed.

### Remaining findings and their disposition

| #                          | Finding                                                                                                                                                                                                                                                                                                                                                                     | Disposition                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| A1/SP2                     | Certificate never uploaded or validated; `has_certificate: true` + `certificate_url: null` short-circuits `computeSealTier` to **gold** ("certificate on file"), one approval away from a false gold seal                                                                                                                                                                   | **User chose: build upload + validation properly.** In the follow-up handoff, plus closing the false-gold path in both algorithms |
| A2/SP4                     | JoinHalal importer hardcodes `no_alcohol: true`, and RPC `090:111` defaults it to `true`. Under new semantics `no_pork: false` means "declared serves pork", so the whole corpus reads as `denied`, and every imported row gets a free bronze tier from an import default                                                                                                   | **User chose: fix defaults to NULL now, backfill separately.** New migration; no backfill in this branch                          |
| A3/SP7                     | The oath sits above tri-state controls, so "Not sure" answers an oath sworn before Allah                                                                                                                                                                                                                                                                                    | **User chose: oath for owners (yes/no only), neutral phrasing for recommenders and admins (yes/no/not sure)**                     |
| SP1                        | `verification_method \|\| 'online'` hardcoded into the seal input, so one `true` attestation manufactures a bronze tier from a method nobody chose. AC6.1's verification-method question is missing from both recommend flows                                                                                                                                               | In follow-up: pass `?? null` to the seal, add the question                                                                        |
| SP3                        | Admin no/not-sure distinction survives in only 1 of 4 surfaces. `edit/halal/page.tsx:476,486,496` uses `!data.noAlcohol` (true for both `false` and `null`); `ProviderDetailSections.tsx:282` headlines "Not halal", and its `:235` trigger fires for **every** food/store row because `verification_method` is NOT NULL DEFAULT `'online'`                                 | In follow-up                                                                                                                      |
| SP5                        | Three unfiltered public queries now return the caller's own pending rows via the widened policy: `suggestions.ts:25-29`, `cities.ts:210`, `crud.ts:167-177`. AC7.2 says no public list                                                                                                                                                                                      | In follow-up                                                                                                                      |
| SP6                        | `UnifiedProviderCreateForm.tsx:205-207` still toasts `providerCreated`; C5 fixed only the other owner submit site                                                                                                                                                                                                                                                           | In follow-up                                                                                                                      |
| S5                         | `adminProvider.ts:25-27,35-37` and `chat/types.ts:109-110,151-153` still type the attestations `boolean`, not `boolean \| null`. No compile error because the pages read untyped `res.json()`, so it is a trap                                                                                                                                                              | In follow-up                                                                                                                      |
| S1, S2, S3, S4, S7, S8, S6 | 8 new hex literals in `HalalAttestationFields` (net increase on the create surface); `@iconify`/`mdi:` still in components those pages render; dead recommendation-mode branches; vestigial `isRecommendationMode` param; duplicated login-gate blocks with inconsistent lock icons; only 1 of 4 `MobileFooterBar` aria-labels translated; remaining weak source-scan tests | Queued as a final hygiene handoff                                                                                                 |
| SP8                        | `computeHalalStars` is inert in production: no list or search query joins `food_providers`, and the two card adapters disagree on which fields they forward                                                                                                                                                                                                                 | Informational; no action                                                                                                          |

### Rework after review

Three consolidated handoffs, batched by area rather than sent piecemeal.

**R1 `b7ac6f6b`** — all six blocking findings, each with **red-with-fix-stashed evidence**, which is the standard I asked for after the review showed that passing tests proved nothing. 550/550 across regression and API suites.

| Finding | Fix                                                                                                             | Proof                                                                                                                                                         |
| ------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1      | `HalalAttestationFields` rendered in `UnifiedProviderCreateForm`; three fields added to `ownerSubmissionSchema` | Renders the desktop form, answers the three radiogroups, submits, asserts the provider insert and `food_providers` upsert. Fails 3 tests with the fix stashed |
| C2      | Migration `131`, replacing all six COALESCE sites with 124's own `CASE WHEN ... ? 'key'` pattern                | Asserts the RPC receives `null` and the migration contains zero `COALESCE(...->>'no_*'..., false)` remnants                                                   |
| H1      | `'noAlcohol' in parsed ? ... : ...`                                                                             | Seeded `{noAlcohol: null}` over a provider whose ext row says `true`; asserts `null` reaches `onSubmitForm`. Comes back `true` with the fix stashed           |
| H2      | Schema requires the three; `/create/halal` Next gated                                                           | Next disabled until the third answer, then navigates                                                                                                          |
| H3      | Storage key bumped to `providerFormData_v2`                                                                     | A legacy draft with `no_alcohol: false` restores as `undefined`                                                                                               |
| H4      | `{ error }` now read; throws a loud error naming the orphaned provider id                                       | Asserts the combined error and the id. Silent pass-through with the fix stashed                                                                               |

H4 is loud-but-manual; a `SECURITY DEFINER` cleanup RPC remains the durable answer and is deferred.

**R2 `078f3fd3`** — the three user decisions plus the remaining correctness findings. 856/856 across 66 files.

- **Certificate upload built** (`src/lib/validations/certificate.ts`): type and size validation (5 MB, matching the admin page's existing client-side check), upload to the `provider-certificates` bucket following `uploadEntityImages` conventions, re-validated at the service boundary. `has_certificate` is only written `true` when a real `certificate_url` exists. **Both** tier algorithms now require a non-null `certificate_url` for gold, so a bare toggle and legacy rows cannot mint gold. I verified this one myself in both files.
- **JoinHalal defaults → NULL** in the transform and in new migration `132`, so an import with no information records "unknown" rather than minting `no_alcohol: true`. No backfill, per decision. Expected impact once applied: newly imported rows arrive unattested instead of claiming bronze and "serves pork".
- **Oath variants**: `HalalAttestationFields` takes `variant: 'oath' | 'neutral'`. Owner surfaces keep the oath and offer Yes/No only, so owners never write NULL; recommend, import and admin surfaces use neutral phrasing with Yes/No/Not sure. `ownerSubmissionSchema` now rejects both `null` and `undefined`, and the `validOwner` fixture had to change `no_pork: null -> false`, which is real evidence the schema behaviour changed. The admin page's hardcoded German oath now goes through `t()`.
- **Seal from real answers**: both streamlined forms pass `verification_method ?? null` into the seal input and now render a `VerificationMethodField`, satisfying AC6.1. The `|| 'online'` write-time fallback stays, since the column is NOT NULL with a two-value CHECK.
- **Admin triage**: `false` and `null` are now distinguished on the admin halal page, and the "Not halal" banner needs at least one `false` declaration rather than firing on every row with a default `verification_method`.
- **Public-query leak closed**: `.eq('review_status', 'approved')` added to `suggestions.ts`, `cities.ts` (no-query branch) and `getProviderCount`, verified with a recording-client proxy. Remaining unfiltered reads are owner-scoped by design.
- Types widened in `adminProvider.ts` and `chat/types.ts`; desktop owner toast corrected.

**R3 `2c63e9ab`** — standards and test hygiene. 1344/1344 across 126 files.

- **S3a was more than hygiene:** `UnifiedProviderCreateForm.handleSubmit` still had an `isRecommendationMode` branch that let `!user` through **and skipped validation entirely**. Not reachable, held off only by effect ordering, but one reorder away from an anonymous unvalidated submit in a form that submits directly. Deleted, plus `doCreateProviderOrService` now throws a readable `Authentication required` before any storage or insert work, so a bypassed gate is diagnosable rather than surfacing a raw PostgREST rejection.
- Dead recommendation-mode branches removed from `create/halal` and `create/media`, and partially from `create/contact`. **Justified pushback accepted:** the sidekick kept `create/contact`'s `router.replace('/create/recommend')` because it is genuinely reachable (after a recommend submission `creationMode` stays `'recommendation'`, so manual navigation would render the owner page over recommendation draft data).
- Vestigial `isRecommendationMode` parameter removed after checking all call sites for disagreement; none found, so it was a cleanup rather than a hidden bug.
- Hex literals: 5 removed from `HalalAttestationFields` plus 6 more swept from both streamlined forms. The extraction test now scans rendered components, not just the three page files, which is why these slipped through.
- Icons: `@iconify`/`mdi:`/`material-symbols:` removed from `RecommendSuccessScreen` and both streamlined forms, converted to Lucide with size tokens. Note `strokeWidth: 8` was iconify-only and would have rendered absurdly thick in Lucide.
- One shared `LoginGate` replaces three near-identical 45-line blocks and the inconsistent lock icons.
- All four `MobileFooterBar` aria-labels translated. One deviation: `navigation.saved` had to go inside the existing `navigation` object rather than appended at file end, since a duplicate top-level key is illegal. Flagged for the `cr/229` merge.
- **Weak tests replaced, not deleted:** nav overflow now renders at the three widths and does the arithmetic on the rendered class; the seal-leak test renders the form and asserts no seal image, caption or alt text, so it catches a leak through any indirection; migration-text assertions renamed to say what they actually check, with a comment pointing at the unverified-against-live-DB gap.

## QA results

**Full suite: 2488/2488 pass across 272 files** (2 files / 28 tests skipped, pre-existing). `type-check` clean, `i18n:check` key-complete, per-file eslint clean.

**CI: green.** Run [36243663373](https://github.com/abu-lina/uflow/actions/runs/36243663373) — Supply Chain IOC Scan, Build Verification, Lint & Type Check, Security Audit, Run Tests, CI Summary all success.

### CI coverage gap, found late

`ci.yml:3-5` triggers only on `pull_request` targeting `[main, develop]`. PR #418 is stacked on `feature/255-create-recommend-menu`, so **the pipeline never ran on it**; only Snyk did. I had told the user CI was running in parallel, which was wrong. Triggered explicitly via `workflow_dispatch`. Once #416 merges, #418's base retargets to `main` and CI runs natively.

### What the first CI run caught, and why local runs missed it

Both failures were ours, and both were invisible to every prior run because **my briefs asked for "the narrowest checks that cover the change"** and the directory list I supplied (`regression/`, `api/`, `components/`, `utils/`, `services/`) never included `src/__tests__/features/`. That is exactly where the breakage was.

| Failure                                                       | Cause                                                                                                                                                                                                                                        | Fix                                                                                                                                                                                     |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProofTierCardQA.test.tsx`, 7 of 13 failing                   | Asserted the old contract: `hasCertificate` alone yields gold. R2 deliberately made gold require a real `certificate_url`                                                                                                                    | Tests updated to pass `certificateUrl` where genuine gold is intended, plus the motivating negative case (toggle without URL earns no gold but still bronze). 14/14. Guard not weakened |
| `joinhalal-section-fields.test.ts` (not in CI's failure list) | Asserted the old import defaults `no_alcohol=true`, `no_pork=false`                                                                                                                                                                          | Four assertions to `toBeNull()`, matching A2's tri-state contract. Guard not weakened                                                                                                   |
| Perf budgets: `/food` 374/370 kB, `/p/[id]` 290/286 kB        | The **all-six-locale translations bundle**, statically imported by `LanguageProvider` in root `ClientProviders`, so every route paid for it. The C1 tip was already ~1 kB over both, so reverting our i18n additions would not have sufficed | `en`/`de` eager, `ar`/`tr`/`ur`/`ps` via per-language dynamic `import()`. `/food` 315 kB, `/p/[id]` 231 kB. **~59 kB off every route**                                                  |

**Budgets were not raised.** The org guardrails prohibit weakening a CI quality gate, and a 1.6% overage is not a reason to move a threshold.

**Trade-off checked, not assumed:** gated-locale users get their chunk one network tick after detection with `de` as interim fallback. No layout or direction jump, verified: neither `LanguageProvider` nor `translations/index.ts` derives `dir`/`rtl` from the bundle. No user-visible change today since those locales are German-seeded. Whoever lands real translations should re-check first paint for `ar`/`ur` (both RTL).

Scope note: `LanguageProvider.tsx`, `translations/index.ts` and `MobileGreetingHeader.tsx` were not previously in this diff. Fixing the shared chunk at source was judged better than shaving bytes off unrelated components.

## UAT regression after #416 merged (fixed)

PR #416 merged at 13:19 and auto-deployed to UAT (`deploy-uat.yml` runs on push to `main`). Recommendations then failed at `POST /rest/v1/locations` with `42501 new row violates row-level security policy`.

**Root cause.** The `locations` INSERT policy (`101_plan_151_multi_location.sql:68-77`, never revised) was `auth.uid() IN (SELECT provider_owner_id FROM providers WHERE provider_id = locations.provider_id)`. A recommendation has `provider_owner_id = NULL` by design, so the subquery yielded NULL, `auth.uid() IN (NULL)` evaluated to NULL rather than true, and the check failed. That policy had only ever permitted owner-created providers. `createPrimaryLocation` is called at the same points on `main` as on this branch, so the call was not new: C1's `listing_type` fix simply let the flow reach the next wall.

**Why worse than a 403.** `createPrimaryLocation` sits in the `Promise.all` at `mutations.ts:402` and throws; the extension-row write and its compensating delete are both after it. So every attempt left an orphaned provider row with no location and no extension row, which the live 228 gate makes permanently unapprovable, and the `providers` DELETE policy also keyed on `provider_owner_id` so nothing could clean it up. The H4 finding materialising.

**The systemic pattern:** every RLS policy keyed on `provider_owner_id` silently excludes recommendations. `provider_owner_id` is set on 1 of 941 rows.

**Fix, migration 133** (`fba42d80`, `3a694a14`):

| Policy             | Change                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `locations` INSERT | Permits the creator as well as the owner, via `EXISTS` rather than the `IN`-subquery that caused the bug. Creator branch gated on `review_status = 'pending'`; owner branch unconditional. Asymmetry is deliberate and commented: an owner legitimately manages locations on an approved listing, but a creator who cannot edit the row must not keep adding publicly-visible locations to it after approval |
| `providers` DELETE | Additionally permits a creator to delete their own `pending` row so cleanup can run. Scoped to `pending` so creating a row never grants deletion of an approved provider. Admin branch verbatim                                                                                                                                                                                                              |

Both `DROP POLICY` names verified against their sources (`101:68`, `001_baseline.sql:3784`), so no stale permissive policy survives. Admin location management unaffected: `admin_update_provider` is `SECURITY DEFINER` (`102:10-13`, verified in the function body). All three location-insert paths confirmed to write immediately after a `pending` provider insert, so the `pending` gate blocks nothing legitimate.

**Orphan window closed:** `cleanupAfterFailedInsert` now wraps every post-insert statement in both branches, not just the extension-row write, rethrowing the original error verbatim and naming the orphan id if cleanup itself fails. A new test walks a recommendation through every write and asserts each lands.

**Bonus:** the chat `register_provider` path (`tool-executor.ts:410`) was hitting the same 42501 and is unblocked by the policy fix. Its location error is swallowed with `console.error` and has no cleanup; pre-existing, separate flow, flagged not fixed.

**Environment exposure, verified:**

| Environment | Trigger                         | Last deploy      | Affected                         |
| ----------- | ------------------------------- | ---------------- | -------------------------------- |
| UAT         | `push` to `main`                | 2026-09-26 13:24 | **Yes**, orphans generated since |
| Production  | manual `workflow_dispatch` only | **2026-08-16**   | **No**, never received #416      |

**Do not dispatch a production deploy until #418 merges.** Deploying `main` as it stands would take production from "recommendations fail cleanly" to "recommendations fail and leave permanently unapprovable orphans".

Cleanup SQL for existing UAT orphans is in the [#418 comment](https://github.com/abu-lina/uflow/pull/418), for a human with DB access to run.

**Branch note:** someone rebased `feature/255-create-recommend-menu-2` onto the new `main` and force-pushed while I was working. I replayed only my two missing commits onto the rebased tip with `git rebase --onto`, rather than forcing my stale history over it. No conflicts, and CI is green on all 6 jobs on the rebased state. A stash (`stash@{0}`) in that worktree holds two unrelated pre-existing changes; the learning it contained (PR #395 / Issue #394, button `type="submit"` double-fire) has been persisted to `docs/ai/LEARNINGS.md` so it is not lost when the worktree is removed.

## Outstanding before merge

| #   | Item                                                                                                                                                                                                                                                   | Owner                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| 1   | ~~Merge PR #416~~ — **done**, merged 2026-09-26 13:19 as `c171270a`. Auto-deployed to UAT, which surfaced the `locations` regression above. **Merge #418 next**, and hold the production deploy until it lands                                         | User (guardrails require human review) |
| 2   | **`SUPABASE_DB_URL` for the dev project.** Requested early and still not present in `.env.local`, so migrations 129-132 remain unverified against a real database. Policy correctness currently rests on static review plus tests asserting SQL _text_ | User                                   |
| 3   | **ar / tr / ur / ps translation.** 36+ keys German-seeded as marked interim. Checklist: `agent-output/requests/255-i18n-human-review.md`                                                                                                               | Human reviewer per locale              |
| 4   | **Religious oath sign-off.** English rendering is deliberately literal and unapproved; no machine translation was applied to the four locales                                                                                                          | Native speaker                         |

## Follow-up requests

_New work discovered during this request. Do not act on these; finish the current request first._

| #   | Work                                                                                                                                     | Why it was split                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | **Moderation throughput:** queue UI, bulk approve, the 805-pending backlog, approve/reject notifications                                 | The honest caveat on this whole feature. AC7 was already satisfied before any of this work; nothing here makes more content visible until the queue is addressed |
| S2  | Merge `StreamlinedRecommendForm` + `StreamlinedImportForm` (~3245 lines, near-duplicate)                                                 | Large refactor                                                                                                                                                   |
| S3  | Unify the two mobile navbars, simplify `navigationUtils.ts:186-423`                                                                      | Collides with #227/#247/#250 and Plan 253                                                                                                                        |
| S4  | Activate owner-outreach dispatch (`provider_owner_outreach`, action tokens, `/owner-decision`)                                           | Fully built and completely idle; `provider_owner_id` set on 1 of 941 rows                                                                                        |
| S5  | A Search tab in the bottom nav                                                                                                           | Q1 chose position 2 instead                                                                                                                                      |
| S6  | Remove the stale `feature/228-halal-attestation-gate` worktree                                                                           | Its PR #398 is merged; deleting worktrees is the user's call                                                                                                     |
| S7  | **JoinHalal corpus backfill.** Defaults now write NULL, but existing rows keep their minted `no_alcohol=true` and `no_pork=false` claims | Data migration across 941 rows wants its own review and rollback plan                                                                                            |
| S8  | `SECURITY DEFINER` cleanup RPC for the H4 compensation path                                                                              | Current fix makes the failure loud and the orphan identifiable, but cleanup is manual                                                                            |
| S9  | Transactional submission via a Postgres function                                                                                         | Provider, location, badges and extension row are separate statements with best-effort compensation                                                               |
| S10 | Shared normalizer for the seal inputs                                                                                                    | The success screen duplicates the write-time normalization in `mutations.ts`; they agree today but will drift                                                    |

## Learnings

Five captured and persisted to `docs/ai/LEARNINGS.md` per the `workflow.mdc` rule.

1. **A NOT NULL column with no default silently killed the whole recommend flow.** Derive-then-insert, never insert-then-derive. Never `catch` around a write whose failure leaves the row unusable. Sanity-check a feature's health with a data question ("how many rows has this path ever produced?"), not a code read; the answer here was zero.
2. **Making a column nullable silently reinterprets every read of it.** Adding NULL to a domain is a semantic change, not a constraint change. Treat `?? false`, `!x`, `Boolean(x)` and `!== undefined` on a newly-nullable column as defects until proven otherwise, and check the validation layer too, since a Zod `z.boolean()` in the middle makes a tri-state impossible end to end.
3. **A blocked requirement can dissolve instead of being met.** The `consent_logs` wall was resolved by a product decision (require login) rather than a migration. Escalate a schema collision as a genuine choice with costs named, and leave room for an answer outside your own list; the winning option came from the user and beat all four of mine.
4. **Source-scan tests buy confidence without buying coverage.** A guard test asserting `not.toMatch(/noAlcohol.*\?\? false/)` passed while the real bug, `?? prev.noAlcohol`, sat in the same file. Prove a new test works by making it fail. Review the final diff with a **fresh** reviewer, not the author and not whoever reviewed the pieces.
5. **"Narrowest checks that cover the change" is only safe if you know what the change covers.** My directory list never included `src/__tests__/features/`, which is exactly where two deliberately-changed contracts were still asserted. Run the full suite before opening a PR, and verify CI actually triggered rather than trusting a green-looking checks list; a PR stacked on a non-`main` base skips `ci.yml` entirely.
