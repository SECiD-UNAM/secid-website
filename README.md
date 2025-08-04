# 🚀 SECiD Alumni Platform

<div align="center">

![SECiD Logo](images/logo.png)

**Sociedad de Egresados en Ciencia de Datos**  
_UNAM's Data Science Alumni Society Platform_

[![Build Status](https://img.shields.io/github/actions/workflow/status/secid/secid-website/deploy.yml?branch=main&logo=github&label=Build%20%26%20Deploy)](https://github.com/secid/secid-website/actions)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fsecid.mx&logo=astro&logoColor=white)](https://secid.mx)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.17%2B-green?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[🌐 Visit Platform](https://secid.mx) • [📖 Quick Start](QUICKSTART.md) • [💻 Developer Guide](DEVELOPMENT.md) • [🤝 Contributing](#contributing)

</div>

---

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
- **[Firebase](https://firebase.google.com)** - Backend services and authentication
- **[GitHub Pages](https://pages.github.com)** - Zero-cost hosting

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

### **GitHub Pages (Production)**

Automatic deployment on push to `main` branch:

```bash
# Manual deployment
make deploy-gh-pages
```

### **Firebase Hosting (Alternative)**

```bash
# Login to Firebase
make firebase-login

# Deploy to production
make firebase-deploy

# Create preview channel
make firebase-preview
```

## 🔄 CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment:

**🔄 Automated on:**

- Push to `main` branch
- Pull requests
- Manual dispatch

**✅ Quality Gates:**

- TypeScript compilation
- ESLint & Prettier checks
- Unit tests (Vitest)
- E2E tests (Playwright)
- Build verification
- Lighthouse CI performance audit

**🚀 Deployment:**

- Automatic deployment to GitHub Pages
- Preview deployments for PRs
- Zero-downtime updates

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

- **💾 GitHub Pages** - Static site hosting (free)
- **🔥 Firebase** - Backend services only
- **🌐 Cloudflare** - DNS & CDN
- **🔒 SSL/TLS** - Automatic HTTPS

### **Environments**

| Environment | URL                      | Branch      |
| ----------- | ------------------------ | ----------- |
| Production  | https://secid.mx         | `main`      |
| Staging     | https://staging.secid.mx | `staging`   |
| Development | http://localhost:4321    | `feature/*` |

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
