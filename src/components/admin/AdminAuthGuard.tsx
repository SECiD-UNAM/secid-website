import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/hooks/useTranslations';
import { Shield, AlertTriangle } from 'lucide-react';

interface AdminAuthGuardProps {
  children?: React.ReactNode;
  requiredRole?: 'admin' | 'moderator';
  redirectTo?: string;
}

export const AdminAuthGuard: React.FC<AdminAuthGuardProps> = ({
  children,
  requiredRole = 'moderator',
  redirectTo = '/login',
}) => {
  const { user, userProfile, loading, isAuthenticated, isAdmin, isModerator } =
    useAuth();
  const { t, language } = useTranslations();
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      // Wait for auth to initialize
      if (loading) return;

      // Check if user is authenticated
      if (!isAuthenticated || !user || !userProfile) {
        setHasAccess(false);
        setIsCheckingPermissions(false);
        return;
      }

      // Check role-based access
      let hasRequiredRole = false;
      if (requiredRole === 'admin') {
        hasRequiredRole = isAdmin;
      } else if (requiredRole === 'moderator') {
        hasRequiredRole = isAdmin || isModerator;
      }

      // Additional security checks
      const securityChecks = [
        // Check if user account is active
        userProfile.isActive !== false,
        // Check if user is verified (optional, depending on requirements)
        userProfile.isVerified !== false,
        // Check if user has the required role
        hasRequiredRole,
      ];

      const passesSecurityChecks = securityChecks.every(
        (check) => check === true
      );

      setHasAccess(passesSecurityChecks);
      setIsCheckingPermissions(false);

      // Redirect if no access
      if (!passesSecurityChecks) {
        // Log unauthorized access attempt
        console.warn('Unauthorized admin access attempt:', {
          userId: user.uid,
          email: user.email,
          requiredRole,
          actualRole: userProfile['role'],
          timestamp: new Date().toISOString(),
          url: window.location.href,
        });

        // Redirect after a brief delay to show the error message
        setTimeout(() => {
          const returnUrl = encodeURIComponent(
            window.location.pathname + window.location.search
          );
          window.location.href = `${redirectTo}?returnUrl=${returnUrl}&error=insufficient_permissions`;
        }, 2000);
      }
    };

    checkAccess();
  }, [
    loading,
    isAuthenticated,
    user,
    userProfile,
    isAdmin,
    isModerator,
    requiredRole,
    redirectTo,
  ]);

  // Show loading state
  if (loading || isCheckingPermissions) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">
            {language === 'es'
              ? 'Verificando permisos...'
              : 'Checking permissions...'}
          </p>
        </div>
      </div>
    );
  }

  // Show access denied if user doesn't have permission
  if (!hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <Shield className="h-8 w-8 text-red-600" />
          </div>

          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {language === 'es' ? 'Acceso Denegado' : 'Access Denied'}
          </h1>

          <p className="mb-6 text-gray-600">
            {language === 'es'
              ? 'No tienes permisos suficientes para acceder al panel de administración.'
              : 'You do not have sufficient permissions to access the admin panel.'}
          </p>

          <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-start">
              <AlertTriangle className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
              <div className="text-sm text-yellow-800">
                <p className="mb-1 font-medium">
                  {language === 'es'
                    ? 'Información de acceso:'
                    : 'Access information:'}
                </p>
                <ul className="list-inside list-disc space-y-1 text-xs">
                  <li>
                    {language === 'es' ? 'Rol requerido: ' : 'Required role: '}
                    <span className="font-medium">
                      {requiredRole === 'admin'
                        ? language === 'es'
                          ? 'Administrador'
                          : 'Administrator'
                        : language === 'es'
                          ? 'Moderador o superior'
                          : 'Moderator or higher'}
                    </span>
                  </li>
                  {userProfile && (
                    <li>
                      {language === 'es'
                        ? 'Tu rol actual: '
                        : 'Your current role: '}
                      <span className="font-medium capitalize">
                        {userProfile['role']}
                      </span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => (window.location.href = '/')}
              className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {language === 'es' ? 'Ir al Inicio' : 'Go Home'}
            </button>

            <button
              onClick={() => (window.location.href = '/contact')}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {language === 'es' ? 'Contactar Soporte' : 'Contact Support'}
            </button>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-6">
            <p className="text-xs text-gray-500">
              {language === 'es'
                ? 'Si crees que esto es un error, contacta al administrador del sistema.'
                : 'If you believe this is an error, please contact the system administrator.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render children if user has access
  return <>{children}</>;
};

// Hook for checking admin permissions in components
export const useAdminAuth = (
  requiredRole: 'admin' | 'moderator' = 'moderator'
) => {
  const { isAuthenticated, isAdmin, isModerator, userProfile } = useAuth();

  const hasPermission = () => {
    if (!isAuthenticated || !userProfile) return false;

    if (requiredRole === 'admin') {
      return isAdmin;
    } else if (requiredRole === 'moderator') {
      return isAdmin || isModerator;
    }

    return false;
  };

  const checkPermission = (permission?: string) => {
    if (!hasPermission()) return false;

    // Add more granular permission checking here if needed
    // For example, checking specific permissions stored in userProfile
    return true;
  };

  return {
    hasPermission: hasPermission(),
    isAdmin,
    isModerator,
    checkPermission,
    userProfile,
  };
};

export default AdminAuthGuard;
