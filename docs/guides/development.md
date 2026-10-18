# SECiD Alumni Platform - Developer Guide 🚀

Welcome to the SECiD Alumni Platform development guide! This document provides everything you need to start developing, testing, and deploying the platform.

## 🔥 New: One-Command Development!

The platform now includes **`make start`** - the only command you need:

```bash
# Just clone and start!
git clone https://github.com/secid/secid-website.git
cd secid-website
make start  # That's it! 🚀
```

The Mock API automatically activates when Firebase credentials are missing and provides:

- ✅ Full authentication flow (login/signup/logout)
- ✅ Job board CRUD operations
- ✅ User profiles and member directory
- ✅ File upload simulation
- ✅ Pre-populated sample data
- ✅ Network delay simulation for realistic UX
- ✅ Error state testing capabilities

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Project Setup](#project-setup)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Building & Deployment](#building--deployment)
- [Project Structure](#project-structure)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🚀 Quick Start

Get up and running in less than 5 minutes:

```bash
# Clone the repository
git clone https://github.com/secid/secid-website.git
cd secid-website

# One-click setup
make setup

# Start development server
make dev
```

The site will open automatically at http://localhost:4321 🎉

## 📦 Prerequisites

### Required Software

- **Node.js** 20.17.0 or higher
- **npm** 8.0.0 or higher
- **Git** 2.0 or higher
- **Make** (usually pre-installed on Unix systems)

### Recommended Tools

- **VS Code** with recommended extensions
- **Firebase CLI** for deployment
- **Chrome** for development and testing

### System Check

Run this command to verify your system is ready:

```bash
make check-requirements
```

## 🛠️ Project Setup

### 1. Initial Setup

```bash
# Install dependencies and configure environment
make setup
```

This command will:

- ✅ Check system requirements
- ✅ Install npm dependencies
- ✅ Create `.env` file from example
- ✅ Validate the setup

### 2. Environment Configuration

Update your `.env` file with Firebase credentials:

```env
# Firebase Configuration
PUBLIC_FIREBASE_API_KEY=your-api-key
PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
PUBLIC_FIREBASE_PROJECT_ID=your-project-id
PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
PUBLIC_FIREBASE_APP_ID=your-app-id
PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Optional: Development settings
PUBLIC_USE_EMULATORS=false
PUBLIC_DEBUG_MODE=false
```

### 3. VS Code Setup

Open the project in VS Code and install recommended extensions:

```bash
code .
# Press Cmd/Ctrl+Shift+P → "Extensions: Show Recommended Extensions"
```

## 💻 Development Workflow

### Starting Development

```bash
# The fastest way - setup (if needed) + dev server
make start

# Start dev server only (if already set up)
make dev

# Start without opening browser
make dev-quiet

# Start with network access (for mobile testing)
make dev-host

# Start with debug logging
make dev-debug
```

### Code Quality

```bash
# Run all tests and checks
make test

# Auto-fix linting issues
make lint

# Format code with Prettier
make format

# Type checking
make test-type
```

### Making Changes

1. **Create a new branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**

   ```bash
   make test
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

## 🔧 Mock API Development

The platform includes a comprehensive Mock API for local development without Firebase:

### Automatic Activation

The Mock API activates automatically when:

- No Firebase credentials in `.env`
- `PUBLIC_USE_MOCK_API=true` is set
- Running tests (`NODE_ENV=test`)

### Features

**Authentication:**

```typescript
// Works exactly like Firebase Auth
import { signIn, signUp, signOut } from '@/lib/auth';

// Login with mock user
await signIn('john.doe@example.com', 'password');

// Create new user
await signUp('jane@example.com', 'password', {
  firstName: 'Jane',
  lastName: 'Smith',
});
```

**Job Board:**

```typescript
import { createJob, getActiveJobs } from '@/lib/jobs';

// Create job posting
const jobId = await createJob(
  {
    title: 'Senior Data Scientist',
    company: 'Tech Corp',
    location: 'Mexico City',
    type: 'Full-time',
    remote: true,
    // ...
  },
  userId
);

// Get all jobs
const jobs = await getActiveJobs();
```

### Sample Data

Mock API includes pre-populated data:

- Test user: `john.doe@example.com` / any password
- Sample job postings
- User profiles with complete information

### Customizing Mock Behavior

Edit `src/lib/mock-api.ts` to:

- Add more sample data
- Simulate error conditions
- Adjust network delays
- Add new mock endpoints

## 🧪 Testing

### Running Tests

```bash
# Run all tests
make test

# Run unit tests
make test-unit

# Run tests in watch mode
make test-watch

# Run with coverage report
make test-coverage

# Run e2e tests
make test-e2e

# Run e2e tests with UI
make test-e2e-ui
```

### Writing Tests

#### Unit Test Example

```typescript
// src/components/Button/Button.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

#### E2E Test Example

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/es/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/es/dashboard');
});
```

## 🏗️ Building & Deployment

### Local Build

```bash
# Build for production
make build

