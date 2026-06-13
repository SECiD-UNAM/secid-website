# Required Google APIs. These were previously expected to be enabled by
# hand (the deploy workflows even said "check that … APIs are enabled" in
# their swallowed error messages). Declaring them here makes "the project
# is wired correctly" part of CI/CD instead of tribal knowledge.

locals {
  required_apis = [
    "cloudfunctions.googleapis.com",
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "eventarc.googleapis.com",
    "identitytoolkit.googleapis.com",
    "firestore.googleapis.com",
    "firebasestorage.googleapis.com",
    "firebaserules.googleapis.com",
    "firebase.googleapis.com",
    "iam.googleapis.com",
    "cloudresourcemanager.googleapis.com",
  ]
}

resource "google_project_service" "required" {
  for_each = toset(local.required_apis)

  project = var.project_id
  service = each.value

  # Don't tear down APIs on `terraform destroy` — other things may depend
  # on them and disabling APIs is destructive/slow.
  disable_on_destroy         = false
  disable_dependent_services = false
}
