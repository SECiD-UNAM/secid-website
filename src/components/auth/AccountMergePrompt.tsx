import React from 'react';
import type { SupportedProvider } from '@/types/user';

interface AccountMergePromptProps {
  email: string;
  existingProvider: SupportedProvider;
  onSignInWithExisting: () => void;
  onCancel: () => void;
  lang?: 'es' | 'en';
  loading?: boolean;
}

const PROVIDER_NAMES: Record<SupportedProvider, string> = {
  google: 'Google',
  github: 'GitHub',
  linkedin: 'LinkedIn',
};

export const AccountMergePrompt: React.FC<AccountMergePromptProps> = ({
  email,
  existingProvider,
  onSignInWithExisting,
  onCancel,
  lang = 'es',
  loading = false,
}) => {
  const providerName = PROVIDER_NAMES[existingProvider] ?? existingProvider;

  const message =
    lang === 'es'
      ? `Ya existe una cuenta con ${email} vía ${providerName}. Inicia sesión con ${providerName} para vincular tus cuentas.`
      : `An account with ${email} already exists via ${providerName}. Sign in with ${providerName} to link your accounts.`;

  const signInButtonLabel =
    lang === 'es' ? `Continuar con ${providerName}` : `Continue with ${providerName}`;

  const cancelButtonLabel = lang === 'es' ? 'Cancelar' : 'Cancel';

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
      <p className="text-sm text-amber-800 dark:text-amber-200">{message}</p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onSignInWithExisting}
          disabled={loading}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {signInButtonLabel}
            </span>
          ) : (
            signInButtonLabel
          )}
        </button>

        <button
          type="button"
          className="rounded-md border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelButtonLabel}
        </button>
      </div>
    </div>
  );
};

export default AccountMergePrompt;
