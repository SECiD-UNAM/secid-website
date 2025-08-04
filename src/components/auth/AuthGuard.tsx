import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useTranslations } from '@/hooks/useTranslations';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  lang?: 'es' | 'en';
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback,
  redirectTo,
  lang = 'es',
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const t = useTranslations(lang);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);

      if (!user && redirectTo) {
        window.location.href = redirectTo;
      }
    });

    return () => unsubscribe();
  }, [redirectTo]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t.common.loading}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
            {t.auth.unauthorized.title}
          </h2>
          <p className="mb-8 text-gray-600 dark:text-gray-400">
            {t.auth.unauthorized.message}
          </p>
          <div className="space-x-4">
            <a
              href={`/${lang}/login`}
              className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              {t.auth.unauthorized.signIn}
            </a>
            <a
              href={`/${lang}/signup`}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {t.auth.unauthorized.signUp}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
