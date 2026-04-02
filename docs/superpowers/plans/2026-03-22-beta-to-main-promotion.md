# Beta → Main Promotion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the `feature/hub` branch (beta.secid.mx) to `main`, switching production from GitHub Pages to Firebase Hosting at secid.mx.

**Architecture:** This is a full platform migration — static HTML site → Astro 5.x + React 18 + Firebase + Stripe. The `cd.yml` workflow already handles Firebase Hosting deployment on push to `main`. The key work is: fix CI blockers, verify secrets/infrastructure, migrate DNS, merge, and validate.

**Tech Stack:** Astro 5.x, React 18, Firebase (Auth, Firestore, Storage, Functions), Stripe, GitHub Actions, Firebase Hosting

---

## Pre-Merge: Infrastructure Verification

### Task 1: Fix CI Blockers (TypeScript Errors)

The pre-commit hook and CI run `tsc --noEmit`. There are currently 2 TypeScript errors blocking commits:

**Files:**

- Fix: `src/lib/linkedin-parser/certifications-parser.ts:48,59`
- Fix: `src/components/profile/tabs/CareerTab.tsx:11` (missing module)

- [ ] **Step 1: Check the current TypeScript errors**

```bash
npx tsc --noEmit 2>&1
```

- [ ] **Step 2: Fix `certifications-parser.ts` — Object possibly undefined**

Add null checks or non-null assertions at lines 48 and 59.

- [ ] **Step 3: Fix `CareerTab.tsx` — Missing module `@/lib/linkedin-parser`**

Either create the barrel export at `src/lib/linkedin-parser/index.ts` or fix the import path.

- [ ] **Step 4: Verify TypeScript compiles clean**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 5: Run full test suite**

```bash
npm run test:unit
```

Expected: All tests pass

- [ ] **Step 6: Commit fixes**

```bash
git add src/lib/linkedin-parser/ src/components/profile/tabs/CareerTab.tsx
git commit -m "fix: resolve TypeScript errors in linkedin-parser and CareerTab"
```

---

### Task 2: Resolve Uncommitted & Untracked Files

There are modified and untracked files that should be committed or discarded before merging.

**Files to review:**

- Modified: `CHANGELOG.md`, `functions/lib/index.js`, `functions/lib/index.js.map`
- Modified: `docs/superpowers/plans/2026-03-22-linkedin-integration.md`
- Modified: `docs/superpowers/specs/2026-03-22-linkedin-integration-design.md`
- Untracked: `src/lib/auth/provider-id-map.ts`, `src/lib/linkedin-parser/*.ts`
- Untracked: `tests/unit/lib/auth/provider-id-map.test.ts`, `tests/unit/lib/linkedin-parser/`
- Untracked: `scripts/update-artemio-profile.mjs` — personal utility, add to `.gitignore`
- Stale: `aboutus.html`, `index.html`, `job-submission.html` (legacy files from merge conflict)

- [ ] **Step 1: Review and stage meaningful changes**

```bash
git status
git diff CHANGELOG.md  # review
git diff functions/lib/index.js  # review — is this a build artifact?
```

- [ ] **Step 2: Delete legacy HTML files left from merge conflict**

```bash
rm -f aboutus.html index.html job-submission.html
```

- [ ] **Step 3: Add personal scripts to .gitignore**

```bash
echo "scripts/update-artemio-profile.mjs" >> .gitignore
```

- [ ] **Step 4: Delete the CNAME file**

The `CNAME` file contains `www.secid.mx` for GitHub Pages. If left in the repo, GitHub may re-enable Pages on push. Remove it before merging:

```bash
git rm CNAME
git commit -m "chore: remove CNAME — migrating from GitHub Pages to Firebase Hosting"
```

- [ ] **Step 5: Stage and commit untracked source files**

```bash
git add src/lib/linkedin-parser/ src/lib/auth/provider-id-map.ts
git add tests/unit/lib/linkedin-parser/ tests/unit/lib/auth/provider-id-map.test.ts
git add CHANGELOG.md .gitignore
git commit -m "feat: add linkedin parser modules and provider-id-map"
```

- [ ] **Step 6: Commit remaining docs and build artifacts**

