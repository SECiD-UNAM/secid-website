import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JoinPage } from '@/components/auth/JoinPage';

vi.mock('lucide-react', () => {
  const stub = () => null;
  return {
    GraduationCap: stub,
    Handshake: stub,
    Building2: stub,
    ArrowRight: stub,
    Briefcase: stub,
  };
});

describe('JoinPage — default lang (es)', () => {
  it('TC-JOIN-001: renders with default Spanish labels', () => {
    // Verifies: heading renders in Spanish by default
    render(<JoinPage />);
    expect(screen.getByText('Únete a SECiD')).toBeTruthy();
  });
});

describe('JoinPage — member path card (es)', () => {
  it('TC-JOIN-002: member card links to /es/signup?role=member', () => {
    // Verifies: member path href is correct for Spanish
    render(<JoinPage lang="es" />);
    const memberLinks = screen.getAllByRole('link');
    const memberLink = memberLinks.find(
      (l) => l.getAttribute('href') === '/es/signup?role=member'
    );
    expect(memberLink).toBeTruthy();
  });
});

describe('JoinPage — collaborator path card (es)', () => {
  it('TC-JOIN-003: collaborator card links to /es/signup?role=collaborator', () => {
    // Verifies: collaborator path href is correct for Spanish
    render(<JoinPage lang="es" />);
    const links = screen.getAllByRole('link');
    const link = links.find(
      (l) => l.getAttribute('href') === '/es/signup?role=collaborator'
    );
    expect(link).toBeTruthy();
  });
});

describe('JoinPage — recruiter path card (es)', () => {
  it('TC-JOIN-004: recruiter card links to /es/signup?role=recruiter', () => {
    // Verifies: recruiter path href is correct for Spanish
    render(<JoinPage lang="es" />);
    const links = screen.getAllByRole('link');
    const link = links.find(
      (l) => l.getAttribute('href') === '/es/signup?role=recruiter'
    );
    expect(link).toBeTruthy();
  });
});

describe('JoinPage — post-job link (es)', () => {
  it('TC-JOIN-005: post-job link renders with correct href', () => {
    // Verifies: post a job without account link is correct for Spanish
    render(<JoinPage lang="es" />);
    const links = screen.getAllByRole('link');
    const postJobLink = links.find(
      (l) => l.getAttribute('href') === '/es/post-job'
    );
    expect(postJobLink).toBeTruthy();
  });
});

describe('JoinPage — sign-in link (es)', () => {
  it('TC-JOIN-006: sign-in link renders with correct href', () => {
    // Verifies: already have account sign-in link is correct for Spanish
    render(<JoinPage lang="es" />);
    const links = screen.getAllByRole('link');
    const signInLink = links.find(
      (l) => l.getAttribute('href') === '/es/login'
    );
    expect(signInLink).toBeTruthy();
  });
});

describe('JoinPage — English lang', () => {
  it('TC-JOIN-007: renders English heading when lang="en"', () => {
    // Verifies: heading renders in English when lang prop is "en"
    render(<JoinPage lang="en" />);
    expect(screen.getByText('Join SECiD')).toBeTruthy();
  });
});

describe('JoinPage — English member path', () => {
  it('TC-JOIN-008: member card links to /en/signup?role=member when lang="en"', () => {
    // Verifies: member path href uses en prefix when lang is "en"
    render(<JoinPage lang="en" />);
    const links = screen.getAllByRole('link');
    const link = links.find(
      (l) => l.getAttribute('href') === '/en/signup?role=member'
    );
    expect(link).toBeTruthy();
  });
});

describe('JoinPage — English post-job link', () => {
  it('TC-JOIN-009: post-job link uses /en prefix when lang="en"', () => {
    // Verifies: post-job link uses English prefix
    render(<JoinPage lang="en" />);
    const links = screen.getAllByRole('link');
    const link = links.find(
      (l) => l.getAttribute('href') === '/en/post-job'
    );
    expect(link).toBeTruthy();
  });
});

describe('JoinPage — English sign-in link', () => {
  it('TC-JOIN-010: sign-in link uses /en prefix when lang="en"', () => {
    // Verifies: sign-in link uses English prefix
    render(<JoinPage lang="en" />);
    const links = screen.getAllByRole('link');
    const link = links.find(
      (l) => l.getAttribute('href') === '/en/login'
    );
    expect(link).toBeTruthy();
  });
});

describe('JoinPage — card titles (es)', () => {
  it('TC-JOIN-011: renders all three Spanish card titles', () => {
    // Verifies: all role card titles appear in Spanish
    render(<JoinPage lang="es" />);
    expect(screen.getByText('Egresado / Miembro')).toBeTruthy();
    expect(screen.getByText('Colaborador')).toBeTruthy();
    expect(screen.getByText('Reclutador')).toBeTruthy();
  });
});

describe('JoinPage — card titles (en)', () => {
  it('TC-JOIN-012: renders all three English card titles', () => {
    // Verifies: all role card titles appear in English
    render(<JoinPage lang="en" />);
    expect(screen.getByText('Alumni / Member')).toBeTruthy();
    expect(screen.getByText('Collaborator')).toBeTruthy();
    expect(screen.getByText('Recruiter')).toBeTruthy();
  });
});
