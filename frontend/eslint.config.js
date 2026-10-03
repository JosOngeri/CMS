/**
 * ESLint flat config (ESLint v9) — replaces the legacy .eslintrc.cjs/.eslintrc.json
 * pair (the .cjs silently shadowed the .json).
 *
 * Notable scoping:
 *  - react-hooks plugin is registered (the legacy config referenced
 *    react-hooks/exhaustive-deps in source disable-comments without loading it).
 *  - The no-hardcoded-hex rule is disabled for palette-definition files and
 *    tests — churchColorPalette.js IS the palette; tests legitimately assert
 *    hex literals.
 *  - Test files get node + vitest globals (`global`, `describe`, `vi`, ...).
 */
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    ignores: [
      'dist/',
      'dist-new/',
      'node_modules/',
      'coverage/',
      'build/',
      '*.config.js',
      'playwright-report/',
      'test-results/',
    ],
  },
  {
    files: ['src/**/*.{js,jsx}'],
    ...react.configs.flat.recommended,
    languageOptions: {
      ...(react.configs.flat.recommended.languageOptions || {}),
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // Vite statically replaces process.env.NODE_ENV at build time.
        process: 'readonly',
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: { react: { version: '18.2' } },
    rules: {
      ...(react.configs.flat.recommended.rules || {}),
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Prevent hardcoded hex colors (Phase 3 requirement) — exempt files below
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#[0-9a-fA-F]{6}$/]',
          message: 'Hardcoded hex colors are not allowed. Use CSS variables instead.',
        },
      ],
    },
  },
  {
    // Palette-definition files and tests may legitimately contain hex literals.
    files: [
      '**/churchColorPalette.js',
      '**/colorPalettes.js',
      '**/ColorPaletteContext.jsx',
      '**/PalettePreviewCard.jsx',
      '**/__tests__/**',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    // Tests run under vitest/jsdom — need node + vitest globals.
    files: ['**/__tests__/**', '**/setup.js', '**/*.test.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        vi: 'readonly',
      },
    },
  },
];
