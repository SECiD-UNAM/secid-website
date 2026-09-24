# Handoff: Beta-to-Main Promotion — Feedback FAB + CD Simplification

## Session Metadata

- Created: 2026-03-23 22:37:01
- Project: /Users/artemiopadilla/Documents/repos/GitHub/secid/secid-website
- Branch: feature/hub
- Session duration: ~2 hours

### Recent Commits (for context)

- 55495c4 Merge branch 'main' into feature/hub (includes feedback FAB + issue templates)
- 974d13a chore: retrigger deploy after granting invoker permissions
- 70952f0 fix(deploy): disable linkedin-auth export (requires Secret Manager secret)
- 1b497c9 refactor(forums): migrate ForumSearch state management to useUniversalListing hook
- 65fbdbc refactor(admin): migrate UserManagement, AdminMembersTable, SalaryAdminTable to useUniversalListing

## Handoff Chain

- **Continues from**: [2026-03-23-160613-mega-session-4-salary-security.md](./2026-03-23-160613-mega-session-4-salary-security.md)
  - Previous title: Mega Session 4 — Salary Insights Built + Security Refactor Spec Ready
- **Supersedes**: None

## Current State Summary

This session accomplished two things: (1) built a floating feedback FAB button + GitHub issue templates, and (2) began the beta-to-main promotion plan. The feedback FAB is committed and pushed. The `cd.yml` workflow was simplified from 307 to 120 lines by removing the staging/production split (single Firebase backend), but **the user reverted the cd.yml change** — the file is back to its original 307-line version with `PROD_*` secret references. The promotion plan document exists at `docs/superpowers/plans/2026-03-22-beta-to-main-promotion.md` but needs updating to reflect the decision to use a single backend. Several Task 2 cleanup items (CNAME deletion, legacy HTML removal, untracked files) remain undone.

## Codebase Understanding

### Architecture Overview

SECiD is an Astro 5.x + React 18 + Firebase full-stack platform. `feature/hub` is 283 commits ahead of `main`. Main currently serves a static HTML site via GitHub Pages at `www.secid.mx`. Beta deploys to Firebase Hosting at `beta.secid.mx` via `deploy-beta.yml`. The goal is to promote beta to main, switching production from GitHub Pages to Firebase Hosting.

### Critical Files