```bash
git add docs/superpowers/ functions/lib/
git commit -m "docs: update linkedin integration specs and function build"
```

- [ ] **Step 7: Verify clean working tree**

```bash
git status
```

Expected: `nothing to commit, working tree clean` (except `.claude/worktrees/` which is gitignored)

---

### Task 3: Verify GitHub Actions Secrets & Firebase Config

The `cd.yml` workflow requires production Firebase secrets. These must be set before merging.

- [ ] **Step 1: List required secrets**

The following secrets must exist in GitHub repo settings → Secrets → Actions:

| Secret                                | Used by                     | Purpose                                  |
| ------------------------------------- | --------------------------- | ---------------------------------------- |
| `FIREBASE_SERVICE_ACCOUNT`            | `deploy-beta.yml`           | GCP service account for beta deployments |
| `FIREBASE_SERVICE_ACCOUNT_STAGING`    | `cd.yml` (staging path)     | GCP service account for staging          |
| `FIREBASE_SERVICE_ACCOUNT_PRODUCTION` | `cd.yml` (production path)  | GCP service account for prod             |
| `PROD_FIREBASE_API_KEY`               | `cd.yml`                    | Firebase Web API key (production)        |
| `PROD_FIREBASE_AUTH_DOMAIN`           | `cd.yml`                    | e.g. `secid-prod.firebaseapp.com`        |
| `PROD_FIREBASE_PROJECT_ID`            | `cd.yml`                    | e.g. `secid-prod`                        |
| `PROD_FIREBASE_STORAGE_BUCKET`        | `cd.yml`                    | e.g. `secid-prod.appspot.com`            |
| `PROD_FIREBASE_MESSAGING_SENDER_ID`   | `cd.yml`                    | FCM sender ID                            |
| `PROD_FIREBASE_APP_ID`                | `cd.yml`                    | Firebase app ID                          |
| `PROD_FIREBASE_MEASUREMENT_ID`        | `cd.yml`                    | GA measurement ID                        |
| `PROD_STRIPE_PUBLISHABLE_KEY`         | `cd.yml`                    | Stripe live publishable key              |
| `STAGING_FIREBASE_*` (all variants)   | `cd.yml` (staging fallback) | Used when environment != production      |

**Note:** `SITE_URL` is NOT set as a secret — `astro.config.mjs` falls back to `https://secid.mx` when unset, which is correct for production. Do not add `SITE_URL` as a repo-level variable.

- [ ] **Step 2: Verify secrets exist**

```bash
gh secret list
```

Check that all secrets from the table above appear in the list. Pay special attention to:

- `FIREBASE_SERVICE_ACCOUNT` (no suffix — used by beta, different from staging)
- `FIREBASE_SERVICE_ACCOUNT_PRODUCTION` (used by cd.yml production path)

- [ ] **Step 3: If any are missing — set them**

```bash
gh secret set PROD_FIREBASE_API_KEY
# (paste the value when prompted)
```

Repeat for each missing secret. Get values from Firebase Console → Project Settings → Your apps → Web app config.

- [ ] **Step 4: Verify production Firebase project has required APIs enabled**

In Google Cloud Console for the production project, ensure these APIs are enabled:

- Cloud Functions API
- Cloud Build API
- Firebase Hosting API
- Firestore API
- Cloud Storage API
- Identity Toolkit API (for Firebase Auth)

- [ ] **Step 5: Update `.firebaserc` to include production project**

Verify the actual production project ID from Firebase Console, then update:

```json
{
  "projects": {
    "default": "<PROD_PROJECT_ID>",
    "staging": "secid-org"
  }
}
```

```bash
git add .firebaserc
git commit -m "chore: set production Firebase project as default in .firebaserc"
```

This prevents local `firebase deploy` from accidentally hitting staging.

---

### Task 4: DNS Migration (Zero-Downtime)

Currently `main` deploys to GitHub Pages at `www.secid.mx`. After merging, `cd.yml` will deploy to Firebase Hosting at `secid.mx`. This task ensures zero downtime during the cutover.

**Important:** Do NOT disable GitHub Pages until Firebase Hosting is confirmed live. The correct order is: prepare Firebase → update DNS → verify → disable Pages.

