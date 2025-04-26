#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');

// Map of old paths to new paths
const PATH_MAPPINGS = {
  '@/lib/utils/utils': '@/lib/utils',
  '@/lib/utils/index': '@/lib/utils',
  '@/lib/utils/cn': '@/lib/utils',
  '@/lib/utils/database': '@/lib/supabase',
  '@/context/AuthContext': '@/features/auth/context/AuthContext',
  '@/components/ui': '@/components/core',
  '@/components/shared': '@/components/core',
  '@/components/common': '@/components/core',
};

// Map of relative path fixes
const RELATIVE_PATH_FIXES: { [key: string]: { [key: string]: string } } = {
  'src/lib/utils/auth.ts': {
    './supabase': '../supabase',
  },
  'src/features/auth/context/AuthContext.tsx': {
    '@/lib/utils/database': '@/lib/supabase',
  }
};

// Validate that target paths exist
function validatePaths() {
  const errors: string[] = [];
  Object.values(PATH_MAPPINGS).forEach(newPath => {
    const relativePath = newPath.replace('@/', '');
    const fullPath = path.join(SRC_DIR, relativePath);
    if (!fs.existsSync(fullPath)) {
      if (!fs.existsSync(fullPath + '.ts') && !fs.existsSync(fullPath + '.tsx') && !fs.existsSync(fullPath + '/index.ts')) {
        errors.push(`Target path does not exist: ${newPath}`);
      }
    }
  });
  
  if (errors.length > 0) {
    console.error('Path validation errors:');
    errors.forEach(err => console.error('- ' + err));
    process.exit(1);
  }
}

function updateImportPaths(filePath: string, dryRun: boolean = false): void {
  const content = fs.readFileSync(filePath, 'utf8');
  let updatedContent = content;
  let hasChanges = false;

  // Handle @ imports
  Object.entries(PATH_MAPPINGS).forEach(([oldPath, newPath]) => {
    const importRegex = new RegExp(`from ["']${oldPath}(/[^"']*)?["']`, 'g');
    const newContent = updatedContent.replace(importRegex, (match) => {
      hasChanges = true;
      return match.replace(oldPath, newPath);
    });
    
    if (newContent !== updatedContent) {
      updatedContent = newContent;
    }
  });

  // Handle relative path fixes
  const relativeToSrc = path.relative(SRC_DIR, filePath);
  if (RELATIVE_PATH_FIXES[relativeToSrc]) {
    Object.entries(RELATIVE_PATH_FIXES[relativeToSrc]).forEach(([oldPath, newPath]) => {
      const importRegex = new RegExp(`from ["']${oldPath}["']`, 'g');
      const newContent = updatedContent.replace(importRegex, (match) => {
        hasChanges = true;
        return match.replace(oldPath, newPath);
      });
      
      if (newContent !== updatedContent) {
        updatedContent = newContent;
      }
    });
  }

  if (hasChanges) {
    if (dryRun) {
      console.log(`Would update imports in: ${filePath}`);
    } else {
      fs.writeFileSync(filePath, updatedContent);
      console.log(`Updated imports in: ${filePath}`);
    }
  }
}

function processDirectory(dir: string, dryRun: boolean = false): void {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath, dryRun);
    } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
      updateImportPaths(fullPath, dryRun);
    }
  });
}

// Parse command line arguments
const dryRun = process.argv.includes('--dry-run');

// Validate paths before processing
console.log('Validating paths...');
validatePaths();

// Start processing from src directory
console.log(`Starting path fixes... ${dryRun ? '(dry run)' : ''}`);
processDirectory(SRC_DIR, dryRun);
console.log('Path fixes completed!'); 