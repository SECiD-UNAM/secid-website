# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SECiD (Sociedad de Egresados en Ciencia de Datos) is UNAM's Data Science Alumni Society platform. It is a full-stack web application built with Astro, React, Firebase, and Stripe, providing member management, job boards, events, mentorship, forums, payments, and an admin dashboard.

## Architecture

**Astro 4.x hybrid SSR** application with React 18 islands, Firebase backend, and Stripe payments.

- **Frontend**: Astro pages (`.astro`) + React components (`.tsx`) + Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions) + Stripe
- **Rendering**: Hybrid mode — static by default, server-rendered for dynamic routes
- **i18n**: Spanish (default) + English, with route-based localization (`/es/`, `/en/`)
- **API**: Astro API routes at `src/pages/api/` with middleware for auth, rate limiting, CORS, and CAPTCHA

### Key Modules

| Module     | Components                                      | Description                                                       |
| ---------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| Auth       | `src/lib/auth/`, `src/contexts/AuthContext.tsx` | Firebase Auth, OAuth (Google/GitHub/LinkedIn), session management |
| Dashboard  | `src/components/dashboard/`                     | Member dashboard with profile, jobs, events, forums, mentorship   |
| Admin      | `src/components/admin/`                         | User management, content moderation, analytics, settings          |
| Payments   | `src/pages/api/create-*.ts`, `src/lib/stripe/`  | Stripe subscriptions, invoices, Mexican tax (IVA/RFC)             |
| Jobs       | `src/components/jobs/`                          | Job board with search, filters, posting                           |
| Events     | `src/components/events/`                        | Event listing, registration                                       |
| Forums     | `src/components/forums/`                        | Community forum                                                   |
| Mentorship | `src/components/mentorship/`                    | Mentor-mentee matching and sessions                               |

## Development Requirements

**Node.js Version:** >=20.0.0 (see `.nvmrc`)

- Use `nvm use` for version consistency
- Engine-strict mode enabled

## Development Commands

**Local Development:**

- `npm run dev` - Start Astro dev server + Firebase emulators + Functions watcher (concurrent)
- `npm run preview` - Preview production build locally

**Build:**

- `npm run build` - Production build (`astro check && astro build`)
- `npm run check` - TypeScript/Astro type checking
- `npm run type-check` - `tsc --noEmit`

**Testing:**

- `npm test` - Run all Vitest tests
- `npm run test:unit` - Unit tests only (`tests/unit/`)
- `npm run test:integration` - Integration tests only (`tests/integration/`)
- `npm run test:e2e` - Playwright end-to-end tests
- `npm run test:mobile` - Mobile-specific test suite
- `npm run coverage` - Run with coverage report

**Linting & Formatting:**

- `npm run lint` - ESLint check
- `npm run lint:fix` - ESLint auto-fix
- `npm run format` - Prettier format all files
- `npm run format:check` - Prettier check

**Firebase:**

- `npm run emulator:start` - Start Firebase emulators
- `npm run seed` - Seed emulator with test data
- `npm run functions:install` - Install Cloud Functions dependencies

**Pre-commit Hooks:**
Husky + lint-staged runs ESLint and Prettier on staged files before each commit.

## File Organization

- `src/pages/` — Astro pages and API routes (organized by locale: `en/`, `es/`)
- `src/components/` — React components (organized by feature module)
- `src/lib/` — Utility functions, services, Firebase/Stripe clients
- `src/types/` — TypeScript type definitions
- `src/contexts/` — React Context providers (Auth, Search)
- `src/hooks/` — Custom React hooks
- `src/middleware/` — Astro middleware (security, sessions, rate limiting, CORS)
- `src/i18n/` — Internationalization translations
- `src/layouts/` — Astro layout components
- `src/styles/` — Global CSS/Tailwind styles
- `functions/` — Firebase Cloud Functions (TypeScript)
- `tests/` — Test suites (unit, integration, e2e, mobile, fixtures)
- `public/` — Static assets (CSS, JS, images, fonts)
- `docs/` — Documentation (specs, reviews, ADRs, guides)

---

# Agent Triforce Configuration

## System Overview

This project uses the Agent Triforce multi-agent development system:

- **Prometeo (PM)**: Product strategy, feature specs, business logic
- **Forja (Dev)**: Architecture, implementation, testing, documentation
- **Centinela (QA)**: Security audit, code review, compliance

## Agent Invocation

- "Use Prometeo to define the feature for [X]"
- "Use Forja to implement [X]"
- "Use Centinela to audit [X]"

Or use skills:

- `/agent-triforce:feature-spec [description]` — Create a feature specification
- `/agent-triforce:implement-feature [spec-name]` — Implement a feature from its spec
- `/agent-triforce:security-audit [scope]` — Run a security audit
- `/agent-triforce:code-health` — Scan for dead code and tech debt
- `/agent-triforce:release-check` — Pre-release verification gate
- `/agent-triforce:review-findings [review-file]` — Fix QA review findings

## Tech Stack Preferences

- **Language**: TypeScript 5.x, JavaScript (ES modules)
- **Frameworks**: Astro 4.x, React 18, Tailwind CSS 3.x
- **Backend**: Firebase, Stripe
- **Testing**: Vitest, Playwright
- **Linting**: ESLint, Prettier
- **Build tools**: Husky, lint-staged, Vite
- **State management**: Zustand, TanStack React Query
- **Forms**: React Hook Form + Zod
- **i18n**: i18next, react-i18next
- **Infrastructure**: Firebase Hosting, GitHub Actions
- **Node.js**: >=20.0.0

## Project Conventions

### File Locations

- Feature specs: `docs/specs/{feature-name}.md`
- Architecture Decision Records: `docs/adr/ADR-{NNN}-{title}.md`
- QA reviews: `docs/reviews/{feature-name}-review.md`
- Source code: `src/`
- Tests: `tests/`

### Git Conventions

- Branches: `{type}/{short-description}` (feat/, fix/, refactor/, docs/, test/, feature/)
- Commits: Conventional Commits (feat:, fix:, docs:, refactor:, test:, chore:)

### Code Standards

- Functions <30 lines, one level of abstraction, meaningful names
- No hardcoded secrets, URLs, or config values
- No commented-out code (it belongs in git history)
- Prefer exceptions over null returns for error handling

## MCP Configuration

- **GitHub Issues**: Available via `gh` CLI — use `gh issue list`, `gh issue create`, `gh issue view` for issue tracking
- **Linear**: Not configured — run `/agent-triforce:issues-setup` to add Linear MCP server later
- **SonarQube**: Not configured — run `/agent-triforce:mcp-setup` to add SonarQube MCP server later
