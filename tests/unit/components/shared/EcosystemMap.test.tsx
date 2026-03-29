/**
 * Unit tests for EcosystemMap component.
 *
 * Tests cover:
 * - Industry group rendering
 * - Current-member filter (memberCount > 0, default)
 * - "All" toggle showing zero-member companies
 * - onCompanyClick callback invocation
 * - <a> link rendering when no click handler
 * - Empty company list rendering
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { EcosystemMap } from '@/components/shared/EcosystemMap';
import type { Company } from '@/types/company';

// ---------------------------------------------------------------------------
// Factory — covers all required Company fields
// ---------------------------------------------------------------------------

const makeCompany = (overrides: Partial<Company> = {}): Company => ({
  id: 'c1',
  name: 'Acme Corp',
  domain: 'acme.com',
  slug: 'acme-corp',
  industry: 'Tecnología',
  location: 'CDMX',
  website: 'https://acme.com',
  memberCount: 5,
  createdBy: 'u1',
  createdAt: new Date(),
  updatedAt: new Date(),
  pendingReview: false,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests — each in its own describe block to avoid jsdom state contamination
// ---------------------------------------------------------------------------

describe('TC-ecosys-001: renders industry groups from company data', () => {
  /** Verifies: AC-industry-groups */
  afterEach(() => cleanup());

  it('groups companies by industry and renders group headers', () => {
    const companies = [
      makeCompany({ id: 'c1', name: 'TechCo', industry: 'Tecnología', memberCount: 3 }),
      makeCompany({ id: 'c2', name: 'BankCo', industry: 'Finanzas', memberCount: 2 }),
    ];
    render(<EcosystemMap companies={companies} lang="es" />);
    expect(screen.getByText('Tecnología')).toBeTruthy();
    expect(screen.getByText('Finanzas')).toBeTruthy();
  });
});

describe('TC-ecosys-002: filters to current members by default (memberCount > 0)', () => {
  /** Verifies: AC-current-filter-default */
  afterEach(() => cleanup());

  it('shows active companies and hides zero-member companies', () => {
    const companies = [
      makeCompany({ id: 'c1', name: 'ActiveCo', memberCount: 3 }),
      makeCompany({ id: 'c2', name: 'EmptyCo', memberCount: 0 }),
    ];
    render(<EcosystemMap companies={companies} lang="es" />);
    expect(screen.getByText('ActiveCo')).toBeTruthy();
    expect(screen.queryByText('EmptyCo')).toBeNull();
  });
});

describe('TC-ecosys-003: shows all companies when "all" toggle is clicked', () => {
  /** Verifies: AC-all-toggle */
  afterEach(() => cleanup());

  it('reveals zero-member companies after clicking Historial completo', () => {
    const companies = [
      makeCompany({ id: 'c1', name: 'ActiveCo', memberCount: 3 }),
      makeCompany({ id: 'c2', name: 'EmptyCo', memberCount: 0 }),
    ];
    render(<EcosystemMap companies={companies} lang="es" />);
    fireEvent.click(screen.getByText('Historial completo'));
    expect(screen.getByText('EmptyCo')).toBeTruthy();
  });
});

describe('TC-ecosys-004: calls onCompanyClick when provided', () => {
  /** Verifies: AC-click-handler */
  afterEach(() => cleanup());

  it('invokes the handler with the company object on pill click', () => {
    const handler = vi.fn();
    const companies = [makeCompany()];
    render(<EcosystemMap companies={companies} onCompanyClick={handler} lang="es" />);
    fireEvent.click(screen.getByText('Acme Corp'));
    expect(handler).toHaveBeenCalledWith(companies[0]);
  });
});

describe('TC-ecosys-005: renders <a> links when onCompanyClick is omitted', () => {
  /** Verifies: AC-link-rendering */
  afterEach(() => cleanup());

  it('wraps each company pill in an anchor pointing to /es/companies/:slug', () => {
    const companies = [makeCompany({ slug: 'acme-corp' })];
    const { container } = render(<EcosystemMap companies={companies} lang="es" />);
    const link = container.querySelector('a[href="/es/companies/acme-corp"]');
    expect(link).toBeTruthy();
  });
});

describe('TC-ecosys-006: handles empty company list', () => {
  /** Verifies: AC-empty-state */
  afterEach(() => cleanup());

  it('renders without errors and shows zero stats', () => {
    render(<EcosystemMap companies={[]} lang="es" />);
    // Stats grid renders multiple '0' values (companies, industries, connections)
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });
});
