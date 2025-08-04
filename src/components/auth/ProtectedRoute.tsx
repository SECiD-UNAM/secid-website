import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/hooks/useTranslations';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerified?: boolean;
  requireRole?: ('member' | 'admin' | 'moderator' | 'company')[];
  redirectTo?: string;
  lang?: 'es' | 'en';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireVerified = false,
  requireRole = [],
  redirectTo = '/login',
  lang = 'es',
}) => {
  const { user, userProfile, loading, isAuthenticated, isVerified } = useAuth();
  const t = useTranslations(lang);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Redirect to login if not authenticated
      window.location.href = `/${lang}${redirectTo}`;
    }
  }, [loading, isAuthenticated, redirectTo, lang]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center">
            <svg
              className="h-12 w-12 animate-spin text-primary-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Check authentication
  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
            Authentication Required
          </h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            Please sign in to access this page.
          </p>
          <a
            href={`/${lang}/login`}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-6 py-3 text-base font-medium text-white hover:bg-primary-700"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  // Check verification requirement
  if (requireVerified && !isVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md text-center">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-yellow-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
            UNAM Verification Required
          </h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            Please verify your UNAM email to access this feature.
          </p>
          <a
            href={`/${lang}/dashboard/settings`}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-6 py-3 text-base font-medium text-white hover:bg-primary-700"
          >
            Complete Verification
          </a>
        </div>
      </div>
    );
  }

  // Check role requirement
  if (requireRole.length > 0 && userProfile) {
    const hasRequiredRole = requireRole.includes(userProfile.role);

    if (!hasRequiredRole) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="w-full max-w-md text-center">
            <div className="mb-6">
              <svg
                className="mx-auto h-16 w-16 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
            <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
              Access Denied
            </h2>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              You don't have permission to access this page.
            </p>
            <a
              href={`/${lang}/dashboard`}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-600 px-6 py-3 text-base font-medium text-white hover:bg-primary-700"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  // User is authenticated and meets all requirements
  return <>{children}</>;
};

export default ProtectedRoute;
