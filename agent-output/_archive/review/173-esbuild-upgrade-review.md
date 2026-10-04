# Review: esbuild upgrade 0.27.7 → 0.28.1

**Plan ID**: 173
**Files**: `tools/memory-backend/package.json`, `tools/memory-backend/package-lock.json`
**Reviewer**: opencode

---

## Verdict: APPROVED

Minor recommendation below — no blocker.

---

## Summary

The change adds `esbuild` as a direct devDependency at `^0.28.1` and introduces an `overrides` block to pin the transitive esbuild dependency (via vitest → vite) to the same range.

### Findings

1. **All esbuild packages resolve to 0.28.1** — Verified 27 entries in `package-lock.json` (1 main + 26 platform-specific `@esbuild/*` optional packages). All `resolved` URLs point to the `0.28.1` tarball. No stale 0.27.x artifacts remain.

2. **The `overrides` mechanism is correct** — Vite declares `"esbuild": "^0.27.0"` in its own `package.json` (visible in the lockfile at line 1912), but the overrides block in the root `package.json` overrides this to `^0.28.1`, correctly fixing the Dependabot alert on the transitive dependency.

3. **`^0.28.1` is the right range** — Using `>=0.28.1` would allow major version bumps (0.29.0, 1.0.0) which could introduce breaking changes. The caret range (`>=0.28.1 <0.29.0`) is the safer choice for a security patch pin.

4. **Redundant direct devDependency (recommendation)** — The build uses `tsc`, not esbuild. esbuild is only a transitive dependency of vitest/vite. The `overrides` block alone would resolve the Dependabot alert. The explicit `"esbuild": "^0.28.1"` in `devDependencies` is unnecessary and adds a dependency that is never imported or invoked directly. Consider removing it to keep the dependency tree lean.

### Integrity check

| Check | Status |
|-------|--------|
| All `@esbuild/*` platform packages at 0.28.1 | ✅ |
| Main `esbuild` resolved to 0.28.1 | ✅ |
| No stale 0.27.x version references | ✅ |
| Override range covers vite's `^0.27.0` requirement | ✅ |
| Lockfile integrity consistent | ✅ |

## Recommendation

Remove `"esbuild": "^0.28.1"` from `devDependencies` in `package.json` and regenerate the lockfile. The `overrides` block is sufficient to fix the vulnerability.
