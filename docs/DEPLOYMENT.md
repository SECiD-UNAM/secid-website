# Deployment Guide

## Environments

| Environment | Branch        | URL                                    | Host                                                   | Workflow          |
| ----------- | ------------- | -------------------------------------- | ------------------------------------------------------ | ----------------- |
| Production  | `main`        | https://secid.mx, https://www.secid.mx | Firebase Hosting, site `secid-mx` (`secid-mx.web.app`) | `cd.yml`          |
| Beta        | `feature/hub` | https://beta.secid.mx                  | Firebase Hosting, project default site                 | `deploy-beta.yml` |

Production has been on Firebase Hosting since **2026-10-18** (DNS cutover,
[`LAUNCH-CHECKLIST.md`](./LAUNCH-CHECKLIST.md) Fase 4). GitHub Pages no
longer serves the domain; disabling it in the repo settings and removing
`public/CNAME` are the remaining cleanup items (Fase 5 of the checklist,
runbook [prod-cutover §5](./runbooks/prod-cutover.md)). DNS for `secid.mx`
lives in Cloudflare and is changed only by the project owner.

Both environments use ONE Firebase project (`secid-org`): same Auth users,
same Firestore data, same Cloud Functions. Only the static frontend differs.

## Deploy flows

| Workflow                                  | Trigger                                    | Hosting                                                          | Backend (rules → storage → functions)            | Afterwards                                                                                       |
| ----------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `cd.yml` (Deploy to Production)           | push to `main`, `workflow_dispatch`        | `firebase deploy --only hosting` to `FIREBASE_PROD_HOSTING_SITE` | yes, when `BACKEND_DEPLOYED_FROM_MAIN == 'true'` | `validate` job: smoke test against `<site>.web.app`, then against `https://secid.mx` (both hard) |
| `deploy-beta.yml` (Deploy Beta)           | push to `feature/hub`, `workflow_dispatch` | `action-hosting-deploy` to the default site, channel `live`      | only when `BACKEND_DEPLOYED_FROM_MAIN != 'true'` | none (run `scripts/ci/smoke-test.sh` by hand, see below)                                         |
| `cutover.yml` (Production Cutover)        | `workflow_dispatch`                        | creates the prod site, requests domains                          | —                                                | one-off; runbook [prod-cutover](./runbooks/prod-cutover.md)                                      |
| `firestore-backup.yml` (Firestore Backup) | weekly + `workflow_dispatch`               | —                                                                | export to GCS                                    | runbook [firestore-backup](./runbooks/firestore-backup.md)                                       |
| `uptime.yml` (Uptime Monitor)             | every 15 min                               | probes prod, www, beta, one callable                             | —                                                | opens/closes an `incident` issue ([Monitoreo de uptime](#monitoreo-de-uptime))                   |

Repo variables that steer these workflows (`gh variable list`):

| Variable                     | Current value | Effect                                                                                                                                                  |
| ---------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FIREBASE_PROD_HOSTING_SITE` | `secid-mx`    | Hosting site `cd.yml` deploys to (`hosting.site` is injected into `firebase.json` with `jq`); the job fails fast if unset.                              |
| `BACKEND_DEPLOYED_FROM_MAIN` | `true`        | Which branch deploys functions/rules/indexes: `true` → `cd.yml` (`main`); unset → `deploy-beta.yml` (`feature/hub`). The other job is skipped.          |
| `ALLOW_FUNCTION_DELETIONS`   | unset         | Comma-separated function names a single deploy may delete. Set for one run, then remove ([shared-backend-change](./runbooks/shared-backend-change.md)). |

Both backend jobs share the concurrency group `firebase-backend`, so they
never run at the same time. Rollback of hosting or backend: runbook
[rollback](./runbooks/rollback.md).

## What Gets Deployed

- **Hosting** — static site from `dist/client/`, per environment.
- **Backend** — Cloud Functions (`functions/src/`, compiled to
  `functions/lib/` by the `predeploy` hook in `firebase.json`; the compiled
  output is not tracked in git), Firestore rules and indexes, Storage
  rules. Shared by both environments, so exactly ONE branch may deploy it.
  Whoever deploys it also writes `APP_URL` into `functions/.env`, which
  ends up in user-facing email links.

## Shared-backend rules

The repo variable `BACKEND_DEPLOYED_FROM_MAIN` picks the one branch that
deploys the backend: unset → `feature/hub` (`deploy-beta.yml`), `true` →
`main` (`cd.yml`). The other branch's backend job is skipped, not failed.
Both backend jobs share the concurrency group `firebase-backend`, so they
never run at the same time.

`main` owns the backend since 2026-10-18 (`BACKEND_DEPLOYED_FROM_MAIN=true`).
Operator steps for a backend change: runbook
[shared-backend-change](./runbooks/shared-backend-change.md). The rules:

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
6. **Post-deploy smoke test** (`scripts/ci/smoke-test.sh`) runs in
   `cd.yml`'s `validate` job after every prod deploy, first against
   `https://secid-mx.web.app` and then against `https://secid.mx`; both are
   hard failures (locale pages, a dynamic rewrite, the security headers,
   `/api/forms/*`, a callable). `deploy-beta.yml` has no smoke job; run it
   by hand against any environment:
   `scripts/ci/smoke-test.sh https://beta.secid.mx https://us-central1-secid-org.cloudfunctions.net`.
   Between deploys, [`uptime.yml`](#monitoreo-de-uptime) keeps probing
   production.

## Production cutover

Done on 2026-10-18. Production is the second Firebase Hosting site
`secid-mx` in `secid-org`; GitHub Pages could not serve this app (no
rewrites for the dynamic detail routes and `/api/forms/*`, no security
headers). The step-by-step track with evidence is in
[`LAUNCH-CHECKLIST.md`](./LAUNCH-CHECKLIST.md) (Fases 2–4 done, Fase 5
cleanup pending) and the operator procedure, including the DNS records and
how to revert, in the runbook [prod-cutover](./runbooks/prod-cutover.md)
(reversal: [rollback §C](./runbooks/rollback.md)).

What it set up, for reference:

- Hosting site `secid-mx` with `secid.mx` and `www.secid.mx` connected
  (created by the `Production Cutover` workflow, `.github/workflows/cutover.yml`).
- Repo variables `FIREBASE_PROD_HOSTING_SITE=secid-mx` and
  `BACKEND_DEPLOYED_FROM_MAIN=true` (see [Deploy flows](#deploy-flows)).
- Auth authorized domains and reCAPTCHA Enterprise key domains include
  `secid-mx.web.app`, `secid.mx` and `www.secid.mx`.
- `cd.yml`'s `validate` job fails if `secid.mx` does not serve the build
  (PR #76).

Still open (Fase 5): disable GitHub Pages and remove its custom domain
(Settings → Pages), then merge the PR that deletes `public/CNAME`.

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

# Deploy manually (requires firebase login). Prefer the workflows: a manual
# deploy skips the function-deletion guard and the smoke test, and without
# `hosting.site` set it targets the DEFAULT site, i.e. beta.
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

## Monitoreo de uptime

`.github/workflows/uptime.yml` vigila producción desde GitHub Actions sin servicios
externos ni secretos: sólo `curl` y `gh` con el `GITHUB_TOKEN` del run (no hay checkout
ni `npm install`, así que cada corrida cuesta unos segundos).

**Qué verifica** (cada sonda se reintenta hasta 3 veces con 20 s entre intentos;
cualquier 5xx, 404 o timeout cuenta como caída):

| Sonda     | URL                                                               | Esperado                             |
| --------- | ----------------------------------------------------------------- | ------------------------------------ |
| `prod`    | `https://secid.mx/es/`                                            | 200 y el HTML contiene `build-sha=`  |
| `www`     | `https://www.secid.mx/`                                           | 200 o redirección a `secid.mx`       |
| `beta`    | `https://beta.secid.mx/es/`                                       | 200                                  |
| `backend` | `POST …cloudfunctions.net/completeRegistration` con `{"data":{}}` | 401 (o 400/405): la función responde |

**Cadencia:** cada 15 minutos (`*/15 * * * *`) más `workflow_dispatch` para una
corrida manual. GitHub sólo ejecuta `schedule` en la rama por defecto (`main`) y puede
retrasar o saltar corridas en horas pico; el resultado de cada corrida queda en
Actions → _Uptime Monitor_ (el resumen del run lista las cuatro sondas).

**Dónde aparecen las alertas:** en los Issues del repo. Al fallar, el workflow abre un
issue `🔴 secid.mx caído: <fecha UTC>` con la etiqueta `incident` (la crea si no
existe) y el detalle de cada sonda. Mientras ese issue siga abierto no se abre otro,
aunque las corridas sigan fallando. Cuando las cuatro sondas vuelven a pasar, comenta
`Recuperado <fecha UTC>` en el issue abierto y lo cierra. Si quieres recibir el aviso
por correo o móvil, activa las notificaciones del repo para issues (o suscríbete a la
etiqueta `incident`).

**Cómo silenciarlo** (mantenimiento planeado, migración de DNS, etc.): Actions →
_Uptime Monitor_ → menú `…` → _Disable workflow_; vuelve a habilitarlo al terminar.
También puedes cerrar el issue `incident` a mano; el monitor abrirá uno nuevo si la
caída persiste en la siguiente corrida.

## Monitoring Deploys

```bash
# Latest production deploy (hosting + backend + smoke test)
gh run list --branch main --workflow "Deploy to Production (Firebase Hosting)" --limit 1

# Latest beta deploy
gh run list --branch feature/hub --workflow "Deploy Beta" --limit 1

# View deploy logs
gh run view <RUN_ID> --log

# Which build is live? Both sites print it in the HTML.
curl -s https://secid.mx/es/ | grep -o 'build-sha=[0-9a-f]*'
curl -s https://beta.secid.mx/es/ | grep -o 'build-sha=[0-9a-f]*'
```
