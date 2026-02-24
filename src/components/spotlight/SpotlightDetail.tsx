import React, { useState, useEffect } from 'react';
import { getSpotlight } from '@/lib/spotlights';
import type { AlumniSpotlight } from '@/types/spotlight';

interface Props {
  spotlightId: string;
  lang?: 'es' | 'en';
}

export default function SpotlightDetail({ spotlightId, lang = 'es' }: Props) {
  const [spotlight, setSpotlight] = useState<AlumniSpotlight | null>(null);
  const [loading, setLoading] = useState(true);

  const t = {
    es: {
      loading: 'Cargando...',
      notFound: 'Historia no encontrada.',
      back: '\u2190 Volver a historias',
      classOf: 'Generación',
    },
    en: {
      loading: 'Loading...',
      notFound: 'Story not found.',
      back: '\u2190 Back to stories',
      classOf: 'Class of',
    },
  }[lang];

  useEffect(() => {
    getSpotlight(spotlightId)
      .then(setSpotlight)
      .finally(() => setLoading(false));
  }, [spotlightId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>{t.loading}</p>
      </div>
    );
  }

  if (!spotlight) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>{t.notFound}</p>
        <a href={`/${lang}/spotlights`} style={{ color: 'var(--secid-primary)' }}>
          {t.back}
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <a
        href={`/${lang}/spotlights`}
        style={{
          color: 'var(--secid-primary)',
          display: 'inline-block',
          marginBottom: '2rem',
          textDecoration: 'none',
        }}
      >
        {t.back}
      </a>

      <div
        style={{
          background:
            'linear-gradient(135deg, var(--secid-primary), var(--secid-gold))',
          borderRadius: 'var(--radius-xl)',
          padding: '3rem',
          color: 'white',
          textAlign: 'center',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            width: '5rem',
            height: '5rem',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            fontSize: '2rem',
            fontWeight: 700,
          }}
        >
          {spotlight.name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')}
        </div>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            margin: '0 0 0.5rem',
          }}
        >
          {spotlight.name}
        </h1>
        <p style={{ fontSize: '1.125rem', opacity: 0.95 }}>
          {spotlight.title} @ {spotlight.company}
        </p>
        <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>
          {t.classOf} {spotlight.graduationYear}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '2rem',
          justifyContent: 'center',
        }}
      >
        {spotlight.tags.map((tag, i) => (
          <span
            key={i}
            style={{
              padding: '0.375rem 0.75rem',
              background: 'var(--color-surface-alt)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          lineHeight: 1.8,
          color: 'var(--color-text-primary)',
        }}
        dangerouslySetInnerHTML={{ __html: spotlight.story }}
      />
    </div>
  );
}
