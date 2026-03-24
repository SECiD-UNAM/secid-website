# SECiD Component System Documentation

## Overview

This document describes the custom component system designed for the SECiD website. The system features a futuristic, minimalist aesthetic that incorporates data science themes while maintaining a professional and academic feel.

## Brand Colors

```css
:root {
  --secid-primary: #f65425; /* Mandarina/Orange - Primary CTA */
  --secid-secondary: #5b7f99; /* Azul/Blue - Secondary */
  --secid-dark-blue: #385061; /* Azul Oscuro/Dark Blue - Text */
  --secid-gold: #fdb157; /* Dorado/Gold - Accents */
  --secid-cream: #f4efe0; /* Crema/Cream - Backgrounds */
}
```

## Installation

1. Include the CSS file:

```html
<link rel="stylesheet" href="public/assets/css/secid-components.css" />
```

2. Include the JavaScript file:

```html
<script src="public/assets/js/secid-components.js"></script>
```

3. Include required fonts:

```html
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

4. Include FontAwesome for icons:

```html
<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
/>
```

## Components

### 1. Buttons

Modern button system with multiple variants, sizes, and states.

#### Variants

```html
<!-- Primary Button -->
<button class="secid-button secid-button--primary">
  <i class="fas fa-star secid-button__icon"></i>
  Primary Action
</button>

<!-- Secondary Button -->
<button class="secid-button secid-button--secondary">
  <i class="fas fa-users secid-button__icon"></i>
  Secondary Action
</button>

<!-- Outline Button -->
<button class="secid-button secid-button--outline">
  <i class="fas fa-download secid-button__icon"></i>
  Outline Button
</button>

<!-- Ghost Button -->
<button class="secid-button secid-button--ghost">
  <i class="fas fa-edit secid-button__icon"></i>
  Ghost Button
</button>
```

#### Sizes

```html
<button class="secid-button secid-button--primary secid-button--sm">
  Small
</button>
<button class="secid-button secid-button--primary">Normal</button>
<button class="secid-button secid-button--primary secid-button--lg">
  Large
</button>
<button class="secid-button secid-button--primary secid-button--xl">
  Extra Large
</button>
```

#### States

```html
<!-- Loading State -->
<button class="secid-button secid-button--primary secid-button--loading">
  Loading
</button>

<!-- Disabled State -->
<button class="secid-button secid-button--primary" disabled>Disabled</button>
```

### 2. Navigation Bar

Fixed header with glassmorphism effect and responsive mobile menu.

```html
<nav class="secid-navbar">
  <div class="secid-navbar__container">
    <a href="#" class="secid-navbar__logo">
      <div class="secid-navbar__logo-icon">
        <i class="fas fa-chart-line"></i>
      </div>
      SECiD
    </a>

    <div class="secid-navbar__nav">
      <a href="#" class="secid-navbar__link secid-navbar__link--active"
        >Inicio</a
      >
      <a href="#" class="secid-navbar__link">Empleos</a>
      <a href="#" class="secid-navbar__link">Miembros</a>
      <a href="#" class="secid-navbar__link">Nosotros</a>
    </div>

    <div class="secid-navbar__actions">
      <a href="#" class="secid-button secid-button--outline secid-button--sm"
        >Iniciar Sesión</a
      >
      <a href="#" class="secid-button secid-button--primary secid-button--sm"
        >Registrarse</a
      >
    </div>

    <!-- Mobile Menu Toggle -->
    <div class="secid-navbar__mobile-toggle">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>

  <!-- Mobile Menu -->
  <div class="secid-navbar__mobile-menu">
    <nav class="secid-navbar__mobile-nav">
      <a href="#" class="secid-navbar__link">Inicio</a>
      <a href="#" class="secid-navbar__link">Empleos</a>
      <a href="#" class="secid-navbar__link">Miembros</a>
      <a href="#" class="secid-navbar__link">Nosotros</a>
    </nav>
  </div>
