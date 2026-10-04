---
ID: 133
Origin: 133
UUID: b4e71f9c
Status: Active
---

# Architecture Findings — Halal Proof Tier Rework (Plan 133)

## Changelog

| Date       | Handoff Context                        | Outcome Summary                                                                                                                                                                                                                                                                                                                                      |
| ---------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-20 | Orchestrator → Architect (initial ADR) | ADR created: 3-tier proof model, data model decisions, component inventory, migration assessment. APPROVED                                                                                                                                                                                                                                           |
| 2026-05-20 | Owner feedback: cleanup unused fields  | **CRITICAL FINDING**: `upsert_joinhalal_providers` RPC references 4 dropped columns (`halal_level`, `no_alcohol`, `offers_ids`, `needs_ids`). RPC is broken on production. Section 7 (Legacy Cleanup) added. Blast radius expanded: +RPC rewrite, +import script update, +stale translation key removal. Conditions 1-2 and 5 added to Planner gate. |

---

## 1. Problem Statement

The current provider detail page has a **structural contradiction** between two co-existing elements:

1. **Baseline Gate (HalalTrustBanner)** — Displays at the bottom of every detail page/modal: _"Restaurants on Ummah Flow are checked for halal compliance"_. This communicates that listing on UFlow = halal guarantee (entry requirement).

2. **Proofs Section (AttestationCard + TrustBadgesSection)** — Lives inside the `ExpandSection title="Proofs"` accordion. Shows per-provider commitments (`no_alcohol`, `no_pork`, `no_gambling`) with a "declared by Allah" attestation, plus trust badges.

**The contradiction**: If _every listing_ is halal (baseline), why does a "Proofs" section exist implying _some_ providers have more evidence than others? Users reasonably ask: "If this one has proofs and that one doesn't, is the one without proofs less halal?"

### Current Data State (Production)

| Table             | Column                   | Status                                           |
| ----------------- | ------------------------ | ------------------------------------------------ |
| `food_providers`  | `halal_level SMALLINT`   | **100% NULL** (973/973 rows) — completely unused |
| `food_providers`  | `no_alcohol` / `no_pork` | 2 providers have `true`; 971 have `false`        |
| `store_providers` | `no_gambling`            | 0 providers have `true` (342/342 = `false`)      |

The `halal_level` column was introduced in migration 083 but never populated by any import pipeline or UI flow.

---

## 2. Proposed Model

### Core Insight: Separate **Gate** from **Transparency**

Two fundamentally different concepts must be separated in the UI AND in the data model:

| Concern           | Nature                   | What it answers                  | Variability                                  |
| ----------------- | ------------------------ | -------------------------------- | -------------------------------------------- |
| **Baseline Gate** | Binary admission control | "Is this listing halal?"         | No — all listed providers pass it. Constant. |
| **Proof Tier**    | Transparency signal      | "HOW was halal status verified?" | Yes — 3 levels of verification depth.        |

The proof tier does NOT imply "more halal" or "less halal". It indicates **verification depth** — how UFlow confirmed the provider meets the baseline. Every provider meets the baseline; the tier tells users how much effort went into verifying that claim.

### Three-Tier Proof Model

| Tier | Name (EN)      | Name (DE)           | Verification Method                                | Examples                                                                |
| ---- | -------------- | ------------------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| 1    | Online Check   | Online-Prüfung      | Website/menu checked online                        | Menu states halal, no alcohol visible on menu                           |
| 2    | Personal Visit | Persönliche Prüfung | Physical visit, spoke with owner/staff             | Visited kitchen, interviewed owner, confirmed meat source               |
| 3    | Certified      | Zertifiziert        | Official halal cert for meat + signed declarations | IFANCA/HMC cert on file, signed alcohol-free + gambling-free affidavits |

**Tier semantics are ADDITIVE** — Tier 2 implies Tier 1 was also done. Tier 3 implies Tier 2 + Tier 1.

---

