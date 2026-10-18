#!/usr/bin/env node
/**
 * Guard for `firebase deploy --only functions --force` on a SHARED backend.
 *
 * One Firebase project backs beta.secid.mx (feature/hub) and secid.mx
 * (main). `--force` lets the CLI delete any deployed function the current
 * branch does not export, so a stale branch could silently remove a
 * function the other site still calls. This script compares what is
 * deployed with what functions/src/index.ts exports and fails before the
 * deploy if anything would be deleted.
 *
 * Deliberate deletions: set ALLOW_FUNCTION_DELETIONS="name1,name2" on the
 * job (or pass --allow name1,name2) for that one deploy.
 *
 * Usage: node scripts/ci/check-function-deletions.mjs --project <id> [--allow a,b]
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

const project = arg('--project');
if (!project) {
  console.error(
    'usage: check-function-deletions.mjs --project <id> [--allow a,b]'
  );
  process.exit(2);
}
const allowed = new Set(
  (arg('--allow') ?? process.env.ALLOW_FUNCTION_DELETIONS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

/** Names exported from functions/src/index.ts (every `export` form). */
function localExports(indexPath) {
  const src = readFileSync(indexPath, 'utf8').replace(/\/\/.*$/gm, '');
  const names = new Set();
  for (const m of src.matchAll(
    /^export\s+(?:const|function|async function)\s+([A-Za-z0-9_$]+)/gm
  )) {
    names.add(m[1]);
  }
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const spec of m[1].split(',')) {
      const name = spec
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name) names.add(name);
    }
  }
  return names;
}

/** Names currently deployed, as reported by the Firebase CLI. */
function deployedFunctions(projectId) {
  const raw = execFileSync(
    'npx',
    ['firebase-tools', 'functions:list', '--project', projectId, '--json'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }
  );
  const parsed = JSON.parse(raw);
  if (parsed.status !== 'success') {
    throw new Error(`functions:list failed: ${parsed.error ?? raw}`);
  }
  return (parsed.result ?? []).map((fn) => {
    const full = fn.id ?? fn.name ?? '';
    return full.split('/').pop();
  });
}

const local = localExports(resolve('functions/src/index.ts'));
const deployed = deployedFunctions(project);

// Extension-managed functions (ext-*) are not part of this codebase and the
// CLI never deletes them with `--only functions`.
const wouldDelete = deployed.filter(
  (name) =>
    name && !name.startsWith('ext-') && !local.has(name) && !allowed.has(name)
);

console.log(`deployed: ${deployed.length}, exported locally: ${local.size}`);
if (wouldDelete.length === 0) {
  console.log('OK: this deploy deletes no functions.');
  process.exit(0);
}

console.error(
  `\n::error::This branch does not export ${wouldDelete.length} deployed function(s); ` +
    `\`firebase deploy --force\` would DELETE them from the shared backend:\n` +
    wouldDelete.map((n) => `  - ${n}`).join('\n') +
    `\n\nIf the deletion is intended, re-run with ALLOW_FUNCTION_DELETIONS="${wouldDelete.join(',')}". ` +
    `Otherwise merge the branch that still exports them first (see docs/LAUNCH-CHECKLIST.md).`
);
process.exit(1);
