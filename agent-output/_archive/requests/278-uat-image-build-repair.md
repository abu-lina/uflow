---
ID: 278
Origin: 277
UUID: 7E3A1C64-9B20-4D85-A1F7-5C08B2D6E934
Status: Complete
Type: fix
Branch: fix/278-dockerignore-tests
Worktree: ../uflow-wt/278-dockerignore
Created: 2026-10-01T19:10:00Z
---

# Request 278: Repair the UAT image build broken by the Next 16 merge

## Original request

Follow-on from request 277. While answering a question about Snyk status, found
`Build & Deploy to UAT` failing on `main`. Last green run was `804a6259`; it
broke at `59a446e3` (the Next 16 merge) and stayed broken through `d2fe604e`.

## Process deviation, recorded deliberately

The branch-first rule says create the tracking file at the implementer handoff.
This tracking file was written **after** the fix merged, because `main` was
broken for deploys and unblocking it came first. The learning was captured in
the same follow-up. Noting it so the gap is visible rather than silent.

## Two causes, both invisible to CI

### 1. A `.dockerignore` pattern that never matched (pre-existing)

The Tests section used a bare `__tests__`. That matches only a **root-level**
entry, so `src/__tests__` (254 files) was copied into the Docker build context
while `scripts/`, which those tests import from, was correctly excluded. Outside
Docker this resolves because `scripts/` exists on disk.

Next 16 type-checks those files during `next build` where Next 15 did not, so
the image build began failing:

```
src/__tests__/scripts/enrich-images.test.ts(3,37): error TS2307:
  Cannot find module '../../../scripts/enrich-images'
```

Anchoring to `**/__tests__` cleared every TS2307 and then exposed **226 TS2339**
errors across 23 **colocated** `*.test.*` files (`Property 'toBeInTheDocument'
does not exist`), because the jest-dom augmentation lives in
`src/__tests__/jest-dom.d.ts`. Colocated tests, `__mocks__`, `e2e/`,
`playwright.config.ts` and `vitest.config.ts` are now excluded too.

### 2. The PWA guard from #476 was never shipped into the image (self-inflicted)

Request 277 appended `&& node scripts/verify-pwa-output.js` to
`build:standalone`, but `scripts/` is dockerignored:

```
Error: Cannot find module '/app/scripts/verify-pwa-output.js'
  code: 'MODULE_NOT_FOUND'
```

`build:standalone` could not have succeeded in Docker regardless of the type
errors; the UAT build simply died earlier. The guard added specifically to
protect the production image was absent from that image.

## Decision

Ship the one guard file into the context rather than drop the guard or duplicate
it in the Dockerfile:

```
scripts/*
!scripts/verify-pwa-output.js
```

`scripts/*` rather than `scripts/`, because Docker cannot reliably re-include a
path under a wholly excluded directory. Dropping the guard would remove it from
the only build path that ships, which was the entire reason for adding it;
duplicating it into the Dockerfile gives two definitions that can drift.

## Verification

A real `docker build` to completion with the same build-args as
`deploy-uat.yml`, not a local `npm run build`, since the whole defect is about
what is and is not in the Docker context.

- Type-check clean: `Finished TypeScript`, zero TS2307, zero TS2339
- `Next.js 16.3.8 (webpack)` with `webpackBuildWorker`, not Turbopack
- Guard observed running inside the image build:
  `OK: public/sw.js generated and imports sw-push-handler.js`
- Reached the runner stage and produced an image (`DOCKER BUILD EXIT: 0`)
- Builder `/app/scripts` contains **exactly** `verify-pwa-output.js`; final
  image has no `scripts/` and zero test files, with `public/sw.js` present

## Outcome

Merged as PR #478, squash commit `5d199d08`. `.dockerignore` only, 21 insertions.
`Build & Deploy to UAT` is green again on `main`, with the real UAT run showing
`Next.js 16.3.8 (webpack)`, `Finished TypeScript in 18.3s`, and the guard
printing OK.

## Status

- [x] Diagnose the UAT failure and separate it from the `--webpack` work
- [x] Fix the `.dockerignore` patterns
- [x] Ship the guard script into the build context
- [x] Prove with a real `docker build` to completion
- [x] PR, CI, merge
- [x] Capture learning
