import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { MemberDashboard } from '@/components/dashboard/members/MemberDashboard';

interface Props {
  lang?: 'es' | 'en';
}

export default function MemberDashboardPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <MemberDashboard lang={lang} />
    </AuthProvider>
  );
}
