# AGENTS.md

Pointer file for coding assistants other than Claude Code (Codex, Cursor,
Copilot, ...). Read [`CLAUDE.md`](./CLAUDE.md) (architecture, modules,
commands, conventions) and [`CONTRIBUTING.md`](./CONTRIBUTING.md) (branches,
local setup, tests, CI checks, auto-merge, what not to do) first.

## What this project is

- SECiD (Sociedad de Egresados en Ciencia de Datos), UNAM's data science
  alumni platform: members, jobs, events, forums, mentorship, admin panel.
- Astro 7 (static output, React 18 islands, Tailwind) + Firebase (Auth,
  Firestore, Storage, Cloud Functions in `functions/`) + Stripe.
- Spanish is the default locale, English second (`/es/`, `/en/`).
- Node `>=22.12` (`.nvmrc` pins 22.12.0; Vitest 5 needs it), Java 21 for the emulators; tests with
  Vitest (`tests/unit`, `integration`, `rules`) and Playwright (`tests/e2e`).

## Scripts that exist (see `package.json`)

```bash
npm ci && npm run functions:install   # deps for root and functions/
npm run dev          # Astro + Firebase emulators + functions watcher
npm run build        # astro check && astro build
npm run type-check   # tsc --noEmit
npm run lint         # ESLint (lint:fix to auto-fix)
npm run format:check # Prettier (format to write)
npm test             # Vitest: unit + integration + build
npm run test:unit | test:integration | test:rules | test:e2e | coverage
npm run seed         # seed the emulators with test data
```

The pre-commit hook (Husky + lint-staged) runs ESLint, Prettier and
`type-check`; never bypass it with `--no-verify`.

## Branch and PR rules

- Work on `{type}/{short-description}` branches from `origin/main`
  (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`).
- Conventional Commits (`feat(auth): ...`, `fix: ...`, `docs: ...`).
- `main` only changes through a pull request with the required checks
  green. Never push to or merge into `main` locally: it deploys production.
- Every change in `src/` or `functions/` ships with tests.

## Shared backend: read before touching data

Beta (`feature/hub` -> beta.secid.mx) and production (`main` -> secid.mx)
share ONE Firebase project, `secid-org`: same Auth users, same Firestore,
same Cloud Functions. "Testing on beta" writes real data. Use the emulators
(`npm run dev`) for destructive tests and QA accounts with a plus-tag
(`name+qa@...`). Only `main` deploys the backend (functions, rules,
indexes); backend changes go to `main` first, then `main` is merged into
`feature/hub`. Never change DNS or Cloudflare for `secid.mx`.

## Operations

- Environments, deploy flows, secrets: [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md);
  runbooks (rollback, backups, backend changes): [`docs/runbooks/`](./docs/runbooks/README.md).
- Operating the backend from an assistant (Auth users, Firestore docs,
  verifying a deploy, what only the owner may do):
  [`.claude/skills/secid-ops/SKILL.md`](./.claude/skills/secid-ops/SKILL.md).
