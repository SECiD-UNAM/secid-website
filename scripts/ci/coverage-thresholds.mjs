/**
 * Coverage thresholds — the ONE place they are defined.
 *
 * Consumed by vitest.config.ts (local `npm run coverage` enforces them) and
 * by scripts/ci/check-coverage.mjs (CI enforces them on the report merged
 * from the four test shards, since a single shard only covers part of the
 * code and must not be judged on its own).
 *
 * Floor = measured values on 2026-10-18 (ROADMAP B6), rounded DOWN to the
 * nearest whole percent so the suite stays green and coverage can never
 * silently drop. Raise them as suites are un-skipped — never lower them
 * without a note in docs/ROADMAP.md.
 * Measured: lines 16.72, statements 16.72, functions 43.63, branches 71.78.
 */
export const coverageThresholds = {
  branches: 71,
  functions: 43,
  lines: 90,
  statements: 16,
};
