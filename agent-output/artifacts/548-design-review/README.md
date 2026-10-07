# Issue #548 — Design Review evidence

Captured against the real app: `next dev` on 127.0.0.1:3100 from worktree
`feature/548-halal-approve-reject`, local Supabase (migration 138 applied),
signed in as a seeded `role=admin` user, on a seeded pending food provider
whose `food_providers` row is the production-shape import default
(`no_alcohol/no_pork/no_gambling = false`).

## Captured

| File                                         | What it shows                                                                                                                           |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `01-halal-footer-desktop-1440.png`           | Review footer at 1440x900. Two full-bleed fixed bars; `Verifizierungsmethode` heading clipped behind the review bar.                    |
| `02-halal-footer-mobile-390.png`             | Review footer at 390x844. Green `Genehmigen` / red `Ablehnen` at 36px above the 48px teal `Speichern`.                                  |
| `03-halal-footer-mobile-scrolled-bottom.png` | Same after scrolling `main` to the end (byte-identical to 02: `main` is not the scroll container at this size).                         |
| `04-halal-footer-rtl-ar-mobile.png`          | `locale=ar`, `document.documentElement.dir === "rtl"` (asserted in script). Footer mirrors correctly; new review strings are localized. |

## NOT captured — stated honestly rather than described

- **Provider-list card moderation actions.** `ProvidersContent.tsx:583` gates
  them on `enableModeration = isAdmin && !!status`, where `isAdmin` comes from
  the client-side `useIsAdmin()` hook. Cookie-only auth (what the e2e `signIn`
  helper does) satisfies the server routes but does not hydrate the browser
  Supabase session, so `isAdmin` stayed false and the list rendered
  "Keine Ergebnisse gefunden". Two attempts (`shots.mjs`, `shots2.mjs`,
  the second injecting the session into three candidate localStorage keys)
  both reported `cards visible = false`. Findings about this surface are from
  source (`ProviderCard.tsx:600-641`), not from a render.
- **Community-services footer.** No `community_services` row exists in the
  local DB (`NO community_services row to screenshot`). Findings about it are
  from source (`community-services/[id]/edit/page.tsx:381-425`).

## Reproducing

```bash
# worktree root, with local supabase running
npx next dev -p 3100 -H 127.0.0.1   # with NEXT_PUBLIC_SUPABASE_* from `supabase status`
cd agent-output/artifacts/548-design-review
ANON=<anon> SVC=<service_role> OUT=$PWD node shots.mjs
```

Both scripts seed and then delete their own auth users and provider rows.
Keys are read from the environment, never written to disk.
