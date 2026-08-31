# 173 - esbuild upgrade to ^0.28.1

## What changed

- Added `"esbuild": "^0.28.1"` to `devDependencies` in `tools/memory-backend/package.json`
- Added `"overrides": { "esbuild": "^0.28.1" }` to ensure transitive dependencies resolve to >=0.28.1
- Ran `npm install` — 2 packages updated

## Resolved esbuild version

0.28.1 (confirmed from `node_modules/esbuild/package.json`)

## Test results

```
 ✓ tests/store.test.ts (27 tests) 149ms
 Test Files  1 passed (1)
      Tests  27 passed (27)
```
All 27 tests pass. No regressions.
