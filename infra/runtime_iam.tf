# IAM for the Cloud Functions runtime service accounts.
#
# gen2 functions run on Cloud Run as the Compute Engine default SA; the
# single gen1 function (onUserDelete, Auth trigger) runs as the App Engine
# default SA. Both lost the primitive Editor role during hardening, so the
# roles they actually need are declared here. See docs/runbooks/prod-cutover.md
# ("Roles de las cuentas de servicio de runtime" and "Grupos de Google
# Workspace") and issues #86 / #83.

data "google_project" "current" {
  project_id = var.project_id
}

locals {
  functions_runtime_sa_email = "${data.google_project.current.number}-compute@developer.gserviceaccount.com"
  compute_runtime_sa         = "serviceAccount:${local.functions_runtime_sa_email}"
  appengine_runtime_sa       = "serviceAccount:${var.project_id}@appspot.gserviceaccount.com"
}

# gen2 runtime: Firestore, Auth admin, reCAPTCHA Enterprise assessments.
resource "google_project_iam_member" "compute_runtime" {
  for_each = toset([
    "roles/datastore.user",
    "roles/firebaseauth.admin",
    "roles/recaptchaenterprise.agent",
    "roles/eventarc.eventReceiver",
    "roles/run.invoker",
  ])

  project = var.project_id
  role    = each.value
  member  = local.compute_runtime_sa
}

# gen1 runtime (onUserDelete): deletes users/{uid} and their applications.
resource "google_project_iam_member" "appengine_runtime_datastore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = local.appengine_runtime_sa
}

# Keyless domain-wide delegation for Google Workspace groups (issue #83).
#
# The runtime SA has NO private key, so functions/src/google-admin.ts asks
# the IAM Credentials API to sign the delegation JWT as itself
# (projects/-/serviceAccounts/{SA}:signJwt). That needs
# roles/iam.serviceAccountTokenCreator on the SA ITSELF: the binding lives on
# the service-account resource, not on the project. The other half (adding
# the SA's OAuth client ID under Workspace Admin Console → Security → API
# controls → Domain-wide delegation) is a console step.
resource "google_service_account_iam_member" "functions_runtime_self_token_creator" {
  service_account_id = "projects/${var.project_id}/serviceAccounts/${local.functions_runtime_sa_email}"
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = local.compute_runtime_sa

  depends_on = [google_project_service.required]
}
