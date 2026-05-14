---
ID: 126
Origin: 126
UUID: a7f3c2d8
Status: Active
---

# Plan 126 — Nachweise Attestation Display

| Field          | Value                                                                 |
| -------------- | --------------------------------------------------------------------- |
| Plan ID        | 126                                                                   |
| Target Release | next available **minor** release after v0.12.9 (v0.13.0); confirm bump type at DevOps Stage 1 — user-visible feature addition warrants minor per semver |
| Epic Alignment | Provider Detail UX Enhancement                                        |
| Related Issues | None                                                                  |
| Classification | Feature                                                               |
| Pipeline       | Abbreviated                                                           |
| GitHub Issue   | https://github.com/abu-lina/uflow/issues/219                         |
| Created        | 2026-05-05T21:00Z                                                     |

## Value Statement and Business Objective

**As a** Muslim community user browsing a provider's detail page,
**I want to** see a clear Islamic attestation (Bezeugung) showing which halal compliance commitments the provider has declared,
**so that** I can trust the provider meets my religious dietary/service requirements at a glance.

## Decision Record

| # | Decision | Status |
|---|----------|--------|
| 1 | Attestation content is driven by existing `no_alcohol`, `no_pork`, `no_gambling` boolean columns on the provider | [RESOLVED] — data already exists, no schema changes needed |
| 2 | Attestation is displayed only when at least one of the three booleans is `true` | [RESOLVED] — empty state falls back to existing "Keine Nachweise vorhanden" |
| 3 | The attestation renders as a structured declaration card (header + bullet items + signature) inside the existing Nachweise ExpandSection | [RESOLVED] — consistent with accordion pattern, no new section needed |
| 4 | Translation keys support all 6 locales (de/en/ar/tr/ur/ps) | [RESOLVED] — all users see the declaration in their language |
| 5 | Signature displays the provider name (not a handwritten image) | [RESOLVED] — simple, no file upload or crypto needed |
| 6 | Bullets are conditionally rendered based on each boolean (only show commitments the provider has declared) | [RESOLVED] — honest representation; providers only attest what they've declared |
| 7 | The `no_pork` bullet text is narrowed to *"kein Schweinefleisch verarbeite/verkaufe"* (not "verbotenes Fleisch") | [RESOLVED] — `no_pork = true` means pork specifically; widening to "forbidden meat" would overstate the commitment and risk a trust-breaking overpromise |
| 8 | Implementer must verify migration 083 state against remote DB before writing display code | [RESOLVED] — migration `083_m5a_supertype_unification.sql` drops `no_alcohol`/`no_pork`/`no_gambling` from `providers` and moves them to `food_providers`/`store_providers`; if applied, `providers.server.ts` must JOIN extension tables before the attestation booleans are available |

## Assumptions

- The `no_alcohol`, `no_pork`, `no_gambling` booleans are the source of truth for attestation content.
- **Migration state is a pre-condition** (see Milestone 0): these columns may reside on `providers` directly OR on the `food_providers`/`store_providers` extension tables depending on whether migration 083 has been applied to the remote DB. The server fetch strategy depends on this state.
- No new DB migration is required for the display feature itself — only the fetch query may need to change.
- The provider name serves as the "Unterschrift" (signature).
- This supplements the current badge-based proofs rendering (badges remain if present; the attestation card renders above them).
- Arabic/Turkish/Urdu/Pashto translations are provisional and require native speaker sign-off before production merge (see Milestone 1 acceptance).

## UX/UI Design

### Layout Concept (within existing Nachweise ExpandSection)

