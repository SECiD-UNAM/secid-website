/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const isCI = !!process.env.CI;

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // happy-dom is ~2-3x faster than jsdom for the RTL component suite.
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/build/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.astro',
      'raw_template',
      'assets',
      'tests/e2e/**/*',
      'tests/fixtures/**/*',
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      // QUARANTINED — see docs/known-issues/test-suite-hang.md + GitHub
      // issue. There are TWO independent defects here:
      //
      //  1. Stale assertions: tests authored against a since-rewritten
      //     component API/data-model (e.g. JobApplicationModal now takes
      //     jobId + getDoc; DashboardStats shows profile-completeness, not
      //     +%/connection counts; TwoFactorSetup copy/labels changed).
      //  2. Cross-file isolation leakage: even after the assertions are
      //     corrected, several files pass individually but fail when run
      //     together (shared global/module mock state — webkitSpeechRecognition
      //     defineProperty, console spies, shared heroicons/firebase mocks —
      //     bleeds across files; reproduced even single-process/single-fork).
      //
      // 6 files (journal-club, LinkedInVerifiedBadge, ForumSearch, JobCard,
      // QuickActions, SearchBar) have had defect #1 fixed and pass in
      // isolation, but stay quarantined until defect #2 (suite-wide test
      // isolation) is fixed — un-quarantining them now adds 66 failures to
      // the gating suite. The remaining files also need fresh suites.
      'tests/unit/components/dashboard/DashboardStats.test.tsx',
      'tests/unit/components/dashboard/QuickActions.test.tsx',
      'tests/unit/components/dashboard/RecentActivity.test.tsx',
      'tests/unit/components/jobs/JobApplicationModal.test.tsx',
      'tests/unit/components/jobs/JobCard.test.tsx',
      'tests/unit/components/jobs/JobFilters.test.tsx',
      'tests/unit/components/jobs/JobPostingForm.test.tsx',
      'tests/unit/components/search/GlobalSearch.test.tsx',
      'tests/unit/components/search/SearchBar.test.tsx',
      'tests/unit/components/auth/TwoFactorSetup.test.tsx',
      'tests/unit/components/forums/ForumSearch.test.tsx',
      'tests/unit/components/shared/LinkedInVerifiedBadge.test.tsx',
      'tests/unit/lib/journal-club.test.ts',
      // Anti-pattern: runs a full `npx astro build` inside a unit test
      // (slow; was a TIMEOUT in isolation; fails on a pre-existing Astro
      // content-collection error under sharded CI). The real build is
      // already gated by the dedicated "Build Validation" CI job, so this
      // is redundant. Tracked with the others for rewrite/removal.
      'tests/build/astro-build.test.ts',
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        'dist/',
        '.astro/',
        'raw_template/',
        'assets/',
        'public/',
        'scripts/',
        '**/*.astro',
        '**/types/**',
        '**/fixtures/**',
        '**/mocks/**',
        '**/__tests__/**',
        '**/*.test.*',
        '**/*.spec.*',
      ],
      include: ['src/**/*.{js,ts,jsx,tsx}'],
      thresholds: {
        global: {
          branches: 0,
          functions: 0,
          lines: 0,
          statements: 0,
        },
      },
      all: true,
      skipFull: false,
    },
    // In CI the heavy 'json'/'html' reporters serialize the whole run tree
    // and write a static site on every push — pure overhead. Keep them only
    // for local debugging; CI just needs a compact reporter + junit.
    reporters: isCI
      ? ['dot', ['junit', { outputFile: './test-results/junit.xml' }]]
      : [
          'default',
          'json',
          'html',
          ['junit', { outputFile: './test-results/junit.xml' }],
        ],
    outputFile: {
      json: './test-results/test-results.json',
      html: './test-results/index.html',
    },
    cache: {
      dir: 'node_modules/.vitest',
    },
    logHeapUsage: false,
    sequence: {
      shuffle: true,
      concurrent: true,
    },
    benchmark: {
      include: ['**/*.{bench,benchmark}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['node_modules', 'dist', '.astro'],
      reporters: ['default'],
    },
    typecheck: {
      enabled: false,
    },
    watchExclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/coverage/**',
      '**/test-results/**',
    ],
    deps: {
      external: [
        'firebase',
        'firebase/auth',
        'firebase/firestore',
        'firebase/storage',
        '@firebase/rules-unit-testing',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@layouts': resolve(__dirname, './src/layouts'),
      '@lib': resolve(__dirname, './src/lib'),
      '@types': resolve(__dirname, './src/types'),
      '@styles': resolve(__dirname, './src/styles'),
      '@i18n': resolve(__dirname, './src/i18n'),
      '@config': resolve(__dirname, './src/config'),
      '@tests': resolve(__dirname, './tests'),
      '@fixtures': resolve(__dirname, './tests/fixtures'),
    },
  },
  esbuild: {
    target: 'es2022',
  },
});
