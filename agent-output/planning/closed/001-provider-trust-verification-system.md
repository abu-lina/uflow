---
ID: 001
Origin: 001
UUID: ab8a542e
Status: Superseded
---

# Implementation Plan: Provider Trust & Verification System

**Plan ID**: 001
**Epic**: 2.1 - Provider Trust & Verification System
**Target Release**: v0.2.0
**Priority**: P0
**Created**: 2026-01-27
**Planner**: planner agent

---

## Change Log

| Date       | Agent   | Change                         | Rationale                                                                                                                      |
| ---------- | ------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 2026-01-27 | planner | Initial plan draft             | Created implementation plan from Epic 2.1                                                                                      |
| 2026-01-27 | planner | Revised for architecture gates | Incorporate F1–F3 requirements (privacy-safe endorsement reads, unified role authority, DB-side ranking for stable pagination) |
| 2026-02-21 | planner | Superseded by replan           | Replanned for deployment readiness; see agent-output/planning/001-provider-trust-verification-system-replan.md                  |

---

## Epic Reference

**From Roadmap**: Epic 2.1 - Provider Trust & Verification System

**User Story**:
As a **service seeker**, I want to **see verified, trustworthy provider profiles with community endorsements**, so that **I feel confident supporting Muslim businesses and know I'm getting authentic halal/Islamic services**.

**Epic Acceptance Criteria**:

- [ ] AC1: Service seekers can instantly distinguish verified providers from unverified ones
- [ ] AC2: Providers display community trust signals (verification badges, endorsement counts)
- [ ] AC3: Users can endorse providers they've used (social proof mechanism)
- [ ] AC4: Verification status visible in search results and provider cards
- [ ] AC5: Trust metrics contribute to search ranking (verified providers surface higher)

---

## Plan Overview

### Objectives

Implement a comprehensive trust and verification system that makes provider authenticity instantly visible to service seekers through:

1. Visual badge indicators showing verification status
2. Community endorsement mechanism allowing users to confirm provider badges
3. Trust-based search ranking prioritizing verified providers
4. Clear trust signals integrated into all provider touchpoints (cards, profiles, search results)

### Scope

**In Scope**:

- Badge display components (visual indicators with trust levels)
- User endorsement UI (confirm/remove endorsements)
- Search result ranking based on trust metrics
- Provider profile trust section showing all badges and endorsements
- Provider card trust badges (search results, city pages)
- Badge statistics and social proof display
- User endorsement tracking and limits
- Performance optimization for badge queries

**Out of Scope** (Future Epics):

- Islamic authenticity verification by scholars (Epic 5.1)
- Admin verification workflow (separate admin epic)
- Badge creation/management UI (admin functionality)
- Halal certification upload and verification (Epic 5.1)
- Provider notification system for endorsements (future engagement epic)

### Success Metrics

**Quantitative**:

- 80%+ of approved providers have at least one badge
- 30%+ of authenticated users endorse at least one provider
- 50%+ of search result clicks go to verified/community-confirmed providers
- Page load time increase <200ms with badge queries

**Qualitative**:

- Service seekers report increased confidence in provider selection (user feedback)
- Providers perceive value in badge system (feedback from provider onboarding)
- Trust badges visually distinct and understandable without explanation

---

## Architectural Gates (Must Fix Before Implementation)

This plan is gated by the architecture findings in `agent-output/architecture/001-provider-trust-verification-architecture-findings.md`.

### Gate F1 (CRITICAL): Privacy-safe endorsement reads

- Public pages and search MUST NOT expose confirmer identities (e.g., `user_id` from confirmation rows).
- Replace any public read of raw confirmation rows with **aggregate-only** reads (counts/trust_level), using a Postgres-first read model (view or materialized view).
- Logged-in UX may show “you confirmed this” for the current user, but must do so without exposing other users.

### Gate F2 (HIGH): Unified role authority for admin/moderation

- Define a single canonical role source for the application (recommended: `public.users.role`).
- Ensure RLS and server routes rely on the same authority (avoid mixed checks across auth metadata vs app DB).