</nav>
```

### 3. Hero Section

Split layout hero with animated elements and data visualization themes.

```html
<section class="secid-hero">
  <div class="secid-hero__container">
    <div class="secid-hero__content">
      <h1 class="secid-hero__title">
        Conectando el futuro de la
        <span class="secid-hero__title-highlight">Ciencia de Datos</span>
      </h1>
      <p class="secid-hero__subtitle">
        La red de egresados en Ciencia de Datos más grande de México.
      </p>
      <div class="secid-hero__actions">
        <a href="#" class="secid-button secid-button--primary secid-button--lg">
          <i class="fas fa-rocket secid-button__icon"></i>
          Únete Ahora
        </a>
        <a href="#" class="secid-button secid-button--outline secid-button--lg">
          <i class="fas fa-play secid-button__icon"></i>
          Ver Demo
        </a>
      </div>
    </div>
    <div class="secid-hero__visual">
      <div class="secid-hero__graphic">
        <!-- Your custom graphics here -->
      </div>
      <div class="secid-hero__floating-element"></div>
      <div class="secid-hero__floating-element"></div>
      <div class="secid-hero__floating-element"></div>
    </div>
  </div>
</section>
```

### 4. Job Cards

Modern card design for displaying job opportunities.

```html
<div class="secid-job-card">
  <div class="secid-job-card__header">
    <div class="secid-job-card__company">
      <div class="secid-job-card__logo">TF</div>
      <div class="secid-job-card__company-info">
        <h3>Senior Data Scientist</h3>
        <p class="secid-job-card__company-name">TechFlow AI</p>
      </div>
    </div>
    <span class="secid-job-card__status secid-job-card__status--remote"
      >Remoto</span
    >
  </div>

  <p class="secid-job-card__description">
    Buscamos un Data Scientist senior para liderar proyectos de machine
    learning.
  </p>

  <div class="secid-job-card__tags">
    <span class="secid-job-card__tag">Python</span>
    <span class="secid-job-card__tag">TensorFlow</span>
    <span class="secid-job-card__tag">SQL</span>
  </div>

  <div class="secid-job-card__footer">
    <div class="secid-job-card__meta">
      <span class="secid-job-card__salary">$80k - $120k</span>
      <span>•</span>
      <span>Hace 2 días</span>
    </div>
    <button class="secid-button secid-button--primary secid-button--sm">
      Ver Detalles
    </button>
  </div>
</div>
```

#### Job Status Variants

```html
<!-- Remote -->
<span class="secid-job-card__status secid-job-card__status--remote"
  >Remoto</span
>

<!-- Hybrid -->
<span class="secid-job-card__status secid-job-card__status--hybrid"
  >Híbrido</span
>

<!-- On-site -->
<span class="secid-job-card__status secid-job-card__status--onsite"
  >Presencial</span
>
```

### 5. Feature Cards

Cards for showcasing platform features and benefits.

```html
<div class="secid-feature-card">
  <div class="secid-feature-card__icon">
    <i class="fas fa-network-wired"></i>
  </div>
  <h3 class="secid-feature-card__title">Red de Contactos</h3>
  <p class="secid-feature-card__description">
    Conecta con más de 5,000 profesionales en ciencia de datos.
  </p>
  <a href="#" class="secid-button secid-button--outline">Explorar Red</a>
</div>
```

### 6. Forms

Modern form system with validation states and interactive feedback.

```html
<div class="secid-form">
  <form>
    <div class="secid-form__group">
      <label class="secid-form__label" for="name">Nombre Completo</label>
      <input
        type="text"
        id="name"
        class="secid-form__input"
        placeholder="Tu nombre completo"
        required
      />
    </div>

    <div class="secid-form__group">
      <label class="secid-form__label" for="email">Email</label>
      <input
        type="email"
        id="email"
        class="secid-form__input"
        placeholder="tu.email@ejemplo.com"
      />
    </div>

    <div class="secid-form__group">
      <label class="secid-form__label" for="role">Rol Actual</label>
      <select id="role" class="secid-form__select">
        <option value="">Selecciona tu rol</option>
        <option value="data-scientist">Data Scientist</option>
        <option value="data-analyst">Data Analyst</option>
        <option value="ml-engineer">ML Engineer</option>
      </select>
    </div>

    <div class="secid-form__group">
      <label class="secid-form__label" for="bio">Biografía</label>
      <textarea
        id="bio"
        class="secid-form__textarea"
        placeholder="Cuéntanos sobre tu experiencia..."
      ></textarea>
    </div>

    <div class="secid-form__group">
      <label class="secid-form__checkbox">
        <input type="checkbox" required />
        Acepto los términos y condiciones
      </label>
    </div>

    <button
      type="submit"
      class="secid-button secid-button--primary secid-button--lg"
    >
      Enviar Formulario
    </button>
  </form>
