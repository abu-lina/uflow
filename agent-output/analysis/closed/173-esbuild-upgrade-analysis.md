---
ID: 173
Origin: 173
UUID: a3f7c2b1
Status: Committed
---

# Analysis: esbuild Upgrade for Dependabot Alerts

## Changelog
| Date | Agent | Change |
|------|-------|--------|
| 2026-06-14 | Analyst | Initial analysis created |

## Value Statement
Fix 2 Dependabot alerts for esbuild Deno RCE vulnerability (CVE-2025-xxx) by upgrading esbuild from 0.27.7 to >=0.28.1 in tools/memory-backend/.

## Context
- esbuild 0.27.7 is a transitive dependency via vitest 3.2.6 → vite 7.3.5 → esbuild ^0.27.0
- The vulnerability affects esbuild < 0.28.1: Deno module downloads native binaries without SHA-256 integrity verification when NPM_CONFIG_REGISTRY env var is set
- The Node.js path (which is what we use) already has integrity checks, but we still need to upgrade to clear the Dependabot alerts

## Findings

### 1. Current Dependency Chain
- `vitest ^3.2.6` → `vite 7.3.5` → `esbuild ^0.27.0`
- esbuild 0.27.7 is resolved in the lock file
- All @esbuild/* platform packages at version 0.27.7

### 2. Fix Options Evaluated

| Option | Viable? | Notes |
|--------|---------|-------|
| Upgrade vitest to version pulling esbuild >= 0.28.1 | No | vitest 4.x uses vite 8.x which makes esbuild an optional peer. Would be a major version change with potential breakage. |
| Add npm `overrides` to force esbuild to ^0.28.1 | **Yes** | Cleanest approach. npm 11.6.3 supports overrides. esbuild 0.28.x is backward-compatible for APIs vite uses (vite 8 supports `^0.27.0 || ^0.28.0`). |
| Add direct devDependency on esbuild ^0.28.1 | Partial | Works but without overrides, vitest's sub-dependency on esbuild ^0.27.0 might still resolve 0.27.x in nested node_modules. Overrides ensure uniform resolution. |

### 3. Recommended Approach
Use **both** a direct devDependency and npm overrides to guarantee esbuild >= 0.28.1 is resolved everywhere:

1. Add `"esbuild": "^0.28.1"` to devDependencies
2. Add `"overrides": { "esbuild": "^0.28.1" }` to package.json
3. Run `npm install` to update lock file

## Analysis Recommendations
Proceed to implementation with the recommended approach above. No further investigation needed.

## Remaining Gaps
None — fix approach is clear and low-risk.

## Open Questions
None.
