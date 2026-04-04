import React, { useState, useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardSidebar } from './DashboardSidebar';
import { MergeNotificationBanner } from '@/components/merge/MergeNotificationBanner';
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner';
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
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('onboarding') === 'true') {
      setShowOnboarding(true);
      // Clean URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete('onboarding');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

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
            className={`fixed left-4 z-40 rounded-lg bg-white p-2 shadow-md dark:bg-gray-800 lg:hidden ${
              isBeta ? 'top-28' : 'top-20'
            }`}
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
              <EmailVerificationBanner lang={lang} />
              <MergeNotificationBanner lang={lang} />
              {children}
              {showOnboarding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {lang === 'es' ? '¡Completa tu perfil!' : 'Complete your profile!'}
                      </h2>
                      <button
                        onClick={() => setShowOnboarding(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">
                      {lang === 'es'
                        ? 'Tu cuenta ha sido creada. Ve a tu perfil para agregar más información y aprovechar al máximo la plataforma.'
                        : 'Your account has been created. Visit your profile to add more information and get the most out of the platform.'}
                    </p>
                    <div className="mt-6 flex gap-3">
                      <a
                        href={`/${lang}/dashboard/profile`}
                        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                      >
                        {lang === 'es' ? 'Completar perfil' : 'Complete profile'}
                      </a>
                      <button
                        onClick={() => setShowOnboarding(false)}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        {lang === 'es' ? 'Más tarde' : 'Later'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </ProtectedRoute>
    </AuthProvider>
  );
};

export default DashboardShell;
