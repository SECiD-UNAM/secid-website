import { useState, useEffect, useRef } from 'react';

const REPO_URL = 'https://github.com/SECiD-UNAM/secid-website';

interface FeedbackOption {
  key: string;
  iconClass: string;
  iconColor: string;
  label: string;
  description: string;
  template: string;
}

const options: FeedbackOption[] = [
  {
    key: 'bug',
    iconClass: 'fas fa-bug',
    iconColor: '#ef4444',
    label: 'Reportar un Bug',
    description: 'Algo no funciona correctamente',
    template: 'bug_report.yml',
  },
  {
    key: 'feature',
    iconClass: 'fas fa-lightbulb',
    iconColor: '#f59e0b',
    label: 'Solicitar Funcionalidad',
    description: 'Sugiere una mejora',
    template: 'feature_request.yml',
  },
  {
    key: 'feedback',
    iconClass: 'fas fa-comment',
    iconColor: '#3b82f6',
    label: 'Retroalimentacion',
    description: 'Comparte tu opinion',
    template: 'general_feedback.yml',
  },
];

function buildIssueUrl(template: string): string {
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const browser = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  const params = new URLSearchParams({
    template,
    'page-url': pageUrl,
    browser,
  });

  return `${REPO_URL}/issues/new?${params.toString()}`;
}

export default function FeedbackFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  function handleOptionClick(template: string) {
    window.open(buildIssueUrl(template), '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 90 }}
    >
      {/* Popover menu */}
      <div
        style={{
          position: 'absolute',
          bottom: 64,
          right: 0,
          width: 280,
          transformOrigin: 'bottom right',
          transition: 'all 200ms ease',
          transform: isOpen ? 'scale(1)' : 'scale(0.95)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        role="menu"
        aria-label="Feedback options"
      >
        <div
          style={{
            background: 'var(--card-bg, white)',
            border: '1px solid var(--color-border, #e5e7eb)',
            borderRadius: 12,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border, #e5e7eb)',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--color-text-primary, #111)',
              }}
            >
              ¿Como podemos ayudarte?
            </p>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 12,
                color: 'var(--color-text-secondary, #666)',
              }}
            >
              Abre un issue en GitHub
            </p>
          </div>

          <div style={{ padding: 6 }}>
            {options.map((opt) => (
              <button
                key={opt.key}
                role="menuitem"
                onClick={() => handleOptionClick(opt.template)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  borderRadius: 8,
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 150ms',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background =
                    'var(--color-surface-alt, #f3f4f6)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'var(--color-surface-alt, #f3f4f6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: opt.iconColor,
                    fontSize: 16,
                  }}
                >
                  <i className={opt.iconClass} />
                </span>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'var(--color-text-primary, #111)',
                    }}
                  >
                    {opt.label}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: 'var(--color-text-secondary, #666)',
                    }}
                  >
                    {opt.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAB button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Cerrar menu' : 'Enviar retroalimentacion'}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          border: 'none',
          background: 'var(--secid-primary, #F65425)',
          color: 'white',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(246,84,37,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          transition: 'all 200ms ease',
        }}
      >
        <i className={isOpen ? 'fas fa-times' : 'fas fa-comment-dots'} />
      </button>
    </div>
  );
}
