# Notion MCP Setup Guide

Complete guide for setting up Notion MCP integration with Cursor for backlog management.

## Prerequisites

- Notion workspace with Issues, Features, and Sprints databases
- Notion account with admin access
- Cursor IDE with MCP support enabled

## Step 1: Create Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Fill in the details:
   - **Name**: `Cursor Backlog Manager` (or your preferred name)
   - **Logo**: Optional
   - **Associated workspace**: Select your workspace
   - **Type**: Internal
4. Click **"Submit"**
5. **Copy the Integration Token** (starts with `secret_`) - you'll need this later

## Step 2: Connect Integration to Databases

For each database (Issues, Features, Sprints):

1. Open the database in Notion
2. Click the **"..."** menu (top right)
3. Select **"Connections"**
4. Find and select your integration (`Cursor Backlog Manager`)
5. Click **"Connect"**

Repeat for all three databases.

## Step 3: Get Database IDs

You need the database IDs for the mapping configuration:

1. Open each database in Notion
2. Copy the URL from your browser
3. Extract the database ID from the URL:
   ```
   https://www.notion.so/workspace/DATABASE_ID?v=view_id
   ```
   The database ID is the long string between the last `/` and `?v=`

Example:
- URL: `https://www.notion.so/myworkspace/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6?v=...`
- Database ID: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

## Step 4: Configure Cursor MCP

1. Open Cursor Settings
2. Go to **Features** → **MCP** (or search for "MCP")
3. Click **"Add MCP Server"** or **"Configure MCP"**
4. Select **Notion** from the list (or add if not available)
5. Enter your **Integration Token** from Step 1
6. Save the configuration

## Step 5: Verify Database Schema

Ensure your Notion databases match the schema in `.cursor/mcp/notion.json`:

### Issues Database Properties
- `Nº ID` (Number)
- `Type` (Select: Epic, User Story, Bug, Task)
- `Name` (Title)
- `Status` (Select: Not started, Ready, In progress, Done)
- `Device` (Select: Web, Mobile, Both)
- `Features` (Relation to Features database)
- `Refinement` (Multi-select: Security, Compliance, QA, Backend, Frontend)
- `Completed Refinement` (Multi-select: same options as Refinement)
- `Ready?` (Formula - evaluates if all required refinements are complete)

### Features Database Properties
- `Nº ID` (Number)
- `Name` (Title)
- `Description` (Rich text)
- `MoSCoW` (Select: Must have, Should have, Could have, Won't have)
- `Status` (Select: Not started, In progress, Done)
- `Target Delivery` (Date)
- `Sub-items` (Relation to Issues database)
- `Labels` (Multi-select)

### Sprints Database Properties
- `Nº ID` (Number)
- `Name` (Title)
- `Start Date` (Date)
- `End Date` (Date)
- `Goal` (Rich text)
- `Status` (Select: Planning, Active, Completed)
- `Issues` (Relation to Issues database)

## Step 6: Test Connection

1. In Cursor, open the Command Palette (Cmd/Ctrl + Shift + P)
2. Type "MCP" or "Notion"
3. Try to list resources or search for a test task
4. If successful, you should see your Notion databases

## Troubleshooting

### Connection Failed
- Verify the integration token is correct
- Ensure the integration is connected to all databases
- Check that the integration has the correct permissions

### Database Not Found
- Verify database IDs are correct
- Ensure the integration is connected to the database
- Check that database names match exactly (case-sensitive)

### Permission Errors
- Ensure the integration has "Read" and "Update" permissions
- Check that the integration is added to the correct workspace
- Verify you have admin access to the workspace

### MCP Server Not Available
- Update Cursor to the latest version
- Check Cursor's MCP documentation for supported servers
- Verify MCP is enabled in Cursor settings

## Next Steps

After setup is complete:
1. Read [USAGE.md](./USAGE.md) to learn how to use the backlog system
2. Review [EXPERT_ROLES.md](./EXPERT_ROLES.md) to understand expert rules
3. Test with a sample task using `@refine-task.md` command

## Support

If you encounter issues:
1. Check Cursor's MCP documentation
2. Review Notion API documentation
3. Verify all prerequisites are met
4. Check Cursor and Notion logs for error messages