### Gate F3 (HIGH): DB-side ranking for stable pagination

- Compute trust metrics (e.g., `trust_score`, `highest_trust_level`, counts) in SQL and order in the database.
- Avoid client-side re-ranking after pagination to prevent unstable ordering.

### Gate F4 (MED): Minimal trust workflow telemetry

- Add low-volume telemetry around endorsement and trust-level transitions (success/fail + latency), keeping payloads privacy-safe.

---

## Technical Architecture

### Database Schema (Existing)

✅ **Already Implemented** (Migration `016_create_badge_trust_system.sql`):

```sql
-- Trust level progression
CREATE TYPE trust_level AS ENUM (
  'SELF_DECLARED',
  'COMMUNITY_CONFIRMED',  -- ≥5 user confirmations
  'UMMAH_FLOW_VERIFIED'   -- Admin verified
);

-- Tables
- badge_types: Defines available badges (HALAL, MUSLIM_OWNED, etc.)
- provider_badges: Badges assigned to providers with trust_level
- badge_confirmations: User endorsements (user_id + provider_badge_id)
- badge_verifications: Admin verification audit trail
- badge_system_config: System settings (confirmation_threshold)
```

**Key Constraints**:

- User can confirm each badge only once (UNIQUE constraint)
- Badge auto-upgrades to COMMUNITY_CONFIRMED at 5 confirmations (trigger)
- UMMAH_FLOW_VERIFIED requires admin action (cannot auto-upgrade)

**Additional Required DB Read Model (New)**:

- Create a privacy-safe, aggregate trust read model for UI/search (recommended name: `provider_trust_summary`).
- This read model should expose only aggregates needed for the product (counts, highest trust level, computed trust score), not raw confirmer identities.

### Services Layer (Existing)

✅ **Already Implemented** (`src/services/badges.ts`):

```typescript
// Core functions available:
- getBadgeTypes(): Fetch all badge definitions
- getBadgesForEntity(entityId, entityType): Get all badges for a provider
- createBadgeForEntity(): Provider assigns badge to self
- confirmBadge(badgeId, userId): User endorses a badge
- unconfirmBadge(badgeId, userId): User removes endorsement
- getUserBadgeConfirmations(userId): Get user's endorsement history
- hasUserConfirmedBadge(badgeId, userId): Check if user endorsed badge
```

**Note**: Services already handle RLS policies, error handling, and trust level calculations via database triggers.

### New Components Required

#### 1. **BadgeDisplay Component** (`src/components/badges/BadgeDisplay.tsx`)

**Purpose**: Render individual badges with trust level indicators

**Props**:

```typescript
interface BadgeDisplayProps {
  badge: ProviderBadgeWithType;
  size?: 'sm' | 'md' | 'lg';
  showTrustLevel?: boolean;
  showConfirmationCount?: boolean;
  interactive?: boolean; // If true, shows endorsement button for auth users
  onEndorse?: (badgeId: string) => void;
  onUnendorse?: (badgeId: string) => void;
  userHasConfirmed?: boolean;
}
```

**Design Specs**:

- **SELF_DECLARED**: Gray badge, no icon overlay
- **COMMUNITY_CONFIRMED**: Green badge, checkmark icon, shows count (e.g., "✓ 12 confirmations")
- **UMMAH_FLOW_VERIFIED**: Gold/premium badge, verified icon, "UFlow Verified" label

**Accessibility**:

- ARIA labels describing trust level
- Keyboard navigation for interactive badges
- Tooltip/popover explaining trust levels on hover/focus

#### 2. **ProviderBadgesList Component** (`src/components/badges/ProviderBadgesList.tsx`)

**Purpose**: Display all badges for a provider in grid/list format

**Props**:

```typescript
interface ProviderBadgesListProps {
  providerId: string;
  layout?: 'grid' | 'inline';
  interactive?: boolean;
  maxVisible?: number; // Show first N, "+X more" button
}
```

**Features**:

