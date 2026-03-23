// @ts-nocheck
/**
 * Accessibility Helper Functions for SECiD Platform
 * Implements WCAG 2.1 Level AA compliance utilities
 */

export interface AccessibilityOptions {
  enableAnnouncements: boolean;
  enableFocusManagement: boolean;
  enableKeyboardNavigation: boolean;
  highContrastMode: boolean;
  reducedMotion: boolean;
  screenReaderOptimized: boolean;
}

export interface ColorContrastResult {
  ratio: number;
  isCompliant: boolean;
  level: 'AA' | 'AAA' | 'fail';
  recommendation?: string;
}

export interface AccessibilityAuditResult {
  score: number;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    element?: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  recommendations: string[];
}

/**
 * Validates color contrast ratios according to WCAG guidelines
 */
export function checkColorContrast(
  foreground: string,
  background: string,
  fontSize: number = 16,
  isBold: boolean = false
): ColorContrastResult {
  const fgRgb = hexToRgb(foreground);
  const bgRgb = hexToRgb(background);

  if (!fgRgb || !bgRgb) {
    return {
      ratio: 0,
      isCompliant: false,
      level: 'fail',
      recommendation: 'Invalid color format. Use hex colors (e.g., #000000)',
    };
  }

  const fgLuminance = getRelativeLuminance(fgRgb);
  const bgLuminance = getRelativeLuminance(bgRgb);

  const ratio =
    (Math.max(fgLuminance, bgLuminance) + 0.05) /
    (Math.min(fgLuminance, bgLuminance) + 0.05);

  // Determine if text is large (18pt+ or 14pt+ bold)
  const isLargeText = fontSize >= 18 || (fontSize >= 14 && isBold);

  // WCAG criteria
  const aaRequirement = isLargeText ? 3.0 : 4.5;
  const aaaRequirement = isLargeText ? 4.5 : 7.0;

  let level: 'AA' | 'AAA' | 'fail';
  let isCompliant: boolean;
  let recommendation: string | undefined;

  if (ratio >= aaaRequirement) {
    level = 'AAA';
    isCompliant = true;
  } else if (ratio >= aaRequirement) {
    level = 'AA';
    isCompliant = true;
  } else {
    level = 'fail';
    isCompliant = false;
    recommendation =
      `Contrast ratio ${ratio.toFixed(2)}:1 is below WCAG AA standard (${aaRequirement}:1). ` +
      'Consider using darker text or lighter background.';
  }

  return { ratio, isCompliant, level, recommendation };
}

/**
 * Converts hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result?.[1], 16),
        g: parseInt(result?.[2], 16),
        b: parseInt(result?.[3], 16),
      }
    : null;
}

/**
 * Calculates relative luminance for contrast calculations
 */
function getRelativeLuminance(rgb: {
  r: number;
  g: number;
  b: number;
}): number {
  const { r, g, b } = rgb;

  const normalize = (c: number) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * normalize(r) + 0.7152 * normalize(g) + 0.0722 * normalize(b);
}

/**
 * Validates form accessibility
 */
export function validateFormAccessibility(
  formElement: HTMLFormElement
): AccessibilityAuditResult {
  const issues: AccessibilityAuditResult.issues = [];
  const recommendations: string[] = [];
  let score = 100;

  // Check form labels
  const inputs = formElement.querySelectorAll('input, select, textarea');
  inputs.forEach((input, index) => {
    const id = input.getAttribute('id');
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledBy = input.getAttribute('aria-labelledby');
    const label = id ? formElement.querySelector(`label[for="${id}"]`) : null;

    if (!label && !ariaLabel && !ariaLabelledBy) {
      issues.push({
        type: 'error',
        message: `Form input ${index + 1} is missing a label`,
        element: input.tagName.toLowerCase(),
        severity: 'high',
      });
      score -= 15;
    }
  });

  // Check fieldsets for grouped inputs
  const radioGroups = formElement.querySelectorAll('input[type="radio"]');
  const checkboxGroups = formElement.querySelectorAll('input[type="checkbox"]');

  if (radioGroups.length > 1 || checkboxGroups.length > 1) {
    const fieldset = formElement.querySelector('fieldset');
    if (!fieldset) {
      recommendations.push(
        'Use fieldset and legend for grouping related form controls'
      );
      score -= 5;
    }
  }

  // Check error messages
  const errorElements = formElement.querySelectorAll('[aria-invalid="true"]');
  errorElements.forEach((element) => {
    const describedBy = element.getAttribute('aria-describedby');
    if (!describedBy) {
      issues.push({
        type: 'warning',
        message: 'Error state should be described with aria-describedby',
        element: element.tagName.toLowerCase(),
        severity: 'medium',
      });
      score -= 10;
    }
  });

  return { score, issues, recommendations };
}

/**
 * Validates heading structure
 */
