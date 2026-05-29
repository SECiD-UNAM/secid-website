import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { getAdminAggregates } from '@/lib/survey/queries';
import type { SurveyAggregates } from '@/types/survey';
import IndustryDonut from '@/components/directory/charts/IndustryDonut';
import GenerationHistogram from '@/components/directory/charts/GenerationHistogram';
import HorizontalBars from '@/components/directory/charts/HorizontalBars';
import { AuthProvider } from '@/contexts/AuthContext';

interface Props {
  lang?: 'es' | 'en';
}

function AdminInner({ lang = 'es' }: Props) {
  const [aggregates, setAggregates] = useState<SurveyAggregates | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true);
    const data = await getAdminAggregates();
    setAggregates(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const callable = httpsCallable(functions, 'refreshSurveyAggregates');
      await callable({});
      await load();
      toast.success(lang === 'es' ? 'Agregados actualizados' : 'Aggregates refreshed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error';
      toast.error(msg);
    } finally {
      setRefreshing(false);
    }
  }

  function handleExportCsv() {
    if (!aggregates) return;
    const rows: string[] = ['bucket,key,count'];
    const sections: [string, Record<string, number> | undefined][] = [
      ['industry', aggregates.byIndustry as Record<string, number>],
      ['seniority', aggregates.bySeniority as Record<string, number>],
      ['jobFunction', aggregates.byJobFunction as Record<string, number>],
      ['workMode', aggregates.byWorkMode as Record<string, number>],
      ['generation', aggregates.byGeneration],
      ['country', aggregates.byCountry],
      ['areaOfInterest', aggregates.byAreaOfInterest as Record<string, number>],
      ['techStack', aggregates.byTechStack as Record<string, number>],
      ['mentorship', aggregates.byMentorship as Record<string, number>],
      ['openToOpportunities', aggregates.byOpenToOpportunities as Record<string, number>],
      ['reasonsForJoining', aggregates.byReasonsForJoining as Record<string, number>],
      ['academicLevel', aggregates.byAcademicLevel as Record<string, number>],
    ];
    for (const [bucket, data] of sections) {
      if (!data) continue;
      for (const [k, v] of Object.entries(data)) {
        rows.push(`${bucket},${k},${v}`);
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `survey-aggregates-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const respondentRate = useMemo(() => {
    if (!aggregates || aggregates.totalRespondents === 0) return 0;
    return Math.round(
      (aggregates.totalCompleted / aggregates.totalRespondents) * 100
    );
  }, [aggregates]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"
          />
        ))}
      </div>
    );
  }

  // First load — aggregator hasn't run yet
  if (!aggregates) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {lang === 'es'
            ? 'Aún no se han generado agregados'
            : 'Aggregates not generated yet'}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {lang === 'es'
            ? 'Haz clic en "Recalcular ahora" para generar el primer reporte. Después, se actualizará automáticamente cada 6 horas.'
            : 'Click "Recompute now" to generate the first report. It will refresh automatically every 6 hours after that.'}
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {refreshing
            ? lang === 'es'
              ? 'Generando...'
              : 'Generating…'
            : lang === 'es'
              ? 'Recalcular ahora'
              : 'Recompute now'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {lang === 'es' ? 'Encuesta de Miembros' : 'Member Survey'}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {lang === 'es'
              ? 'Agregados completos sin censura k-anonymity (vista admin).'
              : 'Full uncensored aggregates (admin view).'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {refreshing
              ? lang === 'es'
                ? 'Actualizando...'
                : 'Refreshing…'
              : lang === 'es'
                ? 'Recalcular ahora'
                : 'Recompute now'}
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!aggregates}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {lang === 'es' ? 'Exportar CSV' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label={lang === 'es' ? 'Respuestas' : 'Responses'} value={aggregates?.totalRespondents ?? 0} />
        <Stat label={lang === 'es' ? 'Completas' : 'Completed'} value={aggregates?.totalCompleted ?? 0} />
        <Stat label={lang === 'es' ? '% Completas' : '% Completed'} value={`${respondentRate}%`} />
        <Stat
          label={lang === 'es' ? 'Miembros sin encuesta' : 'Members w/o survey'}
          value={aggregates?.totalFallbackUsers ?? 0}
        />
      </div>

      {aggregates && (aggregates.totalRespondents === 0 && (aggregates.totalFallbackUsers ?? 0) > 0) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-100">
          {lang === 'es'
            ? `Aún no hay respuestas de encuesta. Las gráficas muestran datos derivados de los perfiles de ${aggregates.totalFallbackUsers} miembros (generación, skills) como fallback.`
            : `No survey responses yet. Charts use fallback data from ${aggregates.totalFallbackUsers} member profiles (generation, skills) until the survey collects responses.`}
        </div>
      )}

      {aggregates && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title={lang === 'es' ? 'Industria' : 'Industry'}>
            <IndustryDonut data={aggregates.byIndustry as Record<string, number>} lang={lang} />
          </Card>
          <Card title={lang === 'es' ? 'Generación' : 'Generation'}>
            <GenerationHistogram data={aggregates.byGeneration} lang={lang} />
          </Card>
          <Card title={lang === 'es' ? 'Tech stack' : 'Tech stack'}>
            <HorizontalBars data={aggregates.byTechStack as Record<string, number>} lang={lang} color="#059669" />
          </Card>
          <Card title={lang === 'es' ? 'Áreas de interés' : 'Areas of interest'}>
            <HorizontalBars data={aggregates.byAreaOfInterest as Record<string, number>} lang={lang} color="#7C3AED" />
          </Card>
          <Card title={lang === 'es' ? 'Mentoría' : 'Mentorship'}>
            <HorizontalBars data={aggregates.byMentorship as Record<string, number>} lang={lang} color="#DB2777" heightPerRow={48} />
          </Card>
          <Card title={lang === 'es' ? 'Razones para unirse' : 'Reasons for joining'}>
            <HorizontalBars data={aggregates.byReasonsForJoining as Record<string, number>} lang={lang} color="#EA580C" />
          </Card>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      {children}
    </div>
  );
}

export default function SurveyAdminPage({ lang = 'es' }: Props) {
  return (
    <AuthProvider>
      <AdminInner lang={lang} />
    </AuthProvider>
  );
}
