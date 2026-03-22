/**
 * Client-side CV page component.
 *
 * Replaces the SSR Astro CV pages with a React component that:
 * - Extracts the member slug from the URL path
 * - Fetches member profile data from Firestore
 * - Checks CV visibility against auth state
 * - Transforms profile to CVData and renders all sections
 * - Includes PDF download functionality
 * - Provides sidebar navigation with active section tracking
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getMemberProfile } from '@/lib/members';
import { transformProfileToCV } from '@/lib/cv/transform';
import CvPdfDownloader from '@/components/cv/CvPdfDownloader';
import type { CVData } from '@/types/cv';
import type { MemberProfile } from '@/types/member';

interface CvPageClientProps {
  lang: 'es' | 'en';
}

// ---------------------------------------------------------------------------
// URL extraction
// ---------------------------------------------------------------------------

/** Extract member slug from URL path: /{lang}/members/{slug}/cv */
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

// ---------------------------------------------------------------------------
// Proficiency badge colors (matches CvLanguages.astro)
// ---------------------------------------------------------------------------

const PROFICIENCY_COLORS: Record<string, string> = {
  native:
    'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400',
  nativo:
    'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400',
  fluent:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  avanzado:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  advanced:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  intermediate:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
  intermedio:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
  basic:
    'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400',
  basico:
    'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

const DEFAULT_BADGE =
  'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400';

function getBadgeClasses(proficiency: string): string {
  return PROFICIENCY_COLORS[proficiency.toLowerCase()] || DEFAULT_BADGE;
}

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

function GradientDivider() {
  return (
    <div className="my-12 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-700" />
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-8 text-3xl font-bold uppercase tracking-wide text-gray-900 dark:text-white">
      {children}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// Section navigation components
// ---------------------------------------------------------------------------

function SidebarNav({
  sections,
  activeSection,
  labels,
}: {
  sections: NavSection[];
  activeSection: string;
  labels: Labels;
}) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
      e.preventDefault();
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    },
    [],
  );

  return (
    <aside className="hidden lg:block lg:w-48 flex-shrink-0">
      <nav className="sticky top-24 space-y-1">
        {sections.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={(e) => handleClick(e, section.id)}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
              }`}
            >
              {String(labels[section.labelKey])}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

function MobileNav({
  sections,
  activeSection,
  labels,
}: {
  sections: NavSection[];
  activeSection: string;
  labels: Labels;
}) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
      e.preventDefault();
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    },
    [],
  );

  return (
    <nav className="lg:hidden mb-8 -mx-6 px-6 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 pb-2">
        {sections.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={(e) => handleClick(e, section.id)}
              className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {String(labels[section.labelKey])}
            </a>
          );
        })}
      </div>
    </nav>
  );
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
// Sub-components for CV sections
// ---------------------------------------------------------------------------

function CvAboutSection({ personal }: { personal: CVData['personal'] }) {
  const { name, title, location, contact, profileImage, summary } = personal;
  const initials = `${name.first.charAt(0)}${name.last.charAt(0)}`.toUpperCase();

  const socialLinkClass =
    'inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-500 hover:bg-primary-500 hover:text-white dark:border-gray-700 dark:text-gray-400 dark:hover:border-primary-500';

  return (
    <section id="about" className="scroll-mt-24 pb-10">
      <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900 md:p-8">
        <div className="flex flex-col-reverse gap-8 md:flex-row md:items-start">
          <div className="flex-1">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white md:text-5xl">
              {name.full}
            </h1>

            {title && (
              <p className="mt-2 text-xl text-primary-600 dark:text-primary-400">
                {title}
              </p>
            )}

            {location && (
              <div className="mt-3 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="relative flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                  {location}
                </span>
              </div>
            )}

            {summary && (
              <p className="mt-6 leading-relaxed text-gray-600 dark:text-gray-300">
                {summary}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {contact.linkedin && (
                <a
                  href={contact.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={socialLinkClass}
                  aria-label="LinkedIn"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              )}

              {contact.github && (
                <a
                  href={contact.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={socialLinkClass}
                  aria-label="GitHub"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                </a>
              )}

              {contact.twitter && (
                <a
                  href={contact.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={socialLinkClass}
                  aria-label="Twitter"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              )}

              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className={socialLinkClass}
                  aria-label="Email"
                >
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
                </a>
              )}

              {contact.portfolio && (
                <a
                  href={contact.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={socialLinkClass}
                  aria-label="Portfolio"
                >
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
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-shrink-0 justify-center md:justify-end">
            {profileImage ? (
              <img
                src={profileImage}
                alt={name.full}
                className="h-36 w-36 rounded-full border-4 border-white object-cover shadow-lg dark:border-gray-800 md:h-44 md:w-44"
              />
            ) : (
              <div className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-white bg-primary-100 text-4xl font-bold text-primary-700 shadow-lg dark:border-gray-800 dark:bg-primary-900/30 dark:text-primary-400 md:h-44 md:w-44 md:text-5xl">
                {initials}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function CvExperienceSection({
  experience,
  labels,
}: {
  experience: CVData['experience'];
  labels: Labels;
}) {
  if (experience.length === 0) return null;
  return (
    <section id="experience" className="scroll-mt-24 py-10">
      <SectionHeading>{labels.experience}</SectionHeading>
      <div className="space-y-4">
        {experience.map((exp, i) => (
          <div
            key={`${exp.company}-${exp.title}-${i}`}
            className="rounded-xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:border-primary-500 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-primary-500"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {exp.title}
                </h3>
                <p className="font-medium text-primary-600 dark:text-primary-400">
                  {exp.company}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <span className="whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {exp.startDate} &ndash; {exp.endDate || labels.current}
                </span>
                {exp.current && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                    </span>
                    {labels.current}
                  </span>
                )}
              </div>
            </div>

            {exp.description && (
              <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {exp.description}
              </p>
            )}

            {exp.technologies && exp.technologies.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {exp.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function CvEducationSection({
  education,
  labels,
}: {
  education: CVData['education'];
  labels: Labels;
}) {
  if (education.length === 0) return null;
  return (
    <section id="education" className="scroll-mt-24 py-10">
      <SectionHeading>{labels.education}</SectionHeading>
      <div className="space-y-4">
        {education.map((edu, i) => (
          <div
            key={`${edu.institution}-${edu.degree}-${i}`}
            className="rounded-xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:border-primary-500 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-primary-500"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {edu.degree}
                </h3>
                <p className="font-medium text-primary-600 dark:text-primary-400">
                  {edu.institution}
                </p>
                {edu.fieldOfStudy && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {edu.fieldOfStudy}
                  </p>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <span className="whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {edu.startDate} &ndash; {edu.endDate || labels.current}
                </span>
                {edu.current && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                    </span>
                    {labels.current}
                  </span>
                )}
              </div>
            </div>

            {edu.gpa != null && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  GPA:
                </span>{' '}
                {edu.gpa}
              </p>
            )}

            {edu.description && (
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {edu.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function CvCertificationsSection({
  certifications,
  labels,
}: {
  certifications: CVData['certifications'];
  labels: Labels;
}) {
  if (certifications.length === 0) return null;
  return (
    <section id="certifications" className="scroll-mt-24 py-10">
      <SectionHeading>{labels.certifications}</SectionHeading>
      <div className="space-y-4">
        {certifications.map((cert, i) => (
          <div
            key={`${cert.issuer}-${cert.name}-${i}`}
            className="rounded-xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:border-primary-500 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-primary-500"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {cert.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {cert.issuer}
                </p>
                {cert.credentialUrl && (
                  <a
                    href={cert.credentialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 transition-all duration-200 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/40"
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    {labels.viewCredential}
                  </a>
                )}
              </div>
              <span className="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
                {cert.date}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CvSkillsSection({
  skills,
  labels,
}: {
  skills: string[];
  labels: Labels;
}) {
  if (skills.length === 0) return null;
  return (
    <section id="skills" className="scroll-mt-24 py-10">
      <SectionHeading>{labels.skills}</SectionHeading>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {skills.map((skill) => (
          <span
            key={skill}
            className="rounded-full border border-gray-200 px-3 py-1 text-center text-sm font-medium text-gray-700 transition-colors duration-200 hover:border-primary-500 hover:text-primary-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-primary-500 dark:hover:text-primary-400"
          >
            {skill}
          </span>
        ))}
      </div>
    </section>
  );
}

function CvProjectsSection({
  projects,
  labels,
}: {
  projects: CVData['projects'];
  labels: Labels;
}) {
  if (projects.length === 0) return null;
  return (
    <section id="projects" className="scroll-mt-24 py-10">
      <SectionHeading>{labels.projects}</SectionHeading>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {projects.map((project, i) => (
          <div
            key={`${project.title}-${i}`}
            className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-500 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-primary-500"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {project.title}
              </h3>
              <div className="flex flex-shrink-0 items-center gap-2">
                {project.featured && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                    <svg
                      className="h-3 w-3"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {labels.featured}
                  </span>
                )}
                {project.category && (
                  <span className="rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-400">
                    {project.category}
                  </span>
                )}
              </div>
            </div>

            <p className="mb-3 flex-1 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {project.description}
            </p>

            {project.technologies.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {project.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
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
                  className="inline-flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                >
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                  GitHub
                </a>
              )}
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
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

function CvLanguagesSection({
  languages,
  labels,
}: {
  languages: CVData['languages'];
  labels: Labels;
}) {
  if (languages.length === 0) return null;
  return (
    <section id="languages" className="scroll-mt-24 py-10">
      <SectionHeading>{labels.languages}</SectionHeading>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {languages.map((language, i) => (
          <div
            key={`${language.name}-${i}`}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-all duration-200 hover:border-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-primary-500"
          >
            <span className="font-medium text-gray-900 dark:text-white">
              {language.name}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getBadgeClasses(language.proficiency)}`}
            >
              {language.proficiency}
            </span>
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600 dark:border-gray-700 dark:border-t-primary-400" />
        <p className="text-gray-600 dark:text-gray-400">{label}</p>
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-gray-900">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl dark:bg-gray-800">
          :(
        </div>
        <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          {message}
        </h2>
        <p className="mb-6 text-gray-600 dark:text-gray-400">{detail}</p>
        <a
          href={backHref}
          className="inline-flex items-center rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-gray-900">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
          <svg
            className="h-8 w-8 text-amber-600 dark:text-amber-400"
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
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
          {message}
        </h2>
        <div className="flex items-center justify-center gap-4">
          <a
            href={`/${lang}/login`}
            className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            {labels.signIn}
          </a>
          <a
            href={`/${lang}/members`}
            className="text-sm text-primary-600 hover:underline dark:text-primary-400"
          >
            {labels.memberDirectory}
          </a>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers for visible section filtering
// ---------------------------------------------------------------------------

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
// Main component
// ---------------------------------------------------------------------------

export default function CvPageClient({ lang }: CvPageClientProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const slug = useMemo(() => extractSlugFromUrl(), []);
  const labels = useMemo(() => getLabels(lang), [lang]);

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

  // Compute cvData and visible sections before hooks so hook call count is stable
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

  // --- Early returns after all hooks ---

  if (authLoading || loading) {
    return <LoadingView label={labels.loading} />;
  }

  if (error || !member) {
    return (
      <ErrorView
        message={error || labels.notFound}
        detail={labels.notFoundDetail}
        backHref={`/${lang}/members`}
        backLabel={labels.backToDirectory}
      />
    );
  }

  // Privacy check
  const cvVisibility = member.cvVisibility || 'members';

  if (cvVisibility === 'private') {
    return <AccessDeniedView message={labels.accessDeniedPrivate} lang={lang} />;
  }

  if (cvVisibility === 'members' && !isAuthenticated) {
    return (
      <AccessDeniedView message={labels.accessDeniedMembers} lang={lang} />
    );
  }

  if (!cvData) {
    return <LoadingView label={labels.loading} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header bar */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <a
            href={`/${lang}/members`}
            className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            {labels.directory}
          </a>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            SECiD
          </span>
          <span className="rounded bg-primary-100 px-1.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
            CV
          </span>
        </div>
      </header>

      {/* Main layout with sidebar */}
      <div className="mx-auto max-w-6xl px-6 py-12 lg:flex lg:gap-8">
        {/* Sidebar nav - sticky, hidden on mobile */}
        <SidebarNav
          sections={visibleSections}
          activeSection={activeSection}
          labels={labels}
        />

        {/* Main content */}
        <main className="min-w-0 flex-1 max-w-4xl">
          {/* Mobile section nav - horizontal scroll */}
          <MobileNav
            sections={visibleSections}
            activeSection={activeSection}
            labels={labels}
          />

          <CvAboutSection personal={cvData.personal} />
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
              <CvCertificationsSection
                certifications={cvData.certifications}
                labels={labels}
              />
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
          <section id="download" className="scroll-mt-24 py-10">
            <CvPdfDownloader cvData={cvData} lang={lang} />
          </section>
        </main>
      </div>

      {/* Footer */}
      <footer className="pb-8 pt-4">
        <div className="mx-auto max-w-6xl px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-700" />
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {labels.generatedFrom} &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
