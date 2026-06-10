import React, { useMemo } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import SkillAssessment from '@/components/assessment/SkillAssessment';
import { useRouteIdBySegment } from '@/hooks/use-route-id';

interface Props {
  skillId?: string;
  lang?: 'es' | 'en';
}

const SKILL_MAP: Record<string, string> = {
  python: 'python',
  sql: 'sql',
  'machine-learning': 'machine_learning',
  'aprendizaje-automatico': 'machine_learning',
  estadistica: 'statistics',
  statistics: 'statistics',
  'visualizacion-datos': 'data_visualization',
  'data-visualization': 'data_visualization',
  'big-data': 'big_data',
  'deep-learning': 'deep_learning',
  'aprendizaje-profundo': 'deep_learning',
  'ingenieria-datos': 'data_engineering',
  'data-engineering': 'data_engineering',
  'inteligencia-negocios': 'business_intelligence',
  'business-intelligence': 'business_intelligence',
  excel: 'excel',
  r: 'r',
  tableau: 'tableau',
  'power-bi': 'power_bi',
  spark: 'spark',
  aws: 'aws',
  azure: 'azure',
  gcp: 'gcp',
  docker: 'docker',
  git: 'git',
  linux: 'linux',
  apis: 'apis',
  etl: 'etl',
  'bases-datos': 'databases',
  databases: 'databases',
  mongodb: 'mongodb',
  hadoop: 'hadoop',
};

function SkillAssessmentInner({ skillId, lang = 'es' }: Props) {
  const { user, loading } = useAuth();
  const routeId = useRouteIdBySegment('assessments');
  const effectiveId = skillId || routeId || 'python';
  const skillCategory = useMemo(
    () => SKILL_MAP[effectiveId] || 'python',
    [effectiveId]
  );
  if (loading || !user?.uid) {
    return null;
  }
  return (
    <SkillAssessment
      skillCategory={skillCategory as any}
      userId={user.uid}
      onStartAssessment={(assessmentId: string) => {
        const path =
          lang === 'es'
            ? `/es/dashboard/assessments/${assessmentId}`
            : `/en/dashboard/assessments/${assessmentId}`;
        window.location.href = path;
      }}
      onViewCertificate={() => {
        const path =
          lang === 'es'
            ? '/es/dashboard/assessments/historial'
            : '/en/dashboard/assessments/history';
        window.location.href = path;
      }}
    />
  );
}

export default function SkillAssessmentPage(props: Props) {
  return (
    <AuthProvider>
      <SkillAssessmentInner {...props} />
    </AuthProvider>
  );
}
