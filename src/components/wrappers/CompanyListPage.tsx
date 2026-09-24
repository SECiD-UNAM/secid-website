import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { CompanyList } from '@/components/companies/CompanyList';

interface Props {
  lang?: 'es' | 'en';
}

export default function CompanyListPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <CompanyList lang={lang} />
    </AuthProvider>
  );
}
