# Keyless domain-wide delegation for Google Workspace groups (issue #83).
#
# Gen2 functions run on Cloud Run as the Compute Engine default service
# account with NO private key, so functions/src/google-admin.ts cannot use
# the classic "JWT signed with the key file + subject" flow. Instead it asks
# the IAM Credentials API to sign the delegation JWT as the runtime SA
# (projects/-/serviceAccounts/{SA}:signJwt). For that the runtime SA needs
# roles/iam.serviceAccountTokenCreator on ITSELF — the binding lives on the
# service-account resource, not on the project.
#
# The other half of the setup (adding the SA's OAuth client ID under
# Workspace Admin Console → Security → API controls → Domain-wide
# delegation) is outside GCP and stays a console step; see
# docs/runbooks/prod-cutover.md, "Grupos de Google Workspace".

data "google_project" "current" {
  project_id = var.project_id
}

locals {
  functions_runtime_sa_email = "${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

resource "google_service_account_iam_member" "functions_runtime_self_token_creator" {
  service_account_id = "projects/${var.project_id}/serviceAccounts/${local.functions_runtime_sa_email}"
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${local.functions_runtime_sa_email}"

  depends_on = [google_project_service.required]
}
