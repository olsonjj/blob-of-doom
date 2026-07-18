import js from '@eslint/js';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import securityPlugin from 'eslint-plugin-security';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'dist/',
      'node_modules/',
      '.vercel/',
      'src/routeTree.gen.ts',
      'vite.config.ts',
      'drizzle.config.ts',
      'vitest.config.ts',
      'prettier.config.js',
      'scripts/',
    ],
  },

  // Base JS/TS config
  js.configs.recommended,
  ...tseslint.configs.strict,

  // Enable type-aware linting for all TypeScript files
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // React Hooks
  {
    plugins: { 'react-hooks': reactHooksPlugin },
    rules: reactHooksPlugin.configs.recommended.rules,
  },

  // Security
  {
    plugins: { security: securityPlugin },
    rules: {
      'security/detect-eval-with-expression': 'error',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'off',
      'security/detect-non-literal-require': 'off',
      'security/detect-object-injection': 'off',
      'security/detect-possible-timing-attacks': 'off',
      'security/detect-pseudoRandomBytes': 'off',
    },
  },

  // Import sorting
  {
    plugins: { 'simple-import-sort': simpleImportSortPlugin },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },

  // Custom rules for this project
  {
    rules: {
      // Turn off rules already enforced by tsconfig
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',

      // Async handling — error
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // Non-null assertions — warn (TypeScript strict mode already provides null safety)
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Naming conventions — warn
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        },
        {
          selector: 'variable',
          modifiers: ['destructured'],
          format: null,
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'variable',
          types: ['boolean'],
          format: ['camelCase', 'PascalCase'],
        },
      ],
    },
  },

  // Test files — relax some rules
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'test-fixtures/**'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'security/detect-eval-with-expression': 'off',
    },
  },
);
