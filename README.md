# 🚀 SECiD Alumni Platform

<div align="center">

![SECiD Logo](images/logo.png)

**Sociedad de Egresados en Ciencia de Datos**  
_UNAM's Data Science Alumni Society Platform_

[![Build Status](https://img.shields.io/github/actions/workflow/status/secid/secid-website/deploy.yml?branch=main&logo=github&label=Build%20%26%20Deploy)](https://github.com/secid/secid-website/actions)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fsecid.mx&logo=astro&logoColor=white)](https://secid.mx)
[![Astro](https://img.shields.io/badge/Astro-5.x-BC52EE?logo=astro&logoColor=white)](https://astro.build)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore-DD2C00?logo=firebase&logoColor=white)](https://firebase.google.com)
[![Node.js](https://img.shields.io/badge/Node.js-20.17%2B-5FA04E?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[🌐 Visit Platform](https://secid.mx) • [📖 Quick Start](QUICKSTART.md) • [💻 Developer Guide](DEVELOPMENT.md) • [🤝 Contributing](#contributing)

</div>

---

> Contributing? Read [CONTRIBUTING.md](CONTRIBUTING.md) first: branch flow, local setup, tests, CI checks and what not to do.

## 🎯 About SECiD

**SECiD** (Sociedad de Egresados en Ciencia de Datos) is UNAM's premier Data Science Alumni Society, dedicated to connecting graduates, fostering professional growth, and building a strong community within Mexico's data science ecosystem.

Our platform serves as the central hub for:

- 🤝 **Alumni Networking** - Connect with fellow data science professionals
- 💼 **Career Opportunities** - Access exclusive job postings and career resources
- 📚 **Knowledge Sharing** - Stay updated with industry trends and best practices
- 🎓 **Professional Development** - Participate in workshops, seminars, and events

## ✨ Features & Highlights

### 🚀 **Platform Features**

- **🌐 Multilingual** - Full Spanish/English support with i18n
- **🔐 Authentication** - Secure member login with Firebase Auth
- **💼 Job Board** - Advanced job posting and discovery system
- **👥 Member Directory** - Connect with alumni across industries
- **📊 Analytics Dashboard** - Track engagement and community growth
- **📱 PWA Ready** - Install as mobile app for offline access

### 🛠️ **Technical Stack**

- **[Astro](https://astro.build)** - Lightning-fast static site generator
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[React](https://react.dev)** - Interactive UI components
- **[Tailwind CSS](https://tailwindcss.com)** - Modern utility-first styling
- **[Firebase](https://firebase.google.com)** - Hosting, Auth, Firestore, Storage, Cloud Functions

### 🎨 **Modern Features**

- **🌙 Dark Mode** - Automatic theme switching
- **⚡ Performance** - 95+ Lighthouse scores
- **♿ Accessible** - WCAG 2.1 AA compliant
- **🔍 SEO Optimized** - Schema.org structured data
- **📱 Responsive** - Mobile-first design
- **🧪 Well-Tested** - Unit, integration, and E2E tests
- **Custom Branding** - SECiD-specific styling and visual identity
- **Multi-language Ready** - Structured for internationalization

## 🚀 Getting Started

### The Fastest Way - One Command!

```bash
# Clone and start everything with a single command
git clone https://github.com/secid/secid-website.git && \
cd secid-website && \
make start
```

That's it! 🎉 Your browser will automatically open to http://localhost:4321

**What `make start` does:**

- ✅ Checks and installs dependencies (first run only)
- ✅ Sets up environment files
- ✅ Starts the development server
- ✅ Opens your browser automatically
- ✅ Uses Mock API if no Firebase credentials

### Manual Setup

1. **Prerequisites**
   - Node.js 20.17.0+ ([Download](https://nodejs.org/))
   - Git ([Download](https://git-scm.com/))
   - Make (usually pre-installed)

2. **Clone & Install**

   ```bash
   git clone https://github.com/secid/secid-website.git
   cd secid-website
   npm install
   ```

3. **Configure Environment**

   ```bash
   cp .env.example .env
   # Edit .env with your Firebase credentials (optional)
   ```

   **Note:** Firebase credentials are optional! The platform will automatically use a mock API for local development if credentials are not provided.

4. **Start Development**
   ```bash
   make dev
   # or npm run dev
   ```

## 🛠️ Development Workflow

### **Essential Commands**

| Command        | Description                                     |
| -------------- | ----------------------------------------------- |
| `make start`   | 🚀 Smart start - setup (if needed) + dev server |
| `make dev`     | 💻 Start development server only                |
| `make test`    | 🧪 Run all tests (lint, type check, unit)       |
| `make build`   | 🏗️ Build for production                         |
| `make preview` | 👀 Preview production build                     |
| `make help`    | 📝 Show all available commands                  |

### **Testing**

```bash
# Run all tests
make test

# Run specific test types
make test-unit      # Unit tests with Vitest
make test-e2e       # E2E tests with Playwright
make test-lint      # ESLint checks
make test-type      # TypeScript checks
make test-coverage  # Coverage report
```

### **Code Quality**

```bash
# Auto-fix issues
make lint          # Fix ESLint issues
make format        # Format with Prettier

# Validation
make validate      # HTML & Schema.org checks
make health        # Environment health check
```

### **Development Tips**

- 🌐 Access from other devices: `make dev-host`
- 🔍 Debug mode: `make dev-debug`
- 📊 Bundle analysis: `make analyze`
- 🚀 Performance audit: `make lighthouse`

## 📁 Project Structure

```
secid-website/
├── 📄 src/
│   ├── 🎨 components/         # React components
│   │   ├── auth/            # Authentication (Login, SignUp)
│   │   ├── layout/          # Layout components
│   │   └── ui/              # Reusable UI components
│   ├── 📄 pages/             # Route pages
│   │   ├── es/              # Spanish pages
│   │   └── en/              # English pages
│   ├── 🏷️ layouts/           # Astro layouts
│   ├── 🔧 lib/               # Utilities & Firebase
│   ├── 🌍 i18n/              # Translations
│   ├── 🎨 styles/            # Global styles
│   └── 📝 types/             # TypeScript types
├── 🌐 public/               # Static assets
├── 🧪 tests/                # Test files
├── 📦 scripts/              # Build & utility scripts
├── ⚙️ .github/workflows/    # GitHub Actions
├── 🔧 Makefile             # Developer commands
└── 📝 docs/                 # Documentation
└── 📚 raw_template/           # Original HTML5 UP template
```

## 🚀 Deployment

Both environments run on **Firebase Hosting** in one Firebase project
(`secid-org`), sharing Auth, Firestore, Storage and Cloud Functions. Only
the static frontend differs per site. Details, runbook and rules for the
shared backend: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md); launch
tracking: [`docs/LAUNCH-CHECKLIST.md`](docs/LAUNCH-CHECKLIST.md).

- `feature/hub` → **beta.secid.mx** (`deploy-beta.yml`)
- `main` → **secid.mx** (`cd.yml`, production Hosting site; `main` only
  changes via pull request)
- Backend (functions, rules, indexes) is deployed by exactly one branch,
  chosen by the repo variable `BACKEND_DEPLOYED_FROM_MAIN`.

## 🔄 CI/CD Pipeline

GitHub Actions, on push to `main` / `feature/*`, on pull requests into
`main` / `feature/hub`, and on manual dispatch:

**✅ Quality Gates:**

- TypeScript compilation
- ESLint & Prettier checks
- Unit tests (Vitest, 4 shards)
- Firestore security rules tests (against the emulator)
- E2E tests (Playwright)
- Build verification
- Lighthouse CI performance audit

**🚀 Deployment:**

- Hosting deploy per branch, then rules → storage → functions
- A guard refuses to delete functions another branch still exports
- Post-deploy smoke test (locale pages, dynamic rewrites, security
  headers, `/api/forms/*`, a callable)
- `Production Cutover` and `Firestore Backup` workflows for the one-off
  setup and restore points

## 🤝 Contributing

We welcome contributions from the SECiD community! Here's how to get involved:

### **How to Contribute**

1. **Fork & Clone**

   ```bash
   git clone https://github.com/YOUR-USERNAME/secid-website.git
   cd secid-website
   make setup
   ```

2. **Create Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Follow TypeScript best practices
   - Add tests for new features
   - Update documentation

4. **Test Your Changes**
   ```bash
   make test        # Run all tests
   make health      # Check environment
   ```
5. **Commit Changes**

   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

6. **Push & Create PR**

   ```bash
   git push origin feature/your-feature-name
   ```

7. **Submit Pull Request** with clear description

### **Code Standards**

- 📦 **TypeScript** - Strict mode enabled
- ⚛️ **React** - Functional components with hooks
- 🎨 **Tailwind CSS** - Utility-first styling
- 🧪 **Testing** - Unit tests for all components
- 📝 **Documentation** - JSDoc comments
- 🔒 **Security** - No secrets in code

### **Commit Convention**

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation
- `style:` Code style
- `refactor:` Code refactoring
- `test:` Testing
- `chore:` Maintenance

## 🔧 Technical Details

### **Architecture**

- **🌐 JAMstack** - JavaScript, APIs, Markup
- **🚀 Astro SSG** - Static site generation
- **⚛️ React Islands** - Interactive components
- **🔥 Firebase Backend** - Auth, Firestore, Storage
- **💙 TypeScript** - End-to-end type safety

### **Performance**

- **💯 Lighthouse Score** - 95+ across all metrics
- **🚀 Fast Load Times** - < 2s on 3G
- **📦 Small Bundles** - Optimized with Vite
- **🖼️ Image Optimization** - WebP with fallbacks
- **📁 Code Splitting** - Per-route bundles

### **Security**

- **🔒 Firebase Auth** - Secure authentication
- **🔐 Environment Variables** - Secrets management
- **🛡️ CSP Headers** - Content Security Policy
- **🌐 HTTPS Only** - SSL/TLS encryption
- **🤖 Bot Protection** - Rate limiting

## 🌐 Infrastructure

### **Hosting**

- **🔥 Firebase Hosting** - Static site hosting, one site per environment
- **🔥 Firebase** - Auth, Firestore, Storage, Cloud Functions (shared)
- **🌐 Cloudflare** - DNS
- **🔒 SSL/TLS** - Automatic HTTPS

### **Environments**

| Environment | URL                                        | Branch        |
| ----------- | ------------------------------------------ | ------------- |
| Production  | https://secid.mx                           | `main`        |
| Beta        | https://beta.secid.mx                      | `feature/hub` |
| Development | http://localhost:4321 (Firebase emulators) | any           |

## 📚 Resources

### **Documentation**

- 📖 [Quick Start Guide](QUICKSTART.md)
- 🛠️ [Developer Guide](DEVELOPMENT.md)
- 🔧 [Troubleshooting](TROUBLESHOOTING.md)
- 🔥 [Firebase Setup](FIREBASE-MEMBERS-HUB-PLAN.md)
- 📋 [Feature Roadmap](SECID-FUTURE-FEATURES.md)
- 🗺️ [Implementation Plan](SECID-IMPLEMENTATION-TODO.md)

### **Support**

- 🐛 [Report Issues](https://github.com/secid/secid-website/issues)
- 💡 [Feature Requests](https://github.com/secid/secid-website/discussions)
- 📧 [Contact SECiD](mailto:contacto@secid.mx)
- 💬 [LinkedIn Community](https://linkedin.com/company/secid-unam)

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### **Template Attribution**

Website design based on **[Editorial by HTML5 UP](https://html5up.net/editorial)**  
Free for personal and commercial use under the CCA 3.0 license.

---

<div align="center">

**Made with ❤️ by the SECiD Community**

[🌐 Website](https://secid.mx) • [📱 LinkedIn](https://linkedin.com/company/secid) • [🐙 GitHub](https://github.com/secid)

_Connecting Mexico's Data Science Talent_

</div>
