# Known Issue: Unit/Integration test suite hangs (~25 files in)

**Status:** Open — pre-existing tech debt, NOT a regression.
**Impact:** The `Unit & Integration Tests` CI job has never completed; it is
marked `continue-on-error: true` and is non-blocking for merges.

## Symptom

`vitest run` (full suite or any shard) processes ~25–26 fast test files
(each completing in ms) and then **hangs indefinitely**. Individual tests
pass; the run never reaches the summary. With 4 worker threads, ~25 is
roughly the number of healthy files that drain before every worker is
blocked holding an open handle from a hung file.

This pre-dates all hub-promotion work — it was already `fail/canceled` on
the first inspected commit.

## Root cause (narrowed, not yet pinpointed)

A **leaked open handle** (timer / listener / un-mocked external `fetch` /
socket) in a small number of test files keeps the Vitest worker alive so
the file never finishes. Vitest has no collection-phase timeout, so
`testTimeout` does not rescue it.

### Disproven hypotheses (each verified empirically)

| Hypothesis                                                     | Verdict                                                                  |
| -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| jsdom is slow                                                  | No — happy-dom is faster, still hangs                                    |
| Missing auth/firestore/storage emulators                       | No — still hangs with them up                                            |
| Missing functions emulator                                     | No — still hangs with all 4 up                                           |
| `@/lib/firebase` module-level `connect*Emulator()` side-effect | No — still hangs with the module globally stubbed in `src/test/setup.ts` |

## Diagnostic method that works

Run a shard with a watchdog that kills on output-stall and records the
last completed file (the in-flight file is the suspect). To pinpoint:
get the shard's file list, diff against completed files, then run each
remaining candidate **in isolation with a hard timeout** (macOS has no
`timeout`; use a `perl -e 'alarm'` wrapper) — files that time out in
isolation are the leakers. Quarantine (`describe.skip`) or fix them.

## Improvements already shipped alongside (keep)

- happy-dom instead of jsdom (faster)
- 4-way `vitest --shard` matrix
- CI-lean reporters (drop `html`/`json` when `CI=true`)
- `logHeapUsage: false`
- Global `@/lib/firebase` stub in `src/test/setup.ts` (still useful; note it
  makes `src/lib/firebase.test.ts` fail since that file tests the real
  module — it needs `vi.unmock('@/lib/firebase')` / `importActual` when the
  suite is repaired)

## To close

1. Pinpoint leaking files via the isolation method above.
2. Mock the offending external I/O (or add proper teardown/unmount).
3. Restore `src/lib/firebase.test.ts` to the real module.
4. Remove `continue-on-error` and restore a normal `timeout-minutes` on the
   `test` job in `.github/workflows/ci.yml`.