- Fetches badges via `getBadgesForEntity(providerId, 'provider')`
- Sorts by trust level (UMMAH_FLOW_VERIFIED → COMMUNITY_CONFIRMED → SELF_DECLARED)
- Handles loading/error states
- Responsive grid layout (3 cols desktop, 2 cols tablet, 1 col mobile)

#### 3. **BadgeEndorsementButton Component** (`src/components/badges/BadgeEndorsementButton.tsx`)

**Purpose**: Allow authenticated users to endorse/un-endorse badges

**Props**:

```typescript
interface BadgeEndorsementButtonProps {
  badgeId: string;
  providerId: string;
  badgeName: string;
  currentCount: number;
  userHasConfirmed: boolean;
  onSuccess?: () => void;
}
```

**Behavior**:

- Shows "Confirm" button if user hasn't endorsed
- Shows "Confirmed ✓" button (green) if user has endorsed, click to remove
- Optimistic UI update (instant visual feedback, rollback on error)
- Toast notification on success/error
- Login prompt for unauthenticated users

**Rate Limiting**:

- Client-side: Max 10 endorsements per session (prevent spam)
- Server-side: RLS + database constraints enforce one confirmation per user per badge

#### 4. **TrustBadgeIndicator Component** (`src/components/badges/TrustBadgeIndicator.tsx`)

**Purpose**: Compact badge indicator for search result cards

**Props**:

```typescript
interface TrustBadgeIndicatorProps {
  badges: ProviderBadgeWithType[];
  maxBadges?: number; // Show top N badges, "+X" for overflow
  variant?: 'compact' | 'detailed';
}
```

**Display Logic**:

- **Compact**: Show only trust level icons (up to 3), "+2" if more
- **Detailed**: Show badge names + trust icons (for provider cards)
- Prioritize UMMAH_FLOW_VERIFIED → COMMUNITY_CONFIRMED → SELF_DECLARED

#### 5. **BadgeLegend Component** (`src/components/badges/BadgeLegend.tsx`)

**Purpose**: Educational component explaining trust levels

**Placement**:

- Footer of provider profile page
- Help modal accessible from badge tooltips

**Content**:

```
Trust Levels Explained:
🔹 Self-Declared: Provider claimed this badge
🔹 Community Confirmed: ≥5 community members confirmed this badge
🔹 UFlow Verified: Verified by UFlow team or Islamic scholars

How to Confirm:
1. Click "Confirm" on any badge you can verify
2. Only confirm badges you've personally experienced
3. Your confirmations help the Ummah trust businesses
```

---

## Implementation Tasks

### Phase 1: Core Badge Display (Week 1)

#### Task 1.1: Create Badge Display Components

**Files**:

- `src/components/badges/BadgeDisplay.tsx`
- `src/components/badges/ProviderBadgesList.tsx`
- `src/components/badges/TrustBadgeIndicator.tsx`

**Requirements**:

- Import badge types from `src/types/badges.ts`
- Use `getBadgesForEntity` from `src/services/badges.ts`
- Implement responsive design (Tailwind CSS)
- Add loading skeletons
- Handle empty states gracefully ("No badges yet")

**Acceptance Criteria**:

- [ ] Badges render with correct trust level colors (gray/green/gold)
- [ ] Trust icons display correctly (checkmark, verified badge)
- [ ] Responsive layout works on mobile/tablet/desktop
- [ ] Loading states prevent layout shift
- [ ] Component passes accessibility audit (ARIA labels, keyboard nav)

#### Task 1.2: Integrate Badges into Provider Profile

**Files**:

- `src/app/(dashboard)/providers/[id]/page.tsx` (or equivalent provider detail page)

**Requirements**:

- Add `<ProviderBadgesList>` component to provider profile layout
- Place below provider name/header, above description
- Fetch badges server-side (Next.js Server Component) for SEO
- Pass `interactive={true}` for authenticated users

**Acceptance Criteria**:

- [ ] Badges visible on all provider profile pages
- [ ] Section has clear heading ("Trust & Verification" or "Community Verified Badges")
- [ ] Empty state shows "No verified badges yet" with CTA for providers
- [ ] SSR works (badges render on first load, no flash)

