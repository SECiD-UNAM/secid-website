# SEO & Accessibility Guide for SECiD Platform

## Table of Contents

1. [Overview](#overview)
2. [SEO Implementation](#seo-implementation)
3. [Accessibility Implementation](#accessibility-implementation)
4. [Testing & Auditing](#testing--auditing)
5. [Best Practices](#best-practices)
6. [Checklists](#checklists)
7. [Tools & Resources](#tools--resources)
8. [Implementation Examples](#implementation-examples)

## Overview

This guide provides comprehensive instructions for implementing SEO optimizations and WCAG 2.1 Level AA accessibility features on the SECiD platform. The implementation follows modern web standards and best practices for search engine optimization and web accessibility.

### Goals

- **SEO**: Improve search engine visibility and ranking
- **Accessibility**: Ensure WCAG 2.1 Level AA compliance
- **User Experience**: Enhance usability for all users
- **Performance**: Optimize page load times and Core Web Vitals
- **Internationalization**: Support Spanish and English content

## SEO Implementation

### 1. Meta Tags and Structured Data

#### SEOHead Component Usage

The SEOHead component (`/src/components/seo/SEOHead.astro`) provides comprehensive meta tags:

```astro
---
import SEOHead from '../components/seo/SEOHead.astro';
---

<SEOHead
  title="Data Science Jobs - SECiD UNAM"
  description="Find the latest data science job opportunities for UNAM alumni"
  keywords={['data science jobs', 'UNAM alumni', 'machine learning']}
  lang="en"
  ogType="website"
  structuredData={jobBoardStructuredData}
/>
```

#### Key Features

- **Open Graph**: Social media sharing optimization
- **Twitter Cards**: Enhanced Twitter link previews
- **Structured Data**: JSON-LD for rich snippets
- **Hreflang**: Language alternate declarations
- **Canonical URLs**: Prevent duplicate content issues

### 2. SEO Utility Functions

Use `/src/lib/seo-utils.ts` for SEO operations:

```typescript
import {
  generatePageTitle,
  generateMetaDescription,
  checkColorContrast,
  generateJobStructuredData,
} from '../lib/seo-utils';

// Generate optimized titles
const title = generatePageTitle('Job Opportunities');

// Create structured data
const jobData = generateJobStructuredData({
  title: 'Senior Data Scientist',
  company: 'Tech Company',
  location: 'Mexico City',
  description: 'Join our data science team...',
  employmentType: 'FULL_TIME',
  datePosted: '2025-08-03',
  validThrough: '2025-09-03',
});
```

### 3. Robots.txt Configuration

The optimized robots.txt file includes:

- **Allow all crawlers** with rate limiting
- **Block sensitive areas** (admin, dashboard, API)
- **Bot-specific rules** for major search engines
- **Sitemap references** for discovery
- **AI bot blocking** to prevent content scraping

### 4. Sitemap Generation

The sitemap.xml includes:

- **Multilingual support** with hreflang attributes
- **Image sitemaps** for rich media content
- **Priority scoring** based on page importance
- **Change frequencies** for content freshness
- **Last modification dates** for indexing efficiency

## Accessibility Implementation

### 1. WCAG 2.1 Level AA Compliance

#### Color Contrast

All text must meet contrast requirements:

- **Normal text**: 4.5:1 ratio minimum
- **Large text**: 3.0:1 ratio minimum (18pt+ or 14pt+ bold)

```typescript
import { checkColorContrast } from '../lib/accessibility';

const result = checkColorContrast('#333333', '#ffffff', 16, false);
console.log(result.isCompliant); // true/false
console.log(result.ratio); // 12.6:1
```

#### Semantic HTML

Use proper HTML5 semantic elements:

```html
<main id="main-content">
  <section aria-labelledby="jobs-heading">
    <h1 id="jobs-heading">Job Opportunities</h1>
    <article role="listitem">
      <h2>Senior Data Scientist</h2>
      <p>Job description...</p>
    </article>
  </section>
</main>
```

#### ARIA Labels and Roles

Enhance elements with ARIA attributes:

```html
<button aria-expanded="false" aria-controls="menu">Menu</button>
<nav id="menu" role="navigation" aria-label="Main navigation">
  <!-- navigation items -->
</nav>
```

### 2. Accessibility Helper Functions

Use `/src/lib/accessibility.ts` for accessibility features:

```typescript
import {
  AccessibilityAnnouncer,
  FocusManager,
  validateFormAccessibility,
} from '../lib/accessibility';

// Announce dynamic content changes
const announcer = new AccessibilityAnnouncer();
announcer.announce('New job posted', 'polite');

// Manage focus for modal dialogs
const focusManager = new FocusManager();
focusManager.trapFocus(modalElement);
```

### 3. Keyboard Navigation

Ensure all interactive elements are keyboard accessible:

- **Tab navigation**: Logical tab order
- **Enter/Space**: Activate buttons and links
- **Escape**: Close modals and dropdowns
- **Arrow keys**: Navigate menus and lists

### 4. Screen Reader Support

Optimize for screen readers:

- **Skip links**: Jump to main content
- **Heading structure**: Logical H1-H6 hierarchy
- **Alt text**: Descriptive image alternatives
- **Form labels**: Associated with inputs
- **Error messages**: Clearly announced

## Testing & Auditing

### 1. Automated Testing

Run the accessibility audit script:

```bash
# Full accessibility audit
./scripts/accessibility-audit.sh

# Quick axe-core test only
./scripts/accessibility-audit.sh quick

# Color contrast check only
./scripts/accessibility-audit.sh contrast
```

The script generates comprehensive reports in `/accessibility-reports/`:

- **HTML report**: Visual audit results
- **JSON data**: Programmatic analysis
- **Lighthouse scores**: Google accessibility metrics
- **Pa11y results**: WCAG 2.1 compliance

### 2. Manual Testing

#### Screen Reader Testing

Test with popular screen readers:

- **macOS**: VoiceOver (Cmd + F5)
- **Windows**: NVDA (free) or JAWS
- **Linux**: Orca

#### Keyboard Testing

Navigate the entire site using only:

- Tab/Shift+Tab (navigation)
- Enter/Space (activation)
- Arrow keys (menu navigation)
- Escape (close dialogs)

#### Color and Contrast

- Test in high contrast mode
- Verify with color blindness simulators
- Check minimum contrast ratios

### 3. Performance Testing

Monitor Core Web Vitals:

```bash
# Lighthouse performance audit
npm run lighthouse

# Generate performance reports
lighthouse https://secid.mx --output=html --output-path=./performance-report.html
```

## Best Practices

### SEO Best Practices

1. **Content Quality**
   - Write unique, valuable content
   - Use descriptive headings (H1-H6)
   - Include relevant keywords naturally
   - Keep content fresh and updated

2. **Technical SEO**
   - Optimize page load speeds
   - Use clean URL structures
   - Implement proper redirects
   - Fix broken links promptly

3. **Mobile Optimization**
   - Responsive design implementation
   - Touch-friendly interface elements
   - Fast mobile page loads
   - Mobile-first indexing ready

4. **International SEO**
   - Proper hreflang implementation
   - Localized content strategy
   - Cultural adaptation
   - Regional search optimization

### Accessibility Best Practices

1. **Content Structure**
   - Logical heading hierarchy
   - Descriptive link text
   - Clear navigation labels
   - Consistent page layouts

2. **Form Design**
   - Associated labels for all inputs
   - Clear error messages
   - Fieldset for grouped elements
   - Validation feedback

3. **Media Content**
   - Alt text for images
   - Captions for videos
   - Audio descriptions
   - Transcripts for audio content

4. **Interactive Elements**
   - Keyboard accessibility
   - Focus indicators
   - Sufficient target sizes
   - Clear interaction feedback

## Checklists

### SEO Implementation Checklist

#### Page-Level SEO

- [ ] Unique, descriptive title tags (50-60 characters)
- [ ] Meta descriptions (150-160 characters)
- [ ] H1 tag present and descriptive
- [ ] Proper heading hierarchy (H1-H6)
- [ ] Clean URL structure
- [ ] Canonical URL specified
- [ ] Language attributes set
- [ ] Open Graph tags implemented
- [ ] Twitter Card tags added
- [ ] Structured data markup

#### Technical SEO

- [ ] Robots.txt properly configured
- [ ] XML sitemap generated and submitted
- [ ] Internal linking strategy
- [ ] Page load speed optimized
- [ ] Mobile-responsive design
- [ ] HTTPS implementation
- [ ] 404 error pages handled
- [ ] Image optimization (alt tags, compression)
- [ ] Schema.org markup for content types

#### Content SEO

- [ ] Keyword research completed
- [ ] Content optimized for target keywords
- [ ] Content freshness maintained
- [ ] Internal linking implemented
- [ ] External link quality checked
- [ ] Duplicate content avoided
- [ ] URL optimization
- [ ] Image SEO optimization

### Accessibility Implementation Checklist

#### WCAG 2.1 Level AA Requirements

##### Perceivable

- [ ] Alternative text for images
- [ ] Captions for videos
- [ ] Audio descriptions for video content
- [ ] Color contrast ratios meet standards (4.5:1 normal, 3:1 large)
- [ ] Text can be resized up to 200%
- [ ] Images of text avoided where possible

##### Operable

- [ ] All functionality keyboard accessible
- [ ] No content flashes more than 3 times per second
- [ ] Users can pause, stop, or hide moving content
- [ ] Page has descriptive title
- [ ] Focus order is logical
- [ ] Link purpose clear from context
- [ ] Multiple ways to navigate site
- [ ] Section headings used to organize content

##### Understandable

- [ ] Page language identified
- [ ] Language of parts identified when different
- [ ] Navigation is consistent
- [ ] Components identified consistently
- [ ] Input assistance provided for forms
- [ ] Error identification for form inputs
- [ ] Labels or instructions for form inputs
- [ ] Error suggestions provided

##### Robust

- [ ] Valid HTML markup
- [ ] Name, role, value available for UI components
- [ ] Status messages programmatically determined

#### Form Accessibility

- [ ] All form inputs have associated labels
- [ ] Required fields clearly marked
- [ ] Error messages are descriptive
- [ ] Fieldsets used for grouped inputs
- [ ] Form validation provides clear feedback
- [ ] Success messages announced to screen readers

#### Navigation Accessibility

- [ ] Skip navigation links provided
- [ ] Consistent navigation structure
- [ ] Current page indicated in navigation
- [ ] Breadcrumb navigation where appropriate
- [ ] Site search functionality accessible

#### Content Accessibility

- [ ] Heading structure is logical and nested
- [ ] Link text is descriptive
- [ ] Lists used for grouped content
- [ ] Tables have appropriate headers
- [ ] Content reflows at 320px width
- [ ] Line height minimum 1.5 times font size

## Tools & Resources

### SEO Tools

#### Free Tools

- **Google Search Console**: Performance monitoring
- **Google PageSpeed Insights**: Core Web Vitals
- **Google Rich Results Test**: Structured data validation
- **Screaming Frog SEO Spider**: Site crawling (free version)
- **Google Analytics**: Traffic analysis

#### Browser Extensions

- **SEO Minion**: On-page SEO analysis
- **SEOquake**: Quick SEO metrics
- **Keyword Surfer**: Search volume data
- **MozBar**: Domain authority metrics

### Accessibility Tools

#### Automated Testing

- **axe-core**: Comprehensive accessibility testing
- **Lighthouse**: Built-in Chrome accessibility audit
- **Pa11y**: Command-line accessibility testing
- **WAVE**: Web accessibility evaluation

#### Manual Testing

- **VoiceOver** (macOS): Built-in screen reader
- **NVDA** (Windows): Free screen reader
- **JAWS** (Windows): Professional screen reader
- **Orca** (Linux): GNOME screen reader

#### Browser Extensions

- **axe DevTools**: In-browser accessibility testing
- **WAVE**: Visual accessibility feedback
- **Colour Contrast Analyser**: Color testing
- **Accessibility Insights**: Microsoft's testing tool

#### Design Tools

- **Stark**: Figma/Sketch accessibility plugin
- **Colour Oracle**: Color blindness simulator
- **TPGi Color Contrast Analyser**: Desktop application

### Development Resources

#### Documentation

- **WCAG 2.1 Guidelines**: Official accessibility standards
- **MDN Accessibility**: Developer documentation
- **WebAIM**: Accessibility tutorials and tools
- **A11y Project**: Community accessibility resources

#### Testing Frameworks

- **jest-axe**: Jest accessibility testing
- **cypress-axe**: Cypress accessibility testing
- **playwright-axe**: Playwright accessibility testing

## Implementation Examples

### Example 1: Job Listing Page SEO

```astro
---
// /src/pages/en/jobs.astro
import SEOHead from '../../components/seo/SEOHead.astro';
import { generateJobStructuredData } from '../../lib/seo-utils';

const jobs = await getJobs();
const structuredData = jobs.map((job) => generateJobStructuredData(job));
---

<SEOHead
  title="Data Science Jobs for UNAM Alumni - SECiD"
  description="Discover exclusive data science job opportunities for UNAM graduates. Connect with top employers and advance your career in data science."
  keywords={[
    'data science jobs',
    'UNAM alumni',
    'machine learning careers',
    'data analyst positions',
  ]}
  lang="en"
  ogType="website"
  structuredData={{
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    mainEntity: structuredData,
  }}
  breadcrumbs={[
    { name: 'Home', url: '/en/' },
    { name: 'Jobs', url: '/en/jobs' },
  ]}
/>

<main id="main-content">
  <h1>Data Science Job Opportunities</h1>

  <section aria-labelledby="featured-jobs">
    <h2 id="featured-jobs">Featured Positions</h2>
    {
      jobs.map((job) => (
        <article role="listitem" class="job-card">
          <h3>
            <a href={`/en/jobs/${job.id}`}>{job.title}</a>
          </h3>
          <p class="company">{job.company}</p>
          <p class="location">{job.location}</p>
          <div class="description">{job.description}</div>
        </article>
      ))
    }
  </section>
</main>
```

### Example 2: Accessible Form Implementation

```astro
---
// Contact form with full accessibility
import { validateFormAccessibility } from '../../lib/accessibility';
---

<form aria-labelledby="contact-heading" novalidate>
  <h2 id="contact-heading">Contact Us</h2>

  <fieldset>
    <legend>Personal Information</legend>

    <div class="form-group">
      <label for="name">
        Full Name <span aria-label="required">*</span>
      </label>
      <input
        type="text"
        id="name"
        name="name"
        required
        aria-describedby="name-error"
        aria-invalid="false"
      />
      <div id="name-error" class="error-message" role="alert" hidden>
        Please enter your full name
      </div>
    </div>

    <div class="form-group">
      <label for="email">
        Email Address <span aria-label="required">*</span>
      </label>
      <input
        type="email"
        id="email"
        name="email"
        required
        aria-describedby="email-help email-error"
        aria-invalid="false"
      />
      <div id="email-help" class="help-text">
        We'll never share your email address
      </div>
      <div id="email-error" class="error-message" role="alert" hidden>
        Please enter a valid email address
      </div>
    </div>
  </fieldset>

  <fieldset>
    <legend>Message</legend>

    <div class="form-group">
      <label for="subject">Subject</label>
      <select id="subject" name="subject" aria-describedby="subject-help">
        <option value="">Choose a topic</option>
        <option value="general">General Inquiry</option>
        <option value="membership">Membership</option>
        <option value="jobs">Job Opportunities</option>
        <option value="events">Events</option>
      </select>
      <div id="subject-help" class="help-text">
        Select the topic that best matches your inquiry
      </div>
    </div>

    <div class="form-group">
      <label for="message">
        Message <span aria-label="required">*</span>
      </label>
      <textarea
        id="message"
        name="message"
        required
        rows="5"
        aria-describedby="message-counter message-error"
        aria-invalid="false"></textarea>
      <div id="message-counter" class="character-counter">
        0 / 500 characters
      </div>
      <div id="message-error" class="error-message" role="alert" hidden>
        Please enter your message (minimum 10 characters)
      </div>
    </div>
  </fieldset>

  <div class="form-actions">
    <button type="submit" class="primary-button"> Send Message </button>
    <button type="reset" class="secondary-button"> Clear Form </button>
  </div>
</form>

<script>
  import {
    AccessibilityAnnouncer,
    FocusManager,
  } from '../../lib/accessibility';

  const announcer = new AccessibilityAnnouncer();
  const form = document.querySelector('form');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Validate form
    const isValid = validateForm();

    if (isValid) {
      announcer.announce('Form submitted successfully', 'assertive');
      // Submit form
    } else {
      announcer.announce('Please fix the errors in the form', 'assertive');
      // Focus first error
      const firstError = form.querySelector('[aria-invalid="true"]');
      if (firstError) {
        firstError.focus();
      }
    }
  });

  function validateForm() {
    // Form validation logic
    return true;
  }
</script>
```

### Example 3: Accessible Navigation Menu

```astro
---
// Main navigation with full keyboard support
---

<nav role="navigation" aria-label="Main navigation">
  <ul class="nav-menu" role="menubar">
    <li role="none">
      <a href="/en/" role="menuitem" class="nav-link">Home</a>
    </li>

    <li role="none">
      <button
        role="menuitem"
        aria-expanded="false"
        aria-haspopup="true"
        aria-controls="jobs-submenu"
        class="nav-button"
      >
        Jobs
      </button>
      <ul id="jobs-submenu" role="menu" class="submenu" hidden>
        <li role="none">
          <a href="/en/jobs" role="menuitem">Browse Jobs</a>
        </li>
        <li role="none">
          <a href="/en/post-job" role="menuitem">Post a Job</a>
        </li>
        <li role="none">
          <a href="/en/career-resources" role="menuitem">Career Resources</a>
        </li>
      </ul>
    </li>

    <li role="none">
      <a href="/en/members" role="menuitem" class="nav-link">Members</a>
    </li>

    <li role="none">
      <a href="/en/events" role="menuitem" class="nav-link">Events</a>
    </li>

    <li role="none">
      <a href="/en/about-us" role="menuitem" class="nav-link">About</a>
    </li>
  </ul>
</nav>

<style>
  /* Focus styles for accessibility */
  .nav-link:focus,
  .nav-button:focus {
    outline: 2px solid #f65425;
    outline-offset: 2px;
    background-color: rgba(246, 84, 37, 0.1);
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .nav-link:focus,
    .nav-button:focus {
      outline: 3px solid;
      background-color: Highlight;
      color: HighlightText;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .submenu {
      transition: none;
    }
  }
</style>

<script>
  // Keyboard navigation for menu
  const menuButtons = document.querySelectorAll('[aria-haspopup="true"]');

  menuButtons.forEach((button) => {
    button.addEventListener('click', toggleSubmenu);
    button.addEventListener('keydown', handleMenuKeydown);
  });

  function toggleSubmenu(e) {
    const button = e.target;
    const submenu = document.getElementById(
      button.getAttribute('aria-controls')
    );
    const isExpanded = button.getAttribute('aria-expanded') === 'true';

    button.setAttribute('aria-expanded', !isExpanded);
    submenu.hidden = isExpanded;

    if (!isExpanded) {
      // Focus first item in submenu
      const firstItem = submenu.querySelector('[role="menuitem"]');
      if (firstItem) {
        firstItem.focus();
      }
    }
  }

  function handleMenuKeydown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        openSubmenuAndFocusFirst(e.target);
        break;
      case 'Escape':
        e.preventDefault();
        closeAllSubmenus();
        break;
    }
  }

  function openSubmenuAndFocusFirst(button) {
    const submenu = document.getElementById(
      button.getAttribute('aria-controls')
    );
    button.setAttribute('aria-expanded', 'true');
    submenu.hidden = false;

    const firstItem = submenu.querySelector('[role="menuitem"]');
    if (firstItem) {
      firstItem.focus();
    }
  }

  function closeAllSubmenus() {
    menuButtons.forEach((button) => {
      button.setAttribute('aria-expanded', 'false');
      const submenu = document.getElementById(
        button.getAttribute('aria-controls')
      );
      submenu.hidden = true;
    });
  }

  // Close submenus when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('nav')) {
      closeAllSubmenus();
    }
  });
</script>
```

## Maintenance and Updates

### Regular Audits

1. **Monthly SEO Review**
   - Check Google Search Console for issues
   - Review page performance metrics
   - Update meta descriptions and titles
   - Analyze keyword rankings

2. **Quarterly Accessibility Audit**
   - Run automated accessibility tests
   - Conduct manual screen reader testing
   - Review and update ARIA labels
   - Test keyboard navigation

3. **Annual Comprehensive Review**
   - Full SEO audit and strategy update
   - Complete accessibility compliance review
   - Performance optimization assessment
   - Content strategy evaluation

### Monitoring Tools

Set up continuous monitoring:

```bash
# Add to CI/CD pipeline
npm run test:accessibility
npm run lighthouse:ci
npm run seo:audit
```

### Documentation Updates

Keep this guide updated with:

- New WCAG guidelines
- Search engine algorithm changes
- Browser compatibility updates
- Tool recommendations and updates

---

**Note**: This guide should be reviewed and updated regularly to reflect the latest web standards, accessibility guidelines, and SEO best practices. For questions or suggestions, contact the SECiD development team.