## 3. Architecture Decisions

### ADR-133/D1: Repurpose `halal_level` as `proof_tier`

**Status**: ACCEPTED

**Context**: `food_providers.halal_level` is a `SMALLINT` column that exists on all 973 food provider rows but is 100% NULL. It was introduced in migration 083 (supertype unification) but never consumed by any pipeline. We need a column to store the proof tier (integer 1–3).

**Decision**: Rename `halal_level` → `proof_tier` on `food_providers`. Add `proof_tier SMALLINT` to `store_providers` for parity (stores also have verification levels). Do NOT add to `ummah_providers` (community services have a different trust model via `is_verified`).

**Consequences**:

- Positive: Zero data loss (column is 100% NULL). Reuses existing column, no new migration complexity. Integer type matches tier semantics naturally.
- Positive: `SMALLINT` accommodates future tier expansion (up to 32,767 values) without schema change.
- Negative: Requires a migration to rename + add CHECK constraint.
- Neutral: `ummah_providers` remains excluded — community services' trust signal is different (verified vs. not verified).

**Alternatives Considered**:

1. **ENUM type** (`proof_tier_enum`): Rejected. Enums are difficult to extend in Postgres (requires `ALTER TYPE ... ADD VALUE` in a non-transactional context). Integer with CHECK is more flexible.
2. **Lookup table** (`proof_tiers`): Rejected. Only 3 values, unlikely to exceed 5. A lookup table adds a JOIN for zero benefit. Tier labels live in i18n, not in the DB.
3. **JSONB column**: Rejected. Structured data with a fixed, small schema (just an integer). JSONB adds parsing overhead and loses type safety.
4. **Keep `halal_level` name**: Rejected. "halal_level" implies quality gradation ("more halal" vs "less halal"), which contradicts the baseline gate message. "proof_tier" clearly communicates verification depth.

**CHECK constraint**:

```sql
ALTER TABLE food_providers
  ADD CONSTRAINT chk_proof_tier CHECK (proof_tier IS NULL OR proof_tier BETWEEN 1 AND 3);

ALTER TABLE store_providers
  ADD CONSTRAINT chk_proof_tier CHECK (proof_tier IS NULL OR proof_tier BETWEEN 1 AND 3);
```

`NULL` = not yet assessed (default for all existing providers). This is the honest state — legacy imports haven't been tier-assessed.

---

### ADR-133/D2: Separate Baseline Banner from Proof Section in the UI

**Status**: ACCEPTED

**Context**: Currently `HalalTrustBanner` renders below `ProviderDetailSections` (which includes the Proofs accordion). The visual sequence is: [Proofs accordion with per-provider attestation] → [HalalTrustBanner saying "all restaurants are halal"]. This sequence invites the contradiction.

**Decision**: Restructure the page layout into two visually distinct zones:

**Zone A — Proof Tier Card** (inside ProviderDetailSections, replacing current Proofs accordion):

- Replaces the "Proofs" `ExpandSection` with a new **ProofTierCard** component.
- Shows the tier as a visual indicator (icon + label + description).
- If `proof_tier` is NULL → show "Verification pending" with neutral styling.
- If `proof_tier` is set → show tier icon, name, description of what was verified.
- The existing `AttestationCard` (declared commitments: no_alcohol, no_pork, no_gambling) **remains** inside this section as a sub-element — these are provider self-declarations, distinct from UFlow's verification tier.
- Trust badges (`TrustBadgesSection`) also remain here.

**Zone B — Baseline Gate Banner** (positioned ABOVE the sections, not below):

- Move `HalalTrustBanner` to render **above** the `ProviderDetailSections`, immediately after the provider info header.
- This establishes the baseline _first_, before any per-provider detail.
- Reading order becomes: "All listings are halal" → "Here's how THIS listing was verified" → "Here are this provider's specific declarations".

**Consequences**:

