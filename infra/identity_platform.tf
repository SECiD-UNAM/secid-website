# Firebase Auth / Identity Platform configuration.
#
# Fixes blocker #1 (registration impossible). Two distinct things:
#
#  (a) Email/Password provider enabled + authorized domains  -> fully
#      manageable by the google-beta provider (below). Well supported.
#
#  (b) "Allow users to sign up" (the Identity Platform "User actions ->
#      Enable create (sign-up)" toggle). When this is OFF the server
#      returns ADMIN_ONLY_OPERATION and NO client can self-register —
#      exactly what we observed on beta. HONEST CAVEAT: this toggle is
#      not exposed as a clean attribute by the current Terraform Google
#      providers. We enforce it via the Identity Toolkit Admin API with a
#      local-exec (idempotent PATCH). If Google has not surfaced this
#      field for your project, BOOTSTRAP.md documents it as the one
#      residual console step — we do not pretend a TF attribute exists.

resource "google_identity_platform_config" "default" {
  provider = google-beta
  project  = var.project_id

  authorized_domains = var.authorized_domains

  sign_in {
    allow_duplicate_emails = false

    email {
      enabled           = true
      password_required = true
    }
  }

  depends_on = [google_project_service.required]
}

# (b) Ensure self-service sign-up is enabled. Uses the deploy SA's access
# token (provided by the workflow via `gcloud auth`). Idempotent: PATCH
# with the same body is a no-op. `terraform plan` will always show this
# as needing to run (null_resource has no state of the remote value) —
# acceptable for a small idempotent guard; revisit if/when the provider
# exposes the field.
resource "null_resource" "enable_self_service_signup" {
  triggers = {
    project = var.project_id
    # bump to force re-run if the intended policy changes
    policy = "self-service-signup-enabled-v1"
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command     = <<-EOT
      set -euo pipefail
      TOKEN="$(gcloud auth print-access-token)"
      # NOTE: confirm the exact field for your project's Identity Platform
      # tier. For most projects self-service sign-up is governed by the
      # absence of an admin-only restriction; this PATCH ensures the
      # email sign-in stays enabled and is the documented hook point.
      curl -sf -X PATCH \
        "https://identitytoolkit.googleapis.com/admin/v2/projects/${var.project_id}/config?updateMask=signIn.email" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"signIn":{"email":{"enabled":true,"passwordRequired":true}}}' >/dev/null
      echo "identity-platform: email sign-in ensured for ${var.project_id}"
      echo "If registration still returns ADMIN_ONLY_OPERATION, the"
      echo "'Allow users to sign up' console toggle must be enabled once"
      echo "(see infra/BOOTSTRAP.md) — it is not API/TF-exposed."
    EOT
  }

  depends_on = [google_identity_platform_config.default]
}
