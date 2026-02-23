# `src/components/` — Shared UI Building Blocks

This folder contains **shared, domain-agnostic** UI components used across multiple features.

## Subfolders

| Folder | Purpose | Examples |
| --- | --- | --- |
| `ui/` | Atomic primitives (buttons, inputs, modals, badges) | `Button.tsx`, `Input.tsx`, `Modal.tsx` |
| `common/` | Small reusable components used in multiple pages | `Card.tsx`, `ErrorMessage.tsx` |
| `shared/` | Larger shared blocks (page headers, card groups) | `SplashContent.tsx`, `MobileSplashScreen.tsx` |
| `layout/` | Layout containers and wrappers | `RootClientLayout.tsx`, `Sidebar.tsx` |

## What belongs here

- Components that are **not specific to a single domain** (providers, mosque, admin, etc.)
- UI primitives that could be used by any feature

## What does NOT belong here

- **Domain-specific UI** (provider cards, endorsement buttons, admin dashboards).
  These should live in `src/features/<domain>/components/` so that ownership and boundaries are clear.
- When in doubt, see the [Placement Rubric](../../docs/guides/PLACEMENT_RUBRIC.md).

## Migration direction

Existing domain folders under `src/components/` (e.g., `providers/`, `mosque/`, `admin/`, `community-services/`, `create/`, `auth/`) are **legacy placements**. When you modify files in those folders, consider moving them to `src/features/<domain>/components/` as part of the same PR.

Do **not** mass-move everything at once — migrate incrementally, feature-by-feature.