#### Task 1.3: Add Badge Indicators to Search Result Cards

**Files**:

- `src/components/providers/ProviderCard.tsx` (or equivalent search result card)
- `src/features/search/components/SearchResults.tsx`

**Requirements**:

- Add `<TrustBadgeIndicator>` to provider card
- Display max 3 badges in compact mode
- Position near provider name or category badge
- Fetch badges as part of search query (optimize with JOIN)

**Acceptance Criteria**:

- [ ] AC4 VALIDATED: Verification status visible in search results ✓
- [ ] Badge indicators don't increase card height significantly (<40px)
- [ ] Badges truncate gracefully ("+2 more")
- [ ] Mobile layout remains clean and scannable

---

### Phase 2: User Endorsement System (Week 2)

#### Task 2.1: Create Endorsement Button Component

**Files**:

- `src/components/badges/BadgeEndorsementButton.tsx`
- `src/hooks/useBadgeEndorsement.ts` (custom hook for endorsement logic)

**Requirements**:

- Use `confirmBadge` and `unconfirmBadge` from `src/services/badges.ts`
- Implement optimistic UI updates (React Query or similar)
- Show toast notifications on success/error (using `react-hot-toast` or equivalent)
- Handle authentication state (redirect to login if not authenticated)
- Rate limiting: max 10 endorsements per session (localStorage counter)

**Acceptance Criteria**:

- [ ] AC3 VALIDATED: Users can endorse providers they've used ✓
- [ ] Button state updates instantly (optimistic)
- [ ] Error handling with user-friendly messages
- [ ] Rate limit prevents spam (toast: "Please wait before confirming more badges")
- [ ] Unauthenticated users see "Login to confirm" prompt

#### Task 2.2: Integrate Endorsement into Provider Profile

**Files**:

- `src/app/(dashboard)/providers/[id]/page.tsx`
- `src/components/badges/ProviderBadgesList.tsx`

**Requirements**:

- Pass `interactive={true}` to `ProviderBadgesList` for authenticated users
- Fetch user's existing confirmations via `getUserBadgeConfirmations(userId)`
- Display endorsement count on each badge
- Show user's endorsement status (highlighted if user confirmed)

**Acceptance Criteria**:

- [ ] Authenticated users see "Confirm" buttons on all badges
- [ ] User's confirmed badges show "Confirmed ✓" state
- [ ] Endorsement count increments in real-time after confirmation
- [ ] Provider profile updates without full page refresh

#### Task 2.3: Add User Endorsement History Page

**Files**:

- `src/app/(dashboard)/profile/endorsements/page.tsx`
- `src/components/profile/EndorsementHistory.tsx`

**Requirements**:

- Display all badges user has confirmed
- Group by provider (show provider name, badge, date confirmed)
- Allow user to remove endorsements
- Paginate if user has >20 endorsements

**Acceptance Criteria**:

- [ ] User can view all their endorsements in one place
- [ ] "Remove" action works and updates count immediately
- [ ] Page is accessible from user profile menu
- [ ] Empty state encourages user to explore and endorse providers

---

### Phase 3: Search Ranking & Performance (Week 3)

#### Task 3.1: Add DB Trust Summary Read Model for Search/UI

**Files**:

- `src/services/providers.ts` (searchProvidersAndCommunityServices function)

**Requirements**:

- Introduce a Postgres-first read model (view or materialized view) for provider trust aggregates (recommended: `provider_trust_summary`).
- Ensure the read model is safe for public consumption (aggregate-only; no confirmer `user_id` exposure).
- Update provider search queries to include/join the trust summary rather than requiring raw confirmation reads.
- Provider detail pages may still load badge details, but must not expose confirmer identities in UI/API.

**Acceptance Criteria**:

- [ ] Search results include trust aggregates without N+1 query problem
- [ ] Public read paths cannot return confirmer identities (privacy gate)
- [ ] Query performance remains acceptable at scale (use EXPLAIN/ANALYZE during implementation)

