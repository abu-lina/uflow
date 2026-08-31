---
ID: 156
Origin: 156
UUID: a7d941e3
Status: Active
---

## Milestone 5 — Unified GitHub Actions Workflow

### What was done

Created `.github/workflows/enrich-food-providers.yml` — a single unified workflow that runs all food enrichment sources (Wolt, Lieferando, UberEats) with the following characteristics:

- **Schedule**: Weekly Sunday at 3am UTC (auto-applies all sources)
- **Manual trigger**: Supports `sources` (comma-separated), `mode` (auto-apply/dry-run/write), and `limit` options
- **Sequential execution**: Wolt → Lieferando → UberEats (fixed order, UberEats last)
- **Failure isolation**: `set +e` ensures one source failure doesn't block subsequent sources
- **Playwright**: Installed only when UberEats is in the selected sources (`npx playwright install chromium --with-deps`)
- **Artifacts**: Source-specific logs captured in `/tmp/enrichment-logs/` and uploaded with 30-day retention
- **Timeout**: 60 minutes

Modified `.github/workflows/enrich-wolt.yml`:
- Added deprecation banner pointing to the new unified workflow
- Disabled the schedule block (commented out)

### Files

| File | Action |
|------|--------|
| `.github/workflows/enrich-food-providers.yml` | Created |
| `.github/workflows/enrich-wolt.yml` | Modified (deprecation notice, schedule disabled) |
| `agent-output/implementation/156-m5-unified-workflow.md` | This file |

### Verification

- YAML syntax validated
- CLI args match the script's expected syntax: `--source <name> --mode <mode> [--limit <limit>]`
- Source names (`wolt`, `lieferando`, `ubereats`) match `scripts/enrich-providers.ts` dispatch logic
- UberEats runs last (third in the ordered loop)
- Playwright only installed when `ubereats` is in the sources list
- `.github/workflows/enrich-providers.yml` left untouched (JoinHalal remains a separate workflow)
