import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { CompanyProfile } from '@/components/companies/CompanyProfile';
import { useRouteIdBySegment } from '@/hooks/use-route-id';

interface Props {
  slug?: string;
  lang?: 'es' | 'en';
}

export default function CompanyProfilePage({ slug, lang = 'es' }: Props) {
  const routeSlug = useRouteIdBySegment('companies');
  const effectiveSlug = slug || routeSlug || '';
  return (
    <AuthProvider>
      <CompanyProfile slug={effectiveSlug} lang={lang} />
    </AuthProvider>
  );
}
