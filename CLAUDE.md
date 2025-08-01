# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a static website for SECiD (Sociedad de Egresados en Ciencia de Datos) - UNAM's Data Science Alumni Society. The website is built using HTML5 UP's Editorial template and serves as a platform to connect data science alumni, showcase job opportunities, and facilitate member registration.

## Architecture

The project is a static HTML/CSS/JavaScript website with the following structure:

- **Main pages**: `index.html` (homepage), `aboutus.html` (about page), `job-submission.html` (job posting form), `elements.html` (template elements showcase)
- **Registration redirect**: `registro.html` redirects to a Google Form for member registration
- **Assets**: Located in `assets/` directory with CSS, JavaScript, SASS source files, and web fonts
- **Template source**: Original HTML5 UP template preserved in `raw_template/` directory
- **Analytics**: Amplitude analytics integration for tracking user interactions and session replay

## Key Features

- Responsive design using HTML5 UP Editorial template
- Form-based job submission system
- External registration via Google Forms redirect
- Analytics tracking with Amplitude
- FontAwesome icons and custom styling
- SASS-based CSS architecture

## Development Commands

This is a static website with Node.js tooling for validation and testing. Development commands:

**Local Development:**
- `npm run dev` - Build for development and start local server
- `npm run serve` - Start local server on port 3000
- `npm run build:dev` - Build for development environment

**Testing & Validation:**
- `npm run precommit` - Run all pre-commit validation checks
- `npm run test:local` - Run complete local validation suite
- `npm run validate:html` - Validate HTML structure
- `npm run validate:schema` - Validate Schema.org structured data

**Production:**
- `npm run build` - Build for production
- `npm run build:staging` - Build for staging environment

**Pre-commit Hooks:**
Pre-commit hooks are automatically configured via Husky and will run validation on staged files before each commit. This prevents broken code from reaching the repository.

## File Organization

- `/assets/css/`: Compiled CSS files
- `/assets/js/`: JavaScript files for UI interactions
- `/assets/sass/`: SASS source files organized by components, layout, and base styles
- `/images/`: Site images including logos and favicon
- `/raw_template/`: Original HTML5 UP template (reference only)

## Analytics Integration

The site uses Amplitude analytics with session replay enabled. The tracking code is embedded in HTML files and captures element interactions automatically.

## External Dependencies

- jQuery (minified, local copy)
- FontAwesome (complete icon set included)
- Amplitude Analytics (CDN-loaded)
- HTML5 UP template framework