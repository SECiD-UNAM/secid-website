/**
 * Small shared UI primitives for CV section components.
 *
 * GradientDivider — horizontal rule with a center-fade gradient.
 * SectionHeading  — uppercase H2 used by every section.
 * SocialButton    — pill icon button (LinkedIn, GitHub, etc).
 * SkillPill       — reusable tag for skills / technologies.
 *
 * Underscore prefix indicates "section-internal" — not exported from
 * the CV page surface.
 */
import React from 'react';

export function GradientDivider() {
  return (
    <div
      style={{
        margin: '3rem 0',
        height: '1px',
        background:
          'linear-gradient(to right, transparent, var(--color-border), transparent)',
      }}
    />
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="mb-8 text-3xl font-bold uppercase tracking-wide"
      style={{ color: 'var(--color-text)' }}
    >
      {children}
    </h2>
  );
}

export function SocialButton({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: '9999px',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    background: 'transparent',
  };

  return (
    <a
      href={href}
      target={href.startsWith('mailto:') ? undefined : '_blank'}
      rel={href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
      aria-label={label}
      style={baseStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--color-primary)';
        e.currentTarget.style.color = '#ffffff';
        e.currentTarget.style.borderColor = 'var(--color-primary)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--color-text-muted)';
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {children}
    </a>
  );
}

export function SkillPill({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.25rem 0.625rem',
        borderRadius: '0.375rem',
        fontSize: '0.8125rem',
        color: 'var(--color-text)',
        background: 'var(--color-surface-light)',
        border: '1px solid var(--color-border)',
        transition: 'border-color 0.15s ease, color 0.15s ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-primary)';
        e.currentTarget.style.color = 'var(--color-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.color = 'var(--color-text)';
      }}
    >
      {label}
    </span>
  );
}
