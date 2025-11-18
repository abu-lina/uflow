# Create Epic in Notion

Create a new epic in the Notion Epics database (formerly Features).

## Usage

```
Create an epic:
- Name: "Epic name"
- Description: "Epic description"
- MoSCoW: "Must have" (optional)
- Target Delivery: "2024-12-31" (optional)
```

Or use the API directly:

```
@create-epic.md "Epic Name" "Epic description" "Must have"
```

## What It Does

1. **Calls API route** `/api/notion/create-epic`
2. **Creates epic** in Notion Epics database
3. **Sets properties** (Name, MoSCoW, Status, Target Delivery)
4. **Adds description** as page content
5. **Returns epic URL** for further breakdown

## Epic Properties

- **Name**: Epic title (required)
- **Description**: Detailed epic description (optional)
- **MoSCoW**: Priority - "Must have", "Should have", "Could have", "Won't have" (optional)
- **Status**: "Not started" (default), "In progress", "Done"
- **Target Delivery**: Target date (optional, ISO date string)
- **Labels**: Multi-select labels (optional)

## After Creation

Once the epic is created:
1. Epic URL will be provided
2. Use `@break-down-epic.md` to automatically generate stories and tasks
3. Stories and tasks will be linked to the epic
4. Items will be auto-refined by relevant experts

## Next Steps

1. Review epic in Notion
2. Run `@break-down-epic.md` with epic ID/URL
3. Review generated stories and tasks
4. Refine items if needed
5. Add items to sprint when ready

## Example

```
Create an epic:
- Name: "User Authentication System"
- Description: "Complete authentication system with email verification, password reset, and social login"
- MoSCoW: "Must have"
- Target Delivery: "2024-12-31"
```
