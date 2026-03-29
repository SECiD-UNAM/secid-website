import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import CompanyDashboard from '@/components/jobs/CompanyDashboard';

interface Props {
  lang?: 'es' | 'en';
}

export default function CompanyDashboardPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <CompanyDashboard lang={lang} />
    </AuthProvider>
  );
}