| File                                                          | Purpose                        | Relevance                                                                                                                                         |
| ------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/cd.yml`                                    | Production deployment pipeline | Currently has staging/prod split with `PROD_*` secrets (user reverted simplification). Needs to be simplified to use single backend before merge. |
| `.github/workflows/deploy-beta.yml`                           | Beta deployment pipeline       | Works, uses `FIREBASE_SERVICE_ACCOUNT` + `STAGING_*` secrets                                                                                      |
| `CNAME`                                                       | GitHub Pages custom domain     | Contains `www.secid.mx`. MUST be deleted before merge to prevent Pages re-enabling                                                                |
| `src/components/feedback/FeedbackFAB.tsx`                     | Floating feedback button       | NEW — committed and pushed. Uses `client:only="react"` in ModernLayout                                                                            |
| `.github/ISSUE_TEMPLATE/*.yml`                                | GitHub issue templates         | NEW — bug report, feature request, general feedback                                                                                               |
| `src/layouts/ModernLayout.astro`                              | Main layout                    | Modified to include FeedbackFAB                                                                                                                   |
| `docs/superpowers/plans/2026-03-22-beta-to-main-promotion.md` | Promotion plan                 | Written but needs updating for single-backend decision                                                                                            |
| `.firebaserc`                                                 | Firebase project config        | Default is `secid-org` — single project for both beta and production                                                                              |

### Key Patterns Discovered

- Firebase project `secid-org` (ID: 706604039024) is the ONLY project — used for both beta and production
- Service account: `firebase-adminsdk-fbsvc@secid-org.iam.gserviceaccount.com`
- DNS is on Cloudflare (IPs: 172.67.170.40, 104.21.28.15) — instant propagation when proxied
- The `cd.yml` has a staging/production environment split that is unnecessary since there's only one Firebase project
- FeedbackFAB uses `client:only="react"` (not `client:load`) to avoid SSR issues
- Pre-commit hooks run ESLint + Prettier via lint-staged and can block commits

## Work Completed

### Tasks Finished

- [x] Feedback FAB component (`src/components/feedback/FeedbackFAB.tsx`) — minimal circle button, bottom-right, popover with 3 options linking to GitHub issue templates
- [x] GitHub issue templates (bug report, feature request, general feedback) + config.yml
- [x] Integration into ModernLayout.astro
- [x] Pushed to `origin/feature/hub`
- [x] Wrote beta-to-main promotion plan (7 tasks)
- [x] Verified GitHub Actions secrets — all `STAGING_*` are set, all `PROD_*` are missing
- [x] Verified DNS — Cloudflare, instant propagation possible
- [x] Drafted `cd.yml` simplification (307 → 120 lines) — **user reverted this change**
- [x] Task 1 of promotion plan verified done (TS errors already fixed in prior commits)

### Files Modified

| File                                          | Changes                                                          | Rationale                                      |
| --------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------- |
| `src/components/feedback/FeedbackFAB.tsx`     | Created — FAB + popover component                                | Floating feedback button feature               |
| `src/layouts/ModernLayout.astro`              | Added FeedbackFAB import + `<FeedbackFAB client:only="react" />` | Feedback button on all pages                   |
| `.github/ISSUE_TEMPLATE/bug_report.yml`       | Created — structured bug report form                             | Issue templates for feedback flow              |
| `.github/ISSUE_TEMPLATE/feature_request.yml`  | Created — feature request form                                   | Issue templates for feedback flow              |
| `.github/ISSUE_TEMPLATE/general_feedback.yml` | Created — general feedback form                                  | Issue templates for feedback flow              |
| `.github/ISSUE_TEMPLATE/config.yml`           | Created — template chooser config                                | Disables blank issues, adds email contact      |
| `.github/workflows/cd.yml`                    | Simplified from 307→120 lines then **reverted by user**          | Single backend doesn't need staging/prod split |

### Decisions Made

| Decision                              | Options Considered                                                         | Rationale                                                     |
| ------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Single Firebase backend for beta+prod | (a) Separate projects, (b) Same project                                    | User confirmed: same backend, beta just exposes more features |
| FAB style: minimal circle             | (a) Circle FAB, (b) Labeled pill, (c) Side tab                             | User chose (a) — clean, unobtrusive                           |
| FAB interaction: GitHub issue links   | (a) Menu → GitHub issues, (b) Inline form → Firestore                      | User chose (a) — zero backend, issues land in repo            |
| cd.yml simplification approach        | (a) Set PROD secrets = STAGING values, (b) Remove PROD references entirely | Chose (b) for entropy reduction — but user reverted           |

## Pending Work

## Immediate Next Steps

1. **Re-simplify `cd.yml`** — The user reverted the simplification. The file is back to 307 lines with `PROD_*` references. Need to re-apply the simplification (remove staging/prod split, use `STAGING_*` + `FIREBASE_SERVICE_ACCOUNT` directly). Discuss with user first why they reverted — they may want to keep the staging/prod split for future separation.
2. **Delete CNAME file** — `git rm CNAME` and commit. Critical to prevent GitHub Pages from re-enabling after merge.
3. **Clean working tree (Task 2)** — Delete `aboutus.html`, `index.html`, `job-submission.html`. Add `scripts/update-artemio-profile.mjs` to `.gitignore`. Commit untracked source files (LinkedIn modules, provider-id-map, etc.).
4. **DNS migration (Task 4)** — Add `secid.mx` as custom domain in Firebase Console. Update Cloudflare DNS to point to Firebase Hosting. Disable GitHub Pages only AFTER Firebase is confirmed live.
5. **Create PR and merge (Task 5)** — PR from `feature/hub` to `main` with merge commit (not squash, to preserve 283 commits).
6. **Tag release** — After merge deployment completes, `git tag -a v1.0.0`. Wait for merge deploy to finish before tagging (avoids parallel deployment race).

### Blockers/Open Questions

- [ ] **Why did user revert cd.yml?** Need to clarify if they want the staging/prod split back or if the revert was accidental (linter/other tool may have restored it)
- [ ] **DNS ownership** — Who controls the Cloudflare account for secid.mx? User needs admin access to update records
- [ ] **Firebase Console access** — Need to add custom domain in Firebase Hosting settings (manual step)
- [ ] **Pre-existing test failure** — `tests/unit/lib/cv/pdf-generator.test.ts` has 18 failing tests (jsPDF mock missing `setFillColor`). Not blocking but CI may fail on it.

### Deferred Items

- Renaming `STAGING_*` secrets to just `FIREBASE_*` — cleaner but requires re-setting all secrets in GitHub
- Slack webhook setup for deployment notifications (notify job in cd.yml)
- Post-launch: update `deploy-beta.yml` trigger from `feature/hub` to `develop`

## Context for Resuming Agent

## Important Context

1. **The user is working on other tasks in parallel** — there will be additional commits and file changes since this handoff. Always check `git status` and `git log` before starting work.
2. **cd.yml was reverted** — the simplified version I wrote (120 lines, no `PROD_*` refs) was overwritten. The file is back to the original 307-line version. Before re-simplifying, ask the user why it was reverted.
3. **Single Firebase backend** — critical decision: beta and production use the same Firebase project (`secid-org`). There is NO separate production project. All `PROD_*` secrets in `cd.yml` are unnecessary — the `STAGING_*` values are the real values.
4. **GitHub Pages is still active** — main currently deploys to GitHub Pages. The CNAME file (`www.secid.mx`) must be deleted before merging to prevent Pages from re-enabling.
5. **The promotion plan** at `docs/superpowers/plans/2026-03-22-beta-to-main-promotion.md` was written BEFORE the cd.yml simplification decision. It still references `PROD_*` secrets and separate Firebase projects. It needs updating.
6. **FeedbackFAB uses `client:only="react"`** not `client:load` — this was changed (by user or linter) after initial implementation to avoid SSR build errors.
7. **Firestore project details**: project `secid-org`, project number 706604039024, service account `firebase-adminsdk-fbsvc@secid-org.iam.gserviceaccount.com`. IAM role `iam.serviceAccountUser` is needed for Cloud Functions deploy.

### Assumptions Made

- Single Firebase backend is the permanent architecture (not a temporary shortcut)
- The user has admin access to the GitHub repo, Cloudflare DNS, and Firebase Console
- The `STAGING_*` prefix on secrets is a naming artifact — these are the production values
- The pre-existing pdf-generator test failures are known and acceptable for now

### Potential Gotchas

- Pre-commit hooks will block commits if there are lint/format errors in staged files — run `npx prettier --write <file>` if needed
- The merge from `main` into `feature/hub` created a merge commit (55495c4) that included the feedback files — don't re-commit them
- `git status` shows `.claude/worktrees/` as untracked — this is normal, it's used by Claude Code
- The `cd.yml` workflow triggers on both `push: branches: [main]` AND `push: tags: [v*.*.*]` — pushing a tag immediately after merge will cause two parallel deployments (different concurrency groups). Wait for the merge deploy to finish first.
- `actions/create-release@v1` is deprecated — may need updating to `softprops/action-gh-release@v2` or similar

## Environment State

### Tools/Services Used

- GitHub repo: SECiD-UNAM/secid-website
- Firebase project: secid-org
- DNS: Cloudflare
- CI/CD: GitHub Actions (6 workflows: ci, cd, deploy-beta, e2e-tests, lighthouse, security)

### Active Processes

- None left running from this session

### Environment Variables

- `FIREBASE_SERVICE_ACCOUNT` — GCP service account JSON (set in GitHub Actions)
- `STAGING_FIREBASE_*` (7 secrets) — Firebase web config (all set)
- `STAGING_STRIPE_PUBLISHABLE_KEY` — Stripe key (set)
- `PROD_*` — NOT set, NOT needed if cd.yml is simplified

## Related Resources

- Promotion plan: `docs/superpowers/plans/2026-03-22-beta-to-main-promotion.md`
- Deployment guide: `docs/DEPLOYMENT.md`
- Deployment memory: `.claude/projects/-Users-artemiopadilla-Documents-repos-GitHub-secid-secid-website/memory/reference_deployment.md`
- LinkedIn integration spec: `docs/superpowers/specs/2026-03-22-linkedin-integration-design.md`
- FeedbackFAB component: `src/components/feedback/FeedbackFAB.tsx`
- Issue templates: `.github/ISSUE_TEMPLATE/`

---

**Security Reminder**: Before finalizing, run `validate_handoff.py` to check for accidental secret exposure.
