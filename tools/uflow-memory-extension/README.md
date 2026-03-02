# UFlow Memory

Local-first agent memory for GitHub Copilot — reliable, multi-window safe, no cloud required.

## Overview

UFlow Memory is a lightweight VS Code extension that provides persistent memory for GitHub Copilot agents. It stores structured summaries in a local SQLite database with WAL mode, ensuring:

- **Multi-window safety**: Multiple VS Code windows can read/write simultaneously without daemon locks
- **Local-first**: No cloud authentication required; data stays in your workspace
- **Compatibility**: Uses the same tool contract as Flowbaby (`flowbaby_storeMemory` / `flowbaby_retrieveMemory`)

## Installation

### From VSIX (Local Install)

1. Build the extension:
   ```bash
   cd tools/uflow-memory-extension
   npm install
   npm run compile
   npx vsce package
   ```

2. Install the generated `.vsix` file in VS Code:
   - Open Command Palette (`Cmd+Shift+P`)
   - Run "Extensions: Install from VSIX..."
   - Select the `.vsix` file

### Disabling Flowbaby (Optional)

If you have Flowbaby installed, you can disable it to prevent conflicts:
1. Open Extensions view (`Cmd+Shift+X`)
2. Find "Flowbaby" and click "Disable"

Both can coexist, but they will register tools with the same names.

## Usage

The extension automatically registers two tools for GitHub Copilot agents:

### Store Memory (`flowbaby_storeMemory`)

Stores a structured summary into workspace memory.

**Input:**
- `topic` (required): Short 3–7 word title
- `context` (required): 300–1500 character summary
- `decisions` (optional): Array of decisions (max 5)
- `rationale` (optional): Array of reasoning items (max 5)
- `metadata.status` (optional): "Active", "Superseded", or "DecisionRecord"
- `metadata.plan_id` (optional): Group related memories

### Retrieve Memory (`flowbaby_retrieveMemory`)

Retrieves relevant memories matching a query.

**Input:**
- `query` (required): Natural language description of what to recall
- `maxResults` (optional): Maximum results (default: 3, max: 10)

**Ranking:**
- Keyword matching score
- Recency decay (7-day half-life)
- Status multipliers: DecisionRecord (1.1x) > Active (1.0x) > Superseded (0.4x)

## Storage Location

Memories are stored in `.uflow-memory/memories.db` within your workspace root.

The SQLite database uses WAL (Write-Ahead Logging) mode for safe concurrent access.

## Commands

- **UFlow Memory: Show Status** — Display current memory store status

## Troubleshooting

### "No workspace folder open"

Memory requires a workspace folder to store data. Open a folder or workspace in VS Code.

### Multi-window verification

To verify multi-window support:
1. Open the same workspace in two VS Code windows
2. Store a memory in Window 1
3. Retrieve it in Window 2 — it should appear immediately

## Version History

### 0.1.0

- Initial release
- SQLite WAL mode for multi-window safety
- Keyword + metadata retrieval with recency/status ranking
- Compatible with Flowbaby tool contract

## License

MIT
