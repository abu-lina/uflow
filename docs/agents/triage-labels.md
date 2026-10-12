# Labels

Three label axes. Confirm they exist before relying on this file:

```bash
gh label list --limit 100 --json name --jq '.[].name'
```

## Priority: `P0` to `P3`

| Label | Meaning                                              |
| ----- | ---------------------------------------------------- |
| `P0`  | Blocks users or leaks data. Drop everything.         |
| `P1`  | This week.                                           |
| `P2`  | Next. The default when nothing is set.               |
| `P3`  | Someday. Picked only when nothing higher is `ready`. |

## Readiness: `ready`

`ready` means: the body has an Acceptance Criteria section with testable items, the scope fits one PR, and a lane may pick it without asking. The foreman adds it after checking; the issue templates make the section mandatory but don't add the label.

Companion states that block a lane:

| Label             | Meaning                                           |
| ----------------- | ------------------------------------------------- |
| `needs-triage`    | Nobody has looked yet                             |
| `needs-info`      | Waiting on the owner for an answer or a decision  |
| `ready-for-human` | Owner does it, not an agent                       |
| `no-parallel`     | Repo-wide change; runs alone, no other lanes open |
| `wontfix`         | Closed without action                             |

`ready` together with `needs-info` or `ready-for-human` is a mistake; fix the labels before dispatching.

## Area: `area:*`

One per issue. Two lanes running at the same time never share an area, which keeps their diffs apart.

| Label            | Code it covers                                                      |
| ---------------- | ------------------------------------------------------------------- |
| `area:auth`      | `src/app/(public)/login`, `signup`, `src/features/auth`, `api/auth` |
| `area:search`    | search RPCs, `src/features/search`, `api/providers/search`          |
| `area:providers` | provider pages, `src/features/providers`, `api/providers`           |
| `area:map`       | map components, pins, city stage                                    |
| `area:dashboard` | `src/app/(dashboard)`                                               |
| `area:admin`     | `api/admin`, admin UI                                               |
| `area:i18n`      | `messages/*`, locale handling                                       |
| `area:pwa`       | Serwist, manifest, service worker, push                             |
| `area:db`        | `supabase/migrations`, RLS, RPC functions                           |
| `area:ci`        | `.github/workflows`                                                 |
| `area:infra`     | `Dockerfile`, `deploy/`, nginx, Hetzner                             |
| `area:ui`        | `src/components/ui`, design system                                  |
| `area:imports`   | `imports/`, enrichment and import workflows                         |
| `area:docs`      | `docs/`, `AGENTS.md`, agent guides                                  |
| `area:deps`      | dependency bumps                                                    |

An issue that spans two areas gets split before it is `ready`.

## Type: `type:*`

Unchanged: `type:feature`, `type:bugfix`, `type:hotfix`, `type:refactor`, `type:security`, `type:verification`, `type:change-request`. The branch prefix follows the type (`feat/`, `fix/`, `refactor/`, `chore/`).

## Transition from the old scheme

Until the backlog is re-labelled, `ready-for-agent` counts as `ready`, and `stage:prep` / `stage:build` / `plan` carry no meaning. Re-label as you go:

```bash
gh issue edit N --add-label ready,P2,area:ui --remove-label ready-for-agent,stage:build
```

Create a missing label with `gh label create <name> --description "<meaning from this file>"`.
