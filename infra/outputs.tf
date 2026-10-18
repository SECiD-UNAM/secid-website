output "project_id" {
  value       = var.project_id
  description = "The single Firebase/GCP project managed by this root."
}

output "public_callable_functions" {
  value       = var.public_callable_functions
  description = "Functions granted public Cloud Run invoker (auth enforced in-function)."
}

output "authorized_domains" {
  value       = google_identity_platform_config.default.authorized_domains
  description = "Firebase Auth authorized domains as applied."
}
