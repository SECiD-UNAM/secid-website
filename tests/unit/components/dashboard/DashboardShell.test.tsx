import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardShell from '@/components/dashboard/DashboardShell';

const useBetaMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('@/components/auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('@/components/merge/MergeNotificationBanner', () => ({
  MergeNotificationBanner: () => null,
}));

vi.mock('@/components/auth/EmailVerificationBanner', () => ({
  EmailVerificationBanner: () => null,
}));

vi.mock('@/hooks/useBeta', () => ({
  useBeta: () => useBetaMock(),
}));

vi.mock('@/components/dashboard/DashboardSidebar', () => ({
  DashboardSidebar: ({
    mobileOpen,
  }: {
    mobileOpen?: boolean;
    onClose?: () => void;
  }) => (
    <div data-testid="dashboard-sidebar" data-mobile-open={String(!!mobileOpen)} />
  ),
}));

vi.mock('@heroicons/react/24/outline', () => ({
  Bars3Icon: ({ className }: { className?: string }) => (
    <svg data-testid="bars-icon" className={className} />
  ),
}));

describe('DashboardShell mobile menu button', () => {
  beforeEach(() => {
    useBetaMock.mockReturnValue(false);
  });

  it('renders the hamburger button for non-lg layouts and opens sidebar on click', () => {
    render(
      <DashboardShell lang="es">
        <div>Contenido</div>
      </DashboardShell>
    );

    const button = screen.getByRole('button', { name: 'Abrir menú lateral' });
    expect(button).toHaveClass('lg:hidden');
    expect(button.className).toContain('top-20');
    expect(button.className.split(/\s+/)).not.toContain('hidden');
    expect(button.className).not.toContain('md:block');

    const sidebar = screen.getByTestId('dashboard-sidebar');
    expect(sidebar).toHaveAttribute('data-mobile-open', 'false');

    fireEvent.click(button);
    expect(sidebar).toHaveAttribute('data-mobile-open', 'true');
  });

  it('uses a lower placement when beta banner is visible', () => {
    useBetaMock.mockReturnValue(true);

    render(
      <DashboardShell lang="en">
        <div>Content</div>
      </DashboardShell>
    );

    const button = screen.getByRole('button', { name: 'Open sidebar' });
    expect(button.className).toContain('top-28');
  });
});
