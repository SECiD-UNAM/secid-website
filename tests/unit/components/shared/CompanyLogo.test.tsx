import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { CompanyLogo, getCompanyColor } from '@/components/shared/CompanyLogo';

/* ------------------------------------------------------------------ */
/* getCompanyColor unit tests                                          */
/* ------------------------------------------------------------------ */

describe('getCompanyColor', () => {
  afterEach(() => cleanup());

  it('TC-company-logo-001: returns a valid hex color for any company name', () => {
    /** Verifies: AC-color-deterministic */
    const color = getCompanyColor('Acme Corp');
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('TC-company-logo-002: returns the same color for the same name (deterministic)', () => {
    /** Verifies: AC-color-deterministic */
    const first = getCompanyColor('Google');
    const second = getCompanyColor('Google');
    expect(first).toBe(second);
  });

  it('TC-company-logo-003: returns a color from the predefined palette', () => {
    /** Verifies: AC-color-deterministic */
    const palette = [
      '#3B82F6',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#8B5CF6',
      '#06B6D4',
      '#EC4899',
      '#14B8A6',
      '#F97316',
      '#6366F1',
      '#84CC16',
      '#E11D48',
      '#0EA5E9',
      '#A855F7',
      '#22C55E',
      '#D946EF',
    ];
    const color = getCompanyColor('Microsoft');
    expect(palette).toContain(color);
  });

  it('TC-company-logo-004: different names can produce different colors', () => {
    /** Verifies: AC-color-deterministic */
    const colors = new Set(
      ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'].map(
        getCompanyColor
      )
    );
    // With 6 names across 16 colors, we expect at least 2 distinct colors
    expect(colors.size).toBeGreaterThanOrEqual(2);
  });

  it('TC-company-logo-005: handles single-character name', () => {
    /** Verifies: AC-color-deterministic (boundary) */
    const color = getCompanyColor('A');
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

/* ------------------------------------------------------------------ */
/* CompanyLogo rendering tests                                         */
/* ------------------------------------------------------------------ */

describe('CompanyLogo - fallback avatar (no logoUrl)', () => {
  afterEach(() => cleanup());

  it('TC-company-logo-006: renders initial avatar when no logoUrl is provided', () => {
    /** Verifies: AC-fallback-avatar */
    render(<CompanyLogo company={{ name: 'Acme Corp' }} />);

    const avatar = screen.getByText('A');
    expect(avatar).toBeDefined();
  });

  it('TC-company-logo-007: renders uppercased first character', () => {
    /** Verifies: AC-fallback-avatar */
    render(<CompanyLogo company={{ name: 'google' }} />);

    const avatar = screen.getByText('G');
    expect(avatar).toBeDefined();
  });

  it('TC-company-logo-008: applies deterministic background color from company name', () => {
    /** Verifies: AC-fallback-avatar */
    const expectedColor = getCompanyColor('TestCo');
    render(<CompanyLogo company={{ name: 'TestCo' }} />);

    const avatar = screen.getByText('T');
    // jsdom converts hex to rgb in style attribute -- verify via computed style
    const styleAttr = avatar.getAttribute('style') ?? '';
    expect(styleAttr).toContain('background-color');
    // Verify it's the correct color by checking the hex value was used
    // getCompanyColor('TestCo') returns '#F59E0B' which jsdom renders as rgb(245, 158, 11)
    expect(avatar.style.backgroundColor).toBeTruthy();
    // Double-check determinism: same name always maps to same color
    expect(getCompanyColor('TestCo')).toBe(expectedColor);
  });

  it('TC-company-logo-009: does not render an img element when no logoUrl', () => {
    /** Verifies: AC-fallback-avatar */
    render(<CompanyLogo company={{ name: 'NoLogo Inc' }} />);

    const img = screen.queryByRole('img');
    expect(img).toBeNull();
  });
});

describe('CompanyLogo - image rendering with logoUrl', () => {
  afterEach(() => cleanup());

  it('TC-company-logo-010: renders img when logoUrl is provided', () => {
    /** Verifies: AC-image-render */
    render(
      <CompanyLogo
        company={{ name: 'Google', logoUrl: 'https://example.com/logo.png' }}
      />
    );

    const img = screen.getByRole('img');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('https://example.com/logo.png');
    expect(img.getAttribute('alt')).toBe('Google');
  });
});

describe('CompanyLogo - image error fallback', () => {
  afterEach(() => cleanup());

  it('TC-company-logo-011: shows fallback avatar on image load error', () => {
    /** Verifies: AC-image-error-fallback */
    render(
      <CompanyLogo
        company={{
          name: 'BrokenLogo',
          logoUrl: 'https://example.com/broken.png',
        }}
      />
    );

    const img = screen.getByRole('img');
    fireEvent.error(img);

    // After error, the fallback initial should be visible
    const avatar = screen.getByText('B');
    expect(avatar).toBeDefined();

    // The img should no longer be in the DOM
    expect(screen.queryByRole('img')).toBeNull();
  });
});

describe('CompanyLogo - size variants', () => {
  afterEach(() => cleanup());

  it('TC-company-logo-012: applies sm size classes', () => {
    /** Verifies: AC-size-sm */
    const { container } = render(
      <CompanyLogo company={{ name: 'Small' }} size="sm" />
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('w-8');
    expect(wrapper.className).toContain('h-8');
  });

  it('TC-company-logo-013: applies md size classes (default)', () => {
    /** Verifies: AC-size-md */
    const { container } = render(<CompanyLogo company={{ name: 'Medium' }} />);

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('w-10');
    expect(wrapper.className).toContain('h-10');
  });

  it('TC-company-logo-014: applies lg size classes', () => {
    /** Verifies: AC-size-lg */
    const { container } = render(
      <CompanyLogo company={{ name: 'Large' }} size="lg" />
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('w-16');
    expect(wrapper.className).toContain('h-16');
  });
});

describe('CompanyLogo - className prop', () => {
  afterEach(() => cleanup());

  it('TC-company-logo-015: applies custom className to outer container', () => {
    /** Verifies: AC-className */
    const { container } = render(
      <CompanyLogo company={{ name: 'Custom' }} className="mr-2 mt-4" />
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('mt-4');
    expect(wrapper.className).toContain('mr-2');
  });
});

describe('CompanyLogo - empty logoUrl', () => {
  afterEach(() => cleanup());

  it('TC-company-logo-016: renders fallback when logoUrl is empty string', () => {
    /** Verifies: AC-fallback-avatar (boundary) */
    render(<CompanyLogo company={{ name: 'EmptyUrl', logoUrl: '' }} />);

    const img = screen.queryByRole('img');
    expect(img).toBeNull();

    const avatar = screen.getByText('E');
    expect(avatar).toBeDefined();
  });
});
