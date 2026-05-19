# Infra bootstrap (one-time, org/admin)

Goal: CI/CD manages the complete project configuration via Terraform
(`infra/`) + Firebase CLI for code. Single shared project **`secid-org`**
backs both `beta.secid.mx` and `secid.mx` (intentional — no staging/prod
split).

## 1. The trust root → `infra/bootstrap/`

Steps 1–2 below (state bucket + deployer SA + roles) and the **keyless**
GitHub→GCP auth are now codified in **`infra/bootstrap/`** (local-state
Terraform, run once by an admin). See `infra/bootstrap/README.md`. It
creates the state bucket, the `tf-deployer` SA, its least-priv roles, and
a **Workload Identity Federation** pool/provider — so **no service-account
key is ever created or stored as a secret**. After running it, set the
three outputs as GitHub Actions _Variables_ (`GCP_WIF_PROVIDER`,
`GCP_DEPLOY_SA`, `TF_STATE_BUCKET`) and delete any legacy
`FIREBASE_SERVICE_ACCOUNT` key secret.

This `infra/bootstrap/` `terraform apply` is the **only** human-privileged
step — it cannot be done by the pipeline itself (a pipeline can't mint the
identity it runs as). Everything else is CI-managed and idempotent.

## 2. Org-policy check (genuinely cannot be in any per-repo CI)

`completeRegistration` & other callables need `allUsers` `roles/run.invoker`.
If **Domain Restricted Sharing** (`iam.allowedPolicyMemberDomains`) is
enforced at the org/folder, `terraform apply` of `cloud_run_invoker.tf`
will be **rejected** and no pipeline can override it. An org admin must add
a project/service exception, or the callables must move to authenticated
invocation + Firebase App Check. Verify once:

```
gcloud resource-manager org-policies describe \
  iam.allowedPolicyMemberDomains --project secid-org
```

## 3. Residual console toggle (only if needed)

`infra/identity_platform.tf` enables Email/Password + authorized domains
and PATCHes the Identity Toolkit config. The **"Allow users to sign up"**
control (server returns `ADMIN_ONLY_OPERATION` when off) is not cleanly
exposed by the Terraform providers. If, after `terraform apply`, a test
registration still returns `ADMIN_ONLY_OPERATION`, enable it once in
Firebase Console → Authentication → Settings → User actions →
"Allow users to sign up", for `secid-org`. The single residual manual
step — documented honestly rather than faked in TF.

## After bootstrap

`.github/workflows/infra.yml` authenticates **keyless via OIDC/WIF**, runs
`terraform plan` on PRs (review gate) and `terraform apply` on push. The
deploy workflows no longer swallow functions/rules deploy failures
(`set -o pipefail`, fail-loud).