- Positive: Eliminates the contradiction. Baseline is established first, proof tier is additive context.
- Positive: Users no longer encounter "no proofs available" for unverified providers — instead they see "verification pending" (which is an accurate state, not a gap).
- Negative: Requires layout refactoring in both `ProviderDetailPage.tsx` and `ProviderDetailModal.tsx`.
- Neutral: The popup (`HalalTrustPopup`) continues to show the baseline message — no change needed.

**Alternatives Considered**:

1. **Merge baseline into proof section**: Rejected. The baseline is a platform-level guarantee, not a per-provider attribute. Embedding it inside a per-provider section confuses the abstraction layers.
2. **Remove baseline entirely**: Rejected. The baseline message is a key trust signal for the platform. Users need to know UFlow curates listings.
3. **Keep layout as-is with rewording only**: Rejected. Rewording alone doesn't resolve the structural placement contradiction. The visual sequence matters.

---

### ADR-133/D3: Rename Proofs Section to "Verification" / "Prüfung"

**Status**: ACCEPTED

**Context**: The current section title "Proofs" / "Nachweise" implies the provider must prove something. In the new model, it's UFlow that verifies — the tier reflects UFlow's verification effort, not the provider's burden of proof.

**Decision**: Rename the ExpandSection:

- EN: "Proofs" → "Verification"
- DE: "Nachweise" → "Prüfung"
- (Other locales updated accordingly)

**Consequences**:

- Positive: Aligns language with the new model (UFlow verifies, not provider proves).
- Negative: Existing translation keys change. Manageable — 6 locale files, one key each.

---

### ADR-133/D4: Server/Client Component Boundary

**Status**: ACCEPTED

**Context**: `ProofTierCard` needs the `proof_tier` value from the provider record + i18n translations. It does NOT need interactivity beyond what the parent `ExpandSection` provides.

**Decision**:

- **ProofTierCard**: Client component (`'use client'`). Required because it uses `useLanguage()` hook for translations and lives inside the client-side `ProviderDetailSections` component tree.
- **HalalTrustBanner**: Remains client component (already is, uses `useLanguage()`).
- **Data fetching**: No new queries. `proof_tier` is fetched as part of the existing `food_providers` JOIN in `providers.ts:getProviderById()`. The `select('halal_level, no_alcohol, no_pork')` call simply changes to `select('proof_tier, no_alcohol, no_pork')`.

**Consequences**:

- Positive: No new API calls, no new server components, no waterfalls.
- Negative: None — follows existing patterns exactly.

---

### ADR-133/D5: i18n Key Structure

**Status**: ACCEPTED

**Decision**: New translation namespace `providerDetail.proofTier.*` (not reusing `attestation` or `halal` namespaces):

```typescript
"proofTier": {
  "sectionTitle": "Verification",           // replaces "Proofs"
  "pending": "Verification pending",         // when proof_tier is NULL
  "pendingDetail": "This listing meets our halal requirements. Detailed verification is in progress.",
  "tier1Title": "Online Check",
  "tier1Detail": "Halal status verified via website and menu review.",
  "tier2Title": "Personal Visit",
  "tier2Detail": "Halal status confirmed through a physical visit and owner/staff interview.",
  "tier3Title": "Certified",
  "tier3Detail": "Halal certification on file. Alcohol-free and gambling-free declarations signed.",
  "whatIsThis": "What does this mean?",
  "explanation": "Every listing on Ummah Flow meets our halal requirements. The verification tier shows how we confirmed this."
}
```

German equivalents follow the same structure under `providerDetail.proofTier.*` in `de.ts`.

---

## 4. Data Model

### Migration Summary

**Migration name**: `133_rename_halal_level_to_proof_tier`

