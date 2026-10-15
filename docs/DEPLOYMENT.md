# Deployment Guide

## Environments

| Environment | Branch        | URL                   | Host                                     | Workflow          |
| ----------- | ------------- | --------------------- | ---------------------------------------- | ----------------- |
| Beta        | `feature/hub` | https://beta.secid.mx | Firebase Hosting, default site           | `deploy-beta.yml` |
| Production  | `main`        | https://secid.mx      | GitHub Pages today → Firebase Hosting ⚠️ | `cd.yml`          |

⚠️ As of 2026-09, `secid.mx` still serves the legacy pre-Astro site from
`main` via GitHub Pages. The Astro app is only live on beta. See
[Production cutover](#production-cutover) — GitHub Pages cannot serve this
app, so promotion requires moving production to Firebase Hosting.

Both environments use ONE Firebase project (`secid-org`): same Auth users,
same Firestore data, same Cloud Functions. Only the static frontend differs.

## What Gets Deployed

- **Hosting** — static site from `dist/client/`, per environment.
- **Backend** — Cloud Functions (`functions/src/`), Firestore rules and
  indexes, Storage rules. Shared by both environments, so exactly ONE
  branch may deploy it (see cutover step 5). Whoever deploys it also writes
  `APP_URL` into `functions/.env`, which ends up in user-facing email links.

## Shared-backend rules

The repo variable `BACKEND_DEPLOYED_FROM_MAIN` picks the one branch that
deploys the backend: unset → `feature/hub` (`deploy-beta.yml`), `true` →
`main` (`cd.yml`). The other branch's backend job is skipped, not failed.
Both backend jobs share the concurrency group `firebase-backend`, so they
never run at the same time.

Once `main` owns the backend:

1. **Backend changes go to `main` first**, in a small PR, then `main` is
   merged into `feature/hub`. Beta cannot test a function or rule that
   only exists on `feature/hub`.
2. **Backend changes are additive**: new optional fields, new callables,
   rules that allow more. Remove or restrict only when no deployed
   frontend uses it. `tests/rules/` runs in CI ("Firestore Rules Tests")
   on every PR, so a rule change that breaks an existing path fails there.
3. **Deploys never delete functions by accident.** Both backend jobs run
   `scripts/ci/check-function-deletions.mjs` before `firebase deploy
--force`; it fails if the branch stopped exporting a deployed function.
   For an intended removal set `ALLOW_FUNCTION_DELETIONS=name1,name2` on
   that run.
4. **Deploy order is rules → storage → functions**, so a functions failure
   (billing, quota) never leaves security rules unshipped.
5. **QA accounts use a plus-tag** (`name+qa@`, `name+secidtest…@`,
   `name+test…@`). `functions/src/email-service.ts` queues no mail for
   them, so testing on beta does not email real-looking welcome / job-match
   / status messages. Beta still writes real data: destructive tests belong
   in the emulators (`npm run dev`).
6. **Post-deploy smoke test** (`scripts/ci/smoke-test.sh`) runs against the
   site's `.web.app` URL and the shared functions after every prod deploy;
   it is a hard failure. Run it by hand against any environment:
   `scripts/ci/smoke-test.sh https://beta.secid.mx https://us-central1-secid-org.cloudfunctions.net`.

## Production cutover

GitHub Pages has no rewrites and no custom headers. On Pages, the 44
dynamic-route rewrites in `firebase.json` (member, event, blog, company,
forum and dashboard detail pages) return 404, `/api/forms/contact` and
`/api/forms/newsletter` (Cloud Function rewrites) return 404, and none of
the security headers are sent. Production must be a second Firebase
Hosting site in `secid-org`.

Tracked step by step in [`LAUNCH-CHECKLIST.md`](./LAUNCH-CHECKLIST.md).
Steps 1, 2, 4, 6 and the domain request in 7 are done by the
**`Production Cutover` workflow** (`.github/workflows/cutover.yml`,
`workflow_dispatch`) with the deploy service account; each prints a manual
fallback in the job summary if the account lacks a permission.

Do these in order. Steps 1–4 do not affect the live site.

1. **Create the prod Hosting site**: run `Production Cutover` with
   `site_id` (default `secid-mx`), or by hand
   `firebase hosting:sites:create <site-id> --project secid-org`.
2. **Set repo variable** `FIREBASE_PROD_HOSTING_SITE=<site-id>` (the
   workflow does it; fallback `gh variable set FIREBASE_PROD_HOSTING_SITE
--body <site-id>`).
3. **`cd.yml` deploys to that site** (done): it sets
   `hosting.site` from the variable with `jq` and runs
   `firebase deploy --only hosting`, so both environments keep one
   `firebase.json`. The job fails fast if the variable is unset.
4. **Authorized domains**: `<site-id>.web.app`, `secid.mx` and
   `www.secid.mx` must be in Firebase Console → Authentication → Settings →
   Authorized domains, or sign-in fails on prod. The workflow adds them via
   the Identity Toolkit API.
5. **Hand the backend to `main` BEFORE merging**: run the workflow with
   `backend_from_main=true` (or `gh variable set BACKEND_DEPLOYED_FROM_MAIN
--body true`). From then on `deploy-beta.yml` skips functions/rules and
   `cd.yml` deploys them; there is never a window with two deployers.
6. **Merge PR #1** to `main`. `cd.yml` builds, deploys to the new site and
   runs `scripts/ci/smoke-test.sh` against `https://<site-id>.web.app`
   (locale pages, a dynamic rewrite, security headers, `/api/forms/*`, a
   callable). Check login + signup there by hand before touching DNS.
7. **Connect the domain**: the workflow requests `secid.mx` and
   `www.secid.mx` on the site and prints the DNS records in its summary
   (console fallback: Hosting → `<site-id>` → Add custom domain). Put
   them in Cloudflare as DNS-only / grey cloud until the certificate is
   issued. **This is the moment the live site changes.** Keep the old
   GitHub Pages records noted for rollback.
8. **Retire GitHub Pages**: remove the `secid.mx` custom domain and disable
   Pages (Settings → Pages), so Pages no longer claims the domain. Then
   make the `secid.mx` check in `cd.yml`'s `validate` job a hard failure.

## Prerequisites

### GitHub Secrets Required

One project serves both environments, so one set of secrets does too. They
were created as `STAGING_*` when beta was the only environment; the
workflows read the un-prefixed name first and fall back to `STAGING_*`
(`${{ secrets.FIREBASE_API_KEY || secrets.STAGING_FIREBASE_API_KEY }}`),
so they can be renamed at any time without an outage: set the new name,
confirm a green deploy, delete the old one.

| Secret (preferred)                   | Legacy name                            | Description                                                              |
| ------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------ |
| `FIREBASE_SERVICE_ACCOUNT`           | —                                      | JSON key for `firebase-adminsdk-fbsvc@secid-org.iam.gserviceaccount.com` |
| `FIREBASE_API_KEY`                   | `STAGING_FIREBASE_API_KEY`             | Firebase web API key                                                     |
| `FIREBASE_AUTH_DOMAIN`               | `STAGING_FIREBASE_AUTH_DOMAIN`         | Firebase Auth domain                                                     |
| `FIREBASE_PROJECT_ID`                | `STAGING_FIREBASE_PROJECT_ID`          | `secid-org`                                                              |
| `FIREBASE_STORAGE_BUCKET`            | `STAGING_FIREBASE_STORAGE_BUCKET`      | Firebase Storage bucket                                                  |
| `FIREBASE_MESSAGING_SENDER_ID`       | `STAGING_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID                                                            |
| `FIREBASE_APP_ID`                    | `STAGING_FIREBASE_APP_ID`              | Firebase app ID                                                          |
| `FIREBASE_MEASUREMENT_ID`            | `STAGING_FIREBASE_MEASUREMENT_ID`      | Google Analytics measurement ID                                          |
| `FIREBASE_VAPID_KEY`                 | `STAGING_FIREBASE_VAPID_KEY`           | Web push VAPID key                                                       |
| `RECAPTCHA_SITE_KEY` / `_SECRET_KEY` | `STAGING_RECAPTCHA_*`                  | reCAPTCHA v3                                                             |
| `STRIPE_PUBLISHABLE_KEY`             | `STAGING_STRIPE_PUBLISHABLE_KEY`       | Stripe public key (payments are beta-gated)                              |

### IAM Roles for Service Account

The `firebase-adminsdk-fbsvc@secid-org.iam.gserviceaccount.com` service account needs these roles in Google Cloud IAM:

| Role                             | Purpose                                                 |
| -------------------------------- | ------------------------------------------------------- |
| `roles/cloudfunctions.admin`     | Deploy Cloud Functions                                  |
| `roles/cloudfunctions.developer` | Build and update functions                              |
| `roles/iam.serviceAccountUser`   | **Required** to deploy functions that run as another SA |
| `roles/run.admin`                | Deploy Cloud Run-based functions (v2)                   |
| `roles/firebaserules.admin`      | Deploy Firestore and Storage rules                      |
| `roles/firebasehosting.admin`    | Deploy to Firebase Hosting                              |
| `roles/artifactregistry.writer`  | Push function container images                          |

To grant a missing role:

```bash
gcloud projects add-iam-policy-binding secid-org \
  --member="serviceAccount:firebase-adminsdk-fbsvc@secid-org.iam.gserviceaccount.com" \
  --role="roles/ROLE_NAME"
```

To verify current roles:

```bash
gcloud projects get-iam-policy secid-org \
  --flatten="bindings[].members" \
  --filter="bindings.members:firebase-adminsdk-fbsvc" \
  --format="table(bindings.role)"
```

### Google Cloud APIs Required

These APIs must be enabled on the `secid-org` project:

- Cloud Functions API (`cloudfunctions.googleapis.com`)
- Cloud Build API (`cloudbuild.googleapis.com`)
- Artifact Registry API (`artifactregistry.googleapis.com`)
- Cloud Run API (`run.googleapis.com`)
- Firebase Hosting API
- Firestore API

To enable a missing API:

```bash
gcloud services enable cloudfunctions.googleapis.com --project=secid-org
```

## Firebase Project Info

| Property       | Value                                                       |
| -------------- | ----------------------------------------------------------- |
| Project ID     | `secid-org`                                                 |
| Project Number | `706604039024`                                              |
| Default SA     | `secid-org@appspot.gserviceaccount.com`                     |
| Admin SDK SA   | `firebase-adminsdk-fbsvc@secid-org.iam.gserviceaccount.com` |
| Compute SA     | `706604039024-compute@developer.gserviceaccount.com`        |

## Local Development

```bash
# Start dev server + emulators
npm run dev

# Build for production
npm run build

# Deploy manually (requires firebase login)
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
```

## Common Deploy Issues

### Cloud Functions: "Missing permissions iam.serviceAccounts.ActAs"

The service account needs `roles/iam.serviceAccountUser`. Fix:

```bash
gcloud projects add-iam-policy-binding secid-org \
  --member="serviceAccount:firebase-adminsdk-fbsvc@secid-org.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

### Every Cloud Function returns 503; sign-up fails with `auth/error-code:-47`

The project fell off the Blaze plan (in 2026-06 the GCP free trial
expired). Gen2 functions stop serving, including the `beforeUserCreated`
blocking function, so account creation fails for every provider. Deploys
fail with `Extensions require the Blaze plan`. Fix: Cloud Console →
Billing → **Activate full account**. Tell-tale: an existing function
returns 503 while a nonexistent function name returns 404.

### Functions deploy: `lacks IAM permission "cloudscheduler.jobs.update"`

`aggregateSurveyResponses` is a scheduled function; the deploy SA needs
`roles/cloudscheduler.admin` (granted 2026-08-20). Use the grant command
above with that role.

### Functions deploy: `Quota exceeded for total allowable CPU per project per region`

The Cloud Run CPU quota in `us-central1` is 20 vCPU. Deploying many
functions at once starts one health-check instance each; above the quota,
revisions fail and Cloud Run then rejects requests to every revision for
~30 minutes (HTTP 503/429, log: "exceeded its quota limit ... recently").
`functions/src/init.ts` sets `cpu: 'gcf_gen1'` (0.167 vCPU per instance) to
keep a full deploy near 3.5 vCPU. Check that setting first; raising CPU per
function needs a quota increase.

### Build fails: "Cannot find module X"

A file is imported but not committed to git. Check:

```bash
git status --porcelain | grep "^??" | grep -E "\.(ts|tsx)$"
```

Then `git add` the missing file.

### Build fails: "FeedbackFAB is not defined"

The `FeedbackFAB` component uses `lucide-react` which breaks the Astro static build. It's currently disabled in `ModernLayout.astro`. To re-enable, replace `lucide-react` icons with `@heroicons/react`.

### Firestore writes silently fail

Firestore rules use `hasOnly()` field allowlists. If you add a new field to a document, you must also add it to the rules allowlist or the write is silently rejected.

### API routes return 404

Astro is configured with `output: 'static'`. Server-side API routes (`prerender = false`) don't work on Firebase Hosting. Use direct Firestore writes or callable Cloud Functions instead.

### lighthouserc ESM error

The file must be `lighthouserc.cjs` (not `.js`) because `package.json` has `"type": "module"`.

## Monitoring Deploys

```bash
# Check latest deploy status
gh run list --branch feature/hub --workflow "Deploy Beta" --limit 1

# View deploy logs
gh run view <RUN_ID> --log

# Check all workflows
gh run list --branch feature/hub --limit 5
```