#### Task 3.2: Implement DB-side Trust Ranking (Deterministic Pagination)

**Files**:

- `supabase/migrations/*` (new migration for trust summary / ranking artifacts)
- `src/services/providers.ts`

**Requirements**:

- Compute trust metrics and ordering in SQL (using `provider_trust_summary` and/or a search helper view/function).
- Ensure ordering is deterministic across pages by including stable tie-breakers (e.g., provider_id and/or created_at).
- Keep the ranking explainable to users (document high-level weights/inputs).

**Acceptance Criteria**:

- [ ] AC5 VALIDATED: Trust metrics contribute to search ranking ✓
- [ ] Verified providers appear higher in search results (same category)
- [ ] Ranking is stable across paginated pages (no client-side re-ranking)
- [ ] Edge case: Providers with no badges still appear in results (score = 0)

#### Task 3.3: Add Database Indexes for Performance

**Files**:

- `supabase/migrations/027_add_badge_search_indexes.sql`

**Requirements**:

- Add/verify indexes that support:
  - fetching badges per provider (by entity_id/entity_type/trust_level)
  - aggregating confirmations per badge
  - joining providers to the trust summary read model
- Adjust indexes based on observed query plans during implementation.

**Acceptance Criteria**:

- [ ] Search query execution plan uses indexes (verify with EXPLAIN)
- [ ] No full table scans on large tables
- [ ] Index size reasonable (<10% of table size)

---

### Phase 4: UX Polish & Validation (Week 4)

#### Task 4.1: Add Badge Legend & Educational Content

**Files**:

- `src/components/badges/BadgeLegend.tsx`
- `src/app/(dashboard)/help/badges/page.tsx` (new help page)

**Requirements**:

- Create modal/page explaining trust levels
- Add "Learn more" links on badge components
- Include examples with screenshots
- Translate content (German/English/Turkish/Arabic)

**Acceptance Criteria**:

- [ ] Help content accessible from badge tooltips
- [ ] Clear explanation of trust level progression
- [ ] Encourages community participation ("Your confirmations matter!")

#### Task 4.2: Visual Design System Integration

**Files**:

- `tailwind.config.ts` (add badge color tokens)
- `src/components/badges/*.tsx`

**Requirements**:

- Define color palette:
  - `badge-self-declared`: gray-400
  - `badge-community`: green-500
  - `badge-verified`: amber-500 (gold)
- Use consistent spacing and typography
- Ensure WCAG AA contrast ratios

**Acceptance Criteria**:

- [ ] AC1 VALIDATED: Service seekers can instantly distinguish verified providers ✓
- [ ] AC2 VALIDATED: Providers display community trust signals ✓
- [ ] Badge colors pass accessibility audit (contrast ratio ≥4.5:1)
- [ ] Design matches Figma mockups (if available) or follows UFlow design system

#### Task 4.3: Mobile Responsiveness Testing

**Files**: All badge components

**Test Cases**:

- [ ] Badge grid collapses to 1 column on mobile
- [ ] Endorsement buttons remain tappable (min 44px height)
- [ ] Trust indicators don't overflow card width
- [ ] Modal/popover for badge legend works on iOS/Android

**Devices to Test**:

- iPhone SE (small screen)
- iPhone 14 Pro (notch)
- Android (various sizes via BrowserStack)
- iPad (tablet layout)

#### Task 4.4: E2E Testing Scenarios

**Files**:

- `tests/e2e/badges.spec.ts` (if using Playwright/Cypress)

**Test Scenarios**:

1. **Unauthenticated User**:
   - View provider with badges → See trust indicators
   - Click endorsement button → Redirected to login
2. **Authenticated User**:
   - View provider → See "Confirm" buttons
   - Confirm badge → Count increments, button changes to "Confirmed ✓"
   - Unconfirm badge → Count decrements, button reverts to "Confirm"
3. **Search Results**:
   - Search for category → Verified providers rank higher
   - Verified provider cards show trust badges
