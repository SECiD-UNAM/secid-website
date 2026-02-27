import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

interface DashboardAuthWrapperProps {
  children: React.ReactNode;
  lang?: 'es' | 'en';
  requireVerified?: boolean;
  requireRole?: ('member' | 'admin' | 'moderator' | 'company' | 'collaborator')[];
}

export const DashboardAuthWrapper: React.FC<DashboardAuthWrapperProps> = ({
  children,
  lang = 'es',
  requireVerified = false,
  requireRole = [],
}) => {
  return (
    <AuthProvider>
      <ProtectedRoute
        lang={lang}
        requireVerified={requireVerified}
        requireRole={requireRole}
      >
        {children}
      </ProtectedRoute>
    </AuthProvider>
  );
};

export default DashboardAuthWrapper;