</div>
```

#### Form Validation States

```html
<!-- Success State -->
<input
  class="secid-form__input secid-form__input--success"
  value="valid@email.com"
/>
<div class="secid-form__success">
  <i class="fas fa-check-circle"></i>
  Email válido
</div>

<!-- Error State -->
<input class="secid-form__input secid-form__input--error" />
<div class="secid-form__error">
  <i class="fas fa-exclamation-circle"></i>
  Este campo es requerido
</div>
```

### 7. Footer

Multi-level modern footer with social links and organized navigation.

```html
<footer class="secid-footer">
  <div class="secid-footer__container">
    <div class="secid-footer__content">
      <div class="secid-footer__brand">
        <a href="#" class="secid-footer__logo">
          <div class="secid-footer__logo-icon">
            <i class="fas fa-chart-line"></i>
          </div>
          SECiD
        </a>
        <p class="secid-footer__description">
          La red de egresados en Ciencia de Datos más grande de México.
        </p>
        <div class="secid-footer__social">
          <a href="#" class="secid-footer__social-link">
            <i class="fab fa-linkedin"></i>
          </a>
          <a href="#" class="secid-footer__social-link">
            <i class="fab fa-twitter"></i>
          </a>
          <a href="#" class="secid-footer__social-link">
            <i class="fab fa-github"></i>
          </a>
        </div>
      </div>

      <div class="secid-footer__column">
        <h4>Plataforma</h4>
        <ul class="secid-footer__links">
          <li><a href="#" class="secid-footer__link">Empleos</a></li>
          <li><a href="#" class="secid-footer__link">Miembros</a></li>
          <li><a href="#" class="secid-footer__link">Eventos</a></li>
        </ul>
      </div>

      <!-- More columns... -->
    </div>

    <div class="secid-footer__bottom">
      <p class="secid-footer__copyright">
        © 2024 SECiD - Sociedad de Egresados en Ciencia de Datos UNAM
      </p>
      <div class="secid-footer__legal">
        <a href="#">Privacidad</a>
        <a href="#">Términos</a>
        <a href="#">Cookies</a>
      </div>
    </div>
  </div>
</footer>
```

### 8. Loading States

#### Spinners

```html
<!-- Different sizes -->
<div class="secid-spinner secid-spinner--sm"></div>
<div class="secid-spinner"></div>
<div class="secid-spinner secid-spinner--lg"></div>
```

#### Skeleton Loaders

```html
<!-- For text content -->
<div class="secid-skeleton secid-skeleton--title"></div>
<div class="secid-skeleton secid-skeleton--text"></div>
<div class="secid-skeleton secid-skeleton--text"></div>

<!-- For profile -->
<div style="display: flex; gap: 1rem; align-items: center;">
  <div class="secid-skeleton secid-skeleton--avatar"></div>
  <div style="flex: 1;">
    <div class="secid-skeleton secid-skeleton--text"></div>
    <div class="secid-skeleton secid-skeleton--text"></div>
  </div>
</div>

<!-- For cards -->
<div class="secid-skeleton secid-skeleton--card"></div>
```

#### Loading Overlay

```html
<div class="secid-loading-overlay">
  <div class="secid-spinner secid-spinner--lg"></div>
</div>
```

### 9. Data Visualization Elements

#### Background Patterns

```html
<!-- Dot pattern -->
<div class="secid-data-pattern"></div>

<!-- Grid pattern -->
<div class="secid-data-grid"></div>

<!-- Chart visualization -->
<div class="secid-data-visualization">
  <div class="secid-data-chart"></div>
</div>
```

### 10. Member Profile Cards

Cards for displaying alumni directory information.

```html
<div class="secid-member-card">
  <div class="secid-member-card__avatar">
    <!-- Can contain initials or image -->
    AM
  </div>
  <h3 class="secid-member-card__name">Ana Martínez</h3>
  <p class="secid-member-card__title">Senior Data Scientist</p>
  <p class="secid-member-card__company">Google</p>

  <div class="secid-member-card__skills">
    <span class="secid-member-card__skill">Python</span>
    <span class="secid-member-card__skill">TensorFlow</span>
    <span class="secid-member-card__skill">SQL</span>
  </div>

  <div class="secid-member-card__contact">
    <a href="#" class="secid-member-card__contact-link">
      <i class="fab fa-linkedin"></i>
    </a>
    <a href="#" class="secid-member-card__contact-link">
      <i class="fab fa-twitter"></i>
    </a>
    <a href="#" class="secid-member-card__contact-link">
      <i class="fas fa-envelope"></i>
    </a>
  </div>