4. **Badge Progression**:
   - Badge starts as SELF_DECLARED (gray)
   - After 5 confirmations → Auto-upgrades to COMMUNITY_CONFIRMED (green)

**Acceptance Criteria**:

- [ ] All E2E tests pass in CI pipeline
- [ ] No console errors during badge interactions
- [ ] Performance: Page load <3s on 3G network

---

## Data Migration & Seeding

### Migration Required: Badge Initialization for Existing Providers

**File**: `supabase/migrations/027_seed_initial_provider_badges.sql`

**Purpose**: Assign default badges to existing approved providers

**Strategy**:

```sql
-- For existing providers, assign MUSLIM_OWNED badge (self-declared by default)
INSERT INTO provider_badges (entity_id, entity_type, badge_type_id, trust_level)
SELECT
  p.provider_id,
  'provider'::entity_type,
  bt.id,
  'SELF_DECLARED'::trust_level
FROM providers p
CROSS JOIN badge_types bt
WHERE
  p.review_status = 'approved'
  AND bt.badge_key = 'MUSLIM_OWNED'
  AND NOT EXISTS (
    -- Don't duplicate if badge already exists
    SELECT 1 FROM provider_badges pb
    WHERE pb.entity_id = p.provider_id
    AND pb.badge_type_id = bt.id
  );
```

**Rollback Plan**:

```sql
-- Remove auto-seeded badges if needed
DELETE FROM provider_badges
WHERE trust_level = 'SELF_DECLARED'
AND created_at > '2026-01-27'::timestamptz;
```

**Acceptance Criteria**:

- [ ] All approved providers have at least 1 badge after migration
- [ ] Migration is idempotent (can run multiple times safely)
- [ ] No impact on provider display if migration fails (graceful degradation)

---

## Testing Strategy

Implementation should be supported by automated validation at the unit/integration level (services + key UI states), plus a small number of end-to-end checks around the endorsement flow. Performance validation should focus on search query latency and provider detail rendering when badges are present.

---

## Deployment Plan

### Pre-Deployment Checklist

- [ ] All tests passing (unit, integration, E2E)
- [ ] Database migration tested in UAT environment
- [ ] Performance benchmarks meet targets
- [ ] Accessibility audit passed (WCAG AA)
- [ ] Translations complete (de, en, tr, ar)
- [ ] Feature flag created: `ENABLE_BADGE_SYSTEM` (default: false)
- [ ] RLS/privacy gate validated: no public exposure of confirmer identities (F1)
- [ ] Role authority gate validated across RLS + server routes (F2)
- [ ] DB-side ranking gate validated with stable pagination (F3)

### Rollout Strategy

**Phase 1: UAT (Week 1)**

- Deploy to UAT with feature flag enabled
- Test with 5-10 internal users
- Monitor Supabase logs for errors
- Gather user feedback

**Phase 2: Production Soft Launch (Week 2)**

- Enable for 10% of users (A/B test)
- Monitor metrics: endorsement rate, search CTR
- Check performance: page load times, API latency

**Phase 3: Full Rollout (Week 3)**

- Enable for all users
- Publish blog post/email announcing trust system
- Monitor support tickets for confusion/bugs

### Rollback Plan

**If Critical Issue Detected**:

1. Disable feature flag: `ENABLE_BADGE_SYSTEM = false`
2. Badge components render nothing (graceful degradation)
3. Search ranking reverts to default (no trust score)
4. Investigation timeline: Fix within 48 hours or full rollback

**Rollback Migration** (if database issues):

```sql
-- Disable RLS policies temporarily
ALTER TABLE provider_badges DISABLE ROW LEVEL SECURITY;

-- Remove auto-seeded badges
DELETE FROM provider_badges WHERE created_at > '2026-01-27';

-- Re-enable RLS
ALTER TABLE provider_badges ENABLE ROW LEVEL SECURITY;
```

---

## Success Validation

### Epic Acceptance Criteria Validation

