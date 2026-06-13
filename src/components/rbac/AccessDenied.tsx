import React from 'react';

function detectLanguage(): 'en' | 'es' {
  if (typeof window === 'undefined') return 'es';
  return window.location.pathname.startsWith('/en') ? 'en' : 'es';
}

const translations = {
  en: {
    title: 'Access Denied',
    message: "You don't have permission to access this content.",
    backLabel: 'Back to Dashboard',
    backHref: '/en/dashboard',
  },
  es: {
    title: 'Acceso Denegado',
    message: 'No tienes permisos para acceder a este contenido.',
    backLabel: 'Volver al Panel',
    backHref: '/es/dashboard',
  },
} as const;

export default function AccessDenied() {
  const lang = detectLanguage();
  const t = translations[lang];

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <svg
          className="h-8 w-8 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
      </div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
        {t.title}
      </h2>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        {t.message}
      </p>
      <a
        href={t.backHref}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        {t.backLabel}
      </a>
    </div>
  );
}
