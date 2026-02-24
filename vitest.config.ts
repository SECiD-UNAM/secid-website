/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
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
      include: [
        'src/**/*.{js,ts,jsx,tsx}',
      ],
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
    reporters: [
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
    logHeapUsage: true,
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