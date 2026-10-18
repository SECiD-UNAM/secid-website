terraform {
  required_version = ">= 1.6.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
  # LOCAL state on purpose. This root creates the GCS bucket that the main
  # infra/ root uses for *its* remote state — it cannot itself depend on a
  # remote backend (chicken-and-egg). Run once by an admin; the local
  # state file is gitignored. It changes rarely; re-running is idempotent.
}

provider "google" {
  project = var.project_id
  region  = var.region
}
