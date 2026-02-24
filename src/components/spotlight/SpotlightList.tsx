import React, { useState, useEffect } from 'react';
import { getSpotlights } from '@/lib/spotlights';
import type { AlumniSpotlight } from '@/types/spotlight';
import SpotlightCard from './SpotlightCard';

interface Props {
  lang?: 'es' | 'en';
}

export default function SpotlightList({ lang = 'es' }: Props) {
  const [spotlights, setSpotlights] = useState<AlumniSpotlight[]>([]);
  const [loading, setLoading] = useState(true);

  const t = {
    es: {
      loading: 'Cargando historias...',
      empty: 'No hay historias disponibles aún.',
    },
    en: {
      loading: 'Loading stories...',
      empty: 'No stories available yet.',
    },
  }[lang];

  useEffect(() => {
    getSpotlights()
      .then(setSpotlights)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>{t.loading}</p>
      </div>
    );
  }

  if (spotlights.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>{t.empty}</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '1.5rem',
      }}
    >
      {spotlights.map((spotlight) => (
        <SpotlightCard key={spotlight.id} spotlight={spotlight} lang={lang} />
      ))}
    </div>
  );
}
