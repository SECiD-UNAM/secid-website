import React from 'react';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  lang?: 'es' | 'en';
}

export default function VerifiedBadge({ size = 'md', lang = 'es' }: Props) {
  const sizes = {
    sm: { fontSize: '0.7rem', padding: '0.125rem 0.375rem', iconSize: '0.625rem' },
    md: { fontSize: '0.75rem', padding: '0.25rem 0.5rem', iconSize: '0.75rem' },
    lg: { fontSize: '0.875rem', padding: '0.375rem 0.75rem', iconSize: '0.875rem' },
  };

  const s = sizes[size];
  const label = lang === 'es' ? 'Verificada' : 'Verified';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: s.padding,
        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        color: 'white',
        borderRadius: '9999px',
        fontSize: s.fontSize,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
      title={lang === 'es' ? 'Empresa verificada por SECiD' : 'Company verified by SECiD'}
    >
      <svg
        width={s.iconSize}
        height={s.iconSize}
        viewBox="0 0 16 16"
        fill="currentColor"
        style={{ flexShrink: 0 }}
      >
        <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.78 5.28a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L4.22 8.34a.75.75 0 0 1 1.06-1.06l1.72 1.72 3.72-3.72a.75.75 0 0 1 1.06 0z" />
      </svg>
      {label}
    </span>
  );
}
