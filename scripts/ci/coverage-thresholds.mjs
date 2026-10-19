/**
 * Coverage thresholds — the ONE place they are defined.
 *
 * Consumed by vitest.config.ts (local `npm run coverage` enforces them) and
 * by scripts/ci/check-coverage.mjs (CI enforces them on the report merged
 * from the four test shards, since a single shard only covers part of the
 * code and must not be judged on its own).
 *
 * Floor = measured values, rounded DOWN to the nearest whole percent so the
 * suite stays green and coverage can never silently drop. Raise them as
 * suites are un-skipped — never lower them without a note in docs/ROADMAP.md.
 *
 * History:
 * - 2026-10-18 (ROADMAP B6, Vitest 1 / coverage-v8 1): lines 16.72,
 *   statements 16.72, functions 43.63, branches 71.78.
 * - 2026-10-19 (ROADMAP E16 fase 1, Vitest 5 / coverage-v8 5): lines 15.65,
 *   statements 15.55, functions 13.17, branches 13.20. Same 1488 passing
 *   tests — the drop is a measurement change, not lost coverage: Vitest 4+
 *   remaps V8 coverage from the source AST, so the ~300 files that no test
 *   loads now contribute their real function/branch counts (before, the
 *   provider counted exactly 1 placeholder function + 1 branch per untested
 *   file, which inflated those two metrics), and line totals are counted
 *   on the original source instead of the transpiled output.
 */
export const coverageThresholds = {
  branches: 13,
  functions: 13,
  lines: 15,
  statements: 15,
};