| Criteria                                                          | Implementation                                                         | Status     |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------- |
| AC1: Service seekers can instantly distinguish verified providers | BadgeDisplay component with color-coded trust levels (gray/green/gold) | ✅ Planned |
| AC2: Providers display community trust signals                    | ProviderBadgesList shows all badges with endorsement counts            | ✅ Planned |
| AC3: Users can endorse providers                                  | BadgeEndorsementButton + confirmBadge service                          | ✅ Planned |
| AC4: Verification status visible in search results                | TrustBadgeIndicator in ProviderCard                                    | ✅ Planned |
| AC5: Trust metrics contribute to search ranking                   | DB-side trust metrics + deterministic ordering (via trust summary)     | ✅ Planned |

### Business Metrics (Post-Launch)

**Week 1-2** (Early Adopters):

- Endorsement rate: ≥10% of authenticated users confirm ≥1 badge
- Badge visibility: ≥90% of provider views see badge section

**Month 1** (Adoption):

- Verified provider CTR: 15% higher than unverified (search results)
- Community-confirmed badges: ≥20% of all badges reach this level
- User retention: Badge endorsers have 30% higher 7-day retention

**Month 3** (Maturity):

- Provider badge coverage: 80%+ of approved providers have ≥1 badge
- Trust diversity: All 7 badge types used by at least 10 providers each
- Search quality: User satisfaction with search results increases 20% (survey)

---

## Risks & Mitigation

### Risk 1: Low User Engagement (Users Don't Endorse)

**Likelihood**: Medium  
**Impact**: High (badges remain SELF_DECLARED, no trust differentiation)

**Mitigation**:

- Add onboarding tooltip: "Help the Ummah by confirming badges you've verified"
- Gamification: Badge for users who confirm 5+ providers ("Community Contributor")
- Email campaign to active users: "Your confirmations make UFlow trustworthy"
- Show social proof: "12 community members confirmed this badge"

### Risk 2: Badge Spam/Gaming

**Likelihood**: Low  
**Impact**: Medium (fake endorsements reduce trust in system)

**Mitigation**:

- Rate limiting: Max 10 confirmations per session (already planned)
- Database constraint: UNIQUE(provider_badge_id, user_id) prevents duplicates
- Admin monitoring: Dashboard showing users with abnormal endorsement patterns
- Future: Require verified interaction (booking/review) before endorsement (Epic 4.3)

### Risk 3: Performance Degradation

**Likelihood**: Low  
**Impact**: High (slow page loads reduce user engagement)

**Mitigation**:

- Database indexes on all JOIN columns (Task 3.3)
- Caching: Cache badge data for 5 minutes (Redis or in-memory)
- Lazy loading: Load badges only when user scrolls to provider profile
- Monitoring: Set up alerts for query execution time >1s

### Risk 4: Trust Level Confusion

