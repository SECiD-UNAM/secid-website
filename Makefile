# SECiD Alumni Platform - Development Makefile
# ============================================
# One-click commands for development, testing, and deployment

# Color output
RED=\033[0;31m
GREEN=\033[0;32m
YELLOW=\033[1;33m
BLUE=\033[0;34m
NC=\033[0m # No Color

# Default target
.DEFAULT_GOAL := help

# Environment variables
export NODE_ENV ?= development
export PORT ?= 3000

# Detect OS for platform-specific commands
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
    OPEN_CMD := open
else
    OPEN_CMD := xdg-open
endif

# ============================================
# HELP & DOCUMENTATION
# ============================================

.PHONY: help
help: ## Show this help message
	@echo "$(BLUE)SECiD Alumni Platform - Development Commands$(NC)"
	@echo "============================================"
	@echo ""
	@echo "$(GREEN)Quick Start:$(NC)"
	@echo "  make start        - One command to rule them all (setup + dev)"
	@echo "  make setup        - One-click setup for new developers"
	@echo "  make dev          - Start development server"
	@echo "  make test         - Run all tests"
	@echo ""
	@echo "$(GREEN)Deployment:$(NC)"
	@echo "  make deploy       - Deploy everything (hosting + functions + rules)"
	@echo "  make deploy-functions - Deploy Cloud Functions only"
	@echo "  make deploy-hosting   - Deploy Astro site only"
	@echo "  make deploy-rules     - Deploy Firestore/Storage rules"
	@echo ""
	@echo "$(GREEN)Admin:$(NC)"
	@echo "  make set-admin email=you@example.com - Set user as admin"
	@echo "  make migrate-lifecycle                - Run migration (dry run)"
	@echo ""
	@echo "$(GREEN)All Commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-18s$(NC) %s\n", $$1, $$2}'

# ============================================
# QUICK START
# ============================================

.PHONY: start
start: ## 🚀 Smart start: setup (if needed) + dev server
	@echo "$(BLUE)🚀 Starting SECiD Alumni Platform...$(NC)"
	@echo ""
	@if [ ! -d "node_modules" ]; then \
		echo "$(YELLOW)📦 First time setup detected...$(NC)"; \
		make setup; \
		echo ""; \
	else \
		echo "$(GREEN)✓ Dependencies already installed$(NC)"; \
	fi
	@if [ ! -f ".env" ]; then \
		echo "$(YELLOW)📝 Creating .env file...$(NC)"; \
		cp .env.example .env; \
		echo "$(GREEN)✓ Using Mock API for development (no Firebase needed!)$(NC)"; \
		echo ""; \
	fi
	@echo "$(BLUE)🌐 Starting development server...$(NC)"
	@echo "$(YELLOW)→ Opening http://localhost:4321 in 3 seconds...$(NC)"
	@echo ""
	@(sleep 3 && $(OPEN_CMD) http://localhost:4321) &
	@npm run dev

# ============================================
# SETUP & INSTALLATION
# ============================================

.PHONY: setup
setup: ## One-click setup for new developers
	@echo "$(BLUE)🚀 Setting up SECiD development environment...$(NC)"
	@make check-requirements
	@make install
	@make setup-env
	@make validate-setup
	@echo "$(GREEN)✅ Setup complete! Run 'make dev' to start developing.$(NC)"

.PHONY: check-requirements
check-requirements: ## Check system requirements
	@echo "$(BLUE)Checking system requirements...$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)❌ Node.js is required but not installed.$(NC)" >&2; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "$(RED)❌ npm is required but not installed.$(NC)" >&2; exit 1; }
	@echo "✓ Node.js version: $$(node --version)"
	@echo "✓ npm version: $$(npm --version)"
	@node -e "if (process.version.match(/^v(\d+)/)[1] < 20) { console.error('$(RED)❌ Node.js 20.17.0 or higher is required$(NC)'); process.exit(1); }"
	@echo "$(GREEN)✓ All requirements met$(NC)"

.PHONY: install
install: ## Install dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	@npm install
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

.PHONY: setup-env
setup-env: ## Set up environment files
	@echo "$(BLUE)Setting up environment files...$(NC)"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(YELLOW)⚠️  Created .env file - please update with your Firebase credentials$(NC)"; \
	else \
		echo "✓ .env file already exists"; \
	fi
	@echo "$(GREEN)✓ Environment files ready$(NC)"

# ============================================
# DEVELOPMENT
# ============================================

.PHONY: dev
dev: ## Start development server with hot reload
	@echo "$(BLUE)Starting development server...$(NC)"
	@echo "$(YELLOW)→ Opening http://localhost:4321 in 3 seconds...$(NC)"
	@(sleep 3 && $(OPEN_CMD) http://localhost:4321) &
	@npm run dev

.PHONY: dev-quiet
dev-quiet: ## Start development server without opening browser
	@echo "$(BLUE)Starting development server...$(NC)"
	@npm run dev

.PHONY: dev-host
dev-host: ## Start development server accessible from network
	@echo "$(BLUE)Starting development server with network access...$(NC)"
	@npx astro dev --host

.PHONY: dev-debug
dev-debug: ## Start development server with debug logging
	@echo "$(BLUE)Starting development server with debug mode...$(NC)"
	@DEBUG=* npm run dev

# ============================================
# BUILDING
# ============================================

.PHONY: build
build: ## Build for production
	@echo "$(BLUE)Building for production...$(NC)"
	@npm run build
	@echo "$(GREEN)✓ Build complete$(NC)"

.PHONY: build-staging
build-staging: ## Build for staging environment
	@echo "$(BLUE)Building for staging...$(NC)"
	@npm run build:staging
	@echo "$(GREEN)✓ Staging build complete$(NC)"

.PHONY: preview
preview: build ## Build and preview production build
	@echo "$(BLUE)Starting preview server...$(NC)"
	@echo "$(YELLOW)→ Opening http://localhost:4321 in 3 seconds...$(NC)"
	@(sleep 3 && $(OPEN_CMD) http://localhost:4321) &
	@npm run preview

.PHONY: serve
serve: ## Serve the built site locally
	@echo "$(BLUE)Serving production build...$(NC)"
	@npm run serve

# ============================================
# TESTING
# ============================================

.PHONY: test
test: ## Run all tests
	@echo "$(BLUE)Running all tests...$(NC)"
	@make test-lint
	@make test-type
	@make test-unit
	@make test-build
	@echo "$(GREEN)✓ All tests passed!$(NC)"

.PHONY: test-unit
test-unit: ## Run unit tests
	@echo "$(BLUE)Running unit tests...$(NC)"
	@npm run test

.PHONY: test-watch
test-watch: ## Run unit tests in watch mode
	@echo "$(BLUE)Running unit tests in watch mode...$(NC)"
	@npm run test:watch

.PHONY: test-coverage
test-coverage: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	@npm run test:coverage
	@echo "$(YELLOW)→ Opening coverage report...$(NC)"
	@$(OPEN_CMD) coverage/index.html

.PHONY: test-e2e
test-e2e: ## Run end-to-end tests
	@echo "$(BLUE)Running e2e tests...$(NC)"
	@npm run test:e2e

.PHONY: test-e2e-ui
test-e2e-ui: ## Run e2e tests with UI
	@echo "$(BLUE)Running e2e tests with UI...$(NC)"
	@npm run test:e2e:ui

# ============================================
# CODE QUALITY
# ============================================

.PHONY: test-lint
test-lint: ## Run ESLint
	@echo "$(BLUE)Running ESLint...$(NC)"
	@npm run lint

.PHONY: test-type
test-type: ## Run TypeScript type checking
	@echo "$(BLUE)Running TypeScript type checking...$(NC)"
	@npm run typecheck

.PHONY: lint
lint: ## Run linting and auto-fix issues
	@echo "$(BLUE)Running linter with auto-fix...$(NC)"
	@npm run lint:fix

.PHONY: format
format: ## Format code with Prettier
	@echo "$(BLUE)Formatting code...$(NC)"
	@npm run format

.PHONY: validate
validate: ## Validate HTML and Schema.org markup
	@echo "$(BLUE)Validating HTML and Schema.org...$(NC)"
	@npm run validate:html || true
	@npm run validate:schema || true

.PHONY: validate-setup
validate-setup: ## Validate development environment setup
	@echo "$(BLUE)Validating development setup...$(NC)"
	@npm run validate:setup

.PHONY: test-build
test-build: ## Test if project builds successfully
	@echo "$(BLUE)Testing production build...$(NC)"
	@npm run build > /dev/null 2>&1 && echo "$(GREEN)✓ Build test passed$(NC)" || echo "$(RED)❌ Build test failed$(NC)"

# ============================================
# UTILITIES
# ============================================

.PHONY: test-mock
test-mock: ## Test Mock API functionality
	@echo "$(BLUE)Testing Mock API...$(NC)"
	@node scripts/test-mock-api.cjs

.PHONY: clean
clean: ## Clean build artifacts and caches
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	@rm -rf dist .astro node_modules/.cache coverage .turbo
	@echo "$(GREEN)✓ Cleaned build artifacts$(NC)"

.PHONY: clean-all
clean-all: clean ## Clean everything including node_modules
	@echo "$(BLUE)Cleaning all generated files...$(NC)"
	@rm -rf node_modules package-lock.json
	@echo "$(GREEN)✓ Cleaned all generated files$(NC)"

.PHONY: reset
reset: clean-all ## Reset project to fresh state
	@echo "$(BLUE)Resetting project...$(NC)"
	@make install
	@make setup-env
	@echo "$(GREEN)✓ Project reset complete$(NC)"

.PHONY: update
update: ## Update dependencies to latest versions
	@echo "$(BLUE)Updating dependencies...$(NC)"
	@npm update
	@npm audit fix || true
	@echo "$(GREEN)✓ Dependencies updated$(NC)"

# ============================================
# FIREBASE
# ============================================

.PHONY: firebase-login
firebase-login: ## Login to Firebase
	@echo "$(BLUE)Logging into Firebase...$(NC)"
	@npx firebase login

.PHONY: firebase-init
firebase-init: ## Initialize Firebase project
	@echo "$(BLUE)Initializing Firebase...$(NC)"
	@npx firebase init

.PHONY: firebase-use
firebase-use: ## Select Firebase project (secid-org)
	@echo "$(BLUE)Selecting Firebase project...$(NC)"
	@npx firebase use secid-org
	@echo "$(GREEN)✓ Using project: secid-org$(NC)"

.PHONY: firebase-emulators
firebase-emulators: ## Start Firebase emulators
	@echo "$(BLUE)Starting Firebase emulators...$(NC)"
	@npx firebase emulators:start

# ============================================
# DEPLOYMENT
# ============================================

.PHONY: deploy
deploy: ## Deploy everything (hosting + functions + rules)
	@echo "$(BLUE)Deploying everything to Firebase...$(NC)"
	@make build
	@make deploy-functions
	@make deploy-hosting
	@make deploy-rules
	@echo "$(GREEN)✓ Full deployment complete$(NC)"

.PHONY: deploy-hosting
deploy-hosting: build ## Deploy Astro site to Firebase Hosting
	@echo "$(BLUE)Deploying hosting...$(NC)"
	@npx firebase deploy --only hosting
	@echo "$(GREEN)✓ Hosting deployed$(NC)"

.PHONY: deploy-functions
deploy-functions: ## Deploy Cloud Functions
	@echo "$(BLUE)Building and deploying Cloud Functions...$(NC)"
	@cd functions && npm install && npm run build
	@npx firebase deploy --only functions --force
	@echo "$(GREEN)✓ Cloud Functions deployed$(NC)"

.PHONY: deploy-rules
deploy-rules: ## Deploy Firestore + Storage rules and indexes
	@echo "$(BLUE)Deploying security rules and indexes...$(NC)"
	@npx firebase deploy --only firestore:rules,firestore:indexes,storage
	@echo "$(GREEN)✓ Rules and indexes deployed$(NC)"

.PHONY: deploy-beta
deploy-beta: ## Deploy to beta channel (beta.secid.mx)
	@echo "$(BLUE)Deploying to beta channel...$(NC)"
	@make build
	@npx firebase hosting:channel:deploy beta
	@echo "$(GREEN)✓ Beta deployment complete$(NC)"

.PHONY: deploy-preview
deploy-preview: build ## Create a preview deployment
	@echo "$(BLUE)Creating Firebase preview...$(NC)"
	@npx firebase hosting:channel:deploy preview

# ============================================
# ADMIN & DIRECTORY
# ============================================

.PHONY: set-admin
set-admin: ## Set a user as admin (usage: make set-admin email=user@example.com)
	@echo "$(BLUE)Setting admin role...$(NC)"
	@if [ -z "$(email)" ]; then \
		echo "$(RED)Usage: make set-admin email=user@example.com$(NC)"; \
		exit 1; \
	fi
	@node scripts/set-admin.js $(email)

.PHONY: migrate-lifecycle
migrate-lifecycle: ## Run member lifecycle migration (dry run)
	@echo "$(BLUE)Running lifecycle migration (dry run)...$(NC)"
	@node scripts/migrate-member-lifecycle.js --dry-run

.PHONY: migrate-lifecycle-apply
migrate-lifecycle-apply: ## Run member lifecycle migration (apply changes)
	@echo "$(YELLOW)Running lifecycle migration (LIVE)...$(NC)"
	@node scripts/migrate-member-lifecycle.js

# ============================================
# GITHUB PAGES
# ============================================

.PHONY: deploy-gh-pages
deploy-gh-pages: ## Deploy to GitHub Pages
	@echo "$(BLUE)Deploying to GitHub Pages...$(NC)"
	@npm run build
	@echo "$(YELLOW)⚠️  Make sure GitHub Pages is configured in repository settings$(NC)"
	@echo "$(GREEN)✓ Ready for deployment via GitHub Actions$(NC)"

# ============================================
# DOCKER
# ============================================

.PHONY: docker-build
docker-build: ## Build Docker image for development
	@echo "$(BLUE)Building Docker image...$(NC)"
	@docker-compose build dev

.PHONY: docker-run
docker-run: ## Run development server in Docker
	@echo "$(BLUE)Starting Docker development environment...$(NC)"
	@docker-compose up dev

.PHONY: docker-prod
docker-prod: ## Build and run production Docker image
	@echo "$(BLUE)Building production Docker image...$(NC)"
	@docker-compose build prod
	@docker-compose up prod

.PHONY: docker-test
docker-test: ## Run tests in Docker
	@echo "$(BLUE)Running tests in Docker...$(NC)"
	@docker-compose --profile test run --rm test

.PHONY: docker-shell
docker-shell: ## Open shell in Docker container
	@echo "$(BLUE)Opening Docker shell...$(NC)"
	@docker-compose exec dev sh

.PHONY: docker-stop
docker-stop: ## Stop all Docker containers
	@echo "$(BLUE)Stopping Docker containers...$(NC)"
	@docker-compose down

.PHONY: docker-clean
docker-clean: ## Clean Docker resources
	@echo "$(BLUE)Cleaning Docker resources...$(NC)"
	@docker-compose down -v --rmi all

# ============================================
# DEVELOPMENT UTILITIES
# ============================================

.PHONY: analyze
analyze: ## Analyze bundle size
	@echo "$(BLUE)Analyzing bundle size...$(NC)"
	@npm run build
	@npx vite-bundle-visualizer

.PHONY: lighthouse
lighthouse: build ## Run Lighthouse performance audit
	@echo "$(BLUE)Running Lighthouse audit...$(NC)"
	@npm run lighthouse

.PHONY: check-updates
check-updates: ## Check for dependency updates
	@echo "$(BLUE)Checking for dependency updates...$(NC)"
	@npx npm-check-updates

.PHONY: generate-component
generate-component: ## Generate a new component (usage: make generate-component name=MyComponent)
	@echo "$(BLUE)Generating component: $(name)$(NC)"
	@node scripts/generate-component.js $(name) $(args)

.PHONY: gen
gen: ## Shorthand for generate-component
	@node scripts/generate-component.js $(name) $(args)

.PHONY: dev-utils
dev-utils: ## Run development utilities (usage: make dev-utils cmd=clean-all)
	@node scripts/dev-utils.js $(cmd) $(args)

# ============================================
# PROJECT INFO
# ============================================

.PHONY: info
info: ## Show project information
	@echo "$(BLUE)SECiD Alumni Platform$(NC)"
	@echo "===================="
	@echo "Node version: $$(node --version)"
	@echo "npm version: $$(npm --version)"
	@echo "Project dependencies:"
	@npm list --depth=0
	@echo ""
	@echo "$(GREEN)Run 'make help' for available commands$(NC)"

.PHONY: status
status: ## Show development status
	@echo "$(BLUE)Development Status$(NC)"
	@echo "=================="
	@echo "Git branch: $$(git branch --show-current)"
	@echo "Git status:"
	@git status --short
	@echo ""
	@echo "$(YELLOW)TODO items:$(NC)"
	@grep -r "TODO" src/ --include="*.ts" --include="*.tsx" --include="*.astro" || echo "No TODOs found"
	@echo ""
	@echo "$(YELLOW)TypeScript errors:$(NC)"
	@npm run typecheck 2>&1 | grep -E "error TS" | wc -l | xargs echo "Error count:"

.PHONY: health
health: ## Run development environment health check
	@npm run health