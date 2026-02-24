import React from 'react';
import { COMMISSION_CONFIGS } from '@/lib/commissions';
import type { CommissionConfig } from '@/lib/commissions';

interface Props {
  commissionId: string;
  lang?: 'es' | 'en';
}

const iconMap: Record<string, string> = {
  'chart-bar': 'fas fa-chart-bar',
  'chat-bubble-left-right': 'fas fa-comments',
  'cpu-chip': 'fas fa-microchip',
  'server-stack': 'fas fa-server',
  'sparkles': 'fas fa-brain',
  'eye': 'fas fa-eye',
  'beaker': 'fas fa-flask',
  'cog-6-tooth': 'fas fa-cogs',
  'brain': 'fas fa-brain',
  'presentation-chart-line': 'fas fa-chart-line',
};

export default function CommissionPublicPage({ commissionId, lang = 'es' }: Props) {
  const commission = COMMISSION_CONFIGS[commissionId];

  const t = {
    es: {
      notFound: 'Comisión no encontrada.',
      backToAll: '← Volver a Comisiones',
      features: 'Características',
      tools: 'Herramientas y Tecnologías',
      skillAreas: 'Áreas de Habilidad',
      joinCta: 'Unirse a esta Comisión',
      established: 'Establecida en',
    },
    en: {
      notFound: 'Commission not found.',
      backToAll: '← Back to Commissions',
      features: 'Features',
      tools: 'Tools & Technologies',
      skillAreas: 'Skill Areas',
      joinCta: 'Join this Commission',
      established: 'Established',
    },
  }[lang];

  if (!commission) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>{t.notFound}</p>
        <a href={`/${lang}/commissions`} style={{ color: 'var(--secid-primary)', marginTop: '1rem', display: 'inline-block' }}>
          {t.backToAll}
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <a href={`/${lang}/commissions`} style={{ color: 'var(--secid-primary)', display: 'inline-block', marginBottom: '2rem', textDecoration: 'none' }}>
        {t.backToAll}
      </a>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${commission.color}, ${commission.color}cc)`,
        borderRadius: 'var(--radius-xl)',
        padding: '3rem',
        color: 'white',
        marginBottom: '2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <i className={iconMap[commission.icon] || 'fas fa-cog'} style={{ fontSize: '2rem' }} />
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>{commission.name}</h1>
        </div>
        <p style={{ fontSize: '1.125rem', opacity: 0.95, lineHeight: 1.6 }}>{commission.description}</p>
        <p style={{ fontSize: '0.875rem', opacity: 0.8, marginTop: '1rem' }}>
          {t.established}: {commission.establishedAt.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Features */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem',
        marginBottom: '1.5rem',
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
          <i className="fas fa-star" style={{ color: commission.color, marginRight: '0.5rem' }} />
          {t.features}
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
          {commission.features.map((feature, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-text-secondary)' }}>
              <i className="fas fa-check-circle" style={{ color: commission.color, flexShrink: 0 }} />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Tools */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem',
        marginBottom: '1.5rem',
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
          <i className="fas fa-wrench" style={{ color: commission.color, marginRight: '0.5rem' }} />
          {t.tools}
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {commission.tools.map((tool, i) => (
            <span key={i} style={{
              padding: '0.5rem 1rem',
              background: `${commission.color}15`,
              color: commission.color,
              borderRadius: 'var(--radius-full)',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}>
              {tool}
            </span>
          ))}
        </div>
      </div>

      {/* Skill Areas */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '2rem',
        marginBottom: '2rem',
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
          <i className="fas fa-graduation-cap" style={{ color: commission.color, marginRight: '0.5rem' }} />
          {t.skillAreas}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {commission.skillAreas.map((skill, i) => (
            <div key={i} style={{
              padding: '0.75rem 1rem',
              background: 'var(--color-surface-alt)',
              borderRadius: 'var(--radius-lg)',
              fontSize: '0.9rem',
              color: 'var(--color-text-secondary)',
            }}>
              {skill}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center' }}>
        <a
          href={`/${lang}/dashboard`}
          style={{
            display: 'inline-block',
            padding: '0.875rem 2rem',
            background: commission.color,
            color: 'white',
            borderRadius: 'var(--radius-full)',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '1rem',
          }}
        >
          {t.joinCta}
        </a>
      </div>
    </div>
  );
}
