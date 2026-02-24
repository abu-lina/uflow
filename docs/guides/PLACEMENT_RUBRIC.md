# Placement Rubric — Where Should I Add This File?

Use this table to decide the correct location for new code. When in doubt, default to the simplest option and refactor later.

## Quick Decision Table

| What you're adding                        | Put it in                                        | Example                                      |
| ----------------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| **UI component** (shared across features) | `src/components/ui/` or `src/components/common/` | `Button.tsx`, `Card.tsx`                     |
| **UI component** (specific to one domain) | `src/features/<domain>/components/`              | `ProviderCard.tsx`, `EndorseBadgeButton.tsx` |
| **Layout wrapper**                        | `src/components/layout/`                         | `RootClientLayout.tsx`                       |
| **React hook** (shared)                   | `src/hooks/`                                     | `useDebounce.ts`                             |
| **React hook** (domain-specific)          | `src/features/<domain>/hooks/`                   | `useProviderSearch.ts`                       |
| **Supabase data access** (shared service) | `src/services/`                                  | `providers.ts`, `badges.ts`                  |
| **Server-only data access**               | `src/services/*.server.ts`                       | `providers.server.ts`                        |
| **TypeScript types**                      | `src/types/`                                     | `provider.ts`, `supabase.ts`                 |
| **Pure utility function**                 | `src/utils/`                                     | `sanitizeInput.ts`, `imageUtils.ts`          |
| **Library/framework wrappers**            | `src/lib/`                                       | `supabase/server.ts`, `rate-limit.ts`        |
| **Constants**                             | `src/constants/`                                 | `colors.ts`, `translation-keys.ts`           |
| **Translations**                          | `src/translations/`                              | `de.ts`, `en.ts`, `ar.ts`                    |
| **Context providers**                     | `src/providers/`                                 | `AuthProvider.tsx`, `FilterProvider.tsx`     |
| **Config / feature flags**                | `src/config/`                                    | `feature-flags.ts`, `env.ts`                 |
| **Database migration**                    | `supabase/migrations/`                           | `020_add_column.sql`                         |
| **SQL debug/seed script**                 | `sql/` (reference only)                          | `debug/check-token.sql`                      |
| **Dev/ops script**                        | `scripts/` (repo root)                           | `deploy.sh`, `generate-manifest.js`          |
| **Unit/component test**                   | `src/__tests__/<category>/`                      | `src/__tests__/services/offers.test.ts`      |
| **Performance/e2e test**                  | `tests/performance/`                             | `tests/performance/run-tests.sh`             |
| **Documentation**                         | `docs/<category>/`                               | `docs/features/QUICK_CREATE.md`              |

## Key Rules

1. **Shared UI** lives in `src/components/`; **domain UI** lives in `src/features/<domain>/components/`.
2. **Scripts** are never imported by runtime code. If you need to `import` it in `src/`, it's not a script — move it to `src/lib/` or `src/utils/`.
3. **Authoritative database migrations** go in `supabase/migrations/` only. `sql/migrations/` is for historical reference.
4. **Server-only modules** must use the `*.server.ts` suffix or import `'server-only'` to prevent accidental client bundling.
5. When modifying a file in a **legacy location** (e.g., `src/components/providers/`), consider moving it to the correct location in the same PR.

## Don't Over-Organize

- Don't create a new folder for a single file.
- Don't move code "just because" — only when you're already touching it.
- When uncertain, pick the simpler option now and refactor later.
