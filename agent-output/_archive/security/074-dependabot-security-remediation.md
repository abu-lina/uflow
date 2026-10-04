---
ID: 074
Origin: 074
UUID: b8f4c2e7
Status: Active
Verdict: BLOCKED_PENDING_REMEDIATION
---

# 074 — Dependabot Security Remediation Triage

| Field            | Value                                              |
|------------------|----------------------------------------------------|
| **Document ID**  | 074                                                |
| **Type**         | Dependency Security Triage                         |
| **Status**       | Active                                             |
| **Verdict**      | BLOCKED_PENDING_REMEDIATION                        |
| **Date**         | 2026-04-03                                         |
| **Mode**         | Dependency-Only Review                             |
| **Prior Audits** | 037 (dep-only, v0.7.1), 049 (full, v0.8.7), 066 (targeted, find-bugs) |
| **Scope**        | Root lockfile + tools/uflow-memory-extension + tools/memory-backend |
| **Branch**       | session/074-dependabot-security-remediation         |

## Changelog

| Date             | Agent    | Action                                   | Summary                                                    |
|------------------|----------|------------------------------------------|------------------------------------------------------------|
| 2026-04-03T09:00Z| Security | Initial triage of 8 Dependabot alerts    | 4 require remediation; 1 already mitigated in root; 3 dev-only deferred |

---

## Executive Summary

8 Dependabot alerts investigated across 3 npm projects. The root project has existing `overrides` from Plan 037 that already resolve picomatch, brace-expansion, and several other historical vulnerabilities. However, **4 alerts require active remediation**:

1. **lodash** (root) — HIGH, code injection + prototype pollution, fixable via override
2. **tar** (uflow-memory-extension) — HIGH, path traversal, fixable via `npm audit fix`
3. **picomatch** (uflow-memory-extension) — HIGH, ReDoS + method injection, fixable via override or `npm audit fix`
4. **brace-expansion** (uflow-memory-extension) — MODERATE, DoS hang, fixable via `npm audit fix`

The esbuild/vite chain in memory-backend is dev-only with no production exposure and requires a semver-major vitest upgrade — **deferred**.

### Finding Summary

| # | Package | Project | Severity | CVSS | Decision | Rationale |
|---|---------|---------|----------|------|----------|-----------|
| 1 | lodash <=4.17.23 | root | HIGH | 8.1 | **FIX NOW** | Code injection via `_.template`; prototype pollution via `_.unset`/`_.omit`. Override to `>=4.18.0` resolves both. |
| 2 | tar <=7.5.10 | uflow-memory-extension | HIGH | N/A | **FIX NOW** | Symlink/hardlink path traversal. Dev-time only (@electron/rebuild, node-gyp) but path traversal is high-impact. `npm audit fix` upgrades to 7.5.13. |
| 3 | picomatch 4.0.0–4.0.3 | uflow-memory-extension | HIGH | 7.5 | **FIX NOW** | ReDoS + method injection. Root already patched via override (4.0.4). Extension needs fix. |
| 4 | brace-expansion 2.0.0–2.0.2 | uflow-memory-extension | MODERATE | 6.5 | **FIX NOW** | Zero-step sequence process hang/OOM. `npm audit fix` available. |
| 5 | picomatch (root) | root | — | — | **ALREADY FIXED** | Override `>=4.0.4` already applied in Plan 037; lockfile confirms 4.0.4 installed. |
| 6 | brace-expansion (root) | root | — | — | **ALREADY FIXED** | Override `>=5.0.5` already applied in Plan 037; lockfile confirms 5.0.5 installed. |
| 7 | esbuild <=0.24.2 | memory-backend | MODERATE | 5.3 | **DEFER** | Dev-server CORS bypass; only exploitable during local dev. Fix requires vitest ^1→^3 (semver-major). |
| 8 | vite (via esbuild) | memory-backend | MODERATE | 5.3 | **DEFER** | Transitive via esbuild; same dev-only exposure. Resolves when esbuild is fixed. |

**Totals**: 4 fix now, 2 already fixed, 2 deferred.

---

## Detailed Findings

### F-074-01: lodash <=4.17.23 — Code Injection + Prototype Pollution (ROOT)