- [ ] **Step 1: Lower DNS TTL (24-48 hours before cutover)**

In your DNS provider, reduce TTL on all `secid.mx` and `www.secid.mx` records to 60 seconds. This ensures DNS changes propagate quickly when you switch.

- [ ] **Step 2: Add custom domain in Firebase Hosting**

In Firebase Console → Hosting → Add custom domain:

1. Add `secid.mx`
2. Add `www.secid.mx`
3. Firebase will provide TXT records for domain verification — add them to your DNS
4. Firebase will also provide A records to point to — note these for the next step

You can also use the CLI:

```bash
npx firebase-tools hosting:site:list --project <PROD_PROJECT_ID>
```

- [ ] **Step 3: Deploy to Firebase Hosting (first production deploy)**

Trigger a manual deployment to ensure content is live on Firebase before switching DNS:

```bash
npx firebase deploy --only hosting --project <PROD_PROJECT_ID>
```

Verify the default Firebase URL works (e.g. `https://<project-id>.web.app`).

- [ ] **Step 4: Update DNS records**

Update records at your DNS provider:

- `secid.mx` → A records pointing to Firebase Hosting IPs (provided in Step 2)
- `www.secid.mx` → CNAME pointing to `<project-id>.web.app` (or A records)

- [ ] **Step 5: Wait for DNS propagation and verify**

```bash
# Check DNS resolution
dig secid.mx A
dig www.secid.mx CNAME

# Verify site loads from Firebase
curl -s -o /dev/null -w "%{http_code}" https://secid.mx/
```

Expected: `200` from Firebase Hosting

- [ ] **Step 6: Disable GitHub Pages (only after Firebase is live)**

Once confirmed that Firebase Hosting is serving `secid.mx` correctly:

GitHub repo → Settings → Pages → Source → set to "None" (disable).

Or via API:

```bash
gh api repos/SECiD-UNAM/secid-website/pages -X DELETE
```

---

## Merge Execution

### Task 5: Create PR and Merge

- [ ] **Step 1: Ensure feature/hub is up to date with remote**

```bash
git push origin feature/hub
```

- [ ] **Step 2: Create the pull request**

```bash
gh pr create \
  --base main \
  --head feature/hub \
  --title "feat: launch SECiD platform v1.0 — Astro/React/Firebase" \
  --body "$(cat <<'EOF'
## Summary

Complete platform rewrite from static HTML site to full-stack application:

- **Frontend**: Astro 5.x + React 18 + Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage, Cloud Functions)
- **Payments**: Stripe subscriptions with MX tax support
- **Features**: Dashboard, job board, events, forums, mentorship, CV generator, company directory, salary insights
- **Auth**: Google, GitHub, LinkedIn OAuth
- **i18n**: Spanish + English
- **Testing**: 130+ test files (Vitest + Playwright)
- **CI/CD**: GitHub Actions → Firebase Hosting

## Pre-merge checklist

- [ ] All PROD_FIREBASE_* secrets configured
- [ ] FIREBASE_SERVICE_ACCOUNT (beta) and FIREBASE_SERVICE_ACCOUNT_PRODUCTION secrets both set
- [ ] Production Firebase project APIs enabled
- [ ] .firebaserc updated with production project as default
- [ ] CNAME file removed
- [ ] DNS records point to Firebase Hosting
- [ ] Firebase Hosting serving secid.mx correctly
- [ ] GitHub Pages disabled
- [ ] TypeScript compiles clean
- [ ] Unit tests pass
- [ ] Manual smoke test on beta.secid.mx

## Test plan

- [ ] Verify CI passes on the PR
- [ ] After merge, monitor cd.yml deployment
- [ ] Validate secid.mx loads correctly
- [ ] Test auth flow (Google/GitHub login)
- [ ] Test dashboard navigation
- [ ] Test payment flow with Stripe test keys initially

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Wait for CI checks to pass**

```bash
gh pr checks --watch
```

- [ ] **Step 4: Merge the PR**

```bash
gh pr merge --merge
```

Use `--merge` (not squash) to preserve the commit history.

---

## Post-Merge: Validation

### Task 6: Monitor Deployment & Validate

- [ ] **Step 1: Watch the CD workflow**

```bash
gh run list --workflow=cd.yml --limit=1
gh run watch  # watch the latest run
```

Expected: All jobs pass — pre-deployment → test → build → deploy-production → post-deployment

- [ ] **Step 2: If deployment fails — check logs**

```bash
gh run view <run-id> --log-failed
```

Common issues:

- Missing secrets → set them (Task 3)
- Cloud Functions build fail → check `functions/` TypeScript
- Firestore rules invalid → run `firebase-tools firestore:rules:validate`

- [ ] **Step 3: Validate production site**

```bash
curl -s -o /dev/null -w "%{http_code}" https://secid.mx/
```

Expected: `200`

- [ ] **Step 4: Smoke test critical paths**

Open `https://secid.mx/` in browser and verify:

