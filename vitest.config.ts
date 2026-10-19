import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { coverageThresholds } from './scripts/ci/coverage-thresholds.mjs';

const isCI = !!process.env.CI;
// A sharded CI run (`--shard=N/4 --coverage`) only covers part of the code:
// emit the raw json report and skip thresholds; scripts/ci/check-coverage.mjs
// merges the shards and enforces them once.
const isPartialCoverage = !!process.env.COVERAGE_PARTIAL;

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // Vitest 5 defaults clearMocks to true (vi.clearAllMocks() before every
    // test). Keep the pre-5 behaviour: suites that record calls in
    // beforeAll/module scope rely on that history surviving into the test.
    clearMocks: false,
    // happy-dom is ~2-3x faster than jsdom for the RTL component suite.
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/build/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      // tests/rules/* uses @firebase/rules-unit-testing against the Firestore
      // emulator. Tests gracefully skip if emulator isn't running, so they
      // never break CI when the emulator step is omitted.
      'tests/rules/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
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
    // Vitest 4 replaced poolOptions.threads.{min,max}Threads with maxWorkers.
    maxWorkers: 4,
    coverage: {
      provider: 'v8',
      reporter: isPartialCoverage
        ? ['json']
        : ['text', 'json', 'html', 'lcov', 'json-summary'],
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
      // Values live in scripts/ci/coverage-thresholds.mjs, shared with the CI
      // merge step (ROADMAP B6/B8).
      //
      // NOTE: the keys must sit directly under `thresholds`. Vitest treats any
      // other key (e.g. Jest's `global`) as a file glob, and `global` matches
      // nothing — so the previous `thresholds.global` block was never enforced.
      thresholds: isPartialCoverage ? undefined : coverageThresholds,
      // `coverage.include` above is what makes untested files count (Vitest 4
      // removed `coverage.all`; without `include` only loaded files report).
      skipFull: false,
    },
    // In CI the heavy 'json'/'html' reporters serialize the whole run tree
    // and write a static site on every push — pure overhead. Keep them only
    // for local debugging; CI just needs a compact reporter + junit.
    reporters: isCI
      ? ['dot', ['junit', { outputFile: './test-results/junit.xml' }]]
      : [
          'default',
          ['json', { outputFile: './test-results/test-results.json' }],
          ['html', { outputDir: './test-results' }],
          ['junit', { outputFile: './test-results/junit.xml' }],
        ],
    logHeapUsage: false,
    sequence: {
      shuffle: true,
      // Since Vitest 2 `concurrent: true` interleaves EVERY test of a file
      // (no longer one describe block at a time). The RTL suites share a
      // single happy-dom document, so concurrent renders collide ("Found
      // multiple elements ..."); running a file's tests one at a time is
      // also measurably faster here (environment setup dominates, not the
      // tests). Files are still run in parallel across workers.
      concurrent: false,
    },
    benchmark: {
      include: ['**/*.{bench,benchmark}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['node_modules', 'dist', '.astro'],
    },
    typecheck: {
      enabled: false,
    },
    server: {
      watch: {
        ignored: [
          '**/node_modules/**',
          '**/dist/**',
          '**/.git/**',
          '**/coverage/**',
          '**/test-results/**',
        ],
      },
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