export function validateHeadingStructure(
  element: HTMLElement
): AccessibilityAuditResult {
  const issues: AccessibilityAuditResult['issues'] = [];
  const recommendations: string[] = [];
  let score = 100;

  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const headingLevels: number[] = [];

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    headingLevels.push(level);

    // Check for skipped levels
    if (index > 0) {
      const prevLevel = headingLevels[index - 1];
      if (level > prevLevel + 1) {
        issues.push({
          type: 'warning',
          message: `Heading level skipped: H${prevLevel} to H${level}`,
          element: heading.tagName.toLowerCase(),
          severity: 'medium',
        });
        score -= 10;
      }
    }
  });

  // Check for multiple H1s
  const h1Count = element.querySelectorAll('h1').length;
  if (h1Count > 1) {
    issues.push({
      type: 'warning',
      message: 'Multiple H1 elements found. Use only one H1 per page',
      element: 'h1',
      severity: 'medium',
    });
    score -= 5;
  } else if (h1Count === 0) {
    issues.push({
      type: 'error',
      message: 'No H1 element found. Every page should have one main heading',
      element: 'h1',
      severity: 'high',
    });
    score -= 20;
  }

  return { score, issues, recommendations };
}

/**
 * Validates image accessibility
 */
export function validateImageAccessibility(
  element: HTMLElement
): AccessibilityAuditResult {
  const issues: AccessibilityAuditResult['issues'] = [];
  const recommendations: string[] = [];
  let score = 100;

  const images = element.querySelectorAll('img');

  images.forEach((img, index) => {
    const alt = img.getAttribute('alt');
    const role = img.getAttribute('role');
    const ariaLabel = img.getAttribute('aria-label');

    // Check for missing alt text
    if (alt === null) {
      issues.push({
        type: 'error',
        message: `Image ${index + 1} is missing alt attribute`,
        element: 'img',
        severity: 'high',
      });
      score -= 15;
    }

    // Check for generic alt text
    const genericAltText = ['image', 'photo', 'picture', 'graphic'];
    if (
      alt &&
      genericAltText.some((generic) => alt.toLowerCase().includes(generic))
    ) {
      issues.push({
        type: 'warning',
        message: `Image ${index + 1} has generic alt text: "${alt}"`,
        element: 'img',
        severity: 'medium',
      });
      score -= 5;
    }

    // Check decorative images
    if (alt === '' && !role && !ariaLabel) {
      recommendations.push(
        `Consider adding role="presentation" to decorative image ${index + 1}`
      );
    }
  });

  return { score, issues, recommendations };
}

/**
 * Validates link accessibility
 */
export function validateLinkAccessibility(
  element: HTMLElement
): AccessibilityAuditResult {
  const issues: AccessibilityAuditResult['issues'] = [];
  const recommendations: string[] = [];
  let score = 100;

  const links = element.querySelectorAll('a');

  links.forEach((link, index) => {
    const href = link.getAttribute('href');
    const text = link?.textContent?.trim();
    const ariaLabel = link.getAttribute('aria-label');
    const title = link.getAttribute('title');

    // Check for missing href
    if (!href) {
      issues.push({
        type: 'warning',
        message: `Link ${index + 1} is missing href attribute`,
        element: 'a',
        severity: 'medium',
      });
      score -= 10;
    }

    // Check for empty link text
    if (!text && !ariaLabel && !title) {
      issues.push({
        type: 'error',
        message: `Link ${index + 1} has no accessible text`,
        element: 'a',
        severity: 'high',
      });
      score -= 15;
    }

    // Check for generic link text
    const genericText = ['click here', 'read more', 'more', 'link'];
    if (
      text &&
      genericText.some((generic) => text.toLowerCase().includes(generic))
    ) {
      issues.push({
        type: 'warning',
        message: `Link ${index + 1} has generic text: "${text}"`,
        element: 'a',
        severity: 'medium',
      });
      score -= 5;
    }

    // Check external links
    if (href && href.startsWith('http') && !href.includes('secid.mx')) {
      const hasExternalIndicator =
        link.querySelector('[aria-label*="external"]') ||
        link?.textContent?.includes('(external)') ||
        link.getAttribute('aria-label')?.includes('external');

      if (!hasExternalIndicator) {
        recommendations.push(
          `Consider indicating that link ${index + 1} opens externally`
        );
      }
    }
  });

  return { score, issues, recommendations };
}

/**
 * Creates accessible announcements for screen readers
 */
export class AccessibilityAnnouncer {
  private announcementRegion: HTMLElement;

  constructor() {
    this.announcementRegion = this.createAnnouncementRegion();
  }

  private createAnnouncementRegion(): HTMLElement {
    const existing = document.getElementById('a11y-announcements');
    if (existing) return existing;

    const region = document['createElement']('div');
    region.id = 'a11y-announcements';
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;

    document.body.appendChild(region);
    return region;
  }

  /**
   * Announces a message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    this.announcementRegion.setAttribute('aria-live', priority);
    this.announcementRegion.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      this.announcementRegion.textContent = '';
    }, 1000);
  }

  /**
   * Announces loading states
   */
  announceLoading(isLoading: boolean, context = ''): void {
    const message = isLoading
      ? `Loading ${context}...`.trim()
      : `Finished loading ${context}`.trim();

    this.announce(message);
  }

