import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { dismissMergeMatch } from '@/lib/merge/mutations';
import { AlertCircle, X } from 'lucide-react';
import { ClaimFlow } from './ClaimFlow';

interface MergeNotificationBannerProps {
  lang?: 'es' | 'en';
  onReviewClick?: () => void;
}

export const MergeNotificationBanner: React.FC<MergeNotificationBannerProps> = ({
  lang = 'es',
  onReviewClick,
}) => {
  const { userProfile, user } = useAuth();
  const [dismissing, setDismissing] = useState(false);
  const [showClaimFlow, setShowClaimFlow] = useState(false);

  const match = userProfile?.potentialMergeMatch;
  if (!match || match.dismissed) return null;

  const handleDismiss = async () => {
    if (!user?.uid) return;
    setDismissing(true);
    try {
      await dismissMergeMatch(user.uid);
    } catch (err) {
      console.error('Error dismissing merge match:', err);
    } finally {
      setDismissing(false);
    }
  };

  return (
    <>
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {lang === 'es'
                ? 'Encontramos un perfil existente que coincide con tu número de cuenta de la UNAM. ¿Te gustaría reclamarlo?'
                : 'We found an existing profile matching your UNAM account number. Would you like to claim it?'}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => {
                  setShowClaimFlow(true);
                  onReviewClick?.();
                }}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                {lang === 'es' ? 'Revisar Perfil' : 'Review Profile'}
              </button>
              <button
                onClick={handleDismiss}
                disabled={dismissing}
                className="rounded-md border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-700 dark:text-blue-300"
              >
                {lang === 'es' ? 'Descartar' : 'Dismiss'}
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            disabled={dismissing}
            className="text-blue-400 hover:text-blue-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {showClaimFlow && (
        <ClaimFlow lang={lang} onClose={() => setShowClaimFlow(false)} />
      )}
    </>
  );
};
