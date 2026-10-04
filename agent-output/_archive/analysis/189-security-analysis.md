---
ID: 189
Origin: 189
UUID: a7b3c9d1
Status: Active
---

# Security Analysis: Dependabot Alerts — Plan 189

## Changelog
| Date | Agent | Action |
|------|-------|--------|
| 2026-06-18 | Analyst | Initial analysis of 16 open Dependabot alerts |

## Value Statement
Fix 16 open security vulnerabilities across npm dependencies to reduce attack surface. Covers 3 high, 8 moderate, and 5 low severity alerts.

## Methodology
- Queried GitHub Dependabot API for all open alerts
- Cross-referenced with `npm audit` for current lockfile state
- Checked which packages are direct vs transitive dependencies
- Identified fix versions and compatibility concerns

## Findings

### Affected Packages Overview

| # | Package | Installed | Fixed In | Severity | Direct/Transitive | Parent |
|---|---------|-----------|----------|----------|------------------|--------|
| 1 | `form-data` | 4.0.5 | 4.0.6 | **HIGH** | Transitive | axios |
| 2 | `vite` | 7.3.2 | 7.3.5 | **HIGH** | Transitive (dev) | vitest, @vitejs/plugin-react |
| 3 | `ws` (7.x) | 7.5.10 | 7.5.11 | **HIGH** | Transitive (dev) | webpack-bundle-analyzer |
| 4 | `undici` | 7.27.2 | 7.28.0+ | HIGH | Transitive | cheerio |
| 5 | `dompurify` | 3.4.2 | 3.4.11 | Moderate/Low | Transitive | swagger-ui-react |
| 6 | `js-yaml` | 4.1.1 | 4.2.0 | Moderate | Transitive | swagger-ui-react, eslint |
| 7 | `@babel/core` | 7.29.0 | 7.29.6 | Low | Transitive (dev) | vitest |
| 8 | `esbuild` | 0.27.3 | 0.28.1 | Low | Transitive (dev) | vite, vitest |
| 9 | `postcss` (next-bundled) | 8.4.31 | 8.5.10+ | Moderate | Bundled in next | next (build-time only) |

### Fix Strategy

**Approach 1: npm overrides** — For transitive deps where the parent can't be easily updated:
- `form-data`: override to `4.0.6`
- `dompurify`: override to `3.4.11`
- `js-yaml`: override to `4.2.0`
- `@babel/core`: override to `7.29.6`
- `esbuild`: override to `0.28.1`
- `vite`: override to `7.3.5`
- `undici`: override to latest (7.x series)
- `ws`: override `ws@<8` to `7.5.11`

**Approach 2: Accept risk** — For deps we can't fix:
- `postcss` in next: Bundled inside next@15.5.19. XSS in CSS stringify is a dev-tooling issue, not a runtime concern. Accept.

### Compatibility Assessment
- `js-yaml` 4.1.1 → 4.2.0: Minor bump. swagger-ui-react pins `=4.1.1`, but 4.2.0 is API-compatible (no breaking changes in changelog).

## Recommendations
1. Add npm overrides for all fixable transitive deps
2. Run `npm install` to apply
3. Run full build and test suite to verify
4. Commit changes on a branch

## Remaining Gaps
| # | Unknown | Blocker | Status |
|---|---------|---------|--------|
| 1 | postcss in next can't be overridden | Bundled inside next package | Accepted (dev-time only) |