**Likelihood**: Medium  
**Impact**: Low (users don't understand badge colors, but still see badges)

**Mitigation**:

- Clear legend on every page with badges (BadgeLegend component)
- Tooltip on hover explaining each trust level
- User testing: Validate that 80%+ of users understand trust levels
- Iterate on design based on feedback

---

## Open Questions

1. **Badge Assignment for New Providers**: Should new providers get any default badges, or start with zero badges?
   - **Recommendation**: No default badges. Providers must self-assign badges, encouraging intentional badge use.

2. **Endorsement Limits**: Should there be a daily/weekly endorsement limit (beyond per-session)?
   - **Recommendation**: Start with per-session (10), monitor for abuse, add daily limit (50) if needed.

3. **Badge Removal**: Can providers remove badges after self-declaring?
   - **Recommendation**: Yes, providers can delete their own badges (before community confirmations). After 5+ confirmations, require admin approval to remove.

4. **Trust Level Downgrade**: If users un-confirm badges and count drops below 5, should badge downgrade to SELF_DECLARED?
   - **Recommendation**: Yes, trigger handles this automatically (already implemented in DB).

5. **SEO Impact**: Should badges be in meta tags for SEO (e.g., "Verified Halal Restaurant")?
   - **Recommendation**: Yes, add structured data (schema.org) for badges in provider meta tags (Task 4.1 extension).

---

## Dependencies

### Internal Dependencies

- ✅ Database schema (Migration 016 already applied)
- ✅ Services layer (`src/services/badges.ts` already implemented)
- ✅ Authentication system (required for user endorsements)
- ⏳ Provider profile page structure (must support badge section)
- ⏳ Search result card component (must support badge indicators)

### External Dependencies

- Supabase Row Level Security (RLS) policies (already configured)
- Toast notification library (`react-hot-toast` or equivalent)
- Translation files (`de.json`, `en.json`, etc.) for badge labels
- Design system/Figma assets for badge icons

### Blocking Issues

- **Architecture Gates (Required)**: F1 privacy-safe reads, F2 unified role authority, F3 DB-side ranking stability
- If provider profile page doesn't exist yet, create placeholder component first

---

## Next Steps

1. **Architect Review**: Confirm gates F1–F3 are fully reflected and ordered before feature work
2. **Security Review**: Validate RLS posture (especially `badge_confirmations` visibility) and role authority unification
3. **Implementation**: Start with the gated work (privacy-safe aggregates + DB-side ranking + role authority), then proceed to Phase 1 UI

---

## Appendix

### A. Badge Types Reference

From `supabase/migrations/016_create_badge_trust_system.sql`:

| Badge Key        | Label (DE)          | Label (EN)       | Description                                   |
| ---------------- | ------------------- | ---------------- | --------------------------------------------- |
| HALAL            | Halal               | Halal            | Offers halal products or services             |
| MUSLIM_OWNED     | Muslim im Besitz    | Muslim Owned     | Business is owned by Muslims                  |
| COMMUNITY_ACTIVE | Gemeinschaftsaktiv  | Community Active | Actively participates in community activities |
| SUPPORTS_SADAQAH | Unterstützt Sadaqah | Supports Sadaqah | Supports charitable causes                    |
| PRAYER_FRIENDLY  | Gebetsfreundlich    | Prayer Friendly  | Provides space or accommodates prayer times   |
| FAMILY_FRIENDLY  | Familienfreundlich  | Family Friendly  | Suitable for families with children           |
| WOMEN_FRIENDLY   | Frauenfreundlich    | Women Friendly   | Welcoming environment for women               |

### B. Database Performance Notes

**Current Index Coverage**:

- ✅ `idx_provider_badges_entity`: Covers entity_id + entity_type lookups
- ✅ `idx_provider_badges_trust_level`: Supports trust level filtering
- ✅ `idx_badge_confirmations_badge`: Optimizes confirmation count queries

**Recommended Additional Indexes** (Task 3.3):

- Composite index: (entity_id, trust_level DESC) for search ranking
- Partial index: Verified badges only (WHERE trust_level IN ('COMMUNITY_CONFIRMED', 'UMMAH_FLOW_VERIFIED'))

### C. Translation Keys Required

**New Translation Namespace**: `badges.*`

```json
{
  "badges": {
    "trustLevel": {
      "selfDeclared": "Self-Declared",
      "communityConfirmed": "Community Confirmed",
      "ummahFlowVerified": "UFlow Verified"
    },
    "actions": {
      "confirm": "Confirm",
      "confirmed": "Confirmed ✓",
      "unconfirm": "Remove Confirmation",
      "learnMore": "Learn More About Badges"
    },
    "labels": {
      "confirmationCount_one": "{{count}} confirmation",
      "confirmationCount_other": "{{count}} confirmations",
      "noBadges": "No verified badges yet",
      "addBadge": "Add Badge"
    },
    "legend": {
      "title": "Trust Levels Explained",
      "selfDeclared": "Provider claimed this badge",
      "communityConfirmed": "≥5 community members confirmed this badge",
      "verified": "Verified by UFlow team or Islamic scholars"
    }
  }
}
```

---

**Plan Status**: Active  
**Ready for Implementation**: Pending Architect + Security Review  
**Estimated Effort**: 4 weeks (1 developer)  
**Target Completion**: 2026-02-24
