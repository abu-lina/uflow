# Remove Watermark from Lottie File

Remove watermarks from Lottie/After Effects JSON files automatically.

## Usage

### Method 1: Direct file path

```
@remove-watermark.md [file-path]
```

### Method 2: Conversational (recommended)

Mention the file name in conversation, and I'll extract it automatically:

```
I just imported "new-animation.json" - @remove-watermark.md
```

Or:

```
Remove watermark from Artboard 1(1).json - @remove-watermark.md
```

I'll automatically find and process the file you mentioned.

### Method 3: npm script

```bash
npm run remove-watermark [file-path]
```

## Examples

### Remove watermark from a specific file (direct path)

```
@remove-watermark.md "imports/lottie/animation.json"
```

### Remove watermark (conversational)

```
I imported "my-new-lottie.json" - @remove-watermark.md
```

Or:

```
Remove the watermark from Artboard 1(1).json - @remove-watermark.md
```

### Using npm script

```bash
npm run remove-watermark "imports/lottie/animation.json"
```

## What It Does

1. **Reads the Lottie JSON file** from the provided path
2. **Validates JSON structure** and Lottie format
3. **Identifies watermark layers** using:
   - Name matching: Layers named "Group Layer 8" or containing "watermark", "figma", "made with", or "made in"
   - Position detection: Layers positioned in bottom-right corner (x > 80% canvas width, y > 80% canvas height)
4. **Creates a backup** of the original file (`.backup` extension)
5. **Removes identified watermark layers** from the JSON structure
6. **Saves the cleaned file** (overwrites original)
7. **Reports results** with details of removed layers

## Watermark Detection Logic

The script detects watermarks through multiple methods:

### By Name
- Exact match: "Group Layer 8" (known watermark layer)
- Contains: "watermark", "figma", "made with", "made in" (case-insensitive)

### By Position
- Layers positioned in the bottom-right corner
- Threshold: x > 80% of canvas width AND y > 80% of canvas height
- Useful for detecting watermarks that don't have obvious names

### Search Scope
- Searches main layers array
- Recursively searches nested layer groups
- Searches all assets and their layers
- Handles both array and object-based layer structures

## Output

The script provides detailed output:

```
🔍 Processing file: path/to/file.json

📐 Canvas dimensions: 1200 x 1200

🗑️  Removed 1 watermark layer(s):

1. Group Layer 8 (type: 4)
   Path: Root > Group Layer 8
   Reason: Matched target name: Group Layer 8

💾 Backup created: path/to/file.json.backup

✅ Cleaned file saved: path/to/file.json

✨ Watermark removal complete!
```

## Safety Features

### Automatic Backup
- Creates a `.backup` file before making any changes
- Original file is preserved in case of issues
- Backup file can be restored if needed

### Validation
- Validates file exists before processing
- Validates JSON structure
- Validates Lottie format (checks for required properties)
- Exits gracefully on errors without corrupting files

### No Watermarks Found
If no watermarks are detected:
```
✅ No watermarks found. File is already clean.
```

The file is not modified if no watermarks are found.

## File Path Handling

The script handles both relative and absolute paths:

- **Relative paths**: Resolved from current working directory
- **Absolute paths**: Used as-is
- **Spaces in paths**: Use quotes: `"path with spaces/file.json"`

## Error Handling

The script handles common errors:

### File Not Found
```
❌ Error: File not found: path/to/file.json
```

### Invalid JSON
```
❌ Error: Failed to parse JSON file: [error details]
```

### Backup Creation Failure
```
⚠️  Warning: Failed to create backup: [error details]
   Continuing without backup...
```

The script will continue even if backup creation fails, but warns you.

### Save Failure
```
❌ Error: Failed to save cleaned file: [error details]
```

If saving fails, the original file remains unchanged.

## Restoring from Backup

If you need to restore the original file:

```bash
cp "file.json.backup" "file.json"
```

Or manually rename the backup file to remove the `.backup` extension.

## Technical Details

### Script Location
- **Script**: `scripts/remove-lottie-watermark.ts`
- **Command**: `.cursor/commands/remove-watermark.md`
- **NPM Script**: `npm run remove-watermark`

### Execution
- Uses `tsx` to run TypeScript directly
- No compilation step required
- Works with Node.js 18+

### Layer Removal
- Removes layers from both array and object structures
- Maintains JSON structure integrity
- Preserves all non-watermark layers and properties
- Handles nested layer groups recursively

## Troubleshooting

### Script Not Found
- Ensure you're in the project root directory
- Check that `scripts/remove-lottie-watermark.ts` exists
- Verify `tsx` is installed: `npm install -D tsx`

### Permission Errors
- Ensure you have read/write permissions for the file
- Check file is not locked by another process
- Try running with appropriate permissions

### No Layers Removed
- Verify the file is a valid Lottie JSON file
- Check that watermarks exist (by name or position)
- Review the detection logic if watermarks aren't being found

### File Corrupted
- Restore from backup: `cp "file.json.backup" "file.json"`
- Verify JSON structure: `cat file.json | jq .` (if jq is installed)
- Check file encoding (should be UTF-8)

## Related Commands

- Use this command after importing Lottie files from Figma
- Run before committing Lottie animations to version control
- Use as part of asset preparation workflow

