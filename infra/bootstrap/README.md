# infra/bootstrap — one-time, admin, run locally

This is the **only** human-privileged step. It establishes the trust root
that CI then uses for everything else (keyless, via Workload Identity
Federation — **no service-account key is ever created or stored**).

Run once by someone with admin on `secid-org` (Owner / or
`resourcemanager.projectIamAdmin` + `iam.serviceAccountAdmin` +
`storage.admin` + `iam.workloadIdentityPoolAdmin`):

```
gcloud auth application-default login    # ADC for Terraform
cd infra/bootstrap
terraform init        # local state (gitignored)
terraform plan
terraform apply
```

Then read the outputs and set them as GitHub Actions **Variables**
(Settings → Secrets and variables → Actions → **Variables**, _not_
Secrets — they are non-secret identifiers):

| Output                       | GitHub Actions Variable |
| ---------------------------- | ----------------------- |
| `workload_identity_provider` | `GCP_WIF_PROVIDER`      |
| `deployer_service_account`   | `GCP_DEPLOY_SA`         |
| `tf_state_bucket`            | `TF_STATE_BUCKET`       |

After this, **delete the legacy `FIREBASE_SERVICE_ACCOUNT` key secret** —
CI authenticates via OIDC, no key exists.

Still genuinely org-level (cannot be in any repo pipeline): confirm no
`iam.allowedPolicyMemberDomains` org policy blocks `allUsers` on Cloud
Run (see ../BOOTSTRAP.md), and the residual Identity Platform "Allow
users to sign up" console toggle if not API-exposed.

This root changes rarely (only when the deployer's roles or allowed
GitHub refs change); re-running is idempotent. The local
`terraform.tfstate` is gitignored — keep it where the admin can re-apply,
or migrate it into the created bucket afterwards if you want it shared.
