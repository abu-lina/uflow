import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tseslintParser from '@typescript-eslint/parser';
import nextPlugin from '@next/eslint-plugin-next';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';

const eslintConfig = [
  // Base JavaScript rules
  js.configs.recommended,

  // Next.js configuration (flat config)
  {
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },

  // TypeScript configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
        React: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs.strict.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Emoji policy: Use Lucide icons instead of emojis for consistency and accessibility
      // Example: Replace 🔐 with <Lock className="h-4 w-4" /> from lucide-react
    },
  },

  // React configuration
  {
    files: ['**/*.tsx', '**/*.jsx'],
    plugins: {
      '@next/next': nextPlugin,
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // React rules
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      'react/prop-types': 'off',
      'react/require-default-props': 'off',
      'react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }],
      'react/jsx-sort-props': [
        'error',
        {
          callbacksLast: true,
          shorthandFirst: true,
          ignoreCase: true,
          reservedFirst: true,
          noSortAlphabetically: false,
        },
      ],

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': [
        'warn',
        {
          additionalHooks: '(useMyCustomHook|useAnotherCustomHook)',
        },
      ],

      // Accessibility rules
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/anchor-is-valid': [
        'error',
        {
          components: ['Link'],
          specialLink: ['hrefLeft', 'hrefRight'],
          aspects: ['noHref', 'invalidHref', 'preferButton'],
        },
      ],
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/role-supports-aria-props': 'warn',

      // Custom rules to prevent emoji usage
      'no-irregular-whitespace': 'error',
      // Emoji policy: Use Lucide icons instead of emojis for consistency and accessibility
      // Example: Replace 🔐 with <Lock className="h-4 w-4" /> from lucide-react
    },
  },

  // Prettier configuration (must be last)
  prettier,

  // Global ignores
  {
    ignores: [
      'node_modules/',
      '.next/',
      '.open-next/',
      '.flowbaby/', // Local Flowbaby memory system (gitignored)
      'out/',
      'dist/',
      'coverage/',
      '*.config.js',
      '*.config.mjs',
      '*.config.ts',
      'public/sw.js',
      'public/sw-push-handler.js',
      'public/workbox-*.js',
      'public/fallback-*.js', // Next.js PWA fallback (generated)
      'scripts/**/*.js',
      'scripts/**/*.ts',
      'supabase/functions/**',
      'next-env.d.ts', // Next.js generated file
      'docs/archive/**', // Archived starter template and other reference material
      'docs/implementation/**', // Implementation reference scripts (browser context)
      'tests/**', // Performance and integration tests (k6, etc.)
    ],
  },

  // Test file overrides - more appropriate rules
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      // Test-specific rules - allow some flexibility for testing
      '@typescript-eslint/no-explicit-any': 'warn', // Tests often need 'any' for mocking
      '@typescript-eslint/no-non-null-assertion': 'warn', // Tests use assertions
      '@typescript-eslint/no-unused-vars': 'warn', // Test setup variables
      '@typescript-eslint/no-require-imports': 'warn', // Test utilities
      'react/jsx-sort-props': 'off', // Disable for tests - not critical
      '@typescript-eslint/no-dynamic-delete': 'warn', // Test cleanup
    },
  },

  // Test utilities overrides
  {
    files: ['**/test-utils.tsx', '**/test-utils.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // Test utilities need flexibility
      '@typescript-eslint/no-unused-vars': 'warn',
      'react/jsx-sort-props': 'off', // Not critical for test utilities
      '@typescript-eslint/no-dynamic-delete': 'warn',
    },
  },

  // Debug pages overrides - relax rules for development/debug pages
  {
    files: ['**/app/(debug)/**/*.tsx', '**/app/(debug)/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // Debug pages may need 'any'
      '@typescript-eslint/no-unused-vars': 'warn', // Debug variables may be unused
      '@typescript-eslint/no-require-imports': 'warn', // Debug pages may use require
      'react/jsx-sort-props': 'warn', // Not critical for debug pages
      'react/no-unescaped-entities': 'warn', // Debug content may have quotes
    },
  },
];

export default eslintConfig;
