import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { SalaryInsights } from '@/components/salary/SalaryInsights';

interface Props {
  lang?: 'es' | 'en';
}

export default function SalaryInsightsPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <SalaryInsights lang={lang} />
    </AuthProvider>
  );
}
