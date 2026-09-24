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

## Production cutover

GitHub Pages has no rewrites and no custom headers. On Pages, the 44
dynamic-route rewrites in `firebase.json` (member, event, blog, company,
forum and dashboard detail pages) return 404, `/api/forms/contact` and
`/api/forms/newsletter` (Cloud Function rewrites) return 404, and none of
the security headers are sent. Production must be a second Firebase
Hosting site in `secid-org`.

Do these in order. Steps 1–4 do not affect the live site.

1. **Create the prod Hosting site** (owner):
   `firebase hosting:sites:create <site-id> --project secid-org`
2. **Set repo variable** `FIREBASE_PROD_HOSTING_SITE=<site-id>`
   (Settings → Secrets and variables → Actions → Variables).
3. **`cd.yml` deploys to that site** (done): it sets
   `hosting.site` from the variable with `jq` and runs
   `firebase deploy --only hosting`, so both environments keep one
   `firebase.json`. The job fails fast if the variable is unset.
4. **Authorized domains**: Firebase Console → Authentication → Settings →
   Authorized domains must include `secid.mx` (and `www.secid.mx` if used),
   or sign-in fails on prod.
5. **Merge PR #1** to `main`. `cd.yml` builds and deploys to the new site
   (reachable at `https://<site-id>.web.app`; check dynamic routes and
   `/api/forms/*` there before touching DNS).
6. **Hand the backend to `main`**: set repo variable
   `BACKEND_DEPLOYED_FROM_MAIN=true` so `deploy-beta.yml` stops deploying
   functions/rules. From then on backend changes ship only via `main`.
7. **Connect the domain**: Firebase Console → Hosting → `<site-id>` → Add
   custom domain `secid.mx`, then update DNS in Cloudflare with the records
   Firebase shows (DNS-only / grey cloud until the certificate is issued).
   This is the moment the live site changes.
8. **Retire GitHub Pages**: remove the `secid.mx` custom domain and disable
   Pages (Settings → Pages), so Pages no longer claims the domain.

## Prerequisites

### GitHub Secrets Required

| Secret                                 | Description                                                              |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `FIREBASE_SERVICE_ACCOUNT`             | JSON key for `firebase-adminsdk-fbsvc@secid-org.iam.gserviceaccount.com` |
| `STAGING_FIREBASE_API_KEY`             | Firebase web API key                                                     |
| `STAGING_FIREBASE_AUTH_DOMAIN`         | Firebase Auth domain                                                     |
| `STAGING_FIREBASE_PROJECT_ID`          | `secid-org`                                                              |
| `STAGING_FIREBASE_STORAGE_BUCKET`      | Firebase Storage bucket                                                  |
| `STAGING_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID                                                            |
| `STAGING_FIREBASE_APP_ID`              | Firebase app ID                                                          |
| `STAGING_FIREBASE_MEASUREMENT_ID`      | Google Analytics measurement ID                                          |
| `STAGING_STRIPE_PUBLISHABLE_KEY`       | Stripe public key                                                        |

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
