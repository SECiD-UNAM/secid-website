variable "project_id" {
  type    = string
  default = "secid-org"
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "state_bucket" {
  type        = string
  default     = "secid-org-tfstate"
  description = "GCS bucket for the main infra/ remote state."
}

variable "github_repo" {
  type        = string
  default     = "SECiD-UNAM/secid-website"
  description = "owner/repo allowed to impersonate the deployer SA via WIF."
}

variable "github_refs" {
  type        = list(string)
  default     = ["refs/heads/main", "refs/heads/feature/hub"]
  description = "Git refs allowed to assume the SA (kept tight on purpose)."
}
