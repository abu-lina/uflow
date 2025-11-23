# Plan Sprint
 
Automatically create a new sprint and populate it with high-priority tasks.
 
## Usage
 
```
@plan-sprint.md
```
 
Or run via npm script (if added):
 
```bash
npx tsx scripts/plan-sprint.ts
```
 
## What It Does
 
1. **Creates a Sprint** starting Today until next Sunday (Exception mode).
2. **Fetches "Ready" and "Not started" stories** from the Issues database.
3. **Prioritizes stories** based on:
   - Status (Ready > Not started)
   - Epic Rank (Top priority epics first)
4. **Adds top 8 stories** to the sprint (capacity planning).
5. **Returns summary** of added items.
 
## Configuration
 
- **Duration**: Today -> Sunday (Fixed for "exception" sprints, can be modified in script).
- **Capacity**: Defaults to 8 items (can be modified in `src/app/api/notion/plan-sprint/route.ts`).
- **Selection**: Prioritizes items from Rank 1 Epics.
 
## Example Output
 
```
✅ Sprint Created: Sprint 2025-11-18
   URL: https://www.notion.so/Sprint-2025-11-18-...
   Dates: 2025-11-18 to 2025-11-23
 
✅ Added 8 Stories:
   - [Not started] [Epic Rank 1] API: User Authentication
   - [Ready] [Epic Rank 1] UI: Login Page
   ...
```


