/**
 * Client-side CV page component.
 *
 * Replicates the personal site CV design with:
 * - Fixed sidebar (260px) with profile, navigation, back link
 * - CSS custom properties for theming (light/dark)
 * - IntersectionObserver active-section tracking
 * - Mobile hamburger + slide-in overlay
 * - Gradient dividers between sections
 * - Polished cards, skill tags, language badges, project grid
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getMemberProfile } from '@/lib/members';
import { transformProfileToCV } from '@/lib/cv/transform';
import CvPdfDownloader from '@/components/cv/CvPdfDownloader';
import type { CVData } from '@/types/cv';
import type { MemberProfile } from '@/types/member';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CvPageClientProps {
  lang: 'es' | 'en';
}

// ---------------------------------------------------------------------------
// URL extraction
// ---------------------------------------------------------------------------

function extractSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const segments = window.location.pathname.split('/').filter(Boolean);
  const membersIdx = segments.indexOf('members');
  if (membersIdx >= 0 && membersIdx + 1 < segments.length) {
    const slug = segments[membersIdx + 1];
    if (slug && slug !== 'profile') return slug;
  }
  return null;
}

// ---------------------------------------------------------------------------
// i18n labels
// ---------------------------------------------------------------------------

function getLabels(lang: 'es' | 'en') {
  return lang === 'es'
    ? {
        loading: 'Cargando CV...',
        notFound: 'Miembro no encontrado',
        notFoundDetail:
          'El perfil que buscas no existe o no esta disponible.',
        backToDirectory: 'Volver al directorio',
        accessDeniedPrivate: 'Este CV no esta disponible publicamente.',
        accessDeniedMembers: 'Inicia sesion para ver este CV.',
        signIn: 'Iniciar Sesion',
        memberDirectory: 'Directorio de Miembros',
        errorLoading: 'Error al cargar el CV',
        about: 'Acerca de',
        experience: 'Experiencia Profesional',
        education: 'Educacion',
        certifications: 'Certificaciones',
        skills: 'Habilidades Tecnicas',
        projects: 'Proyectos',
        languages: 'Idiomas',
        current: 'Actual',
        viewCredential: 'Ver credencial',
        featured: 'Destacado',
        directory: 'Directorio',
        generatedFrom: 'Generado desde el perfil SECiD',
        download: 'Descargar PDF',
      }
    : {
        loading: 'Loading CV...',
        notFound: 'Member not found',
        notFoundDetail:
          'The profile you are looking for does not exist or is not available.',
        backToDirectory: 'Back to directory',
        accessDeniedPrivate: 'This CV is not publicly available.',
        accessDeniedMembers: 'Please sign in to view this CV.',
        signIn: 'Sign In',
        memberDirectory: 'Member Directory',
        errorLoading: 'Error loading CV',
        about: 'About',
        experience: 'Professional Experience',
        education: 'Education',
        certifications: 'Certifications',
        skills: 'Technical Skills',
        projects: 'Projects',
        languages: 'Languages',
        current: 'Current',
        viewCredential: 'View credential',
        featured: 'Featured',
        directory: 'Directory',
        generatedFrom: 'Generated from SECiD profile',
        download: 'Download PDF',
      };
}

type Labels = ReturnType<typeof getLabels>;

// ---------------------------------------------------------------------------
// CSS custom properties
// ---------------------------------------------------------------------------

const LIGHT_VARS: Record<string, string> = {
  '--color-text': '#1e293b',
  '--color-text-muted': '#64748b',
  '--color-heading': '#0f172a',
  '--color-primary': '#f65425',
  '--color-accent': '#10b981',
  '--color-border': '#e2e8f0',
  '--color-surface': '#ffffff',
  '--color-surface-light': '#f8fafc',
};

const DARK_VARS: Record<string, string> = {
  '--color-text': '#e2e8f0',
  '--color-text-muted': '#94a3b8',
  '--color-heading': '#f8fafc',
  '--color-primary': '#f65425',
  '--color-accent': '#34d399',
  '--color-border': '#334155',
  '--color-surface': '#1e293b',
  '--color-surface-light': '#0f172a',
};

function useThemeVars(): Record<string, string> {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const check = () =>
      setIsDark(document.documentElement.classList.contains('dark'));
    check();

    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  return isDark ? DARK_VARS : LIGHT_VARS;
}

// ---------------------------------------------------------------------------
// Section navigation definition
// ---------------------------------------------------------------------------

interface NavSection {
  id: string;
  labelKey: keyof Labels;
}

const ALL_SECTIONS: NavSection[] = [
  { id: 'about', labelKey: 'about' },
  { id: 'experience', labelKey: 'experience' },
  { id: 'education', labelKey: 'education' },
  { id: 'certifications', labelKey: 'certifications' },
  { id: 'skills', labelKey: 'skills' },
  { id: 'projects', labelKey: 'projects' },
  { id: 'languages', labelKey: 'languages' },
  { id: 'download', labelKey: 'download' },
];

function getVisibleSections(cvData: CVData): NavSection[] {
  return ALL_SECTIONS.filter((section) => {
    switch (section.id) {
      case 'about':
      case 'download':
        return true;
      case 'experience':
        return cvData.experience.length > 0;
      case 'education':
        return cvData.education.length > 0;
      case 'certifications':
        return cvData.certifications.length > 0;
      case 'skills':
        return cvData.skills.length > 0;
      case 'projects':
        return cvData.projects.length > 0;
      case 'languages':
        return cvData.languages.length > 0;
      default:
        return false;
    }
  });
}

// ---------------------------------------------------------------------------
// Active section tracking hook
// ---------------------------------------------------------------------------

function useActiveSection(sectionIds: string[]): string {
  const [activeSection, setActiveSection] = useState(sectionIds[0] || '');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        const first = visible[0];
        if (first) {
          setActiveSection(first.target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );

    const observer = observerRef.current;

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  return activeSection;
}

// ---------------------------------------------------------------------------
// Proficiency badge helpers (language level colors)
// ---------------------------------------------------------------------------

function getLevelBadgeStyle(proficiency: string): React.CSSProperties {
  const key = proficiency.toLowerCase();
  if (key === 'native' || key === 'nativo') {
    return {
      background: 'rgb(16 185 129 / 0.2)',
      color: '#10b981',
      border: '1px solid rgb(16 185 129 / 0.3)',
    };
  }
  if (key === 'fluent' || key === 'fluido') {
    return {
      background: 'rgb(246 84 37 / 0.15)',
      color: 'var(--color-primary)',
      border: '1px solid rgb(246 84 37 / 0.3)',
    };
  }
  if (key === 'advanced' || key === 'avanzado') {
    return {
      background: 'rgb(59 130 246 / 0.2)',
      color: '#60a5fa',
      border: '1px solid rgb(59 130 246 / 0.3)',
    };
  }
  if (key === 'intermediate' || key === 'intermedio') {
    return {
      background: 'rgb(234 179 8 / 0.2)',
      color: '#facc15',
      border: '1px solid rgb(234 179 8 / 0.3)',
    };
  }
  // basic / basico / default
  return {
    background: 'rgb(107 114 128 / 0.2)',
    color: '#9ca3af',
    border: '1px solid rgb(107 114 128 / 0.3)',
  };
}

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

function GradientDivider() {
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-3xl font-bold uppercase tracking-wide mb-8"
      style={{ color: 'var(--color-text)' }}
    >
      {children}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// SVG icon helpers
// ---------------------------------------------------------------------------

function LinkedInIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function PortfolioIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Social icon button
// ---------------------------------------------------------------------------

function SocialButton({
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

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------

function Sidebar({
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
  const initials = `${personal.name.first.charAt(0)}${personal.name.last.charAt(0)}`.toUpperCase();

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
      e.preventDefault();
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
      onClose();
    },
    [onClose],
  );

  const sidebarContent = (
    <div
      className="flex flex-col h-full"
      style={{
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* Profile section */}
      <div className="flex flex-col items-center px-5 pt-8 pb-6">
        {personal.profileImage ? (
          <img
            src={personal.profileImage}
            alt={personal.name.full}
            className="h-28 w-28 rounded-full object-cover border-4 shadow-lg"
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
          className="mt-4 text-base font-bold text-center"
          style={{ color: 'var(--color-heading)' }}
        >
          {personal.name.full}
        </h2>
        {personal.title && (
          <p
            className="mt-1 text-sm text-center"
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
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
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
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  background: isActive ? 'var(--color-surface-light)' : 'transparent',
                  fontWeight: isActive ? 500 : 400,
                  transition: 'all 0.2s ease',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = 'var(--color-heading)';
                    e.currentTarget.style.background = 'var(--color-surface-light)';
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
        className="fixed top-0 left-0 z-40 h-screen w-[260px] hidden lg:block"
        style={{
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-30 bg-black/60 lg:hidden transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Mobile sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-[260px] lg:hidden transition-transform duration-300 ${
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

// ---------------------------------------------------------------------------
// Section: About
// ---------------------------------------------------------------------------

function CvAboutSection({
  personal,
  labels,
}: {
  personal: CVData['personal'];
  labels: Labels;
}) {
  const { name, title, location, contact, profileImage, summary } = personal;

  return (
    <section id="about" className="scroll-mt-8">
      <div className="flex flex-col-reverse md:flex-row md:items-start gap-8">
        {/* Text column */}
        <div className="flex-1">
          <h1
            className="text-5xl md:text-6xl font-bold uppercase tracking-wide leading-tight"
            style={{ color: 'var(--color-text)' }}
          >
            {name.full}
          </h1>

          {(title || location) && (
            <div className="flex items-center gap-2 mt-3 mb-6">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-lg" style={{ color: 'var(--color-text-muted)' }}>
                {[title, location].filter(Boolean).join(' \u00B7 ')}
              </span>
            </div>
          )}

          {summary && (
            <p
              className="leading-relaxed"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {summary}
            </p>
          )}

          {/* Social icons */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {contact.linkedin && (
              <SocialButton href={contact.linkedin} label="LinkedIn">
                <LinkedInIcon />
              </SocialButton>
            )}
            {contact.github && (
              <SocialButton href={contact.github} label="GitHub">
                <GitHubIcon />
              </SocialButton>
            )}
            {contact.twitter && (
              <SocialButton href={contact.twitter} label="Twitter">
                <TwitterIcon />
              </SocialButton>
            )}
            {contact.email && (
              <SocialButton href={`mailto:${contact.email}`} label="Email">
                <EmailIcon />
              </SocialButton>
            )}
            {contact.portfolio && (
              <SocialButton href={contact.portfolio} label="Portfolio">
                <PortfolioIcon />
              </SocialButton>
            )}
          </div>
        </div>

        {/* Profile image */}
        <div className="flex-shrink-0 flex justify-center md:justify-end">
          {profileImage ? (
            <img
              src={profileImage}
              alt={name.full}
              className="w-36 h-36 md:w-44 md:h-44 rounded-full object-cover border-4 shadow-xl"
              style={{ borderColor: 'var(--color-surface-light)' }}
            />
          ) : (
            <div
              className="flex w-36 h-36 md:w-44 md:h-44 items-center justify-center rounded-full text-4xl md:text-5xl font-bold shadow-xl"
              style={{
                background: 'var(--color-surface-light)',
                color: 'var(--color-primary)',
                border: '4px solid var(--color-border)',
              }}
            >
              {`${name.first.charAt(0)}${name.last.charAt(0)}`.toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: Experience
// ---------------------------------------------------------------------------

function CvExperienceSection({
  experience,
  labels,
}: {
  experience: CVData['experience'];
  labels: Labels;
}) {
  if (experience.length === 0) return null;

  return (
    <section id="experience" className="scroll-mt-8">
      <SectionHeading>{labels.experience}</SectionHeading>
      <div>
        {experience.map((exp, i) => {
          const isLast = i === experience.length - 1;
          return (
            <div
              key={`${exp.company}-${exp.title}-${i}`}
              style={{
                padding: '1.25rem 0',
                borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-3">
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                    {exp.title}
                  </h3>
                  <p className="font-medium" style={{ color: 'var(--color-primary)' }}>
                    {exp.company}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="text-sm whitespace-nowrap"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {exp.startDate} &ndash; {exp.endDate || labels.current}
                  </span>
                  {exp.current && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: 'rgb(16 185 129 / 0.2)',
                        color: 'var(--color-accent)',
                        border: '1px solid rgb(16 185 129 / 0.3)',
                      }}
                    >
                      {labels.current}
                    </span>
                  )}
                </div>
              </div>

              {exp.description && (
                <ul className="space-y-2 mt-3">
                  <li
                    className="flex items-start gap-3 text-sm leading-relaxed"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <span
                      className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0"
                      style={{ background: 'var(--color-border)' }}
                    />
                    <span>{exp.description}</span>
                  </li>
                </ul>
              )}

              {exp.technologies && exp.technologies.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {exp.technologies.map((tech) => (
                    <span
                      key={tech}
                      style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.625rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        background: 'var(--color-surface-light)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: Education
// ---------------------------------------------------------------------------

function CvEducationSection({
  education,
  labels,
}: {
  education: CVData['education'];
  labels: Labels;
}) {
  if (education.length === 0) return null;

  return (
    <section id="education" className="scroll-mt-8">
      <SectionHeading>{labels.education}</SectionHeading>
      <div>
        {education.map((edu, i) => {
          const isLast = i === education.length - 1;
          return (
            <div
              key={`${edu.institution}-${edu.degree}-${i}`}
              style={{
                padding: '1.25rem 0',
                borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-3">
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                    {edu.degree}
                  </h3>
                  <p className="font-medium" style={{ color: 'var(--color-primary)' }}>
                    {edu.institution}
                  </p>
                  {edu.fieldOfStudy && (
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {edu.fieldOfStudy}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="text-sm whitespace-nowrap"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {edu.startDate} &ndash; {edu.endDate || labels.current}
                  </span>
                  {edu.current && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: 'rgb(16 185 129 / 0.2)',
                        color: 'var(--color-accent)',
                        border: '1px solid rgb(16 185 129 / 0.3)',
                      }}
                    >
                      {labels.current}
                    </span>
                  )}
                </div>
              </div>

              {edu.gpa != null && (
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                    GPA:
                  </span>{' '}
                  {edu.gpa}
                </p>
              )}

              {edu.description && (
                <ul className="space-y-2 mt-3">
                  <li
                    className="flex items-start gap-3 text-sm leading-relaxed"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <span
                      className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0"
                      style={{ background: 'var(--color-border)' }}
                    />
                    <span>{edu.description}</span>
                  </li>
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: Certifications
// ---------------------------------------------------------------------------

function CvCertificationsSection({
  certifications,
  labels,
}: {
  certifications: CVData['certifications'];
  labels: Labels;
}) {
  if (certifications.length === 0) return null;

  return (
    <section id="certifications" className="scroll-mt-8">
      <SectionHeading>{labels.certifications}</SectionHeading>
      <div>
        {certifications.map((cert, i) => {
          const isLast = i === certifications.length - 1;
          return (
            <div
              key={`${cert.issuer}-${cert.name}-${i}`}
              style={{
                padding: '1.25rem 0',
                borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-2">
                <div className="flex-1">
                  <h3 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                    {cert.name}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {cert.issuer}
                  </p>
                </div>
                <span
                  className="flex-shrink-0 text-sm"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {cert.date}
                </span>
              </div>
              {cert.credentialUrl && (
                <a
                  href={cert.credentialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium"
                  style={{
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  <ExternalLinkIcon />
                  {labels.viewCredential}
                </a>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: Skills
// ---------------------------------------------------------------------------

function CvSkillsSection({
  skills,
  labels,
}: {
  skills: string[];
  labels: Labels;
}) {
  if (skills.length === 0) return null;

  return (
    <section id="skills" className="scroll-mt-8">
      <SectionHeading>{labels.skills}</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Since skills are a flat array, render as a single card */}
        <div
          className="sm:col-span-2 lg:col-span-3"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
          }}
        >
          <h3
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-primary)' }}
          >
            {labels.skills}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <span
                key={skill}
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
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: Projects
// ---------------------------------------------------------------------------

function CvProjectsSection({
  projects,
  labels,
}: {
  projects: CVData['projects'];
  labels: Labels;
}) {
  if (projects.length === 0) return null;

  return (
    <section id="projects" className="scroll-mt-8">
      <SectionHeading>{labels.projects}</SectionHeading>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {projects.map((project, i) => (
          <div
            key={`${project.title}-${i}`}
            className="flex flex-col"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              transition: 'border-color 0.2s ease, transform 0.2s ease',
              cursor: 'default',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                {project.title}
              </h3>
              <div className="flex flex-shrink-0 items-center gap-2">
                {project.featured && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      background: 'rgb(245 158 11 / 0.2)',
                      color: '#f59e0b',
                      border: '1px solid rgb(245 158 11 / 0.3)',
                    }}
                  >
                    <StarIcon />
                    {labels.featured}
                  </span>
                )}
                {project.category && (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      background: 'rgb(246 84 37 / 0.15)',
                      color: 'var(--color-primary)',
                      border: '1px solid rgb(246 84 37 / 0.3)',
                    }}
                  >
                    {project.category}
                  </span>
                )}
              </div>
            </div>

            <p
              className="mb-3 flex-1 text-sm leading-relaxed"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {project.description}
            </p>

            {project.technologies.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {project.technologies.map((tech) => (
                  <span
                    key={tech}
                    style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.625rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      background: 'var(--color-surface-light)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs"
                  style={{
                    color: 'var(--color-text-muted)',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-muted)';
                  }}
                >
                  <GitHubIcon />
                  GitHub
                </a>
              )}
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs"
                  style={{
                    color: 'var(--color-text-muted)',
                    textDecoration: 'none',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-text-muted)';
                  }}
                >
                  <ExternalLinkIcon />
                  Live
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section: Languages
// ---------------------------------------------------------------------------

function CvLanguagesSection({
  languages,
  labels,
}: {
  languages: CVData['languages'];
  labels: Labels;
}) {
  if (languages.length === 0) return null;

  return (
    <section id="languages" className="scroll-mt-8">
      <SectionHeading>{labels.languages}</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {languages.map((language, i) => (
          <div
            key={`${language.name}-${i}`}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                {language.name}
              </h3>
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={getLevelBadgeStyle(language.proficiency)}
              >
                {language.proficiency}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// State views: loading, error, access denied
// ---------------------------------------------------------------------------

function LoadingView({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--color-surface-light)' }}>
      <div className="text-center">
        <div
          className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4"
          style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-primary)' }}
        />
        <p style={{ color: 'var(--color-text-muted)' }}>{label}</p>
      </div>
    </div>
  );
}

function ErrorView({
  message,
  detail,
  backHref,
  backLabel,
}: {
  message: string;
  detail: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--color-surface-light)' }}>
      <div
        className="mx-auto max-w-md rounded-2xl p-8 text-center shadow-sm"
        style={{ background: 'var(--color-surface)' }}
      >
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl"
          style={{ background: 'var(--color-surface-light)' }}
        >
          :(
        </div>
        <h2
          className="mb-2 text-xl font-semibold"
          style={{ color: 'var(--color-heading)' }}
        >
          {message}
        </h2>
        <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>
          {detail}
        </p>
        <a
          href={backHref}
          className="inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors"
          style={{ background: 'var(--color-primary)' }}
        >
          {backLabel}
        </a>
      </div>
    </div>
  );
}

function AccessDeniedView({
  message,
  lang,
}: {
  message: string;
  lang: 'es' | 'en';
}) {
  const labels = getLabels(lang);

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--color-surface-light)' }}>
      <div
        className="mx-auto max-w-md rounded-2xl p-8 text-center shadow-sm"
        style={{ background: 'var(--color-surface)' }}
      >
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: 'rgb(245 158 11 / 0.15)' }}
        >
          <svg
            className="h-8 w-8"
            style={{ color: '#f59e0b' }}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2
          className="mb-4 text-xl font-bold"
          style={{ color: 'var(--color-heading)' }}
        >
          {message}
        </h2>
        <div className="flex items-center justify-center gap-4">
          <a
            href={`/${lang}/login`}
            className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            {labels.signIn}
          </a>
          <a
            href={`/${lang}/members`}
            className="text-sm"
            style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
          >
            {labels.memberDirectory}
          </a>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CvPageClient({ lang }: CvPageClientProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const slug = useMemo(() => extractSlugFromUrl(), []);
  const labels = useMemo(() => getLabels(lang), [lang]);
  const themeVars = useThemeVars();

  useEffect(() => {
    if (authLoading) return;
    if (!slug) {
      setLoading(false);
      setError(labels.notFound);
      return;
    }

    let cancelled = false;

    async function fetchMember() {
      try {
        setLoading(true);
        setError(null);
        const profile = await getMemberProfile(slug!);
        if (cancelled) return;
        if (profile) {
          setMember(profile);
        } else {
          setError(labels.notFound);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching member profile for CV:', err);
        setError(labels.errorLoading);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMember();

    return () => {
      cancelled = true;
    };
  }, [slug, lang, authLoading, labels.notFound, labels.errorLoading]);

  const cvData = useMemo(
    () => (member ? transformProfileToCV(member, lang) : null),
    [member, lang],
  );

  const visibleSections = useMemo(
    () => (cvData ? getVisibleSections(cvData) : []),
    [cvData],
  );

  const sectionIds = useMemo(
    () => visibleSections.map((s) => s.id),
    [visibleSections],
  );

  const activeSection = useActiveSection(sectionIds);

  // Close sidebar on route change / resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Early returns after all hooks ---

  if (authLoading || loading) {
    return (
      <div style={themeVars as React.CSSProperties}>
        <LoadingView label={labels.loading} />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div style={themeVars as React.CSSProperties}>
        <ErrorView
          message={error || labels.notFound}
          detail={labels.notFoundDetail}
          backHref={`/${lang}/members`}
          backLabel={labels.backToDirectory}
        />
      </div>
    );
  }

  const cvVisibility = member.cvVisibility || 'members';

  if (cvVisibility === 'private') {
    return (
      <div style={themeVars as React.CSSProperties}>
        <AccessDeniedView message={labels.accessDeniedPrivate} lang={lang} />
      </div>
    );
  }

  if (cvVisibility === 'members' && !isAuthenticated) {
    return (
      <div style={themeVars as React.CSSProperties}>
        <AccessDeniedView message={labels.accessDeniedMembers} lang={lang} />
      </div>
    );
  }

  if (!cvData) {
    return (
      <div style={themeVars as React.CSSProperties}>
        <LoadingView label={labels.loading} />
      </div>
    );
  }

  return (
    <div style={themeVars as React.CSSProperties}>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setSidebarOpen((prev) => !prev)}
        className="fixed top-4 left-4 z-50 lg:hidden inline-flex items-center justify-center rounded-lg p-2 shadow-md"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
          cursor: 'pointer',
        }}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? <CloseIcon /> : <HamburgerIcon />}
      </button>

      {/* Sidebar */}
      <Sidebar
        personal={cvData.personal}
        sections={visibleSections}
        activeSection={activeSection}
        labels={labels}
        lang={lang}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content - offset by sidebar on desktop */}
      <main className="min-h-screen lg:ml-[260px]">
        <div className="mx-auto max-w-4xl px-6 py-12 lg:py-16">
          <CvAboutSection personal={cvData.personal} labels={labels} />
          <GradientDivider />

          {cvData.experience.length > 0 && (
            <>
              <CvExperienceSection experience={cvData.experience} labels={labels} />
              <GradientDivider />
            </>
          )}

          {cvData.education.length > 0 && (
            <>
              <CvEducationSection education={cvData.education} labels={labels} />
              <GradientDivider />
            </>
          )}

          {cvData.certifications.length > 0 && (
            <>
              <CvCertificationsSection certifications={cvData.certifications} labels={labels} />
              <GradientDivider />
            </>
          )}

          {cvData.skills.length > 0 && (
            <>
              <CvSkillsSection skills={cvData.skills} labels={labels} />
              <GradientDivider />
            </>
          )}

          {cvData.projects.length > 0 && (
            <>
              <CvProjectsSection projects={cvData.projects} labels={labels} />
              <GradientDivider />
            </>
          )}

          {cvData.languages.length > 0 && (
            <>
              <CvLanguagesSection languages={cvData.languages} labels={labels} />
              <GradientDivider />
            </>
          )}

          {/* PDF Downloader */}
          <section id="download" className="scroll-mt-8">
            <CvPdfDownloader cvData={cvData} lang={lang} />
          </section>

          {/* Footer */}
          <footer
            style={{
              borderTop: '1px solid var(--color-border)',
              marginTop: '3rem',
              padding: '2rem 0',
              textAlign: 'center',
            }}
          >
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {labels.generatedFrom} &copy; {new Date().getFullYear()}
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