| Field | Value |
|-------|-------|
| **Package** | lodash@4.17.23 |
| **Location** | `node_modules/lodash` (root lockfile) |
| **Severity** | HIGH (CVSS 8.1) |
| **Advisories** | [GHSA-r5fr-rjxr-66jc](https://github.com/advisories/GHSA-r5fr-rjxr-66jc), [GHSA-f23m-r3pf-42rh](https://github.com/advisories/GHSA-f23m-r3pf-42rh) |
| **CWE** | CWE-94 (Code Injection), CWE-1321 (Prototype Pollution) |
| **Vulnerable range** | <=4.17.23 |
| **Fix version** | >=4.18.0 |
| **Dependents** | minim, swagger-ui-react, workbox-build (2 instances) |
| **Decision** | **FIX NOW** |

**Exploitability context**: lodash is pulled in by swagger-ui-react (dev API docs page, not production-facing) and workbox-build (build-time PWA tooling). The `_.template` code injection requires attacker control over template key names, which is unlikely in this build-time context. However, the fix is trivial (add override) and the severity warrants closure.

**Remediation**: Add `"lodash": ">=4.18.0"` to root `package.json` overrides, then `npm install` to regenerate lockfile.

### F-074-02: tar <=7.5.10 — Path Traversal (UFLOW-MEMORY-EXTENSION)

| Field | Value |
|-------|-------|
| **Package** | tar@7.5.9 |
| **Location** | `tools/uflow-memory-extension/node_modules/tar` |
| **Severity** | HIGH |
| **Advisories** | [GHSA-qffp-2rhf-9h96](https://github.com/advisories/GHSA-qffp-2rhf-9h96), [GHSA-9ppj-qmqm-q256](https://github.com/advisories/GHSA-9ppj-qmqm-q256) |
| **CWE** | CWE-22 (Path Traversal), CWE-59 (Symlink Following) |
| **Vulnerable range** | <=7.5.10 |
| **Fix version** | >=7.5.11 (latest: 7.5.13) |
| **Dependents** | @electron/rebuild, cacache, node-gyp |
| **Decision** | **FIX NOW** |

**Exploitability context**: tar is used by the build/packaging chain (node-gyp, electron rebuild). Path traversal via crafted archive could write files outside extraction directory. While this project doesn't extract untrusted archives at runtime, the build chain processes downloaded native addon tarballs, making this a supply-chain attack vector.

**Remediation**: Run `npm audit fix` in `tools/uflow-memory-extension/`, or add `"overrides": {"tar": ">=7.5.11"}` to the subproject `package.json`.

### F-074-03: picomatch 4.0.0–4.0.3 — ReDoS + Method Injection (UFLOW-MEMORY-EXTENSION)

| Field | Value |
|-------|-------|
| **Package** | picomatch@4.0.3 |
| **Location** | `tools/uflow-memory-extension/node_modules/picomatch` |
| **Severity** | HIGH (CVSS 7.5) |
| **Advisories** | [GHSA-c2c7-rcm5-vvqj](https://github.com/advisories/GHSA-c2c7-rcm5-vvqj), [GHSA-3v7f-55p6-f55p](https://github.com/advisories/GHSA-3v7f-55p6-f55p) |
| **CWE** | CWE-1333 (ReDoS), CWE-1321 (Prototype Pollution) |
| **Vulnerable range** | 4.0.0–4.0.3 |
| **Fix version** | >=4.0.4 |
| **Dependents** | tinyglobby |
| **Decision** | **FIX NOW** |

**Exploitability context**: picomatch processes glob patterns. ReDoS requires attacker-controlled glob input; method injection requires crafted POSIX character class. The root project already fixed this via override; the extension needs the same treatment. Fix is non-breaking (patch bump).

**Remediation**: Add `"overrides": {"picomatch": ">=4.0.4"}` to `tools/uflow-memory-extension/package.json`, or run `npm audit fix`.

### F-074-04: brace-expansion 2.0.0–2.0.2 — DoS Hang (UFLOW-MEMORY-EXTENSION)

| Field | Value |
|-------|-------|
| **Package** | brace-expansion@2.0.2 |
| **Location** | `tools/uflow-memory-extension/node_modules/brace-expansion` |
| **Severity** | MODERATE (CVSS 6.5) |
| **Advisory** | [GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v) |
| **CWE** | CWE-400 (Resource Consumption) |
| **Vulnerable range** | 2.0.0–2.0.2 |
| **Fix version** | >=2.0.3 |
| **Decision** | **FIX NOW** |

**Exploitability context**: Zero-step brace sequence (e.g., `{1..1000..0}`) causes infinite loop + memory exhaustion. Used in glob matching for file operations. Low likelihood but cheap fix.

**Remediation**: Run `npm audit fix` in `tools/uflow-memory-extension/`.

### F-074-05: esbuild <=0.24.2 — Dev Server CORS Bypass (MEMORY-BACKEND)

| Field | Value |
|-------|-------|
| **Package** | esbuild@0.21.5 |
| **Location** | `tools/memory-backend/node_modules/esbuild` |
| **Severity** | MODERATE (CVSS 5.3) |
| **Advisory** | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) |
| **CWE** | CWE-346 (Origin Validation Error) |
| **Vulnerable range** | <=0.24.2 |
| **Fix version** | >=0.25.0 |
| **Current vitest** | ^1.2.0 (pins vite 5.x → esbuild 0.21.x) |
| **Required vitest** | ^3.2.4 (semver-major) |
| **Decision** | **DEFER** |

**Exploitability context**: This vulnerability allows any website to send requests to the esbuild development server and read responses. It is **only exploitable during local development** when the dev server is running. The memory-backend is a local development tool, not deployed to production. The fix requires upgrading vitest from ^1.2.0 to ^3.2.4, which is a semver-major change with potential breaking test API changes.

**Deferral conditions**:
- Risk is limited to local development environment
- No production exposure
- Fix requires semver-major upgrade with test migration effort
- Owner: Engineering (next planned tool modernization cycle)
- Re-evaluate if memory-backend gains network-facing dev server exposure

### F-074-06: vite via esbuild (MEMORY-BACKEND)

Same root cause as F-074-05. Transitive through esbuild. Resolves when esbuild is updated. **DEFER** with same conditions.

---

## Already Mitigated (No Action Required)

### Root picomatch — Override >=4.0.4 active since Plan 037
- Lockfile confirms: `node_modules/picomatch` → 4.0.4
- Dependabot may alert on stale lockfile metadata; the npm audit shows 0 picomatch vulns in root.

### Root brace-expansion — Override >=5.0.5 active since Plan 037
- Lockfile confirms: `node_modules/brace-expansion` → 5.0.5
- Same as above.

---

## Remediation Plan for @Implementer

### Scope: 2 projects, 4 fixes

#### Fix 1: Root — lodash override (HIGH)

**File**: `package.json` (root)
**Action**: Add `"lodash": ">=4.18.0"` to existing `overrides` section.
**Then**: Run `npm install` to regenerate `package-lock.json`.
**Verify**: `npm audit --json` shows 0 vulnerabilities.

#### Fix 2–4: tools/uflow-memory-extension — tar, picomatch, brace-expansion

**Option A (preferred — simplest)**: Run `npm audit fix` in `tools/uflow-memory-extension/`
- This should resolve all 3 vulnerabilities in one command.
- Verify: `npm audit --json` shows 0 vulnerabilities.
- If `npm audit fix` does not fully resolve, use Option B.

**Option B (override approach)**: Add `overrides` to `tools/uflow-memory-extension/package.json`:
```json
"overrides": {
  "tar": ">=7.5.11",
  "picomatch": ">=4.0.4",
  "brace-expansion": ">=2.0.3"
}
```
Then run `npm install` and verify with `npm audit --json`.

### Verification Commands (MANDATORY per verification-before-completion skill)

After applying all fixes, the Implementer MUST run and record output of:

```bash
# 1. Root project
cd /Users/NARAFIQ/Projects/uflow-wt/S074-dependabot-security-remediation
npm audit
# Expected: 0 vulnerabilities

# 2. uflow-memory-extension
cd tools/uflow-memory-extension
npm audit
# Expected: 0 vulnerabilities

# 3. memory-backend (expect esbuild/vite deferred)
cd ../memory-backend
npm audit
# Expected: 4 moderate (esbuild/vite chain — deferred)

# 4. Root build gate
cd /Users/NARAFIQ/Projects/uflow-wt/S074-dependabot-security-remediation
npm run build
# Expected: exit 0

# 5. Root test gate
npm test
# Expected: all tests pass

# 6. Type check
npm run type-check
# Expected: exit 0
```

### Deferred Alert Tracking

| Alert | Package | Project | Owner | Re-evaluate When |
|-------|---------|---------|-------|------------------|
| F-074-05 | esbuild <=0.24.2 | memory-backend | Engineering | Next tool modernization cycle or if memory-backend gains network exposure |
| F-074-06 | vite (via esbuild) | memory-backend | Engineering | Same as F-074-05 |

---

## Dependency Override Guardrails

Per Security agent mode instructions:

| Override | Constraint Style | Risk Note |
|----------|-----------------|-----------|
| `lodash: >=4.18.0` | Floor constraint | Permits future major bumps. Acceptable because lodash 5.x not expected, and dependents specify `^4.x`. If lodash 5.x releases, this override would auto-adopt — document this tradeoff. |
| Existing `picomatch: >=4.0.4` | Floor constraint | Already in root. Same future-major risk; picomatch 5.x unlikely short-term. |
| Existing `brace-expansion: >=5.0.5` | Floor constraint | Already in root. brace-expansion 5.x is current major; 6.x unlikely short-term. |

For subproject fixes done via `npm audit fix`, no override guardrail applies (lockfile is directly updated).

---

## Variance Note: npm audit vs Dependabot

npm audit (npm advisory DB) and GitHub Dependabot (GitHub advisory DB) may report different totals. This triage is based on **both** sources:
- npm audit: 1 root (lodash), 3 uflow-memory-extension (tar, picomatch, brace-expansion), 4 memory-backend (esbuild chain)
- Dependabot: 8 alerts reported (matching the above when counting individual advisory IDs)

Any discrepancy after remediation should be documented in the Implementer's closure evidence.
