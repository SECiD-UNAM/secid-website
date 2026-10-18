module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'google',
    'plugin:@typescript-eslint/recommended',
    // Must stay last: turns off every formatting rule from the configs
    // above so ESLint never fights the repo-wide Prettier config.
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    // Resolve project paths relative to this file so lint-staged (which runs
    // from the repo root) can still find functions/tsconfig.dev.json.
    tsconfigRootDir: __dirname,
    project: ['tsconfig.json', 'tsconfig.dev.json'],
    sourceType: 'module',
  },
  ignorePatterns: [
    '/lib/**/*',
    // Excluded from tsconfig.json (never compiled or deployed), so the typed
    // parser has no program for them.
    '/src/linkedin-auth.ts',
    '/src/parse-linkedin-pdf.ts',
  ],
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    'import/no-unresolved': 0,
    'require-jsdoc': 'off',
    'valid-jsdoc': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
