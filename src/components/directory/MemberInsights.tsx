import React, { useEffect, useState } from 'react';
import { getGlobalAggregates } from '@/lib/survey/queries';
import type { SurveyAggregates } from '@/types/survey';
import IndustryDonut from './charts/IndustryDonut';
import GenerationHistogram from './charts/GenerationHistogram';
import HorizontalBars from './charts/HorizontalBars';
import { MemberShowcase } from './MemberShowcase';

type Tab =
  | 'companies'
  | 'industries'
  | 'generations'
  | 'tech-stack'
  | 'areas-of-interest'
  | 'mentorship';

const TAB_LABELS: Record<Tab, { es: string; en: string }> = {
  companies: { es: 'Empresas', en: 'Companies' },
  industries: { es: 'Industrias', en: 'Industries' },
  generations: { es: 'Generaciones', en: 'Generations' },
  'tech-stack': { es: 'Tech Stack', en: 'Tech stack' },
  'areas-of-interest': { es: 'Áreas de interés', en: 'Areas of interest' },
  mentorship: { es: 'Mentoría', en: 'Mentorship' },
};

const AREA_LABELS: Record<string, { es: string; en: string }> = {
  ml: { es: 'Machine Learning', en: 'Machine Learning' },
  dl: { es: 'Deep Learning', en: 'Deep Learning' },
  nlp: { es: 'NLP', en: 'NLP' },
  cv: { es: 'Computer Vision', en: 'Computer Vision' },
  rl: { es: 'Reinforcement Learning', en: 'Reinforcement Learning' },
  'gen-ai': { es: 'Generative AI', en: 'Generative AI' },
  mlops: { es: 'MLOps', en: 'MLOps' },
  'data-eng': { es: 'Data Engineering', en: 'Data Engineering' },
  analytics: { es: 'Analítica', en: 'Analytics' },
  bi: { es: 'Business Intelligence', en: 'Business Intelligence' },
  statistics: { es: 'Estadística', en: 'Statistics' },
  research: { es: 'Investigación', en: 'Research' },
  ethics: { es: 'Ética en IA', en: 'AI Ethics' },
  product: { es: 'Producto', en: 'Product' },
  leadership: { es: 'Liderazgo', en: 'Leadership' },
};

const MENTORSHIP_LABELS: Record<string, { es: string; en: string }> = {
  'want-mentor': { es: 'Buscan mentor', en: 'Want a mentor' },
  'want-mentee': { es: 'Quieren mentorear', en: 'Want to mentor' },
  both: { es: 'Ambos', en: 'Both' },
  neither: { es: 'Ninguno', en: 'Neither' },
};

interface Props {
  lang?: 'es' | 'en';
}

export default function MemberInsights({ lang = 'es' }: Props) {
  const [tab, setTab] = useState<Tab>('companies');
  const [aggregates, setAggregates] = useState<SurveyAggregates | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getGlobalAggregates().then((data) => {
      if (!cancelled) {
        setAggregates(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasData = !!(
    aggregates &&
    (aggregates.totalRespondents > 0 || (aggregates.totalFallbackUsers ?? 0) > 0)
  );
  const tabs: Tab[] = hasData
    ? ['companies', 'industries', 'generations', 'tech-stack', 'areas-of-interest', 'mentorship']
    : ['companies'];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav
          className="-mb-px flex space-x-6 overflow-x-auto"
          aria-label={lang === 'es' ? 'Vistas' : 'Tabs'}
        >
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                tab === t
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {TAB_LABELS[t][lang]}
            </button>
          ))}
        </nav>
      </div>

      {aggregates && hasData && tab !== 'companies' && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span>
            {lang === 'es' ? 'Basado en' : 'Based on'}{' '}
            <strong>{aggregates.totalRespondents}</strong>{' '}
            {lang === 'es' ? 'respuestas de encuesta' : 'survey responses'}
            {(aggregates.totalFallbackUsers ?? 0) > 0 && (
              <>
                {' '}
                + <strong>{aggregates.totalFallbackUsers}</strong>{' '}
                {lang === 'es' ? 'perfiles' : 'profiles'}
              </>
            )}
          </span>
          <span>
            ·{' '}
            {lang === 'es'
              ? `Solo agregados de ${aggregates.kAnonymityThreshold}+ miembros`
              : `Only aggregates of ${aggregates.kAnonymityThreshold}+ members shown`}
          </span>
        </div>
      )}

      <div>
        {tab === 'companies' && <MemberShowcase lang={lang} />}

        {loading && tab !== 'companies' && (
          <div className="h-72 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        )}

        {!loading && tab === 'industries' && aggregates && (
          <IndustryDonut data={aggregates.byIndustry as Record<string, number>} lang={lang} />
        )}

        {!loading && tab === 'generations' && aggregates && (
          <GenerationHistogram data={aggregates.byGeneration} lang={lang} />
        )}

        {!loading && tab === 'tech-stack' && aggregates && (
          <HorizontalBars
            data={aggregates.byTechStack as Record<string, number>}
            lang={lang}
            color="#059669"
            maxRows={20}
          />
        )}

        {!loading && tab === 'areas-of-interest' && aggregates && (
          <HorizontalBars
            data={aggregates.byAreaOfInterest as Record<string, number>}
            labels={AREA_LABELS}
            lang={lang}
            color="#7C3AED"
          />
        )}

        {!loading && tab === 'mentorship' && aggregates && (
          <HorizontalBars
            data={aggregates.byMentorship as Record<string, number>}
            labels={MENTORSHIP_LABELS}
            lang={lang}
            color="#DB2777"
            heightPerRow={48}
          />
        )}
      </div>
    </div>
  );
}
