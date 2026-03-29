# Deployment Guide

## Environments

| Environment | Branch        | URL                   | Workflow          |
| ----------- | ------------- | --------------------- | ----------------- |
| Beta        | `feature/hub` | https://beta.secid.mx | `deploy-beta.yml` |
| Production  | `main`        | https://secid.org     | `cd.yml`          |

## What Gets Deployed

Each deploy pushes:

1. **Firebase Hosting** — static site from `dist/client/`
2. **Cloud Functions** — from `functions/src/`
3. **Firestore Rules & Indexes** — from `firestore.rules` and `firestore.indexes.json`
4. **Storage Rules** — from `storage.rules`

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
