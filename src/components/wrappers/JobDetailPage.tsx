import React from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import JobApplicationPage from '@/components/jobs/JobApplicationPage';
import { useRouteIdBySegment } from '@/hooks/use-route-id';

interface Props {
  jobId?: string;
  lang?: 'es' | 'en';
}

export default function JobDetailPage({ jobId, lang = 'es' }: Props) {
  const routeId = useRouteIdBySegment('jobs');
  const effectiveId = jobId || routeId;

  if (!effectiveId) {
    return (
      <div className="py-8 text-center text-gray-500">
        {lang === 'es' ? 'Empleo no encontrado' : 'Job not found'}
      </div>
    );
  }

  return (
    <AuthProvider>
      <JobApplicationPage jobId={effectiveId} lang={lang} />
    </AuthProvider>
  );
}