</div>
```

## Layout Utilities

### Container

```html
<div class="secid-container">
  <!-- Content with max-width and centered -->
</div>
```

### Sections

```html
<section class="secid-section">
  <!-- Section with proper padding -->
</section>
```

### Grid Layouts

```html
<!-- 2 columns -->
<div class="secid-grid secid-grid--2">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<!-- 3 columns -->
<div class="secid-grid secid-grid--3">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>

<!-- 4 columns -->
<div class="secid-grid secid-grid--4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
  <div>Item 4</div>
</div>
```

### Background Utilities

```html
<!-- Cream background -->
<div class="secid-bg-cream">Content</div>

<!-- Gradient background -->
<div class="secid-bg-gradient">Content</div>
```

### Text Utilities

```html
<p class="secid-text-center">Centered text</p>
<p class="secid-text-primary">Primary color text</p>
<p class="secid-text-secondary">Secondary color text</p>
```

## JavaScript API

The JavaScript component system provides interactive functionality:

### Toast Notifications

```javascript
const components = new SECiDComponents();

// Show different types of toasts
components.showToast('Success message', 'success');
components.showToast('Error message', 'error');
components.showToast('Warning message', 'warning');
components.showToast('Info message', 'info');
```

### Button Loading State

```javascript
const button = document.querySelector('.my-button');

// Set loading state
components.setButtonLoading(button, true);

// Remove loading state
components.setButtonLoading(button, false);
```

### Form Validation

Forms are automatically validated when the JavaScript is loaded. You can also manually validate:

```javascript
const input = document.querySelector('#my-input');
components.validateInput(input);
```

### Modal Control

```javascript
// Open modal
components.openModal('modal-id');

// Close modal
components.closeModal(document.querySelector('#modal-id'));
```

### Utility Functions

```javascript
// Copy to clipboard
components.copyToClipboard('Text to copy');

// Format currency
const formatted = components.formatCurrency(75000); // "$75,000.00"

// Format date
const formatted = components.formatDate('2024-12-25'); // "25 de diciembre de 2024"
```

## Responsive Design

All components are fully responsive and follow these breakpoints:

- **Mobile**: < 480px
- **Tablet**: 480px - 768px
- **Desktop**: 768px - 1024px
- **Large Desktop**: > 1024px

## Accessibility Features

- **Focus Management**: Clear focus indicators on all interactive elements
- **Keyboard Navigation**: Full keyboard support for all components
- **Screen Reader Support**: Proper ARIA labels and semantic markup
- **High Contrast Mode**: Support for users with visual impairments
- **Reduced Motion**: Respects user's motion preferences

## Browser Support

- **Modern Browsers**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **CSS Features**: CSS Grid, Flexbox, Custom Properties, Backdrop Filter
- **JavaScript Features**: ES6+, Intersection Observer, Async/Await

## Performance

- **CSS**: ~15KB minified and gzipped
- **JavaScript**: ~8KB minified and gzipped
- **No Dependencies**: Pure CSS and JavaScript implementation
- **Optimized Animations**: Hardware-accelerated transforms
- **Lazy Loading**: Intersection Observer for scroll animations

## Customization

### CSS Custom Properties

You can easily customize the design system by overriding CSS custom properties:

```css
:root {
  /* Override brand colors */
  --secid-primary: #your-color;
  --secid-secondary: #your-color;

  /* Override spacing */
  --space-md: 1.5rem;

  /* Override typography */
  --font-family-base: 'Your Font', sans-serif;
}
```

### Component Variants

Create custom variants by extending the base classes:

```css
.secid-button--custom {
  background: linear-gradient(135deg, #purple, #pink);
  color: white;
}

.secid-card--featured {
  border: 2px solid var(--secid-gold);
  background: linear-gradient(135deg, rgba(253, 177, 87, 0.1), transparent);
}
```

## Examples

See `component-examples.html` for a complete demonstration of all components in action.

## Support

For questions or issues with the component system, please refer to the main project documentation or create an issue in the project repository.
