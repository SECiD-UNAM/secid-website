import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardNavigation } from './DashboardNavigation';
import { DashboardSidebar } from './DashboardSidebar';

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
  return (
    <div className="dark">
      <AuthProvider>
        <ProtectedRoute
          lang={lang}
          requireVerified={requireVerified}
          requireRole={requireRole}
        >
          <div className="min-h-screen bg-gray-950">
            <DashboardNavigation lang={lang} />
            <div className="flex">
              <DashboardSidebar lang={lang} />
              <main className="flex-1 lg:ml-64">
                <div className="px-4 py-8 sm:px-6 lg:px-8">{children}</div>
              </main>
            </div>
          </div>
        </ProtectedRoute>
      </AuthProvider>
    </div>
  );
};

export default DashboardShell;
