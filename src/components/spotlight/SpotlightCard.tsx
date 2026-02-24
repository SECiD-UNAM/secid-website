import React from 'react';
import type { AlumniSpotlight } from '@/types/spotlight';

interface Props {
  spotlight: AlumniSpotlight;
  lang?: 'es' | 'en';
}

export default function SpotlightCard({ spotlight, lang = 'es' }: Props) {
  return (
    <a
      href={`/${lang}/spotlights/${spotlight.id}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        background: 'var(--card-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          height: '200px',
          background: `linear-gradient(135deg, var(--secid-primary), var(--secid-gold))`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {spotlight.featuredImage ? (
          <img
            src={spotlight.featuredImage}
            alt={spotlight.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '5rem',
              height: '5rem',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
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
        )}
      </div>
      <div style={{ padding: '1.5rem' }}>
        {spotlight.featured && (
          <span
            style={{
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              background: 'var(--secid-gold)',
              color: 'white',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
            }}
          >
            {lang === 'es' ? 'Destacado' : 'Featured'}
          </span>
        )}
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            marginBottom: '0.25rem',
          }}
        >
          {spotlight.name}
        </h3>
        <p
          style={{
            color: 'var(--secid-primary)',
            fontSize: '0.9rem',
            fontWeight: 500,
            marginBottom: '0.25rem',
          }}
        >
          {spotlight.title} @ {spotlight.company}
        </p>
        <p
          style={{
            color: 'var(--color-text-tertiary)',
            fontSize: '0.8rem',
            marginBottom: '0.75rem',
          }}
        >
          {lang === 'es' ? 'Generación' : 'Class of'}{' '}
          {spotlight.graduationYear}
        </p>
        <p
          style={{
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
            fontSize: '0.9rem',
          }}
        >
          {spotlight.excerpt}
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginTop: '1rem',
          }}
        >
          {spotlight.tags.map((tag, i) => (
            <span
              key={i}
              style={{
                padding: '0.25rem 0.5rem',
                background: 'var(--color-surface-alt)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.75rem',
                color: 'var(--color-text-tertiary)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </a>
  );
}
