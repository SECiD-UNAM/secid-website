module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:astro/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // TypeScript rules
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/no-unused-expressions': 'off', // too noisy for existing codebase
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-this-alias': 'off',

    // React rules
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react/prop-types': 'off', // We use TypeScript for prop validation
    'react/jsx-uses-react': 'off', // Not needed in React 17+
    'react/jsx-uses-vars': 'error',
    'react/jsx-key': 'error',
    'react/no-unescaped-entities': 'off',

    // React Hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Accessibility rules
    'jsx-a11y/anchor-is-valid': 'off', // Astro handles this differently
    // Labels that wrap a radio/checkbox put the text in an icon+text layout
    // (`label > div > span`); the default depth (2) stops one level short.
    'jsx-a11y/label-has-associated-control': ['error', { depth: 3 }],
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/no-static-element-interactions': 'warn',

    // General rules
    // `no-console` is intentionally a WARN globally — 787 existing call sites
    // make 'error' a flag-day rewrite. New code should route through
    // `src/lib/logger.ts` (the one file where `console.*` is allowed,
    // see overrides). Burndown is tracked separately.
    'no-console': 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
  },
  overrides: [
    {
      files: ['*.astro'],
      parser: 'astro-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro'],
      },
      rules: {
        // Astro-specific rules
        'astro/no-conflict-set-directives': 'error',
        'astro/no-unused-define-vars-in-style': 'error',
        // False positive: Astro templates use plain HTML attributes
        // (`class=`, `for=`, `tabindex=`, …), not React's camelCased props.
        // Its autofix would rewrite `class` to `className`, which Astro
        // does not render, so the rule must stay off for `.astro` files.
        'react/no-unknown-property': 'off',
        // False positive: Astro template expressions (`{items.map(...)}`)
        // render to static HTML, there is no React reconciler and no
        // `key` prop. Keep it on for `.tsx` islands.
        'react/jsx-key': 'off',
        // False positive: the rule only recognises React's `htmlFor`;
        // Astro templates use the HTML `for=` attribute, which it ignores.
        'jsx-a11y/label-has-associated-control': 'off',
      },
    },
    {
      // Third-party Amplitude bootstrap snippet pasted verbatim (uses
      // `var`); keep it byte-identical to the vendor version. The second
      // pattern matches the client-script block that the astro processor
      // splits out as a virtual `<file>.astro/<n>.js` file.
      files: [
        'src/layouts/ModernLayout.astro',
        'src/layouts/ModernLayout.astro/*.{js,ts}',
      ],
      rules: {
        'no-var': 'off',
      },
    },
    {
      // Ambient declarations: the `.astro/types.d.ts` triple-slash is what
      // Astro generates and documents, and `interface ImportMeta` is a
      // global augmentation (declaration merging), not an unused symbol.
      files: ['src/env.d.ts'],
      rules: {
        '@typescript-eslint/triple-slash-reference': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    {
      // Node CommonJS maintenance scripts (run with plain `node`, no
      // bundler). They use `require()` by design.
      files: [
        'scripts/**/*.js',
        'build.js',
        'run-tests.js',
        'validate-schema.js',
      ],
      env: {
        node: true,
      },
      parserOptions: {
        sourceType: 'script',
      },
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
    {
      // Test harness JSX passes props straight through to the component
      // under test; `autoFocus` there is the thing being tested, not UI.
      files: ['tests/**/*.{ts,tsx}'],
      rules: {
        'jsx-a11y/no-autofocus': 'off',
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        // TypeScript-specific rules
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
    {
      files: ['*.config.js', '*.config.cjs', '*.config.mjs'],
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
    {
      // The logger is the ONE place console.* is allowed; it has to call
      // the real console to emit anything. Keep this list tiny and
      // explicit — every new entry is a hole in the guardrail.
      files: ['src/lib/logger.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
  ignorePatterns: [
    'dist/',
    'node_modules/',
    // Separate package with its own root ESLint config and devDependencies
    // (eslint-plugin-import lives in functions/node_modules, which the root
    // install does not provide). Linted via `npm run lint --prefix functions`.
    'functions/',
    '.astro/',
    'public/',
    '*.min.js',
    'raw_template/',
    // Local tool output (untracked); vitest's HTML report ships minified JS.
    'test-results/',
    'coverage/',
    'playwright-report/',
    '.firebase/',
  ],
};
