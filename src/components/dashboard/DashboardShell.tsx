import React, { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardSidebar } from './DashboardSidebar';
import { MergeNotificationBanner } from '@/components/merge/MergeNotificationBanner';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { useBeta } from '@/hooks/useBeta';

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
  const isBeta = useBeta();

  return (
    <AuthProvider>
      <ProtectedRoute
        lang={lang}
        requireVerified={requireVerified}
        requireRole={requireRole}
      >
        <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${isBeta ? 'pt-24' : 'pt-16'}`}>
          {/* Sidebar toggle — hidden on mobile (bottom nav) and desktop (sidebar visible) */}
          <button
            onClick={() => setMobileOpen(true)}
            className="fixed left-4 top-20 z-40 hidden rounded-lg bg-white p-2 shadow-md dark:bg-gray-800 md:block lg:hidden"
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
            <div className="px-4 py-8 pb-24 sm:px-6 md:pb-8 lg:px-8">
              <MergeNotificationBanner lang={lang} />
              {children}
            </div>
          </main>
        </div>
      </ProtectedRoute>
    </AuthProvider>
  );
};

export default DashboardShell;
