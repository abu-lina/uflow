module.exports = {
  // TypeScript files — lint and format only. Type-check and tests run in
  // `verify` (docs/agents/lane.md) and CI, so a red TDD commit can land.
  '*.{ts,tsx}': ['eslint --fix --no-warn-ignored', 'prettier --write'],

  // JavaScript files — lint and format
  '*.{js,jsx}': ['eslint --fix --no-warn-ignored', 'prettier --write'],

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

  // Documentation
  'README.md': ['prettier --write'],

  // TypeScript declaration files
  '*.d.ts': ['prettier --write'],

  // Configuration files
  '*.config.{js,ts}': ['eslint --fix', 'prettier --write'],

  // Test files
  '**/__tests__/**/*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],

  // Storybook files
  '*.stories.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
};
