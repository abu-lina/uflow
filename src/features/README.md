# `src/features/` — Feature Modules

Each subfolder groups **all code that belongs to a single product domain**: UI components, hooks, services, and tests that are specific to that feature.

## Current features

| Feature      | Contents                |
| ------------ | ----------------------- |
| `about/`     | About page UI           |
| `auth/`      | Authentication flows    |
| `providers/` | Provider creation forms |
| `search/`    | Search-specific logic   |

## Structure convention

```
src/features/<domain>/
├── components/       # Domain-specific UI (client or server)
├── hooks/            # Domain-specific React hooks
├── services/         # Domain-specific data access (if not shared)
├── __tests__/        # Unit/component tests for this feature
└── index.ts          # Public API barrel (optional)
```

## What belongs here

- UI, hooks, and logic that are **specific to one domain** and not shared across the app.
- When a component in `src/components/<domain>/` is modified, consider moving it here.

## What does NOT belong here

- Shared UI primitives → `src/components/ui/` or `src/components/common/`
- App-wide hooks → `src/hooks/`
- Shared Supabase data-access modules → `src/services/`
- See the [Placement Rubric](../../docs/guides/PLACEMENT_RUBRIC.md) for the full decision guide.
