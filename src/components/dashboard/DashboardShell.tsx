import React, { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardSidebar } from './DashboardSidebar';
import { Bars3Icon } from '@heroicons/react/24/outline';

interface DashboardShellProps {
  lang?: 'es' | 'en';
  requireVerified?: boolean;
  requireRole?: (
    | 'member'
    | 'admin'
    | 'moderator'
    | 'company'
    | 'collaborator'
  )[];
  children: React.ReactNode;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  lang = 'es',
  requireVerified = false,
  requireRole = [],
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AuthProvider>
      <ProtectedRoute
        lang={lang}
        requireVerified={requireVerified}
        requireRole={requireRole}
      >
        <div className="min-h-screen bg-gray-50 pt-16 dark:bg-gray-900">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setMobileOpen(true)}
            className="fixed left-4 top-20 z-40 rounded-lg bg-white p-2 shadow-md dark:bg-gray-800 lg:hidden"
            aria-label={lang === 'es' ? 'Abrir menú lateral' : 'Open sidebar'}
          >
            <Bars3Icon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </button>

          <DashboardSidebar
            lang={lang}
            mobileOpen={mobileOpen}
            onClose={() => setMobileOpen(false)}
          />

          <main className="flex-1 lg:ml-64">
            <div className="px-4 py-8 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </ProtectedRoute>
    </AuthProvider>
  );
};

export default DashboardShell;
