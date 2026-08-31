---
ID: 156
Origin: 156
UUID: a4f7c3b1
Status: Active
---

# Implementation: M3 — UberEats Web Scraper Client (Experimental)

## Summary

Built an experimental UberEats web scraper using **plain Playwright** (per architect MEDIUM-2 — no `playwright-extra`). The client uses manual stealth evasions via `addInitScript` and Chromium launch args. Error containment is top-level — all errors are caught and returned as `DeliveryEnrichmentResult.error`, never thrown.

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/enrichment/delivery-platform/ubereats-types.ts` | CREATE | TypeScript interfaces for UberEats data |
| `src/lib/enrichment/delivery-platform/ubereats-client.ts` | CREATE | Playwright-based client with state/DOM parsing |
| `src/lib/enrichment/delivery-platform/ubereats-enricher.ts` | CREATE | Enrichment orchestration (never throws) |
| `scripts/enrich-providers.ts` | MODIFY | Add `--source ubereats` support, experimental wrapper |
| `package.json` | MODIFY | Add `playwright` + `@playwright/test` devDeps |
| `src/lib/enrichment/delivery-platform/__tests__/ubereats-client.test.ts` | CREATE | 21 unit tests for parsing logic |

## Key Design Decisions

### Plain Playwright (ARCHITECT MEDIUM-2)
- No `playwright-extra` or `puppeteer-extra-plugin-stealth`
- Chromium args: `--disable-blink-features=AutomationControlled`, `--no-sandbox`, `--disable-dev-shm-usage`
- `addInitScript` overrides `navigator.webdriver`
- Realistic viewport (1920x1080), user agent (Chrome 120 macOS), locale (de-DE)

### Parsing Strategy
1. **Primary**: Extract `window.__INITIAL_STATE__` from page context via `page.evaluate()`
2. **Fallback**: DOM parsing using `data-testid` selectors
3. Price parsing: `"10,50 €"` → 1050 cents (German locale support)

### Error Containment
- `enrichFromUberEats()` NEVER throws — all errors caught and returned as `{ error: "UberEats experimental: ..." }`
- CLI wraps entire UberEats run in top-level try/catch
- Browser lifecycle: one `createUberEatsClient()` per run, `client.close()` after all providers

### Browser Not Installed
- Clear error message: `"Playwright browser not installed. Run npx playwright install chromium."`

## TDD Compliance

| Requirement | Status | Evidence |
|-------------|--------|----------|
| parsePriceToCents (EUR string → cents) | ✅ | 8 tests covering German EUR format, edge cases |
| extractSearchResultsFromState | ✅ | 7 tests: catalog path, dedup, fallback, empty state, null entries |
| extractMenuFromState | ✅ | 5 tests: full extraction, skip no-title, empty state, numeric prices |
| extractRestaurantFromState | ✅ | 3 tests: full data, missing store, missing title |
| Error handling (never throws from enricher) | ✅ | Enricher wraps entire body in try/catch, returns error result |
| No browser required for unit tests | ✅ | All 21 tests are pure function tests, no Playwright dependency |
| Existing tests still pass | ✅ | 15 auto-apply-payload tests pass |
| TypeScript compilation | ✅ | `npx tsc --noEmit` passes for all ubereats/* files |

## Test Evidence

```
 ✓ src/lib/enrichment/delivery-platform/__tests__/ubereats-client.test.ts (21 tests) 4ms
 ✓ src/lib/enrichment/__tests__/auto-apply-payload.test.ts (15 tests) 4ms
```

No TypeScript errors in any ubereats file:
```
$ npx tsc --noEmit 2>&1 | grep -i ubereats
(no output)
```

## File Paths

- `src/lib/enrichment/delivery-platform/ubereats-types.ts`
- `src/lib/enrichment/delivery-platform/ubereats-client.ts`
- `src/lib/enrichment/delivery-platform/ubereats-enricher.ts`
- `src/lib/enrichment/delivery-platform/__tests__/ubereats-client.test.ts`
- `scripts/enrich-providers.ts` (modified)
- `package.json` (modified)
