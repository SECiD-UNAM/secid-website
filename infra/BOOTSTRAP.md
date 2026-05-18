# Infra bootstrap (one-time, org/admin)

Goal: CI/CD manages the complete project configuration via Terraform
(`infra/`) + Firebase CLI for code. A few things **cannot** be done by a
per-repo pipeline and must be set up once by someone with org/billing/admin
rights. After this bootstrap, everything else is CI-managed and idempotent.

Single shared project: **`secid-org`** backs both `beta.secid.mx` and
`secid.mx` (intentional — no staging/prod split).

## 1. Terraform state bucket (once)

```
gsutil mb -p secid-org -l us-central1 gs://secid-org-tfstate
gsutil versioning set on gs://secid-org-tfstate
```

CI passes `-backend-config="bucket=secid-org-tfstate" -backend-config="prefix=secid/infra"`.

## 2. Terraform deploy service account (once)

```
gcloud iam service-accounts create tf-deployer --project secid-org \
  --display-name "Terraform/CI deployer"
```

Grant (project-scoped) — least privilege for what this root manages:

- `roles/serviceusage.serviceUsageAdmin` (enable APIs)
- `roles/firebaseauth.admin` (Identity Platform config)
- `roles/run.admin` + `roles/iam.serviceAccountUser` (Cloud Run invoker IAM)
- `roles/firebase.admin` / `roles/cloudfunctions.admin` (functions deploy via Firebase CLI uses the same SA)
- `roles/firebaserules.admin`, `roles/datastore.indexAdmin` (rules/indexes)
- `roles/storage.objectAdmin` on the state bucket

Provide it to GitHub Actions as the `FIREBASE_SERVICE_ACCOUNT` /
`GCP_SA_KEY` secret (already referenced by the workflows).

## 3. Org-policy check (cannot be done by per-repo CI)

`completeRegistration` & other callables need `allUsers` `roles/run.invoker`.
If **Domain Restricted Sharing** (`iam.allowedPolicyMemberDomains`) is
enforced at the org/folder, `terraform apply` of `cloud_run_invoker.tf`
will be **rejected** and no pipeline can override it. An org admin must
either add a project/service exception, or the callables must move to
authenticated invocation + Firebase App Check. Verify once:

```
gcloud resource-manager org-policies describe \
  iam.allowedPolicyMemberDomains --project secid-org
```

## 4. Residual console toggle (only if needed)

`infra/identity_platform.tf` enables Email/Password + authorized domains and
PATCHes the Identity Toolkit config. The **"Allow users to sign up"**
control (server returns `ADMIN_ONLY_OPERATION` when off) is not cleanly
exposed by the Terraform providers. If, after `terraform apply`, a test
registration still returns `ADMIN_ONLY_OPERATION`, enable it once in
Firebase Console → Authentication → Settings → User actions →
"Allow users to sign up", for `secid-org`. This is the single residual
manual step and is documented honestly rather than faked in TF.

## After bootstrap

`.github/workflows/infra.yml` runs `terraform plan` on PRs and a phased
`terraform apply` on deploy (APIs+Identity first, then `firebase deploy`,
then invoker IAM). The deploy workflows no longer swallow failures.
