const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Function to recursively find all TypeScript/JavaScript files
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.next')) {
      findFiles(filePath, fileList);
    } else if (
      stat.isFile() &&
      (filePath.endsWith('.tsx') ||
        filePath.endsWith('.ts') ||
        filePath.endsWith('.jsx') ||
        filePath.endsWith('.js'))
    ) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Function to fix Tailwind classes in a file
function fixTailwindClasses(filePath) {
  try {
    // First, run ESLint with --fix option
    execSync(`npx eslint "${filePath}" --fix`, { stdio: 'inherit' });

    // Then, run Prettier to ensure consistent formatting
    execSync(`npx prettier --write "${filePath}"`, { stdio: 'inherit' });

    console.log(`✅ Fixed: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

// Function to update class names to use the new theme structure
function updateClassNames(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Update color class names to use the new theme structure
    const replacements = {
      // Primary colors
      'text-primary': 'text-primary',
      'bg-primary': 'bg-primary',
      'border-primary': 'border-primary',
      'ring-primary': 'ring-primary',
      'hover:text-primary': 'hover:text-primary',
      'hover:bg-primary': 'hover:bg-primary',
      'focus:ring-primary': 'focus:ring-primary',
      'focus:border-primary': 'focus:border-primary',

      // Text colors
      'text-neutral': 'text-text-neutral',
      'text-gray-500': 'text-text-muted',
      'text-gray-600': 'text-text-secondary',
      'text-gray-700': 'text-text-secondary',
      'text-gray-900': 'text-text-primary',

      // Background colors
      'bg-white': 'bg-background',
      'bg-gray-50': 'bg-background',
      'bg-gray-100': 'bg-background',

      // Border colors
      'border-gray-200': 'border-border',
      'border-gray-300': 'border-border-light',

      // Font families
      'font-sans': 'font-inter-tight',
      'font-inter': 'font-inter-tight',

      // Semantic colors
      'text-green-500': 'text-success',
      'text-red-500': 'text-danger',
      'text-yellow-500': 'text-warning',
      'text-blue-500': 'text-info',

      // Hover states
      'hover:bg-gray-50': 'hover:bg-background',
      'hover:border-gray-300': 'hover:border-border-light',

      // Focus states
      'focus:ring-gray-200': 'focus:ring-border',
      'focus:border-gray-300': 'focus:border-border-light',

      // Active states
      'active:bg-gray-100': 'active:bg-background',

      // Disabled states
      'disabled:bg-gray-100': 'disabled:bg-background',
      'disabled:text-gray-400': 'disabled:text-text-muted',
    };

    // Apply replacements
    Object.entries(replacements).forEach(([oldClass, newClass]) => {
      const regex = new RegExp(`\\b${oldClass}\\b`, 'g');
      content = content.replace(regex, newClass);
    });

    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated class names in: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error updating class names in ${filePath}:`, error.message);
  }
}

// Main function
function main() {
  console.log('🔍 Finding files with Tailwind classes...');
  const files = findFiles(path.join(process.cwd(), 'src'));

  console.log(`📝 Found ${files.length} files to process`);

  files.forEach((file) => {
    updateClassNames(file);
    fixTailwindClasses(file);
  });

  console.log('✨ Done!');
}

main();
