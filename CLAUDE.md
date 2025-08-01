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

This is a static website with no build process or package.json. Development involves:

- Direct editing of HTML files for content changes
- SASS compilation if modifying styles (though compiled CSS is already included)
- Local web server for testing (e.g., `python -m http.server` or similar)

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