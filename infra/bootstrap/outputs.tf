# These are NON-SECRET identifiers. Put them in GitHub as repository
# *Variables* (Settings → Secrets and variables → Actions → Variables),
# NOT secrets. No service-account key exists or is stored anywhere.

output "workload_identity_provider" {
  description = "Set as GitHub Actions variable GCP_WIF_PROVIDER."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "deployer_service_account" {
  description = "Set as GitHub Actions variable GCP_DEPLOY_SA."
  value       = google_service_account.deployer.email
}

output "tf_state_bucket" {
  description = "Set as GitHub Actions variable TF_STATE_BUCKET."
  value       = google_storage_bucket.tfstate.name
}
