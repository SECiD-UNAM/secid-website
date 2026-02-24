import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import CommissionPublicPage from '@/components/commissions/CommissionPublicPage';

interface Props {
  commissionId?: string;
  lang?: 'es' | 'en';
}

export default function CommissionDetailPage({ commissionId, lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <CommissionPublicPage commissionId={commissionId || ''} lang={lang} />
    </AuthProvider>
  );
}
