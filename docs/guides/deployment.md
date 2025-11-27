# SECiD Website CI/CD Documentation

## Overview

This document describes the enhanced CI/CD pipeline for the SECiD website, which includes environment-specific builds, automated testing, and quality assurance.

## Architecture

### Build System

- **Environment-specific configuration**: Development, Staging, Production
- **Template processing**: Dynamic URL generation for different environments
- **Quality assurance**: HTML validation, accessibility testing, performance auditing

### Environments

| Environment | URL                               | Purpose                |
| ----------- | --------------------------------- | ---------------------- |
| Development | `http://localhost:3000`           | Local development      |
| Staging     | `https://staging-secid.github.io` | Pre-production testing |
| Production  | `https://secid.mx`                | Live website           |

## Local Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Install dependencies
npm install

# Build for development
npm run build:dev

# Start local server
npm run serve

# Or build and serve in one command
npm run dev
```

### Available Scripts

```bash
# Build commands
npm run build          # Production build
npm run build:dev      # Development build
npm run build:staging  # Staging build

# Testing commands
npm run validate:html           # HTML validation
npm run test:accessibility      # Accessibility testing
npm run test:lighthouse        # Performance/SEO audit

# Development
npm run serve          # Start local server
npm run dev           # Build for dev + serve
```

## CI/CD Pipeline

### Workflow Triggers

- **Push to main**: Builds and deploys to production
- **Pull Request**: Builds and tests (no deployment)
- **Manual dispatch**: Choose environment for deployment

### Pipeline Stages

1. **Build**
   - Install Node.js dependencies
   - Process templates with environment variables
   - Generate robots.txt, sitemap.xml with correct URLs

2. **Quality Assurance**
   - HTML validation (W3C compliance)
   - Accessibility testing (WCAG 2.1 AA)
   - Performance audit (Lighthouse CI)
   - SEO validation

3. **Deploy** (main branch only)
   - Upload to GitHub Pages
   - Update live website

### Environment Configuration

The build system automatically configures URLs based on the target environment:

**Template Files:**

- `robots.txt.template` → `robots.txt`
- `sitemap.xml.template` → `sitemap.xml`

**HTML Processing:**

- Canonical URLs updated automatically
- Open Graph URLs updated automatically
- Schema.org URLs updated automatically

## Quality Assurance Tools

### HTML Validation

- **Tool**: html-validate
- **Standards**: W3C HTML5 compliance
- **Config**: `.htmlvalidate.json`

### Accessibility Testing

- **Tool**: Pa11y
- **Standards**: WCAG 2.1 AA
- **Config**: `.pa11yci.json`

### Performance Auditing

- **Tool**: Lighthouse CI
- **Metrics**: Core Web Vitals, SEO, Best Practices
- **Config**: `lighthouserc.js`

## File Structure

```
.
├── .github/workflows/static.yml    # CI/CD workflow
├── build.js                        # Build script
├── package.json                    # Dependencies & scripts
├── lighthouserc.js                 # Lighthouse config
├── .htmlvalidate.json              # HTML validation config
├── .pa11yci.json                   # Accessibility testing config
├── robots.txt.template             # SEO robots template
├── sitemap.xml.template            # Sitemap template
├── *.html                          # Website pages
└── assets/                         # Static assets
```

## Deployment

### Automatic Deployment

- Push to `main` branch triggers production deployment
- Pull requests trigger testing only (no deployment)

### Manual Deployment

1. Go to GitHub Actions tab
2. Select "Build, Test & Deploy" workflow
3. Click "Run workflow"
4. Choose environment (development/staging/production)

### Environment URLs

After deployment, the website will be available at:

- **Production**: https://secid.mx (custom domain)
- **GitHub Pages**: https://[username].github.io/secid-website

## Troubleshooting

### Build Failures

1. Check Node.js version (requires 18+)
2. Verify all template files exist
3. Check environment variable configuration

### Test Failures

1. **HTML Validation**: Check markup errors in output
2. **Accessibility**: Review Pa11y report for WCAG violations
3. **Performance**: Check Lighthouse report for optimization opportunities

### Deployment Issues

1. Verify GitHub Pages is enabled
2. Check repository permissions
3. Review workflow logs in GitHub Actions

## Contributing

1. Create feature branch from `main`
2. Make changes and test locally with `npm run dev`
3. Create Pull Request (triggers CI testing)
4. After review and approval, merge to `main` (triggers deployment)

## Monitoring

The CI/CD pipeline provides:

- Build status badges
- Performance metrics via Lighthouse
- Accessibility compliance reporting
- HTML validation results

All reports are available in GitHub Actions run details.
