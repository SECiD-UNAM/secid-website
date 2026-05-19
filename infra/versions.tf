terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
  }

  # Remote state in GCS. Single shared project, so a single bucket/prefix.
  # Bucket is created by the one-time bootstrap (see infra/BOOTSTRAP.md) and
  # passed via `-backend-config` in CI (keeps the bucket name out of git).
  backend "gcs" {
    # bucket = "<set via -backend-config in CI>"
    # prefix = "secid/infra"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}