```sql
-- 1. Rename column on food_providers
ALTER TABLE food_providers RENAME COLUMN halal_level TO proof_tier;

-- 2. Add proof_tier to store_providers (parity)
ALTER TABLE store_providers ADD COLUMN proof_tier SMALLINT;

-- 3. CHECK constraints
ALTER TABLE food_providers
  ADD CONSTRAINT chk_food_proof_tier CHECK (proof_tier IS NULL OR proof_tier BETWEEN 1 AND 3);

ALTER TABLE store_providers
  ADD CONSTRAINT chk_store_proof_tier CHECK (proof_tier IS NULL OR proof_tier BETWEEN 1 AND 3);

-- 4. Comment for documentation
COMMENT ON COLUMN food_providers.proof_tier IS 'Verification depth: 1=online, 2=personal visit, 3=certified. NULL=pending.';
COMMENT ON COLUMN store_providers.proof_tier IS 'Verification depth: 1=online, 2=personal visit, 3=certified. NULL=pending.';
```

### TypeScript Type Change

In `src/services/providers.ts`, the `Provider` interface:

```typescript
// BEFORE
halal_level?: number | null;

// AFTER
proof_tier?: number | null;
```

### Query Change

In `providers.ts:getProviderById()`:

```typescript
// BEFORE
.select('halal_level, no_alcohol, no_pork')

// AFTER
.select('proof_tier, no_alcohol, no_pork')
```

### Blast Radius

| Layer                       | Impact                                                                                                                   | Files                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| DB Migration                | Column rename (food_providers), column add (store_providers), 2 CHECK constraints, **RPC rewrite**                       | 1 migration file                                               |
| RPC Function                | `upsert_joinhalal_providers` rewritten — removes 4 dropped column refs, adds `food_providers` + `provider_offers` INSERT | Part of migration                                              |
| TypeScript types            | `halal_level` → `proof_tier` in Provider interface                                                                       | `src/services/providers.ts`                                    |
| Service layer               | Select column name change                                                                                                | `src/services/providers.ts`                                    |
| Import script               | Remove `offers_ids`/`needs_ids` from interface, update RPC payload                                                       | `scripts/import-joinhalal.ts`                                  |
| UI - AttestationCard        | Remove `halalLevel` prop, add `proofTier` prop                                                                           | `src/features/providers/components/AttestationCard.tsx`        |
| UI - ProviderDetailSections | Replace Proofs ExpandSection content with ProofTierCard                                                                  | `src/features/providers/components/ProviderDetailSections.tsx` |
| UI - ProviderDetailPage     | Move HalalTrustBanner position                                                                                           | `src/components/providers/ProviderDetailPage.tsx`              |
| UI - ProviderDetailModal    | Move HalalTrustBanner position                                                                                           | `src/components/providers/ProviderDetailModal.tsx`             |
| UI - NEW ProofTierCard      | New component                                                                                                            | `src/features/providers/components/ProofTierCard.tsx`          |
| Translations                | New `proofTier.*` keys, rename `sections.proofs`, **remove** stale `empty.noProofs` (6 locale files)                     | `src/translations/{en,de,ar,tr,ur,ps}.ts`                      |
| Tests                       | Update AttestationCard tests, add ProofTierCard tests, update ProviderDetailSections tests                               | 3 test files                                                   |
| Admin/import                | RPC payload updated — no other admin changes needed                                                                      |

---

## 5. Component Inventory

### Components to MODIFY

