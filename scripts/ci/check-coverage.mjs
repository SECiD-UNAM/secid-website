#!/usr/bin/env node
/**
 * Merge per-shard Vitest coverage reports and enforce the thresholds.
 *
 * CI runs the unit suite as 4 shards (`vitest run --shard=N/4 --coverage`
 * with COVERAGE_PARTIAL=1, which turns thresholds off for that run). Each
 * shard uploads its coverage/coverage-final.json; this script merges them
 * (istanbul-lib-coverage matches entries by source location, so a file that
 * is untested in one shard and tested in another merges cleanly), writes
 * the merged json + lcov + json-summary into --out, prints a markdown table
 * (also appended to $GITHUB_STEP_SUMMARY when set) and exits 1 if any
 * metric is below scripts/ci/coverage-thresholds.mjs.
 *
 * Usage: node scripts/ci/check-coverage.mjs [--out dir] <coverage-final.json>...
 */
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import libCoverage from 'istanbul-lib-coverage';
import libReport from 'istanbul-lib-report';
import reports from 'istanbul-reports';
import { coverageThresholds } from './coverage-thresholds.mjs';

function parseArgs(argv) {
  const files = [];
  let out = 'coverage';
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') {
      out = argv[i + 1];
      i += 1;
    } else {
      files.push(argv[i]);
    }
  }
  return { files, out };
}

function mergeReports(files) {
  const map = libCoverage.createCoverageMap({});
  for (const file of files) {
    map.merge(JSON.parse(readFileSync(resolve(file), 'utf8')));
  }
  return map;
}

function writeReports(map, dir) {
  mkdirSync(dir, { recursive: true });
  const context = libReport.createContext({ dir, coverageMap: map });
  for (const name of ['json', 'lcovonly', 'json-summary']) {
    reports.create(name).execute(context);
  }
}

function renderTable(summary, failing) {
  const rows = Object.entries(coverageThresholds).map(([metric, min]) => {
    const status = failing.includes(metric) ? 'BELOW' : 'ok';
    return `| ${metric} | ${summary[metric].pct.toFixed(2)}% | ${min}% | ${status} |`;
  });
  return [
    '## Coverage (4 shards merged)',
    '',
    '| metric | actual | threshold | status |',
    '|---|---:|---:|---|',
    ...rows,
  ].join('\n');
}

const { files, out } = parseArgs(process.argv.slice(2));
if (files.length === 0) {
  console.error(
    'usage: check-coverage.mjs [--out dir] <coverage-final.json>...'
  );
  process.exit(2);
}

const map = mergeReports(files);
writeReports(map, out);
const summary = map.getCoverageSummary().toJSON();
const failing = Object.keys(coverageThresholds).filter(
  (metric) => summary[metric].pct < coverageThresholds[metric]
);

const table = renderTable(summary, failing);
console.log(table);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${table}\n`);
}

for (const metric of failing) {
  console.error(
    `::error::Coverage for ${metric} (${summary[metric].pct.toFixed(2)}%) is below threshold (${coverageThresholds[metric]}%)`
  );
}
process.exit(failing.length ? 1 : 0);
