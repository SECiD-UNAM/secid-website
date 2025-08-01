# 📊 SECiD Website

<div align="center">

![SECiD Logo](images/logo.png)

**Sociedad de Egresados en Ciencia de Datos**  
*UNAM's Data Science Alumni Society*

[![Build Status](https://img.shields.io/github/actions/workflow/status/secid/secid-website/static.yml?branch=main&logo=github&label=Build%20%26%20Deploy)](https://github.com/secid/secid-website/actions)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fsecid.mx&logo=firefox&logoColor=white)](https://secid.mx)
[![Node.js](https://img.shields.io/badge/Node.js-20.17%2B-green?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](#)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)](#)

[🌐 Visit Website](https://secid.mx) • [📝 Report Issues](https://github.com/secid/secid-website/issues) • [🤝 Contributing](#contributing)

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

### 🚀 **Core Features**
- **Responsive Design** - Optimized for all devices and screen sizes
- **Job Board Integration** - Dedicated job submission and discovery system
- **Member Registration** - Streamlined onboarding via Google Forms integration
- **Analytics Tracking** - Comprehensive user behavior analysis with Amplitude
- **SEO Optimized** - Complete Schema.org structured data and meta optimization

### 🛠️ **Technical Excellence**
- **Performance First** - Lighthouse score optimized static site
- **Accessibility Compliant** - WCAG guidelines adherence with pa11y testing
- **PWA Ready** - Progressive Web App capabilities with manifest
- **Modern Tooling** - Automated testing, validation, and deployment pipeline

### 🎨 **Design & UX**
- **Professional Aesthetics** - Based on HTML5 UP's Editorial template
- **FontAwesome Integration** - Comprehensive icon library
- **Custom Branding** - SECiD-specific styling and visual identity
- **Multi-language Ready** - Structured for internationalization

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20.17.0 or higher
- **npm** (comes with Node.js)
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/secid/secid-website.git
   cd secid-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   ```
   http://localhost:3000
   ```

That's it! The website is now running locally with hot reload enabled.

## 🛠️ Development Workflow

### **Available Commands**

| Command | Description |
|---------|-------------|
| `npm run dev` | 🚀 Build for development and start local server |
| `npm run serve` | 🌐 Start local server on port 3000 |
| `npm run build` | 🏗️ Build for production |
| `npm run build:dev` | 🔧 Build for development environment |
| `npm run build:staging` | 🎭 Build for staging environment |

### **Testing & Validation**

| Command | Description |
|---------|-------------|
| `npm run precommit` | ✅ Run all pre-commit validation checks |
| `npm run test:local` | 🧪 Run complete local validation suite |
| `npm run validate:html` | 📝 Validate HTML structure |
| `npm run validate:schema` | 🔍 Validate Schema.org structured data |
| `npm run test:accessibility` | ♿ Run accessibility tests |
| `npm run test:lighthouse` | 🔍 Run Lighthouse performance audit |

### **Pre-commit Hooks**

The project uses **Husky** and **lint-staged** to ensure code quality:

- ✅ **Automatic validation** on staged files before commit
- 🏗️ **Build verification** to catch environment issues early  
- 🔍 **Schema validation** for structured data integrity
- 🚫 **Prevents broken commits** from reaching the repository

```bash
# Pre-commit hooks run automatically, but you can test manually:
npm run precommit
```

## 📁 Project Structure

```
secid-website/
├── 📄 index.html              # Homepage
├── 📄 aboutus.html            # About Us page  
├── 📄 job-submission.html     # Job posting form
├── 📄 registro.html           # Registration redirect
├── 📄 elements.html           # Template showcase
├── 🎨 assets/
│   ├── css/                   # Compiled stylesheets
│   ├── js/                    # JavaScript functionality
│   ├── sass/                  # SASS source files
│   └── webfonts/              # FontAwesome fonts
├── 🖼️ images/                 # Site images and logos
├── ⚙️ .github/workflows/      # CI/CD automation
├── 🏗️ build.js               # Build script
├── ✅ validate-schema.js      # Schema validation
├── 🎯 lighthouserc.js         # Lighthouse configuration
├── 📦 package.json            # Dependencies and scripts
└── 📚 raw_template/           # Original HTML5 UP template
```

### **Key Files**

- **`build.js`** - Environment-specific build processing
- **`validate-schema.js`** - Schema.org structured data validation  
- **`CLAUDE.md`** - AI assistant project guidance
- **`.husky/pre-commit`** - Git hook configuration
- **`manifest.json`** - PWA configuration

## 🔄 CI/CD Pipeline

### **GitHub Actions Workflow**

Our automated pipeline ensures quality and reliability:

```yaml
🔄 Trigger Events:
  - Push to main branch
  - Pull requests  
  - Manual dispatch

✅ Quality Checks:
  - Package lock verification
  - Dependency installation
  - Multi-environment builds
  - HTML validation
  - Schema.org validation
  - Accessibility testing (pa11y)
  - Performance audit (Lighthouse)

🚀 Deployment:
  - Automated GitHub Pages deployment
  - Environment-specific configurations
  - Artifact preservation
```

### **Build Environments**

| Environment | Purpose | URL Pattern |
|-------------|---------|-------------|
| **Development** | Local testing | `http://localhost:3000` |
| **Staging** | Pre-production testing | `https://staging-secid.github.io` |
| **Production** | Live website | `https://secid.mx` |

## 🤝 Contributing

We welcome contributions from the SECiD community! Here's how to get involved:

### **Development Setup**

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test locally**
   ```bash
   npm run test:local
   ```
5. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
6. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### **Code Standards**

- ✅ **HTML5 semantic markup** with proper accessibility attributes
- 🎨 **SASS/CSS** following BEM methodology where applicable  
- 📱 **Mobile-first responsive design** approach
- 🔍 **SEO optimization** with structured data
- ⚡ **Performance considerations** for fast loading
- ♿ **Accessibility compliance** (WCAG 2.1 AA)

### **Pull Request Process**

1. **Ensure all tests pass** - Pre-commit hooks will verify this
2. **Update documentation** - Keep README and comments current
3. **Follow semantic versioning** - For version bumps
4. **Provide clear descriptions** - Explain what and why

## 🔧 Technical Documentation

### **Analytics Integration**

The website uses **Amplitude Analytics** for comprehensive user behavior tracking:

- 📊 **Event Tracking** - User interactions and page views
- 🎥 **Session Replay** - User journey visualization  
- 📈 **Performance Monitoring** - Load times and user experience
- 🎯 **Conversion Tracking** - Job applications and registrations

### **SEO & Performance**

- **Meta Optimization** - Open Graph, Twitter Cards, canonical URLs
- **Structured Data** - JSON-LD Schema.org implementation
- **Performance** - Optimized images, fonts, and resource loading
- **PWA Features** - Manifest, service worker ready, offline capability

### **Accessibility Features**

- **Semantic HTML** - Proper heading hierarchy and landmarks
- **ARIA Labels** - Enhanced screen reader support
- **Keyboard Navigation** - Full keyboard accessibility
- **Color Contrast** - WCAG AA compliant color schemes
- **Focus Management** - Visible focus indicators

## 🌐 Deployment & Hosting

### **GitHub Pages Deployment**

The website is automatically deployed to GitHub Pages via GitHub Actions:

- **Custom Domain** - `secid.mx` with SSL/TLS
- **CDN Integration** - Global content delivery
- **Automatic Deployments** - On every main branch push
- **Environment Variables** - Build-time configuration

### **Domain Configuration**

```
Production: https://secid.mx
Staging: https://staging-secid.github.io  
Repository: https://secid.github.io/secid-website
```

## 📞 Support & Contact

### **Getting Help**

- 🐛 **Bug Reports** - [GitHub Issues](https://github.com/secid/secid-website/issues)
- 💡 **Feature Requests** - [GitHub Discussions](https://github.com/secid/secid-website/discussions)
- 📧 **Contact SECiD** - [Website Contact Form](https://secid.mx)
- 💬 **Community** - Join our alumni network

### **Maintainers**

This project is maintained by the **SECiD Tech Team** with contributions from the data science alumni community.

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

*Connecting Mexico's Data Science Talent*

</div>