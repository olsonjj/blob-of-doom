import js from '@eslint/js';
import securityPlugin from 'eslint-plugin-security';

export default [
  // Global ignores
  {
    ignores: ['node_modules/'],
  },

  // Node.js environment
  {
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        console: 'readonly',
        process: 'readonly',
      },
    },
  },

  // Base JS config
  js.configs.recommended,

  // Security — relaxed for build scripts
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
];
