# Notion API Upgrade to 2025-09-03

## Summary

Updated the Notion API integration to support version **2025-09-03**, which introduces multi-source databases. This change is **not backwards-compatible** and requires code updates.

## What Changed

### API Version
- **Before**: `2022-06-28`
- **After**: `2025-09-03`

### Key Changes

1. **Data Sources Instead of Databases**
   - Creating pages now requires `data_source_id` instead of `database_id`
   - Parent type changed from `database_id` to `data_source_id`

2. **New Functions**
   - `getDatabaseDataSources()` - Fetch all data sources for a database
   - `getDataSourceId()` - Get the first data source ID from a database
   - `createPageInDataSource()` - Create pages using data source ID (new primary function)

3. **Backward Compatibility**
   - `createPageInDatabase()` still works but is deprecated
   - It automatically fetches the data source ID and uses the new API

## Updated Files

- `src/lib/notion/client.ts` - Upgraded to API 2025-09-03
- `src/lib/notion/taskHelpers.ts` - Now uses `data_source_id` directly
- `.cursor/mcp/DATABASE_IDS.md` - Updated documentation

## Data Source ID

The Issues database data source ID is stored in:
- `src/lib/notion/taskHelpers.ts`: `ISSUES_DATA_SOURCE_ID`
- `.cursor/mcp/DATABASE_IDS.md`: Documented for reference

**Current Data Source ID**: `2366163f-450b-809a-ad3c-000b959449b7`

## Why This Matters

If you don't upgrade:
- Creating pages will fail when users add multiple data sources to a database
- Database queries may not work correctly
- Relation properties may fail

## Testing

After upgrading, test task creation:
```bash
# Use the create-task command or API endpoint
curl -X POST http://localhost:3000/api/notion/create-task \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Task",
    "type": "Story",
    "description": "Testing API upgrade"
  }'
```

## References

- [Notion API Upgrade Guide](https://developers.notion.com/docs/upgrade-to-version-2025-09-03)
- [Data Sources FAQ](https://developers.notion.com/docs/data-sources)

