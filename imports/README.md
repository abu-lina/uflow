# Imports Directory

This directory contains raw resources and files that need to be processed by scripts before being used in the application.

## Structure

```
imports/
├── lottie/      # Lottie/After Effects JSON files from Figma
├── images/      # Raw images before optimization
├── svg/         # SVG files to be converted/processed
└── data/        # CSV/JSON data files for import
```

## Usage

### Lottie Files

1. Export Lottie JSON from Figma or After Effects
2. Place in `imports/lottie/`
3. Process with watermark removal script:
   ```bash
   npm run remove-watermark imports/lottie/animation.json
   ```
4. Processed files are typically moved to `public/animations/`

### Images

1. Place raw images in `imports/images/`
2. Process with optimization scripts (if available)
3. Optimized images go to `public/images/`

### SVG Files

1. Place SVG files in `imports/svg/`
2. Process with conversion scripts (if available)
3. Converted files go to appropriate destination

### Data Files

1. Place CSV/JSON data files in `imports/data/`
2. Process with import scripts
3. Data is typically imported into the database

## Git Strategy

- **Source files**: Commit raw import files to track source material
- **Backups**: `.backup` files are gitignored (created during processing)
- **Processed files**: Processed outputs go to their final destinations (e.g., `public/`)

## Scripts

Common processing scripts:
- `scripts/remove-lottie-watermark.ts` - Remove watermarks from Lottie files
- Add more scripts as needed for other resource types

## Best Practices

1. **Keep originals**: Don't delete source files after processing
2. **Name clearly**: Use descriptive filenames
3. **Document sources**: Note where files came from (Figma link, etc.)
4. **Version control**: Commit source files to track changes
5. **Clean up**: Remove processed files from `imports/` after they're in their final location (optional)