| Component                | File                                                                                       | Changes                                                                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProviderDetailSections` | [ProviderDetailSections.tsx](src/features/providers/components/ProviderDetailSections.tsx) | Replace `ExpandSection title="Proofs"` content: embed `ProofTierCard` + `AttestationCard` + `TrustBadgesSection`. Rename section title.                                                                                                      |
| `AttestationCard`        | [AttestationCard.tsx](src/features/providers/components/AttestationCard.tsx)               | Remove `halalLevel` prop (unused in display logic anyway — only checks `> 0`). Add `proofTier` prop for conditional rendering if needed. Simplify: the `hasAnyDeclared` check should use `proof_tier` presence instead of `halal_level > 0`. |
| `ProviderDetailPage`     | [ProviderDetailPage.tsx](src/components/providers/ProviderDetailPage.tsx)                  | Move `<HalalTrustBanner />` from below `ProviderDetailSections` to above it (two locations: mobile + desktop).                                                                                                                               |
| `ProviderDetailModal`    | [ProviderDetailModal.tsx](src/components/providers/ProviderDetailModal.tsx)                | Move `<HalalTrustBanner />` from below sections to above.                                                                                                                                                                                    |
| `HalalTrustBanner`       | [HalalTrustBanner.tsx](src/features/providers/components/HalalTrustBanner.tsx)             | Minor wording update if needed (currently says "checked for halal compliance" — may refine to "meets our halal requirements").                                                                                                               |
| Provider type            | [providers.ts](src/services/providers.ts)                                                  | `halal_level` → `proof_tier` in type + query.                                                                                                                                                                                                |

### Components to CREATE

| Component       | Proposed File                                         | Purpose                                                                                                                                                       |
| --------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProofTierCard` | `src/features/providers/components/ProofTierCard.tsx` | Displays the verification tier (1/2/3/null) with icon, label, description. Contains tier-specific visual indicator (e.g., shield icons with increasing fill). |

### Components UNCHANGED

| Component              | Reason                                                                 |
| ---------------------- | ---------------------------------------------------------------------- |
| `HalalTrustPopup`      | Wraps `HalalTrustBanner` — no changes needed unless banner API changes |
| `TrustBadgesSection`   | Badge rendering is independent of proof tier                           |
| `MobileProviderDetail` | Delegates to shared components                                         |

---

## 6. UI Design Guidance

### Visual Hierarchy (reading order)

```
┌─────────────────────────────────────────────────┐
│  Provider Header (name, category, images)       │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  🕌 HalalTrustBanner (ZONE A — Baseline)│    │
│  │  "All listings meet our halal           │    │
│  │   requirements" [Learn more]            │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─ Values & Amenities ─────────────── ▾ ──┐    │
│  │ ...                                     │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─ Verification ───────────────────── ▾ ──┐    │
│  │                                         │    │
│  │  ┌──── ProofTierCard ──────────────┐    │    │
│  │  │  🛡️ Online Check (Tier 1)       │    │    │
│  │  │  "Verified via website/menu"    │    │    │
│  │  └────────────────────────────────┘    │    │
│  │                                         │    │
│  │  ┌──── AttestationCard ────────────┐    │    │
│  │  │  "I testify by Allah that I..." │    │    │
│  │  │  ✓ No alcohol  ✓ No pork       │    │    │
│  │  └────────────────────────────────┘    │    │
│  │                                         │    │
│  │  ┌──── TrustBadgesSection ─────────┐    │    │
│  │  │  [Muslim-owned] [Prayer space]  │    │    │
│  │  └────────────────────────────────┘    │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─ Menu ──────────────────────────── ▾ ──┐    │
│  └─────────────────────────────────────────┘    │
│  ┌─ Opening Hours ─────────────────── ▾ ──┐    │
│  └─────────────────────────────────────────┘    │
│  ...                                            │
└─────────────────────────────────────────────────┘
```

### ProofTierCard Visual Concept

- **Tier indicator**: Shield icon with 1/2/3 filled segments (progressive fill).
- **Tier 1**: Single outline shield, subtle green.
- **Tier 2**: Half-filled shield, stronger green.
- **Tier 3**: Fully filled shield with gold accent (matches existing `bg-gold-gradient`).
- **NULL (pending)**: Clock/hourglass icon, neutral gray. Text: "Verification pending".
- **No tooltip/info icon needed** — description text is always visible.

### Key UX Principle: "Not More Halal — More Verified"

The UI MUST NOT imply quality gradation. Suggested copy approach:

- ❌ "Level 1 halal" / "Level 3 halal"
- ✅ "Verified: Online Check" / "Verified: Certified"
- ❌ Stars, progress bars, or ranking indicators
- ✅ Shield with descriptive label (qualitative, not quantitative)

