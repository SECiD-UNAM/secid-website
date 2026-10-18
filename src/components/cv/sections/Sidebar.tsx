/**
 * Fixed-width sidebar with profile, navigation, and back link.
 * Renders both the desktop fixed sidebar and the mobile slide-in
 * overlay; visibility is driven by the `mobileOpen` prop.
 */
import React, { useCallback } from 'react';
import type { CVData } from '@/types/cv';
import type { Labels } from '@/lib/cv/labels';
import type { NavSection } from '@/lib/cv/sections';
import { ArrowLeftIcon } from './_icons';

export function Sidebar({
  personal,
  sections,
  activeSection,
  labels,
  lang,
  mobileOpen,
  onClose,
}: {
  personal: CVData['personal'];
  sections: NavSection[];
  activeSection: string;
  labels: Labels;
  lang: 'es' | 'en';
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const initials =
    `${personal.name.first.charAt(0)}${personal.name.last.charAt(0)}`.toUpperCase();

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
      e.preventDefault();
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
      onClose();
    },
    [onClose]
  );

  const sidebarContent = (
    <div
      className="flex h-full flex-col"
      style={{
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* Profile section */}
      <div className="flex flex-col items-center px-5 pb-6 pt-8">
        {personal.profileImage ? (
          <img
            src={personal.profileImage}
            alt={personal.name.full}
            className="h-28 w-28 rounded-full border-4 object-cover shadow-lg"
            style={{ borderColor: 'var(--color-surface-light)' }}
          />
        ) : (
          <div
            className="flex h-28 w-28 items-center justify-center rounded-full text-3xl font-bold shadow-lg"
            style={{
              background: 'var(--color-surface-light)',
              color: 'var(--color-primary)',
              border: '4px solid var(--color-border)',
            }}
          >
            {initials}
          </div>
        )}
        <h2
          className="mt-4 text-center text-base font-bold"
          style={{ color: 'var(--color-heading)' }}
        >
          {personal.name.full}
        </h2>
        {personal.title && (
          <p
            className="mt-1 text-center text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {personal.title}
          </p>
        )}
      </div>

      {/* Divider */}
      <div
        style={{
          height: '1px',
          margin: '0 1.25rem',
          background:
            'linear-gradient(to right, transparent, var(--color-border), transparent)',
        }}
      />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-0.5">
          {sections.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={(e) => handleNavClick(e, section.id)}
                style={{
                  display: 'block',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.8125rem',
                  color: isActive
                    ? 'var(--color-primary)'
                    : 'var(--color-text-muted)',
                  background: isActive
                    ? 'var(--color-surface-light)'
                    : 'transparent',
                  fontWeight: isActive ? 500 : 400,
                  transition: 'all 0.2s ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--color-heading)';
                    e.currentTarget.style.background =
                      'var(--color-surface-light)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--color-text-muted)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {String(labels[section.labelKey])}
              </a>
            );
          })}
        </div>
      </nav>

      {/* Bottom section: back link */}
      <div className="px-5 pb-6 pt-2">
        <div
          style={{
            height: '1px',
            marginBottom: '1rem',
            background:
              'linear-gradient(to right, transparent, var(--color-border), transparent)',
          }}
        />
        <a
          href={`/${lang}/members`}
          className="flex items-center gap-2 text-sm"
          style={{
            color: 'var(--color-text-muted)',
            textDecoration: 'none',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
          }}
        >
          <ArrowLeftIcon />
          {labels.backToDirectory}
        </a>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="fixed left-0 top-0 z-40 hidden h-screen w-[260px] lg:block"
        style={{
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-30 bg-black/60 transition-opacity duration-300 lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Mobile sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-[260px] transition-transform duration-300 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
