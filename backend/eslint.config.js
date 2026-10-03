/**
 * ESLint flat config (ESLint v9) — replaces the legacy .eslintrc.json which
 * eslint 9 no longer reads.
 *
 * Severity policy: correctness rules stay 'error'; purely stylistic rules
 * (formatting, spacing, comments) are 'warn' so `npm run lint` exits non-zero
 * only for real problems. `linebreak-style` is intentionally dropped — the
 * repo is developed on Windows (CRLF). Run `npx eslint . --fix` to batch-clean
 * the stylistic warnings before promoting them back to errors.
 */
const js = require('@eslint/js');
const globals = require('globals');

const STYLISTIC = 'warn';

module.exports = [
  js.configs.recommended,
  {
    ignores: [
      'node_modules/',
      'coverage/',
      'migrations/',
      'sessions/',
      'logs/',
      'uploads/',
      'dist/',
    ],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      // --- correctness -----------------------------------------------------
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-with': 'error',
      'no-duplicate-imports': 'error',
      'no-throw-literal': 'error',
      'no-new-wrappers': 'error',
      'no-debugger': 'error',
      // --- advisory ---------------------------------------------------------
      'no-unused-vars': 'warn',
      'prefer-const': 'warn',
      'require-await': 'warn',
      'prefer-promise-reject-errors': 'warn',
      'no-else-return': 'warn',
      'no-lonely-if': 'warn',
      'no-unreachable-loop': 'warn',
      'no-useless-constructor': 'warn',
      'no-useless-concat': 'warn',
      'no-useless-return': 'warn',
      'no-unneeded-ternary': 'warn',
      'no-console': 'warn',
      'no-shadow': 'warn',
      'no-nested-ternary': 'warn',
      'no-mixed-operators': 'warn',
      'no-empty': 'warn',
      'no-empty-function': 'warn',
      'no-alert': 'warn',
      // --- stylistic (auto-fixable; run eslint --fix to converge) -----------
      'indent': [STYLISTIC, 2],
      'quotes': [STYLISTIC, 'single', { avoidEscape: true }],
      'semi': [STYLISTIC, 'always'],
      'curly': [STYLISTIC, 'all'],
      'no-multi-spaces': STYLISTIC,
      'no-trailing-spaces': STYLISTIC,
      'no-multiple-empty-lines': [STYLISTIC, { max: 2 }],
      'space-before-function-paren': [STYLISTIC, {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always',
      }],
      'object-curly-spacing': [STYLISTIC, 'always'],
      'array-bracket-spacing': [STYLISTIC, 'never'],
      'comma-spacing': [STYLISTIC, { before: false, after: true }],
      'key-spacing': [STYLISTIC, { beforeColon: false, afterColon: true }],
      'keyword-spacing': [STYLISTIC],
      'space-infix-ops': [STYLISTIC],
      'space-unary-ops': [STYLISTIC, { words: true, nonwords: false }],
      'spaced-comment': [STYLISTIC, 'always'],
    },
  },
];
