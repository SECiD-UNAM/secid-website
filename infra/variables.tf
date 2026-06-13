# NOTE: A single Firebase/GCP project (secid-org) backs BOTH beta.secid.mx
# and secid.mx (prod). There is intentionally no staging/prod project split,
# so this Terraform root manages exactly one project and one state. Enabling
# sign-up / invoker / APIs here therefore affects beta and prod together.

variable "project_id" {
  type        = string
  description = "GCP/Firebase project ID. Single shared project (e.g. secid-org)."
}

variable "region" {
  type        = string
  description = "Region for Cloud Functions (gen2 / Cloud Run)."
  default     = "us-central1"
}

variable "authorized_domains" {
  type        = list(string)
  description = "Firebase Auth authorized domains — must include both the beta and prod hosts (same project serves both)."
  default = [
    "localhost",
    "secid.mx",
    "beta.secid.mx",
  ]
}

# Browser-invoked callable / HTTPS functions that MUST allow unauthenticated
# Cloud Run invocation (the function itself enforces auth via request.auth /
# token verification). The on* event-trigger functions are NOT here — they
# are invoked by Eventarc/Firestore, not the browser, and must stay private.
#
# Keep this in sync with the callable/onRequest exports in functions/src.
variable "public_callable_functions" {
  type = list(string)
  default = [
    "completeRegistration",
    "submitPublicJob",
    "getSalaryStats",
    "verifyUnamEmail",
    "seedRbacGroups",
    "backfillRbacUsers",
  ]
}
