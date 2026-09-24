/**
 * Lighthouse CI config.
 *
 * The workflow (.github/workflows/lighthouse.yml) already starts the Astro
 * preview server on http://localhost:4321 before invoking lhci, so this
 * config must NOT start its own server. The previous config pointed at
 * localhost:3000 + dead static paths (aboutus.html) and a nonexistent
 * `npm run serve`, so `lhci autorun` errored, produced no manifest, and
 * the scores defaulted to 0 — the audit never actually ran.
 *
 * Assertions are advisory (`warn`): Lighthouse is a quality signal that
 * varies run-to-run in CI; it surfaces regressions in the PR comment /
 * job summary but does not hard-block a deploy.
 */
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:4321/es/', 'http://localhost:4321/en/'],
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.6 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
