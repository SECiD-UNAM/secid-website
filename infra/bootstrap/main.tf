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
    "roles/cloudscheduler.admin",           # onSchedule fns -> firebase-schedule-* jobs
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

# ── Cloud Scheduler for the SA that actually deploys functions today ──────
# Deploying an onSchedule function makes the Firebase CLI create/update a
# Cloud Scheduler job named firebase-schedule-<fn>-<region>. Today that is
# aggregateSurveyResponses (functions/src/aggregate-survey.ts, 'every 6
# hours'). Without Cloud Scheduler admin the whole functions deploy dies:
#
#   .../jobs/firebase-schedule-aggregateSurveyResponses-us-central1
#   had HTTP Error: 403, The principal ... lacks IAM permission
#   "cloudscheduler.jobs.update"
#
# That is what broke Deploy Beta from 2026-05-29 on; from 2026-06-11 the
# free-trial/Blaze outage failed the deploy earlier and masked it.
#
# Why here and not in the main infra/ root: tf-deployer deliberately has no
# projectIamAdmin, so it cannot grant project-level roles — only an admin
# running this bootstrap can. Same reason the role list above lives here.
#
# The deploy workflows still authenticate with the legacy
# FIREBASE_SERVICE_ACCOUNT key, so the grant must target that SA. Once they
# migrate to WIF/tf-deployer (see BOOTSTRAP.md §1, "delete any legacy
# FIREBASE_SERVICE_ACCOUNT key secret"), set this variable to "" and the
# binding disappears — tf-deployer already has the role above.
resource "google_project_iam_member" "legacy_deployer_scheduler_admin" {
  for_each = toset(compact([var.legacy_functions_deployer_sa]))

  project = var.project_id
  role    = "roles/cloudscheduler.admin"
  member  = "serviceAccount:${each.value}"
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
