module.exports = {
  // TypeScript files — type-check, lint, format
  '*.{ts,tsx}': [
    () => 'tsc --noEmit',
    'eslint --fix --max-warnings=0',
    'prettier --write',
    (files) => {
      const testFiles = files.filter(
        (file) => file.includes('.test.') || file.includes('.spec.') || file.includes('__tests__'),
      );
      if (testFiles.length > 0) {
        return 'npx vitest run ' + testFiles.join(' ');
      }
      return [];
    },
  ],

  // JavaScript files — lint and format (no tsc)
  '*.{js,jsx}': ['eslint --fix --max-warnings=0 --no-warn-ignored', 'prettier --write'],

  // Style files
  '*.{css,scss,sass,less}': ['prettier --write'],

  // JSON files
  '*.json': ['prettier --write'],

  // Markdown files
  '*.{md,mdx}': ['prettier --write'],

  // YAML files
  '*.{yml,yaml}': ['prettier --write'],

  // Configuration files
  '.*rc': ['prettier --write --parser json'],

  // Package files
  'package.json': ['prettier --write'],

  // Lock files
  'package-lock.json': [
    'node -e "process.exit(0)"', // Skip processing
  ],

  // Git files
  '.gitignore': ['prettier --write'],

  // Documentation
  'README.md': ['prettier --write'],

  // Shell scripts
  '*.sh': ['prettier --write'],

  // TypeScript declaration files
  '*.d.ts': ['prettier --write'],

  // Configuration files
  '*.config.{js,ts}': ['eslint --fix', 'prettier --write'],

  // Test files
  '**/__tests__/**/*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],

  // Storybook files
  '*.stories.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
};