# Build and preview
make preview

# Build for staging
make build-staging
```

### Deployment Options

#### GitHub Pages

```bash
# Build for GitHub Pages
make deploy-gh-pages
```

#### Firebase Hosting

```bash
# Login to Firebase
make firebase-login

# Deploy to Firebase
make firebase-deploy

# Create preview channel
make firebase-preview
```

## 📁 Project Structure

```
secid-website/
├── src/
│   ├── components/      # React components
│   │   ├── auth/       # Authentication components
│   │   ├── layout/     # Layout components
│   │   └── ui/         # Reusable UI components
│   ├── layouts/        # Astro layouts
│   ├── pages/          # Route pages
│   │   ├── es/        # Spanish pages
│   │   └── en/        # English pages
│   ├── lib/           # Utilities and Firebase
│   ├── i18n/          # Translations
│   ├── styles/        # Global styles
│   └── types/         # TypeScript types
├── public/            # Static assets
├── tests/             # Test files
│   ├── unit/         # Unit tests
│   └── e2e/          # End-to-end tests
├── .github/          # GitHub Actions
└── docs/             # Documentation
```

## 🔧 Common Tasks

### Component Generation

```bash
# Generate a new component
make generate-component name=MyComponent
```

### Bundle Analysis

```bash
# Analyze bundle size
make analyze
```

### Performance Audit

```bash
# Run Lighthouse audit
make lighthouse
```

### Dependency Management

```bash
# Check for updates
make check-updates

# Update dependencies
make update
```

### Clean & Reset

```bash
# Clean build artifacts
make clean

# Full reset (removes node_modules)
make reset
```

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Kill process on port 4321
lsof -ti:4321 | xargs kill -9
```

#### Node Version Issues

```bash
# Use nvm to switch Node version
nvm use
# or
nvm install 20.17.0
nvm use 20.17.0
```

#### Build Failures

```bash
# Clean and rebuild
make clean
make install
make build
```

#### TypeScript Errors

```bash
# Check for TypeScript errors
make test-type

# Auto-fix what's possible
make lint
```

### Getting Help

1. Check existing issues: [GitHub Issues](https://github.com/secid/secid-website/issues)
2. Read error messages carefully
3. Check the console for detailed logs
4. Ask in the team chat

## 🤝 Contributing

### Commit Convention

We use conventional commits:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Build process/auxiliary changes

### Pull Request Process

1. Create feature branch from `main`
2. Make your changes
3. Run `make test` to ensure all tests pass
4. Update documentation if needed
5. Create PR with clear description
6. Wait for code review
7. Merge after approval

### Code Style

- Use TypeScript for all new code
- Follow ESLint rules (auto-fixed with `make lint`)
- Use Prettier for formatting
- Write meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

## 📊 Development Status

Check current development status:

```bash
# Show project info
make info

# Show development status
make status
```

## 🔐 Security

- Never commit `.env` files
- Use environment variables for secrets
- Keep dependencies updated
- Follow OWASP guidelines
- Report security issues privately

## 📚 Additional Resources

- [Astro Documentation](https://docs.astro.build)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

Happy coding! 🎉 If you have questions, don't hesitate to ask the team.
