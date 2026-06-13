# Fixes blocker #2 (completeRegistration -> HTTP 403, FirebaseError:
# internal). Gen2 Cloud Functions are Cloud Run services; Firebase callable
# / onRequest functions are designed to be invoked unauthenticated at the
# Cloud Run layer and enforce auth INSIDE the function (request.auth /
# verifyIdToken). `firebase deploy` is supposed to grant allUsers
# run.invoker but that was failing silently and/or being blocked. We make
# it explicit and idempotent here.
#
# ORDERING: these services only exist AFTER `firebase deploy --only
# functions`. The infra workflow therefore applies APIs + Identity Platform
# FIRST (so functions can deploy), then runs `firebase deploy`, then
# applies this (full apply) so the services exist when the bindings are
# created. See .github/workflows/infra.yml.
#
# ORG-POLICY CAVEAT: if `iam.allowedPolicyMemberDomains` (Domain Restricted
# Sharing) is enforced at the org/folder, granting `allUsers` will be
# rejected and NO per-project pipeline can override it — an org admin must
# add an exception for these Cloud Run services (or the callables must move
# to authenticated invocation + Firebase App Check). Documented in
# BOOTSTRAP.md.

resource "google_cloud_run_service_iam_member" "public_invoker" {
  for_each = toset(var.public_callable_functions)

  project  = var.project_id
  location = var.region
  # Gen2 functions create a Cloud Run service whose name is the function
  # name LOWERCASED (Cloud Run requires lowercase). Using the camelCase
  # name here fails with NOT_FOUND.
  service = lower(each.value)
  role    = "roles/run.invoker"
  member  = "allUsers"

  depends_on = [google_project_service.required]
}
