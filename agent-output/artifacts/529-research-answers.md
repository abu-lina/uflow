### Phase: Research — Done

- Issue: #529
- Worktree: n/a (read-only investigation on canonical `main` @ `db4a10e5`)
- Flow: research / answers the two open questions on the [gating matrix](https://github.com/abu-lina/uflow/issues/529#issuecomment-6014278930)

## Headline: both questions are answerable, but both source issues describe stale state

Before answering: **every alert cited in #439 and #440 is already `fixed` on GitHub.** Live Dependabot state is 3 open alerts, none of which either issue mentions.

```
$ gh api repos/abu-lina/uflow/dependabot/alerts --paginate \
    -q '.[]|select(.state=="open")|[.security_advisory.severity,.dependency.package.name,.dependency.scope,.dependency.manifest_path]|@tsv'
high     source-map-js             runtime        package-lock.json                        (#216, GHSA-68fv-2mgg-jv7q)
high     source-map-js             development    tools/memory-backend/package-lock.json   (#217, same GHSA)
medium   postcss-selector-parser   development    package-lock.json
```

The #439 trio (two high + one medium `brace-expansion`) are alerts **205, 206, 207**, all `fixed` at `2026-09-30T09:08:23Z`. The #440 set (`ip-address` ×6, `brace-expansion`, `vitest`, `@vitest/mocker`) are alerts 199, 200, 203, 208–213, all `fixed` 2026-09-30. Zero open `brace-expansion`, `ip-address` or `vitest` alerts in any manifest, any scope.

---

## Q1: Is `brace-expansion` production or dev-only?

**Answer: production tree — but build-time in practice, and already patched.** The dev-only hypothesis is wrong.

`npm ls brace-expansion --omit=dev --all` returns a non-empty tree, which settles reachability:

```
ummah-flow@0.15.21
└─┬ @serwist/next@9.5.12
  └─┬ glob@13.0.6
    └─┬ minimatch@10.2.6 overridden
      └── brace-expansion@5.0.12 overridden
```

`@serwist/next` is in `dependencies` (`package.json:103`), not `devDependencies`. Lockfile agrees: `node_modules/brace-expansion` is `version 5.0.12, dev: false`.

Full reverse-dependency walk of `package-lock.json` yields 76 paths. Exactly 5 are production, all through `@serwist/next`:

```
brace-expansion < minimatch < glob < @serwist/build  < @serwist/cli < @serwist/next < [ROOT]
brace-expansion < minimatch < glob < @serwist/build  < @serwist/next < [ROOT]
brace-expansion < minimatch < glob < @serwist/build  < @serwist/webpack-plugin < @serwist/next < [ROOT]
brace-expansion < minimatch < glob < @serwist/cli    < @serwist/next < [ROOT]
brace-expansion < minimatch < glob < @serwist/next   < [ROOT]
```

The other 71 are dev, all via `eslint` → `@eslint/config-array` / `@eslint/eslintrc` → `minimatch`.

**Two corrections to the premises in the brief and #439:**

1. The override is `"brace-expansion": ">=5.0.12"` (`package.json:189`), not `">=5.0.8"`. It _does_ force the patched version.
2. Nothing is stuck at 5.0.9. Installed and locked version is **5.0.12**, the fixed release. `npm ls` marks it `overridden`, and `node_modules/brace-expansion/package.json` reports `5.0.12`.

**Build-time vs runtime nuance (matters for the matrix):** being in `dependencies` is not the same as being in the server bundle. `@serwist/next` runs in _configurator mode_ — a standalone `serwist build` CLI step, not a Next plugin (`next.config.js:5-17`, `scripts/build-sw.js:1-14,39`). App code imports only the `serwist` runtime package (`src/lib/pwa/sw.ts:2`, `src/lib/pwa/runtimeCaching.ts:7`), never `@serwist/next`, so Next's standalone tracer should not pull `glob`/`minimatch`/`brace-expansion` into `server.js`.

⚠️ _Unverified:_ no `.next/standalone` build exists locally, so I could not empirically confirm the trace. This is reasoning from config, not observation. A `npm run build:standalone` then `find .next/standalone -name brace-expansion` would settle it.

**Column: advisory, and #439 should be closed as already-fixed.** Note this is the _right answer for the wrong reason_ — not because it's dev-only (it isn't), but because it's already at the patched version. Had it still been 5.0.9, the `--omit=dev` output above would have put it in the production column.

---

## Q2: Is anything under `tools/*` deployed or executed off a developer machine?

**Answer: no. The assumption holds.**

### `tools/memory-backend` — a library, not a service

- **No `start` script.** `package.json` scripts are exactly `build` (`tsc`), `test`, `test:watch`, `type-check`.
- **Declares itself a library:** `"main": "dist/index.js"`, `"types": "dist/index.d.ts"`.
- **Zero network surface.** `grep -rn "listen(\|createServer\|PORT\|0\.0\.0\.0\|express\|fastify" tools/memory-backend/src/` returns **nothing**. It is an in-process SQLite wrapper ("Local-first agent memory backend with multi-window safe SQLite storage"), consumed by the VS Code extension.
- **No deploy config exists anywhere in the repo.** `find . -maxdepth 3 -not -path "*/node_modules/*" \( -name "Dockerfile*" -o -name fly.toml -o -name vercel.json -o -name render.yaml -o -name "docker-compose*" -o -name "*.service" \)` → only `./Dockerfile` (main Next app), `./infra/plausible/docker-compose.yml`, `./docs/archive/Dockerfile.backup`. No k8s manifests, no systemd units.
- **CI never touches it.** `grep -rn "tools/" .github/workflows/` → no matches.
- **Not referenced by the main app.** Root `package.json` has no `workspaces` field, so `npm ci` never installs `tools/*` dependencies.

### `tools/uflow-memory-extension` — a VS Code extension, side-loaded only

Not a browser extension (the brief assumed browser; it's `engines.vscode ^1.106.0`).

- **Packaged, never published.** Scripts are `vscode:prepublish` → `npm run compile`, and `package` → `vsce package`. There is **no `vsce publish`**, and no CI job that publishes.
- **README documents local install only** (`README.md:15-27`): build, `npx vsce package`, then "Extensions: Install from VSIX...".
- **The `.vsix` artifacts are not git-tracked.** `git ls-files tools/uflow-memory-extension/` returns only `CHANGELOG.md`, `README.md`, `package.json`, `package-lock.json`, `src/{extension,store,types}.ts`, `tsconfig.json`. The three `uflow-memory-0.1.{0,1,2}.vsix` files in the directory are untracked local build output.
- Also: the extension lockfile on `main` contains **no `ip-address` and no `brace-expansion` entries at all** (`grep` returns nothing across its 61 packages), consistent with #440's alerts being fixed.

**Column: advisory. #440 should be closed as already-fixed.**

### One finding that is not in the matrix: `.dockerignore` path anchoring

`.dockerignore` lists bare `node_modules` and bare `dist`. Docker matches these against the full context-relative path, so they match only `./node_modules` and `./dist` — **not** `tools/*/node_modules` or `tools/*/dist`. This is the identical bug the file already documents and fixes for `__tests__` (see its own comment: _"Patterns must be path-anchored"_). So `tools/*` dependency trees **are** copied into the Docker builder stage via `COPY . .` (`Dockerfile:32`).

This does **not** reach production. The runtime stage copies only three paths (`Dockerfile:76,79,82`): `/app/public`, `/app/.next/standalone`, `/app/.next/static`. Builder layers are discarded, and nothing in the build executes `tools/` code. Impact is a fatter build context, not exposure. Worth a cleanup ticket (`tools/` or `**/node_modules`), not a gate.

---

## Confirmed: the CI audit step

`.github/workflows/ci.yml:137-159`, job `security` (`needs: [supply-chain-ioc-scan]`, 5-min timeout):

```yaml
- name: Run npm audit
  run: npm audit --audit-level=high
  continue-on-error: true
```

`continue-on-error: true` confirmed at line 159. Locally the step exits **1** with **13 vulnerabilities (4 moderate, 9 high)**.

The #529 body's characterization of the highs as dev-only is **no longer accurate**. The 9 highs collapse to two advisories:

- `braces` (`*`) — **dev-only**, confirmed: `npm ls braces --omit=dev` → `(empty)`; paths are `lint-staged@15.5.2 > micromatch@4.0.8 > braces` and `tailwindcss@3.4.19 > chokidar@3.6.0 > braces`. Matches the described fast-glob/micromatch cluster.
- `source-map-js` (`1.0.0 - 1.2.1`) — **production tree**, and the live Dependabot `runtime` alert #216.

---

## What this means for the matrix

The matrix's logic is sound; its worked examples are out of date. Two substantive revisions:

1. **Drop #439 and #440 as examples.** Both are fully remediated. Citing them as live cases makes the matrix look like it is gating on nothing.

2. **The matrix needs a third column: production-tree but build-time-only.** This is the real discovery. Both `brace-expansion` (via `@serwist/next`) and `source-map-js` (via `next > postcss`) sit in `dependencies` with `dev: false`, and Dependabot labels `source-map-js` scope `runtime` — yet both are build toolchain, plausibly absent from `server.js`. A strict "production dependency ⇒ blocks merge" rule routes build tooling into the blocking column on a technicality. Suggested discriminator: **blocking requires presence in `.next/standalone`**, not merely absence of `dev: true`.

3. **There is one genuine open item, and the matrix does not name it:** alert **#216**, `source-map-js` high, scope `runtime`, root lockfile, `next@16.3.8 > postcss@8.5.28 > source-map-js@1.2.1`. `npm audit` reports `fix available via npm audit fix` (non-breaking, → 1.2.2). Under the matrix as written this is merge-blocking. Under the revision in (2) it is advisory pending a standalone-trace check. Either way it is a cheap fix and the only thing on the list worth acting on.

### Verification status

| Claim                                                                  | Status                                                                                                        |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `brace-expansion` reachable from `dependencies` via `@serwist/next`    | **Verified** (`npm ls --omit=dev`, lockfile `dev: false`)                                                     |
| Already at patched 5.0.12; override is `>=5.0.12`                      | **Verified** (lockfile, `node_modules`, `package.json:189`)                                                   |
| All #439 / #440 alerts `fixed`                                         | **Verified** (Dependabot API)                                                                                 |
| `tools/memory-backend` is not a service, no listener, no deploy config | **Verified** (scripts, grep, find, CI grep, no `workspaces`)                                                  |
| Extension is side-loaded VS Code, not published                        | **Verified** (no `vsce publish`, README, `git ls-files`)                                                      |
| `continue-on-error: true` on `npm audit`                               | **Verified** (`ci.yml:159`)                                                                                   |
| `braces` dev-only / `source-map-js` production                         | **Verified** (`npm ls --omit=dev`)                                                                            |
| `brace-expansion` + `source-map-js` absent from `.next/standalone`     | ⚠️ **Hypothesis** — no local build; needs `npm run build:standalone` then `find .next/standalone -name <pkg>` |
| `tools/*/node_modules` enter the Docker builder stage                  | **Verified by inspection** of `.dockerignore` anchoring + `Dockerfile:32`; not confirmed by an actual build   |
