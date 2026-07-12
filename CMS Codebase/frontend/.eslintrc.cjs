module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // Prevent hardcoded hex colors in JSX files (Phase 3 requirement)
    // Exclude palette configuration files where hex colors are intentional
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value=/^#[0-9a-fA-F]{6}$/]',
        message: 'Hardcoded hex colors are not allowed. Use CSS variables instead.',
      },
    ],
  },
  overrides: [
    {
      files: ['**/ColorPaletteContext.jsx', '**/PalettePreviewCard.jsx', '**/colorPalettes.js'],
      rules: {
        'no-restricted-syntax': 'off', // Allow hex colors in palette configuration files
      },
    },
  ],
};
