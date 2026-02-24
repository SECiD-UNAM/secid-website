import React, { useState, useEffect } from 'react';
import { getNewsletter, type NewsletterIssue } from '@/lib/newsletter-archive';

interface Props {
  newsletterId: string;
  lang?: 'es' | 'en';
}

export default function NewsletterView({ newsletterId, lang = 'es' }: Props) {
  const [newsletter, setNewsletter] = useState<NewsletterIssue | null>(null);
  const [loading, setLoading] = useState(true);

  const t = {
    es: {
      loading: 'Cargando...',
      notFound: 'Newsletter no encontrado.',
      backToArchive: '\u2190 Volver al archivo',
      issue: 'Edicion',
    },
    en: {
      loading: 'Loading...',
      notFound: 'Newsletter not found.',
      backToArchive: '\u2190 Back to archive',
      issue: 'Issue',
    },
  }[lang];

  useEffect(() => {
    getNewsletter(newsletterId)
      .then(setNewsletter)
      .finally(() => setLoading(false));
  }, [newsletterId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="secid-spinner" />
        <p>{t.loading}</p>
      </div>
    );
  }

  if (!newsletter) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>{t.notFound}</p>
        <a href={`/${lang}/newsletter/archive`} style={{ color: 'var(--secid-primary)', marginTop: '1rem', display: 'inline-block' }}>
          {t.backToArchive}
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <a
        href={`/${lang}/newsletter/archive`}
        style={{ color: 'var(--secid-primary)', display: 'inline-block', marginBottom: '2rem', textDecoration: 'none' }}
      >
        {t.backToArchive}
      </a>

      <div style={{
        background: 'linear-gradient(135deg, var(--secid-primary), var(--secid-gold))',
        borderRadius: 'var(--radius-xl)',
        padding: '3rem',
        color: 'white',
        textAlign: 'center',
        marginBottom: '2rem',
      }}>
        <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>
          {t.issue} #{newsletter.issueNumber} &middot; {newsletter.publishedAt.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem' }}>
          {newsletter.title}
        </h1>
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
        dangerouslySetInnerHTML={{ __html: newsletter.content }}
      />
    </div>
  );
}
