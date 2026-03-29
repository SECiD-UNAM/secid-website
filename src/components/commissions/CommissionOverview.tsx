import React, { useState, Suspense, lazy } from 'react';
import { commissionsI18n } from './commissions-data';
import CommissionsListView from './CommissionsListView';

const CommissionsChartView = lazy(() => import('./CommissionsChartView'));

interface Props {
  lang?: 'es' | 'en';
}

export default function CommissionOverview({ lang = 'es' }: Props) {
  const [view, setView] = useState<'list' | 'chart'>('list');
  const t = commissionsI18n[lang];

  const activeButtonStyle: React.CSSProperties = {
    background: 'var(--secid-primary, #F65425)',
    color: 'white',
    padding: '0.5rem 1.25rem',
    borderRadius: 'var(--radius-full, 999px)',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.875rem',
  };

  const inactiveButtonStyle: React.CSSProperties = {
    background: 'transparent',
    color: 'var(--color-text-secondary, #888)',
    padding: '0.5rem 1.25rem',
    borderRadius: 'var(--radius-full, 999px)',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.875rem',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--color-surface-alt, #171717)',
            borderRadius: 'var(--radius-full, 999px)',
            padding: '4px',
            gap: '2px',
          }}
        >
          <button
            onClick={() => setView('list')}
            style={view === 'list' ? activeButtonStyle : inactiveButtonStyle}
          >
            {t.listView}
          </button>
          <button
            onClick={() => setView('chart')}
            style={view === 'chart' ? activeButtonStyle : inactiveButtonStyle}
          >
            {t.chartView}
          </button>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <div
          style={{
            opacity: view === 'list' ? 1 : 0,
            pointerEvents: view === 'list' ? 'auto' : 'none',
            transition: 'opacity 300ms ease',
            ...(view !== 'list' ? { position: 'absolute', top: 0, left: 0, width: '100%' } : {}),
          }}
        >
          <CommissionsListView lang={lang} />
        </div>

        <div
          style={{
            opacity: view === 'chart' ? 1 : 0,
            pointerEvents: view === 'chart' ? 'auto' : 'none',
            transition: 'opacity 300ms ease',
            ...(view !== 'chart' ? { position: 'absolute', top: 0, left: 0, width: '100%' } : {}),
          }}
        >
          <Suspense
            fallback={
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                Loading...
              </div>
            }
          >
            <CommissionsChartView lang={lang} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