1. Homepage loads with modern layout
2. Login page works (Google/GitHub OAuth)
3. Dashboard renders after login
4. Job board loads with listings
5. Mobile navigation works
6. Feedback FAB appears (bottom-right corner)
7. Dark mode toggle works

- [ ] **Step 5: Tag the release (wait for merge deployment to complete first)**

**Important:** The tag push will trigger a second `cd.yml` run. Wait until the merge-triggered deployment finishes completely before pushing the tag, to avoid two parallel production deployments racing.

```bash
# Confirm the merge deployment is done
gh run list --workflow=cd.yml --limit=1  # status should be "completed"

# Then tag
git checkout main
git pull
git tag -a v1.0.0 -m "v1.0.0: SECiD Platform Launch — Astro/React/Firebase"
git push origin v1.0.0
```

This triggers `cd.yml` again and creates a GitHub Release.

---

### Task 7: Post-Launch Cleanup

- [ ] **Step 1: Update deploy-beta.yml trigger (optional)**

If `feature/hub` is no longer the beta branch, update or remove the workflow trigger:

```yaml
on:
  push:
    branches: [develop] # or whatever the new dev branch is
```

- [ ] **Step 2: Delete the feature/hub branch (optional)**

```bash
gh pr view --json headRefName,state  # confirm merged
git push origin --delete feature/hub
git branch -d feature/hub
```

- [ ] **Step 3: Update memory and docs**

Update deployment reference to reflect new state:

- `main` → `secid.mx` (Firebase Hosting)
- `develop` or feature branches → `beta.secid.mx`

- [ ] **Step 4: Restore DNS TTL**

Set DNS TTL back to normal (e.g. 3600s) now that the migration is stable.

---

## Risk Mitigation

| Risk                                       | Mitigation                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| DNS propagation delay                      | Lower TTL to 60s 24-48h before cutover; keep GitHub Pages active until Firebase is confirmed live |
| Missing prod secrets                       | Verify with `gh secret list` before merging (Task 3)                                              |
| Cloud Functions deploy fails               | Functions are non-blocking in cd.yml (uses `\|\| echo "::warning::"`)                             |
| Tests fail on main                         | Fix in Task 1 before merging; CI runs before deploy                                               |
| Stripe live keys not ready                 | Use test keys initially, swap to live when ready                                                  |
| CNAME re-enables GitHub Pages              | Delete CNAME file before merging (Task 2, Step 4)                                                 |
| Tag triggers parallel deploy               | Wait for merge deployment to complete before tagging (Task 6, Step 5)                             |
| Local `firebase deploy` hits wrong project | Update `.firebaserc` default to production before merging (Task 3, Step 5)                        |
| Rollback needed                            | `git revert --no-commit HEAD` on main, push to trigger redeploy                                   |

## Execution Order

```
Task 1 (fix TS errors) ──→ Task 2 (clean tree + rm CNAME) ──→ Task 3 (secrets + .firebaserc)
                                                                         ↓
                                                               Task 4 (DNS migration)
                                                                         ↓
Task 7 (cleanup) ←── Task 6 (validate + tag) ←── Task 5 (create PR + merge)
```

**Timeline:**

- **Now:** Tasks 1-2 (fix code, clean tree)
- **24-48h before launch:** Task 4, Step 1 (lower DNS TTL)
- **Launch day:** Tasks 3-6 (verify infra → setup Firebase domain → merge → validate)
- **Day after:** Task 7 (cleanup)
