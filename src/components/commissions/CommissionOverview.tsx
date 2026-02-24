import React from 'react';
import { COMMISSION_CONFIGS } from '@/lib/commissions';

interface Props {
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

export default function CommissionOverview({ lang = 'es' }: Props) {
  const t = {
    es: {
      title: 'Comisiones Técnicas',
      subtitle: 'Únete a una comisión y colabora con expertos en tu área de interés',
      features: 'características',
      tools: 'herramientas',
      skills: 'áreas de habilidad',
      viewDetails: 'Ver detalles',
    },
    en: {
      title: 'Technical Commissions',
      subtitle: 'Join a commission and collaborate with experts in your area of interest',
      features: 'features',
      tools: 'tools',
      skills: 'skill areas',
      viewDetails: 'View details',
    },
  }[lang];

  const commissions = Object.values(COMMISSION_CONFIGS).filter(c => c.isActive);

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>{t.title}</h2>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '600px', margin: '0 auto' }}>{t.subtitle}</p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '1.5rem',
      }}>
        {commissions.map((commission) => (
          <a
            key={commission.id}
            href={`/${lang}/commissions/${commission.id}`}
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
              height: '8px',
              background: commission.color,
            }} />
            <div style={{ padding: '1.5rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem',
              }}>
                <div style={{
                  width: '3rem',
                  height: '3rem',
                  background: `${commission.color}20`,
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: commission.color,
                  fontSize: '1.25rem',
                }}>
                  <i className={iconMap[commission.icon] || 'fas fa-cog'} />
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                  {commission.name}
                </h3>
              </div>

              <p style={{
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
                fontSize: '0.9rem',
                marginBottom: '1rem',
              }}>
                {commission.description}
              </p>

              <div style={{
                display: 'flex',
                gap: '1rem',
                fontSize: '0.8rem',
                color: 'var(--color-text-tertiary)',
              }}>
                <span><i className="fas fa-list" style={{ marginRight: '0.25rem' }} />{commission.features.length} {t.features}</span>
                <span><i className="fas fa-wrench" style={{ marginRight: '0.25rem' }} />{commission.tools.length} {t.tools}</span>
                <span><i className="fas fa-graduation-cap" style={{ marginRight: '0.25rem' }} />{commission.skillAreas.length} {t.skills}</span>
              </div>

              <div style={{ marginTop: '1rem', color: 'var(--secid-primary)', fontWeight: 500, fontSize: '0.875rem' }}>
                {t.viewDetails} →
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
