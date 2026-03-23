import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from '@testing-library/react';
import React from 'react';

vi.mock('@heroicons/react/24/outline', () => {
  const stub = () => null;
  return { PlusIcon: stub, XMarkIcon: stub, PencilIcon: stub, TrashIcon: stub };
});

vi.mock('@/lib/companies', () => ({
  getCompanies: vi.fn(),
}));

vi.mock('@/components/shared/CompanyLogo', () => ({
  CompanyLogo: () => null,
}));

import { CompanyAutocomplete } from '@/components/profile/shared/CompanyAutocomplete';
import { getCompanies } from '@/lib/companies';

const mockCompanies = [
  {
    id: 'c1',
    name: 'Google',
    domain: 'google.com',
    industry: 'Technology',
    memberCount: 5,
    createdBy: 'u1',
    createdAt: new Date(),
    updatedAt: new Date(),
    pendingReview: false,
  },
  {
    id: 'c2',
    name: 'Goldman Sachs',
    domain: 'gs.com',
    industry: 'Finance',
    memberCount: 3,
    createdBy: 'u2',
    createdAt: new Date(),
    updatedAt: new Date(),
    pendingReview: false,
  },
  {
    id: 'c3',
    name: 'Meta',
    domain: 'meta.com',
    industry: 'Technology',
    memberCount: 4,
    createdBy: 'u3',
    createdAt: new Date(),
    updatedAt: new Date(),
    pendingReview: false,
  },
];

describe('CompanyAutocomplete - renders input', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (getCompanies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCompanies);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('TC-company-auto-001: renders the search input with placeholder', async () => {
    /** Verifies: AC-company-auto-render */
    const onChange = vi.fn();

    await act(async () => {
      render(<CompanyAutocomplete value="" onChange={onChange} />);
    });

    const input = screen.getByPlaceholderText('Buscar empresa...');
    expect(input).toBeDefined();
  });
});

describe('CompanyAutocomplete - English placeholder', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (getCompanies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCompanies);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('TC-company-auto-002: shows English placeholder when lang=en', async () => {
    /** Verifies: AC-company-auto-i18n */
    const onChange = vi.fn();

    await act(async () => {
      render(<CompanyAutocomplete value="" onChange={onChange} lang="en" />);
    });

    expect(screen.getByPlaceholderText('Search company...')).toBeDefined();
  });
});

describe('CompanyAutocomplete - loads companies on mount', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (getCompanies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCompanies);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('TC-company-auto-003: calls getCompanies on mount', async () => {
    /** Verifies: AC-company-auto-load */
    const onChange = vi.fn();

    await act(async () => {
      render(<CompanyAutocomplete value="" onChange={onChange} />);
    });

    expect(getCompanies).toHaveBeenCalled();
  });
});

describe('CompanyAutocomplete - filters companies on type', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (getCompanies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCompanies);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('TC-company-auto-004: shows filtered results after debounce', async () => {
    /** Verifies: AC-company-auto-filter */
    const onChange = vi.fn();

    await act(async () => {
      render(<CompanyAutocomplete value="" onChange={onChange} />);
    });

    const input = screen.getByRole('textbox');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Go' } });
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByText('Google')).toBeDefined();
    expect(screen.getByText('Goldman Sachs')).toBeDefined();
  });
});

describe('CompanyAutocomplete - calls onChange on free text', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (getCompanies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCompanies);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('TC-company-auto-005: calls onChange with text and undefined companyId for free text', async () => {
    /** Verifies: AC-company-auto-freetext */
    const onChange = vi.fn();

    await act(async () => {
      render(<CompanyAutocomplete value="" onChange={onChange} />);
    });

    const input = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'NewCo' } });
    });

    expect(onChange).toHaveBeenCalledWith('NewCo', undefined);
  });
});

describe('CompanyAutocomplete - select calls onChange with companyId', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (getCompanies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCompanies);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('TC-company-auto-006: selecting a company calls onChange with name and id', async () => {
    /** Verifies: AC-company-auto-select */
    const onChange = vi.fn();

    await act(async () => {
      render(<CompanyAutocomplete value="" onChange={onChange} />);
    });

    const input = screen.getByRole('textbox');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'Meta' } });
      vi.advanceTimersByTime(350);
    });

    const metaItem = screen.getByText('Meta');
    expect(metaItem).toBeDefined();

    await act(async () => {
      fireEvent.mouseDown(metaItem);
    });

    expect(onChange).toHaveBeenCalledWith('Meta', 'c3');
  });
});

describe('CompanyAutocomplete - create new company button', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (getCompanies as ReturnType<typeof vi.fn>).mockResolvedValue(mockCompanies);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('TC-company-auto-007: shows create button in dropdown when companies are listed', async () => {
    /** Verifies: AC-company-auto-create */
    const onChange = vi.fn();

    await act(async () => {
      render(<CompanyAutocomplete value="Go" onChange={onChange} />);
    });

    const input = screen.getByRole('textbox');

    await act(async () => {
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: 'Go' } });
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByText('Crear nueva empresa')).toBeDefined();
  });
});

describe('CompanyAutocomplete - handles empty companies gracefully', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (getCompanies as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error')
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('TC-company-auto-008: renders normally even if getCompanies fails', async () => {
    /** Verifies: AC-company-auto-error */
    const onChange = vi.fn();

    await act(async () => {
      render(<CompanyAutocomplete value="" onChange={onChange} />);
    });

    const input = screen.getByPlaceholderText('Buscar empresa...');
    expect(input).toBeDefined();
  });
});
