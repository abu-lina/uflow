---
ID: 173
Origin: 173
UUID: a3f7c2b1
Status: Committed
---

# Plan 173: Upgrade esbuild to >=0.28.1 in tools/memory-backend

## Changelog
| Date | Agent | Change |
|------|-------|--------|
| 2026-06-14 | Planner | Plan created from analysis |

## Objective
Fix 2 Dependabot alerts by upgrading esbuild from 0.27.7 to >=0.28.1 in `tools/memory-backend/`.

## Scope
- **File to modify**: `tools/memory-backend/package.json`
- **File to update**: `tools/memory-backend/package-lock.json` (via `npm install`)
- **No source code changes** — esbuild is a build tool dependency only

## Changes Required

### 1. Edit `tools/memory-backend/package.json`

Add to `devDependencies`:
```json
"esbuild": "^0.28.1"
```

Add `overrides` section:
```json
"overrides": {
  "esbuild": "^0.28.1"
}
```

### 2. Run npm install
```bash
cd tools/memory-backend && npm install
```

This will:
- Install esbuild 0.28.x as a direct devDependency
- Force the transitive dependency (via vitest → vite) to resolve to 0.28.x
- Update package-lock.json with new esbuild version

### 3. Verify
- Confirm `grep esbuild package-lock.json | grep resolved` shows version >= 0.28.1
- Run `npm test` to ensure vitest still works with the newer esbuild

## Verification Steps
1. Lock file shows esbuild >= 0.28.1
2. All @esbuild/* platform packages are at matching version
3. Tests pass
4. Type checking passes

## Rollback
If the upgrade causes issues, revert package.json changes and run `npm install` to restore original lock file.
