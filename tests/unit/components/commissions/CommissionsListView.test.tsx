// @ts-nocheck
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import CommissionsListView from '@/components/commissions/CommissionsListView';

// Per project test infrastructure pattern (see MEMORY.md: jsdom contamination):
// Every test lives in its own describe block with afterEach cleanup to prevent
// concurrent test contamination under vitest's sequence.concurrent: true config.

describe('CommissionsListView renders all 3 board direction containers', () => {
  afterEach(cleanup);
  it('renders all 3 board direction containers', () => {
    render(<CommissionsListView lang="es" />);
    expect(screen.getByText('Presidencia')).toBeInTheDocument();
    expect(screen.getByText('Secretaria General')).toBeInTheDocument();
    expect(screen.getByText('Tesoreria')).toBeInTheDocument();
  });
});

describe('CommissionsListView renders all 4 directive commissions nested under their parents', () => {
  afterEach(cleanup);
  it('renders all 4 directive commissions nested under their parents', () => {
    render(<CommissionsListView lang="es" />);
    expect(screen.getAllByText('Vinculacion y Relaciones Institucionales').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('IT').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Transparencia y Legalidad').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Gestion de Recursos').length).toBeGreaterThanOrEqual(1);
  });
});

describe('CommissionsListView renders all 5 horizontal commissions', () => {
  afterEach(cleanup);
  it('renders all 5 horizontal commissions', () => {
    render(<CommissionsListView lang="es" />);
    expect(screen.getByText('Comite de Etica')).toBeInTheDocument();
    expect(screen.getByText('Desarrollo Profesional')).toBeInTheDocument();
    expect(screen.getByText('Comunicacion y Difusion')).toBeInTheDocument();
    expect(screen.getByText('Cultura y Responsabilidad Social')).toBeInTheDocument();
    expect(screen.getByText('Academica e Innovacion')).toBeInTheDocument();
  });
});

describe('CommissionsListView renders sub-area tags for directive commissions', () => {
  afterEach(cleanup);
  it('renders sub-area tags for directive commissions', () => {
    render(<CommissionsListView lang="es" />);
    expect(screen.getAllByText('Vinculacion con la UNAM').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Infraestructura y servicios').length).toBeGreaterThanOrEqual(1);
  });
});

describe('CommissionsListView renders English content when lang=en', () => {
  afterEach(cleanup);
  it('renders English content when lang=en', () => {
    render(<CommissionsListView lang="en" />);
    expect(screen.getAllByText('Institutional Relations & Outreach').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Board of Directors')).toBeInTheDocument();
  });
});

describe('CommissionsListView groups Secretaria commissions (IT + Transparencia) together', () => {
  afterEach(cleanup);
  it('groups Secretaria commissions (IT + Transparencia) together', () => {
    render(<CommissionsListView lang="es" />);
    const secretariaSection = screen.getByText('Secretaria General').closest('[data-direction]');
    expect(secretariaSection).toBeTruthy();
    expect(secretariaSection?.textContent).toContain('IT');
    expect(secretariaSection?.textContent).toContain('Transparencia y Legalidad');
  });
});
