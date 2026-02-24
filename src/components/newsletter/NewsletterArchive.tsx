import React, { useState, useEffect } from 'react';
import { getNewsletterArchive, type NewsletterIssue } from '@/lib/newsletter-archive';

interface Props {
  lang?: 'es' | 'en';
}

export default function NewsletterArchive({ lang = 'es' }: Props) {
  const [newsletters, setNewsletters] = useState<NewsletterIssue[]>([]);
  const [loading, setLoading] = useState(true);

  const t = {
    es: {
      title: 'Archivo del Newsletter',
      subtitle: 'Revisa nuestras ediciones anteriores',
      issue: 'Edicion',
      readMore: 'Leer mas',
      loading: 'Cargando...',
      empty: 'No hay ediciones disponibles aun.',
    },
    en: {
      title: 'Newsletter Archive',
      subtitle: 'Browse our past editions',
      issue: 'Issue',
      readMore: 'Read more',
      loading: 'Loading...',
      empty: 'No editions available yet.',
    },
  }[lang];

  useEffect(() => {
    getNewsletterArchive()
      .then(setNewsletters)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="secid-spinner" />
        <p>{t.loading}</p>
      </div>
    );
  }

  if (newsletters.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>{t.empty}</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t.title}</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>{t.subtitle}</p>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '1.5rem',
      }}>
        {newsletters.map((newsletter) => (
          <a
            key={newsletter.id}
            href={`/${lang}/newsletter/${newsletter.id}`}
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
            <div style={{
              height: '160px',
              background: 'linear-gradient(135deg, var(--secid-primary), var(--secid-gold))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '2rem',
              fontWeight: 700,
            }}>
              #{newsletter.issueNumber}
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
                fontSize: '0.875rem',
                color: 'var(--color-text-tertiary)',
              }}>
                <span>{t.issue} #{newsletter.issueNumber}</span>
                <span>{newsletter.publishedAt.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                {newsletter.title}
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6, fontSize: '0.9rem' }}>
                {newsletter.excerpt}
              </p>
              <span style={{
                display: 'inline-block',
                marginTop: '1rem',
                color: 'var(--secid-primary)',
                fontWeight: 500,
                fontSize: '0.875rem',
              }}>
                {t.readMore} &rarr;
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
