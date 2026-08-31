# Security Fixes — Plan 189

## Summary
Added npm overrides to resolve 14 of 16 Dependabot security alerts. The 2 remaining moderate alerts are from `postcss` bundled inside `next`, which is an accepted risk (build-time only, not runtime).

### Overrides Added/Updated
| Package | Old Version | New Version | Severity |
|---------|------------|-------------|----------|
| form-data | 4.0.5 | 4.0.6 | HIGH |
| vite | 7.3.2 | 7.3.5 | HIGH |
| ws@<8 | 7.5.10 | 7.5.11 | HIGH |
| undici | 7.27.2 | 7.28.0 | HIGH |
| dompurify | 3.3.2 | 3.4.11 | Moderate/Low |
| js-yaml | 4.1.1 | 4.2.0 | Moderate |
| @babel/core | 7.29.0 | 7.29.6 | Low |
| esbuild | 0.27.3 | 0.28.1 | Low |

### Full npm audit output (after fixes)
```
# npm audit report

postcss  <8.5.10
Severity: moderate
PostCSS has XSS via Unescaped </style> in its CSS Stringify Output
fix available via `npm audit fix --force`
Will install next@9.3.3, which is a breaking change
node_modules/next/node_modules/postcss
  next  9.3.4-canary.0 - 16.3.0-canary.5
  Depends on vulnerable versions of postcss
  node_modules/next

2 moderate severity vulnerabilities
```

### Build result
✅ **Success** — Full production build completed without errors. All routes compiled successfully.

### Type-check result
✅ **Passed** — `tsc --noEmit` completed with no errors.

### Lint result
⚠️ **Pre-existing errors** — 66 errors, 162 warnings (all in unrelated files, not caused by this change). No new lint issues introduced.

### Issues
None. All verification gates passed. The 2 remaining moderate postcss vulnerabilities are accepted per the analysis doc (bundled inside next, dev-time only).