```
┌─────────────────────────────────────────────────┐
│  Nachweise                              ▾       │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │  🕌  Ich bezeuge bei Allah, dass ich:   │    │
│  │                                         │    │
│  │  ✓ kein Alkohol verarbeite/verkaufe     │    │
│  │  ✓ kein Schweinefleisch                  │    │
│  │    verarbeite/verkaufe                  │    │
│  │  ✓ kein Glücksspiel anbiete             │    │
│  │                                         │    │
│  │  ─────────────────────                  │    │
│  │  Unterschrift: Provider Name            │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  [existing badge proofs if any]                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Design Specifications

1. **Container**: `rounded-xl border border-border/40 bg-[#F8FBF9] p-4` — subtle green-tinted card within the section (complements existing `#E3F2EF` palette)
2. **Header text**: `text-base font-semibold text-content-heading` — matches `DetailListItem` typography
3. **Bullet items**: Each rendered as a flex row with a small checkmark icon (`Check` from lucide-react) in `text-primary` + `text-sm text-content` label
4. **Conditional bullets**: Only bullets whose corresponding boolean is `true` are shown
5. **Signature line**: A `border-t border-border/40 pt-3 mt-3` divider followed by provider name in `text-sm font-medium italic text-content-heading`
6. **Visibility rule**: The entire attestation card is rendered only if at least one of `no_alcohol`, `no_pork`, `no_gambling` is `true`; otherwise the existing empty state shows

### Responsive Behavior

- Card has full-width within the section padding
- Text wraps naturally on mobile (320px+)
- No horizontal scroll concerns — all content is text

## Milestones

### Milestone 0: Verify Extension Table Migration State (Pre-Condition)

**Objective**: Confirm whether migration `083_m5a_supertype_unification.sql` has been applied to the remote DB, and determine the correct data fetch strategy before any display code is written.

**Why this matters**: Migration 083 drops `no_alcohol`, `no_pork` from `providers` and places them in `food_providers`; it drops `no_gambling` from `providers` and places it in `store_providers`. The current `getProviderById` in `src/services/providers.server.ts` selects `*` from `providers` but does NOT join extension tables. If migration 083 is applied, all three booleans will be `undefined` at runtime and the attestation card will silently not render.

**Implementer action**:
1. Query the remote DB: check whether `no_alcohol` column exists on `providers` or on `food_providers`.
2. **If on `providers`** (migration 083 not yet applied): proceed directly to Milestone 1 — no server-side changes needed.
3. **If on `food_providers`/`store_providers`** (migration 083 applied): extend `getProviderById` in `src/services/providers.server.ts` to JOIN or separately fetch the extension table(s) and merge `no_alcohol`, `no_pork`, `no_gambling` onto the returned provider object before Milestone 2 can be started.

**Acceptance**: Implementer documents the confirmed migration state in the implementation artifact. If a server-side JOIN was added, it is covered by an existing or new unit test.

---

### Milestone 1: Add Translation Keys (all 6 locales)

**Objective**: Add i18n keys for the attestation header, three bullet texts, and signature label.

**New translation keys** (nested under `providerDetail.attestation`):
- `header` — "Ich bezeuge bei Allah, dass ich:" / "I attest before Allah that I:" / Arabic/Turkish/Urdu/Pashto equivalents
- `noAlcohol` — "kein Alkohol verarbeite/verkaufe" / equivalents
- `noPork` — "kein Schweinefleisch verarbeite/verkaufe" / equivalents *(narrowed from "verbotenes Fleisch" to match the `no_pork` boolean exactly — see Decision 7)*
- `noGambling` — "kein Glücksspiel anbiete" / equivalents
- `signature` — "Unterschrift" / "Signature" / equivalents

**Acceptance**: All 6 translation files updated. `npm run type-check` passes. Arabic/Turkish/Urdu/Pashto translations are marked as provisional in the implementation artifact; native speaker sign-off is required before production merge.

### Milestone 2: Implement Attestation Card Component

**Objective**: Render the structured attestation inside the Nachweise section, driven by `no_alcohol`, `no_pork`, `no_gambling` booleans.

**Where**: `src/features/providers/components/ProviderDetailSections.tsx` — inside the existing `<ExpandSection title={t('providerDetail.sections.proofs')}>` block, before the badge-based proofs list.

**Logic**:
- Compute which attestation items to show based on the three booleans
- If none are true, skip the attestation card entirely (fall through to badge proofs or empty state)
- If at least one is true, render the card with header, conditional bullets, and signature

**Acceptance**: Card renders correctly for providers with declared values. Empty state preserved when no values set.

### Milestone 3: Unit Tests

**Objective**: Verify attestation rendering logic.

**Test cases** (high-level):
- Attestation card visible when at least one boolean is true
- Only declared items (true booleans) appear as bullet points
- Attestation hidden when all three booleans are false/undefined
- Provider name appears in signature area

**Acceptance**: `npx vitest run` passes all new tests.

## Testing Strategy

- **Unit tests**: Component rendering with various boolean combinations (Vitest + RTL)
- **Visual verification**: Manual check on localhost against the design spec
- **No e2e required**: Static presentation, no user interaction beyond accordion toggle

## Duration Estimates

| Phase          | Estimate    | Uncertainty |
|----------------|-------------|-------------|
| Planning       | 15 min      | Low         |
| M0 pre-check   | 5–30 min    | Medium — depends on migration state; if extension JOIN needed, add 30–45 min |
| Implementation | 30–45 min   | Low if no JOIN needed; Medium if JOIN added to server service |
| Testing        | 15–30 min   | Low–Medium depending on M0 outcome |
| Total          | ~1–2.5 hrs  | Low–Medium depending on migration 083 state |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migration 083 applied → booleans undefined → silent zero-display | Medium | Milestone 0 pre-check resolves this before implementation begins |
| `no_pork` text overpromise ("forbidden meat") | Resolved | Narrowed to "kein Schweinefleisch" (Decision 7) |
| Translation accuracy for Arabic/Turkish/Urdu/Pashto (religious text) | Medium | Provisional translations; native speaker sign-off gate before production merge |
| Provider has no booleans set (all null/false) | Low | Existing empty state handles this gracefully |

## Release Strategy

Standalone. Target: v0.13.0 (minor bump — new user-visible feature). Confirm bump type at DevOps Stage 1.

## Changelog

| Date | Agent | Action |
|------|-------|--------|
| 2026-05-05T21:00Z | planner | Plan created |
| 2026-05-06T09:00Z | planner | Revision R1: addressed all critique findings — added Milestone 0 (extension table pre-check), narrowed `no_pork` text to "kein Schweinefleisch" (Decision 7), updated semver to minor, added translation quality gate to M1 acceptance |
