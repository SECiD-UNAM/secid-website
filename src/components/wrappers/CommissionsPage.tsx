import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import CommissionOverview from '@/components/commissions/CommissionOverview';

interface Props {
  lang?: 'es' | 'en';
}

export default function CommissionsPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <CommissionOverview lang={lang} />
    </AuthProvider>
  );
}
