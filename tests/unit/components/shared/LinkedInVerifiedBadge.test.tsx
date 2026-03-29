import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { LinkedInVerifiedBadge } from '@/components/shared/LinkedInVerifiedBadge';

/* ------------------------------------------------------------------ */
/* Default rendering                                                   */
/* ------------------------------------------------------------------ */

describe('LinkedInVerifiedBadge - default props', () => {
  afterEach(() => cleanup());

  it('TC-linkedin-badge-001: renders a span with Spanish tooltip by default', () => {
    /** Verifies: AC-default-lang-es */
    const { container } = render(<LinkedInVerifiedBadge />);

    const span = container.firstElementChild as HTMLElement;
    expect(span.title).toBe('Verificado en LinkedIn');
  });

  it('TC-linkedin-badge-002: renders screen-reader text in Spanish by default', () => {
    /** Verifies: AC-default-lang-es */
    const { container } = render(<LinkedInVerifiedBadge />);

    const srText = container.querySelector('.sr-only') as HTMLElement;
    expect(srText).toBeDefined();
    expect(srText.textContent).toBe('Verificado en LinkedIn');
  });

  it('TC-linkedin-badge-003: renders two SVG icons', () => {
    /** Verifies: AC-two-icons */
    const { container } = render(<LinkedInVerifiedBadge />);

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
  });
});

/* ------------------------------------------------------------------ */
/* Language prop                                                        */
/* ------------------------------------------------------------------ */

describe('LinkedInVerifiedBadge - lang="en"', () => {
  afterEach(() => cleanup());

  it('TC-linkedin-badge-004: renders English tooltip when lang="en"', () => {
    /** Verifies: AC-lang-en */
    const { container } = render(<LinkedInVerifiedBadge lang="en" />);

    const span = container.firstElementChild as HTMLElement;
    expect(span.title).toBe('Verified on LinkedIn');
  });

  it('TC-linkedin-badge-005: renders screen-reader text in English', () => {
    /** Verifies: AC-lang-en */
    const { container } = render(<LinkedInVerifiedBadge lang="en" />);

    const srText = container.querySelector('.sr-only') as HTMLElement;
    expect(srText).toBeDefined();
    expect(srText.textContent).toBe('Verified on LinkedIn');
  });
});

describe('LinkedInVerifiedBadge - lang="es"', () => {
  afterEach(() => cleanup());

  it('TC-linkedin-badge-006: renders Spanish tooltip when lang="es" is explicit', () => {
    /** Verifies: AC-lang-es-explicit */
    const { container } = render(<LinkedInVerifiedBadge lang="es" />);

    const span = container.firstElementChild as HTMLElement;
    expect(span.title).toBe('Verificado en LinkedIn');
  });
});

/* ------------------------------------------------------------------ */
/* Size variants                                                        */
/* ------------------------------------------------------------------ */

describe('LinkedInVerifiedBadge - size="sm" (default)', () => {
  afterEach(() => cleanup());

  it('TC-linkedin-badge-007: applies h-4 w-4 to LinkedIn icon when size="sm"', () => {
    /** Verifies: AC-size-sm */
    const { container } = render(<LinkedInVerifiedBadge size="sm" />);

    const linkedinSvg = container.querySelectorAll('svg')[0] as SVGElement;
    expect(linkedinSvg.className.baseVal).toContain('h-4');
    expect(linkedinSvg.className.baseVal).toContain('w-4');
  });

  it('TC-linkedin-badge-008: applies h-3 w-3 to checkmark icon when size="sm"', () => {
    /** Verifies: AC-size-sm */
    const { container } = render(<LinkedInVerifiedBadge size="sm" />);

    const checkSvg = container.querySelectorAll('svg')[1] as SVGElement;
    expect(checkSvg.className.baseVal).toContain('h-3');
    expect(checkSvg.className.baseVal).toContain('w-3');
  });
});

describe('LinkedInVerifiedBadge - size="md"', () => {
  afterEach(() => cleanup());

  it('TC-linkedin-badge-009: applies h-5 w-5 to LinkedIn icon when size="md"', () => {
    /** Verifies: AC-size-md */
    const { container } = render(<LinkedInVerifiedBadge size="md" />);

    const linkedinSvg = container.querySelectorAll('svg')[0] as SVGElement;
    expect(linkedinSvg.className.baseVal).toContain('h-5');
    expect(linkedinSvg.className.baseVal).toContain('w-5');
  });

  it('TC-linkedin-badge-010: applies h-3.5 w-3.5 to checkmark icon when size="md"', () => {
    /** Verifies: AC-size-md */
    const { container } = render(<LinkedInVerifiedBadge size="md" />);

    const checkSvg = container.querySelectorAll('svg')[1] as SVGElement;
    expect(checkSvg.className.baseVal).toContain('h-3.5');
    expect(checkSvg.className.baseVal).toContain('w-3.5');
  });
});

/* ------------------------------------------------------------------ */
/* className prop                                                       */
/* ------------------------------------------------------------------ */

describe('LinkedInVerifiedBadge - className prop', () => {
  afterEach(() => cleanup());

  it('TC-linkedin-badge-011: applies custom className to outer span', () => {
    /** Verifies: AC-className */
    const { container } = render(
      <LinkedInVerifiedBadge className="ml-2 align-middle" />
    );

    const span = container.firstElementChild as HTMLElement;
    expect(span.className).toContain('ml-2');
    expect(span.className).toContain('align-middle');
  });

  it('TC-linkedin-badge-012: outer span always includes inline-flex class', () => {
    /** Verifies: AC-layout */
    const { container } = render(<LinkedInVerifiedBadge />);

    const span = container.firstElementChild as HTMLElement;
    expect(span.className).toContain('inline-flex');
  });
});

/* ------------------------------------------------------------------ */
/* Accessibility                                                        */
/* ------------------------------------------------------------------ */

describe('LinkedInVerifiedBadge - accessibility', () => {
  afterEach(() => cleanup());

  it('TC-linkedin-badge-013: SVG icons have aria-hidden="true"', () => {
    /** Verifies: AC-accessibility */
    const { container } = render(<LinkedInVerifiedBadge />);

    const svgs = container.querySelectorAll('svg');
    svgs.forEach((svg) => {
      expect(svg.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('TC-linkedin-badge-014: LinkedIn icon uses correct brand color class', () => {
    /** Verifies: AC-brand-color */
    const { container } = render(<LinkedInVerifiedBadge />);

    const linkedinSvg = container.querySelectorAll('svg')[0] as SVGElement;
    expect(linkedinSvg.className.baseVal).toContain('text-[#0A66C2]');
  });

  it('TC-linkedin-badge-015: checkmark icon uses green color class', () => {
    /** Verifies: AC-checkmark-color */
    const { container } = render(<LinkedInVerifiedBadge />);

    const checkSvg = container.querySelectorAll('svg')[1] as SVGElement;
    expect(checkSvg.className.baseVal).toContain('text-green-500');
  });
});
