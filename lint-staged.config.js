module.exports = {
  // TypeScript and JavaScript files
  '*.{js,jsx,ts,tsx}': [
    // Fix imports first
    './fix-imports.sh',

    // Type checking
    'tsc --noEmit',

    // Linting
    'eslint --fix --max-warnings=0',

    // Formatting
    'prettier --write',

    // Run tests if any test files are changed
    (files) => {
      const testFiles = files.filter(
        (file) => file.includes('.test.') || file.includes('.spec.') || file.includes('__tests__')
      );
      if (testFiles.length > 0) {
        return 'npm test -- --findRelatedTests ' + testFiles.join(' ');
      }
      return [];
    },
  ],

  // Style files
  '*.{css,scss,sass,less}': ['stylelint --fix', 'prettier --write'],

  // JSON files
  '*.json': ['prettier --write'],

  // Markdown files
  '*.{md,mdx}': ['prettier --write', 'markdownlint --fix'],

  // YAML files
  '*.{yml,yaml}': ['prettier --write', 'yamllint'],

  // Configuration files
  '.*rc': ['prettier --write --parser json'],

  // Package files
  'package.json': ['sort-package-json', 'prettier --write'],

  // Lock files
  'package-lock.json': [
    'node -e "process.exit(0)"', // Skip processing
  ],

  // Git files
  '.gitignore': ['prettier --write'],

  // Documentation
  'README.md': ['prettier --write', 'markdownlint --fix'],

  // Shell scripts
  '*.sh': ['shellcheck', 'prettier --write'],

  // TypeScript declaration files
  '*.d.ts': ['prettier --write'],

  // Configuration files
  '*.config.{js,ts}': ['eslint --fix', 'prettier --write'],

  // Test files
  '**/__tests__/**/*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],

  // Storybook files
  '*.stories.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
};
