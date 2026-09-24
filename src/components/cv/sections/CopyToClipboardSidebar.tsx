/**
 * Right-edge floating action bar with quick-share buttons:
 * copy email, share CV link, print CV. Reveals on hover (desktop only).
 * Shows a transient toast for clipboard actions.
 */
import React, { useState } from 'react';
import type { CVData } from '@/types/cv';
import { getLabels } from '@/lib/cv/labels';

export function CopyToClipboardSidebar({
  contact,
  lang,
}: {
  contact: CVData['personal']['contact'];
  lang: 'es' | 'en';
}) {
  const [toast, setToast] = useState<string | null>(null);
  const labels = getLabels(lang);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const copyEmail = () => {
    if (contact.email) {
      navigator.clipboard.writeText(contact.email);
      showToast(lang === 'es' ? 'Email copiado' : 'Email copied');
    }
  };

  const shareCv = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: 'CV', url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast(lang === 'es' ? 'Link copiado' : 'Link copied');
    }
  };

  const printCv = () => {
    window.print();
  };

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px',
    borderRadius: '9999px',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface)',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '1.125rem',
    boxShadow: '0 1px 3px rgb(0 0 0 / 0.1)',
  };

  const actions = [
    ...(contact.email
      ? [{ label: labels.copyEmail, icon: '✉', onClick: copyEmail }]
      : []),
    { label: labels.shareCv, icon: '\u{1F517}', onClick: shareCv },
    { label: labels.printCv, icon: '\u{1F5A8}', onClick: printCv },
  ];

  return (
    <>
      <div
        className="hidden flex-col gap-2 lg:flex"
        style={{
          position: 'fixed',
          right: '-50px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 40,
          transition: 'right 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.right = '12px';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.right = '-50px';
        }}
      >
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            title={action.label}
            aria-label={action.label}
            style={buttonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-primary)';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-surface)';
              e.currentTarget.style.color = 'var(--color-text-muted)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span role="img" aria-hidden="true">
              {action.icon}
            </span>
          </button>
        ))}
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 50,
            background: 'var(--color-primary)',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}
