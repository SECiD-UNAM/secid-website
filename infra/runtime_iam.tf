# IAM for the Cloud Functions runtime service accounts.
#
# gen2 functions run as the Compute Engine default SA; the single gen1
# function (onUserDelete, Auth trigger) runs as the App Engine default SA.
# Both lost the primitive Editor role during hardening, so the roles they
# actually need are declared here. See docs/runbooks/prod-cutover.md
# ("Roles de las cuentas de servicio de runtime") and issue #86.

data "google_project" "this" {
  project_id = var.project_id
}

locals {
  compute_runtime_sa   = "serviceAccount:${data.google_project.this.number}-compute@developer.gserviceaccount.com"
  appengine_runtime_sa = "serviceAccount:${var.project_id}@appspot.gserviceaccount.com"
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