---

## 7. Legacy Cleanup (CRITICAL FINDING)

### 7.1 Stale `upsert_joinhalal_providers` RPC — **BROKEN on Production**

The production RPC function `upsert_joinhalal_providers` still references **four columns that no longer exist** on the `providers` table (dropped by migration 083):

| Dropped Column | Was On      | Moved To                     | RPC Still References?                    |
| -------------- | ----------- | ---------------------------- | ---------------------------------------- |
| `halal_level`  | `providers` | `food_providers.halal_level` | **YES** — INSERT + ON CONFLICT UPDATE    |
| `no_alcohol`   | `providers` | `food_providers.no_alcohol`  | **YES** — INSERT + ON CONFLICT UPDATE    |
| `offers_ids`   | `providers` | `provider_offers` (junction) | **YES** — INSERT + ON CONFLICT allowlist |
| `needs_ids`    | `providers` | `provider_needs` (junction)  | **YES** — INSERT + ON CONFLICT allowlist |

**Impact**: Any call to `upsert_joinhalal_providers` on production will fail with `column "halal_level" of relation "providers" does not exist`. The import pipeline is effectively broken.

**Required cleanup** (bundled into Plan 133 migration):

1. **Rewrite the RPC** to:
   - Remove `offers_ids`, `needs_ids`, `no_alcohol`, `halal_level` from the `providers` INSERT
   - After upserting into `providers`, INSERT into `food_providers` with `proof_tier` (renamed from `halal_level`), `no_alcohol`, `no_pork`
   - After upserting into `providers`, INSERT into `provider_offers` junction table (replacing `offers_ids` array column)
   - Handle `needs_ids` → `provider_needs` junction table (or drop if unused — needs_ids is always `[]` in the import script)

2. **Update the import script** (`scripts/import-joinhalal.ts`):
   - Remove `offers_ids` / `needs_ids` from the `JoinHalalProvider` interface
   - Update the RPC call payload to match the new function signature
   - Replace `halal_level` with `proof_tier` in the mapping

### 7.2 Unused `halal_level` Column Data

As documented in Section 1, `food_providers.halal_level` is 100% NULL (973/973 rows). The rename to `proof_tier` is zero-risk.

### 7.3 Near-Zero Boolean Declaration Data

| Column        | Table             | True count | Total | %    |
| ------------- | ----------------- | ---------- | ----- | ---- |
| `no_alcohol`  | `food_providers`  | 2          | 973   | 0.2% |
| `no_pork`     | `food_providers`  | 2          | 973   | 0.2% |
| `no_gambling` | `store_providers` | 0          | 342   | 0%   |

These columns are **not candidates for removal** — they are actively used by `AttestationCard` and represent valid self-declaration data (the 2 providers with `true` values are real declarations). They just have low adoption, which is expected for a young platform.

### 7.4 Stale Translation Keys (Post-Rework Cleanup)

After the proof tier rework, these keys become obsolete:

- `providerDetail.sections.proofs` → replaced by `providerDetail.proofTier.sectionTitle`
- `providerDetail.empty.noProofs` → replaced by `providerDetail.proofTier.pending` / `pendingDetail`

**Action**: Remove old keys from all 6 locale files to prevent dead code accumulation.

---

## 8. Searchability / Filterability

**Current scope**: Proof tier is NOT searchable/filterable in this plan. It's a display-only attribute.

**Future extension path** (deferred, not in Plan 133):

- If proof tier becomes filterable, a B-tree index on `proof_tier` is appropriate (4 distinct values: NULL, 1, 2, 3).
- No tsvector involvement — tier is numeric, not text.
- Filter UI would live in the providers list page, not the detail page.

---

## 9. Risk Assessment

