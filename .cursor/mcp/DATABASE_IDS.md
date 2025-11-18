# Notion Database IDs

Store your Notion database IDs here for easy reference when creating tasks.

## How to Get Database IDs

1. Open the database in Notion
2. Copy the URL from your browser
3. Extract the database ID from the URL:
   ```
   https://www.notion.so/workspace/DATABASE_ID?v=view_id
   ```
   The database ID is the long string between the last `/` and `?v=`

## Database IDs

### Issues Database
**URL**: `https://www.notion.so/2366163f450b80529b2ff97e97f771db`
**Database ID**: `2366163f-450b-8052-9b2f-f97e97f771db`
**Data Source ID**: `2366163f-450b-809a-ad3c-000b959449b7` (Use this for creating pages)

### Epics Database (formerly Features)
**URL**: `https://www.notion.so/2366163f450b8045985af4f66be56792`
**Database ID**: `2366163f450b8045985af4f66be56792` (without dashes for API queries)
**Database ID (with dashes)**: `2366163f-450b-8045-985a-f4f66be56792` (for reference)
**Data Source ID**: `2366163f-450b-808a-8b40-000b829c74bd` (Use this for creating pages)

### Sprints Database
**Data Source ID**: `2ad6163f-450b-8150-a017-000ba18ab61d` (Use this for creating pages)

## How to Get Data Source IDs

For API version 2025-09-03, you need data source IDs instead of database IDs:

1. Open the database in Notion
2. Click the "..." menu → "Manage data sources"
3. Click "Copy data source ID" next to the data source you want to use
4. Or use the API: `GET /v1/databases/{database_id}` with `Notion-Version: 2025-09-03`

## Usage

**For API version 2025-09-03:**
- Use `data_source_id` when creating pages (not `database_id`)
- The parent type should be `data_source_id`, not `database_id`
- See `src/lib/notion/client.ts` for the updated implementation

**Legacy (2022-06-28):**
- Use `database_id` in the parent field
- This is deprecated and will fail if multiple data sources exist

## Security Note

These IDs are not sensitive, but keep them updated if you move or duplicate databases.

