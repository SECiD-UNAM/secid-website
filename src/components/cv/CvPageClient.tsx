/**
 * Client-side CV page orchestrator.
 *
 * Responsibilities (only):
 *   - Resolve the member slug from the URL.
 *   - Fetch the MemberProfile from Firestore + handle loading/error.
 *   - Apply visibility rules (private / members-only / public).
 *   - Transform the profile to CVData via `transformProfileToCV`.
 *   - Wire theme variables, active-section tracking, and mobile sidebar.
 *   - Compose the visible section components in the correct order.
 *
 * All section rendering lives in `./sections/*` and all pure logic
 * (labels, formatters, skill grouping, vCard, section visibility)
 * lives in `src/lib/cv/`.
 */
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getMemberProfile } from '@/lib/members';
import { transformProfileToCV } from '@/lib/cv/transform';
import { getLabels } from '@/lib/cv/labels';
import { getVisibleSections } from '@/lib/cv/sections';
import CvPdfDownloader from '@/components/cv/CvPdfDownloader';
import { Sidebar } from './sections/Sidebar';
import { CvAboutSection } from './sections/AboutSection';
import { CvExperienceSection } from './sections/ExperienceSection';
import { CvEducationSection } from './sections/EducationSection';
import { CvCertificationsSection } from './sections/CertificationsSection';
import { CvSkillsSection } from './sections/SkillsSection';
import { CvProjectsSection } from './sections/ProjectsSection';
import { CvLanguagesSection } from './sections/LanguagesSection';
import { CvCurrentlyWorkingOnSection } from './sections/CurrentlyWorkingOnSection';
import { CvAwardsSection } from './sections/AwardsSection';
import { CopyToClipboardSidebar } from './sections/CopyToClipboardSidebar';
import { VCardDownloadButton } from './sections/VCardDownloadButton';
import {
  LoadingView,
  ErrorView,
  AccessDeniedView,
} from './sections/StateViews';
import { GradientDivider } from './sections/_primitives';
import { HamburgerIcon, CloseIcon } from './sections/_icons';
import type { MemberProfile } from '@/types/member';

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
// CSS custom properties + dark-mode observer
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
// Active-section tracking (IntersectionObserver)
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
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
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
    [member, lang]
  );

  const visibleSections = useMemo(
    () => (cvData ? getVisibleSections(cvData) : []),
    [cvData]
  );

  const sectionIds = useMemo(
    () => visibleSections.map((s) => s.id),
    [visibleSections]
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

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

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
        className="fixed left-4 top-4 z-50 inline-flex items-center justify-center rounded-lg p-2 shadow-md lg:hidden"
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
        onClose={closeSidebar}
      />

      {/* Copy to Clipboard Sidebar */}
      <CopyToClipboardSidebar contact={cvData.personal.contact} lang={lang} />

      {/* VCard Download Button */}
      <VCardDownloadButton personal={cvData.personal} lang={lang} />

      {/* Main content - offset by sidebar on desktop */}
      <main className="min-h-screen lg:ml-[260px]">
        <div className="mx-auto max-w-4xl px-6 py-12 lg:py-16">
          <CvAboutSection personal={cvData.personal} />
          <GradientDivider />

          {cvData.currentlyWorkingOn && (
            <>
              <CvCurrentlyWorkingOnSection
                data={cvData.currentlyWorkingOn}
                labels={labels}
              />
              <GradientDivider />
            </>
          )}

          {cvData.experience.length > 0 && (
            <>
              <CvExperienceSection
                experience={cvData.experience}
                labels={labels}
              />
              <GradientDivider />
            </>
          )}

          {cvData.education.length > 0 && (
            <>
              <CvEducationSection
                education={cvData.education}
                labels={labels}
              />
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
              <CvSkillsSection
                skills={cvData.skills}
                labels={labels}
                lang={lang}
              />
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
              <CvLanguagesSection
                languages={cvData.languages}
                labels={labels}
              />
              <GradientDivider />
            </>
          )}

          {cvData.awards && cvData.awards.length > 0 && (
            <>
              <CvAwardsSection awards={cvData.awards} labels={labels} />
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
