# Repository Guidelines

## Project Structure & Module Organization

- Root HTML pages: `index.html`, `aboutus.html`, `job-submission.html`, `registro.html`, `elements.html`.
- Static assets in `assets/` (CSS/JS/SASS) and images in `images/`.
- Build/validation utilities: `build.js`, `validate-schema.js`, `.htmlvalidate.json`, `lighthouserc.js`, `.pa11yci.json`.
- Tests and helpers live under `tests/` (keep new checks here).

## Build, Test, and Development Commands

- `npm run dev`: Build for development, then serve at `http://localhost:3000`.
- `npm run serve`: Serve the current directory on port 3000.
- `npm run build` | `build:dev` | `build:staging`: Generate env-specific URLs/meta via `build.js`.
- `npm run validate:html`: HTML structure validation with `html-validate`.
- `npm run validate:schema`: Validate JSON‑LD Schema.org in key pages.
- `npm run test:accessibility`: WCAG checks with `pa11y` (server must be running).
- `npm run test:lighthouse`: Lighthouse CI against the local server.

## Coding Style & Naming Conventions

- HTML: follow existing template style; tabs for indentation, double quotes for attributes.
- JS (node scripts): 2‑space indentation, semicolons required.
- Filenames: lowercase; prefer kebab‑case for new pages (e.g., `job-submission.html`). Keep existing names when editing.
- Accessibility: honor ARIA roles/labels; avoid inline styles; unique IDs.

## Testing Guidelines

- Local suite: `npm run test:local` (runs precommit checks).
- HTML must pass `npm run validate:html`; JSON‑LD must pass `npm run validate:schema`.
- Accessibility: `npm run dev` then `npm run test:accessibility`.
- Performance/SEO: `npm run test:lighthouse` (targets in `lighthouserc.js`).

## Commit & Pull Request Guidelines

- Commits: imperative, short, and scoped (e.g., "Fix header landmark labels").
- Include rationale and reference issues (`#123`) when applicable.
- Pre-push: run `npm run test:local` and verify pages render locally.
- PRs must include: clear description, before/after screenshots for UI changes, linked issues, and notes on testing.

## Security & Configuration Tips

- Node 20.17+ (`nvm use` reads `.nvmrc`).
- Do not commit secrets; keep environment-specific values in templates or local env files.
- Keep external script usage minimal and with SRI when applicable.
