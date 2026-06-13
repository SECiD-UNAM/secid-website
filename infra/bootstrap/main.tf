data "google_project" "this" {
  project_id = var.project_id
}

# ── Remote-state bucket for the main infra/ root ──────────────────────────
resource "google_storage_bucket" "tfstate" {
  name                        = var.state_bucket
  project                     = var.project_id
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false

  versioning { enabled = true }

  lifecycle {
    prevent_destroy = true
  }
}

# ── CI deployer service account (no key — used via WIF impersonation) ─────
resource "google_service_account" "deployer" {
  project      = var.project_id
  account_id   = "tf-deployer"
  display_name = "Terraform / CI deployer (WIF, keyless)"
}

# Least-privilege roles for what infra/ + firebase deploy manage.
resource "google_project_iam_member" "deployer_roles" {
  for_each = toset([
    "roles/serviceusage.serviceUsageAdmin", # enable APIs
    "roles/firebaseauth.admin",             # Identity Platform config
    "roles/run.admin",                      # Cloud Run invoker IAM
    "roles/iam.serviceAccountUser",         # act-as for deploys
    "roles/cloudfunctions.admin",           # functions deploy
    "roles/firebase.admin",                 # firebase deploy (hosting/rules)
    "roles/firebaserules.admin",            # rules
    "roles/datastore.indexAdmin",           # firestore indexes
    "roles/storage.admin",                  # tfstate bucket + function src
    "roles/firebasestorage.admin",          # deploy Storage rules (default bucket get)
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

# ── Workload Identity Federation: GitHub OIDC → impersonate deployer SA ───
resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  # Token exchange only succeeds for THIS repo on the allowed refs.
  attribute_condition = "assertion.repository == '${var.github_repo}' && assertion.ref in ${jsonencode(var.github_refs)}"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Allow GitHub Actions runs of the repo to impersonate the deployer SA.
resource "google_service_account_iam_member" "wif_impersonation" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}
