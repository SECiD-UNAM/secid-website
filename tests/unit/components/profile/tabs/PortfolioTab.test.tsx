import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { PortfolioTab } from '@/components/profile/tabs/PortfolioTab';
import type { FormData } from '@/components/profile/profile-edit-types';
import { INITIAL_FORM_DATA } from '@/components/profile/profile-edit-types';

vi.mock('@heroicons/react/24/outline', () => {
  const stub = () => null;
  return {
    PlusIcon: stub,
    StarIcon: stub,
    LinkIcon: stub,
  };
});

vi.mock('@heroicons/react/24/solid', () => {
  const stub = () => null;
  return {
    StarIcon: stub,
  };
});

describe('PortfolioTab GitHub import action', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderTab(partial: Partial<FormData> = {}) {
    const formData: FormData = {
      ...INITIAL_FORM_DATA,
      ...partial,
    };
    return render(
      <PortfolioTab formData={formData} setFormData={vi.fn()} lang="en" />
    );
  }

  it('shows import button label in english', () => {
    renderTab();
    expect(screen.getByText('Import projects from GitHub')).toBeDefined();
  });

  it('shows import button label in spanish', () => {
    const formData: FormData = { ...INITIAL_FORM_DATA };
    render(<PortfolioTab formData={formData} setFormData={vi.fn()} lang="es" />);
    expect(screen.getByText('Importar proyectos desde GitHub')).toBeDefined();
  });
});