| Risk                                                             | Severity   | Mitigation                                                                                                                                         |
| ---------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---------- | --- | ------- | --- | --------------------------------------------- | --- | ---------- | --- | ------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `upsert_joinhalal_providers` RPC is broken on production         | **HIGH**   | Rewrite RPC as part of this migration. Must INSERT into `food_providers` + `provider_offers` instead of dropped `providers` columns.               |
| Column rename breaks existing queries                            | LOW        | `halal_level` is only referenced in `providers.ts` (one `select()` call) and the stale RPC (addressed above). No triggers or indexes reference it. |
| Import script references dropped fields                          | **MEDIUM** | Update `scripts/import-joinhalal.ts` — remove `offers_ids`/`needs_ids` from interface, update RPC payload.                                         |
| Users misinterpret tiers as quality                              | MEDIUM     | UX copy must emphasize "verification method", not "halal level". ProofTierCard design avoids quantitative indicators (no stars, no progress).      |
| Translation quality for religious content                        | MEDIUM     | EN/DE can be done by the team. AR/TR/UR/PS should be flagged for native speaker review (same pattern as Plan 126).                                 |
| Migration compatibility with Plan 116 (field schema remediation) | LOW        | Plan 116 is about boolean flag refactoring and does not touch `halal_level`. The rename is independent.                                            |
| AttestationCard `hasAnyDeclared` logic change                    | LOW        | Current logic: `(halal_level > 0)                                                                                                                  |     | no_alcohol |     | no_pork |     | no_gambling`. After rename: `(proof_tier > 0) |     | no_alcohol |     | no_pork |     | no_gambling`. Semantically the same since `halal_level`is NULL everywhere — but the check should be reviewed:`proof_tier > 0`in`hasAnyDeclared`may not be the right signal for "declared commitments" (proof_tier is about UFlow verification, not provider declaration). **RECOMMENDATION**: Decouple —`hasAnyDeclared` should check ONLY the boolean declarations (`no_alcohol`, `no_pork`, `no_gambling`), NOT `proof_tier`. |

---

## 10. Verdict

**APPROVED**

This is a clean, well-scoped rework that:

1. Resolves a genuine UX contradiction with a principled model separation.
2. Reuses an existing unused column (zero data loss, minimal migration).
3. Follows established patterns (client components, ExpandSection, translation namespace).
4. Has a manageable blast radius (8 modified files, 1 new component, 1 migration + RPC rewrite).
5. Does not introduce new dependencies or architectural complexity.
6. **Fixes a latent production bug** — the `upsert_joinhalal_providers` RPC references 4 dropped columns.

### Conditions for Planner

1. **MUST** rewrite `upsert_joinhalal_providers` RPC as part of the migration — this is a **production bug fix** (references 4 dropped columns: `halal_level`, `no_alcohol`, `offers_ids`, `needs_ids`).
2. **MUST** update `scripts/import-joinhalal.ts` to match the new RPC signature (remove `offers_ids`/`needs_ids` from interface, replace `halal_level` with `proof_tier`).
3. **MUST** decouple `hasAnyDeclared` from `proof_tier` — the attestation card's "declared commitments" must check only the self-declaration booleans, not the UFlow verification tier.
4. **MUST** maintain the HalalTrustPopup behavior (first 10 views) — no changes to popup logic.
5. **MUST** remove stale translation keys (`sections.proofs`, `empty.noProofs`) from all 6 locale files after adding new `proofTier.*` keys.
6. **SHOULD** move HalalTrustBanner above sections, not merge it into the section.
7. **SHOULD** add a brief explainer in ProofTierCard: "What does this mean?" expandable text.
8. **MAY** adjust baseline banner wording from "checked for halal compliance" to "meets our halal requirements" — but this is a content decision, not architectural.

---

## 10. System Architecture Doc Updates Required

After implementation:

- Update `system-architecture.md` Components section to reflect the new proof tier concept.
- Add to Changelog: "Plan 133: Halal proof tier model — `halal_level` → `proof_tier`, 3-tier verification depth, baseline/proof UI separation."
- No diagram changes needed (no new services, no new data flows, no new external dependencies).