  /**
   * Announces form validation results
   */
  announceValidation(isValid: boolean, errorCount = 0): void {
    const message = isValid
      ? 'Form is valid and ready to submit'
      : `Form has ${errorCount} error${errorCount !== 1 ? 's' : ''} that need to be fixed`;

    this.announce(message, 'assertive');
  }
}

/**
 * Manages focus for accessibility
 */
export class FocusManager {
  private focusHistory: HTMLElement[] = [];
  private trapElements: HTMLElement[] = [];

  /**
   * Sets focus to an element and announces it
   */
  setFocus(element: HTMLElement, announce = true): void {
    if (!element) return;

    this.focusHistory.push(document.activeElement as HTMLElement);
    element.focus();

    if (announce) {
      const announcer = new AccessibilityAnnouncer();
      const label = this.getElementLabel(element);
      announcer.announce(`Focused on ${label}`);
    }
  }

  /**
   * Returns focus to the previous element
   */
  restoreFocus(): void {
    const previousElement = this.focusHistory.pop();
    if (previousElement && document['contains'](previousElement)) {
      previousElement.focus();
    }
  }

  /**
   * Creates a focus trap within specified elements
   */
  trapFocus(container: HTMLElement): void {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements?.[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document['activeElement'] === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    this.trapElements.push(container);
    firstElement.focus();
  }

  /**
   * Releases all focus traps
   */
  releaseFocusTraps(): void {
    this.trapElements.forEach((element) => {
      element.removeEventListener('keydown', this.handleTabKey);
    });
    this.trapElements = [];
  }

  private handleTabKey = (e: KeyboardEvent) => {
    // Implementation moved to trapFocus method
  };

  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors));
  }

  private getElementLabel(element: HTMLElement): string {
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelElement = document['getElementById'](ariaLabelledBy);
      if (labelElement) return labelElement.textContent || '';
    }

    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      const id = element.getAttribute('id');
      if (id) {
        const label = document['querySelector'](`label[for="${id}"]`);
        if (label) return label.textContent || '';
      }
    }

    return element.textContent || element.tagName.toLowerCase();
  }
}

/**
 * Keyboard navigation handler
 */
export function setupKeyboardNavigation(): void {
  document.addEventListener('keydown', (e) => {
    // Skip to main content
    if (e.key === 'Tab' && !e.shiftKey && e.target === document.body) {
      const skipLink = document['querySelector']('.skip-link') as HTMLElement;
      if (skipLink) {
        skipLink.focus();
      }
    }

    // Escape key handling
    if (e.key === 'Escape') {
      const modal = document['querySelector'](
        '[role="dialog"]:not([hidden])'
      ) as HTMLElement;
      if (modal) {
        const closeButton = modal.querySelector(
          '[aria-label*="close"], .close'
        ) as HTMLElement;
        if (closeButton) {
          closeButton.click();
        }
      }
    }
  });
}

/**
 * Sets up reduced motion preferences
 */
export function setupReducedMotion(): void {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const handleReducedMotion = (mq: MediaQueryList) => {
    if (mq.matches) {
      document.documentElement.style.setProperty(
        '--animation-duration',
        '0.01ms'
      );
      document['documentElement'].style.setProperty(
        '--transition-duration',
        '0.01ms'
      );
    } else {
      document['documentElement'].style.removeProperty('--animation-duration');
      document['documentElement'].style.removeProperty('--transition-duration');
    }
  };

  handleReducedMotion(mediaQuery);
  mediaQuery.addListener(handleReducedMotion);
}

/**
 * Comprehensive accessibility audit
 */
export function auditPageAccessibility(
  element: HTMLElement = document.body
): AccessibilityAuditResult {
  const formAudit = validateFormAccessibility(element as HTMLFormElement);
  const headingAudit = validateHeadingStructure(element);
  const imageAudit = validateImageAccessibility(element);
  const linkAudit = validateLinkAccessibility(element);

  const allIssues = [
    ...formAudit.issues,
    ...headingAudit.issues,
    ...imageAudit.issues,
    ...linkAudit.issues,
  ];

  const allRecommendations = [
    ...formAudit.recommendations,
    ...headingAudit.recommendations,
    ...imageAudit.recommendations,
    ...linkAudit.recommendations,
  ];

  const averageScore =
    (formAudit.score +
      headingAudit.score +
      imageAudit.score +
      linkAudit.score) /
    4;

  return {
    score: Math.round(averageScore),
    issues: allIssues,
    recommendations: [...new Set(allRecommendations)],
  };
}

// Global instances
export const announcer = new AccessibilityAnnouncer();
export const focusManager = new FocusManager();

// Initialize on DOM ready
if (typeof window !== 'undefined') {
  document['addEventListener']('DOMContentLoaded', () => {
    setupKeyboardNavigation();
    setupReducedMotion();
  });
}
