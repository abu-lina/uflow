# Architecture Review: Provider Data Access Consolidation

**Date**: 30 August 2026
**Method**: Hot-spot driven, 60 recent commits analyzed
**Status**: Candidate 1 completed; Candidates 2-5 remain

---

## Candidate 1: Collapse the Provider data-access split [COMPLETED]

**Strength**: Strong | local-substitutable

**Files**:
- `src/services/providers.ts` (1,083 lines, 42 importers)
- `src/services/providers.server.ts` (286 lines) -- DELETED
- `src/services/providerService.ts` (421 lines) -- MOVED

**Problem**: Six functions duplicated across `providers.ts` and `providers.server.ts` with subtle behavioral drift (e.g. `getRecommendations` returns different data). The module-level `supabase` singleton makes `providers.ts` untestable without module mocking. An inline admin client at line 553 bypasses `getSupabaseAdmin()`.

**Solution**: Adopt the `badges.ts` pattern: every function accepts `client?: SupabaseClient`. Merge `providers.server.ts` into `providers.ts`. Move mutations to `features/providers/services/mutations.ts`.

**Wins**:
- Locality: one place to fix provider queries
- Leverage: one interface for 42 importers
- Delete 286-line server duplicate
- Testable seam via client injection
- Kill inline admin client construction

**Implemented in**: PR #334 (`refactor/consolidate-provider-data-access`)
- Net: -243 lines (24 files changed, +337 / -580)
- 3 files deleted, 1 relocated
- All 1979 tests pass, typecheck clean, build passes

---

## Candidate 2: Extract the map/discovery module from two god pages [OPEN]

**Strength**: Strong | in-process
**Priority**: Next recommended

**Files**:
- `src/app/(public)/providers/ProvidersContent.tsx` (774 lines, #1 hotspot, 8 changes)
- `src/components/shared/RootPageContent.tsx` (502 lines)

**Problem**: ~120 lines of map/near-me logic copy-pasted verbatim between two files. `ProvidersContent` is a 774-line god module with 15+ `useState` calls handling search, map, near-me, admin moderation, and pagination. Every map-related bug fix requires editing both files.

**Solution**: Extract a `useMapDiscovery()` hook into `features/search/hooks/` that owns pin loading, near-me state, adapters, and view mode. Both pages consume it.

**Wins**:
- Locality: map bugs fixed in one place
- Delete ~120 lines of duplication
- ProvidersContent shrinks from 774 to ~600 lines
- Testable: hook can be tested independently
- Leverage: one interface for both discovery surfaces

---

## Candidate 3: Consolidate Provider components into features/providers/ [OPEN]

**Strength**: Worth exploring | in-process

**Files**:
- `src/components/providers/` (14 files, including 1,106-line ProviderEditForm)
- `src/features/providers/components/` (9 files)

**Problem**: Provider UI split across two directories with circular imports: `components/providers/` imports from `features/providers/` and vice versa. No clear seam. Neither directory is a leaf module.

**Solution**: Move all 14 files from `components/providers/` into `features/providers/` with a `pages/` and `shared/` sub-split. Eliminates the circular dependency; the feature-module pattern already expects this.

**Wins**:
- Locality: all Provider UI in one directory
- Circular imports eliminated
- Feature-module pattern followed consistently
- Imports become shorter, navigability improves

---

## Candidate 4: Eliminate the SearchResult ceremony type [OPEN]

**Strength**: Worth exploring | in-process

**Files**:
- `src/services/providers.ts` lines 73-234: Provider + SearchResult + transformProviderToSearchResult

**Problem**: `SearchResult` is a near-clone of `Provider` that renames 3 fields (`provider_id` to `id`, `provider_name` to `name`, `provider_images` to `images`) and copies 27 others verbatim. The 46-line `transformProviderToSearchResult` is pure ceremony; any new Provider field must be added to both types and the transformer.

**Solution**: Delete `SearchResult`. Use `Provider` as the canonical type everywhere. The 3 renamed fields already exist on Provider; callers that need `id` can read `provider_id`.

**Wins**:
- Delete the 46-line transform function
- One type to learn, one to maintain
- Locality: new fields added in one place
- Deletion test passes: no complexity reappears

---

## Candidate 5: Deepen the Chat tool-executor with handler modules [OPEN]

**Strength**: Worth exploring | mock

**Files**:
- `src/features/chat/services/tool-executor.ts` (533 lines)
- `src/features/providers/services/mutations.ts` (createProviderOrService)

**Problem**: `executeToolCall` is a 300-line switch. The `register_provider` case duplicates provider creation logic instead of calling `createProviderOrService()`, missing location creation, badge insertion, and relation sync. No dependency injection means no testable seam.

**Solution**: Extract each switch case into a handler module under `features/chat/services/tools/`. The `register` handler calls `createProviderOrService()`. Pass `SupabaseClient` into `executeToolCall`.

**Wins**:
- Locality: provider creation logic in one place
- Each handler testable through its own interface
- Seam via client injection
- No drift between chat registration and form registration

---

## Recommended order

1. ~~Candidate 1~~ (done)
2. **Candidate 2** -- highest remaining leverage; #1 source of repeated bug fixes
3. **Candidate 5** -- fixes a correctness bug (chat registration missing locations/badges/relations)
4. **Candidate 4** -- pure deletion, unlocked by Candidate 1
5. **Candidate 3** -- file moves, lower risk but also lower urgency
