import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import SecuritySettings from '@/components/settings/SecuritySettings';

interface Props {
  lang?: 'es' | 'en';
}

// SecuritySettings is a client:only island. It (via AddAlternateEmail)
// consumes AuthContext, so it must be wrapped in AuthProvider — mirrors
// ProfileEditPage / VerifyAlternateEmailPage. Without this, useAuth()
// returns the default context (isVerified:false) and the members-only
// "Correo alterno" section silently never renders.
export default function SecuritySettingsPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <SecuritySettings lang={lang} />
    </AuthProvider>
  );
}
