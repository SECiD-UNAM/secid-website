import React, { useEffect, useState } from 'react';
import { XMarkIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import type { Company } from '@/types/company';
import type { MemberProfile } from '@/types/member';
import { CompanyLogo } from '@/components/shared/CompanyLogo';
import { CompanyMemberCard } from './CompanyMemberCard';
import { getCompanyMembers } from '@/lib/companies/members';

interface Props {
  company: Company | null;
  isOpen: boolean;
  onClose: () => void;
  isVerified: boolean;
  lang?: 'es' | 'en';
}

export const CompanyDrawer: React.FC<Props> = ({
  company,
  isOpen,
  onClose,
  isVerified,
  lang = 'es',
}) => {
  const [current, setCurrent] = useState<MemberProfile[]>([]);
  const [alumni, setAlumni] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!company || !isOpen) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const result = await getCompanyMembers(company!.id, company!.name);
        if (!cancelled) {
          setCurrent(result.current);
          setAlumni(result.alumni);
        }
      } catch (err) {
        console.error('Error loading company members:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [company, isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!company) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed bottom-0 right-0 top-0 z-50 w-full max-w-md transform overflow-y-auto bg-white shadow-2xl transition-transform dark:bg-gray-900 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <CompanyLogo company={company} size="lg" />
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {company.name}
              </h2>
              {company.industry && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {company.industry}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label={lang === 'es' ? 'Cerrar' : 'Close'}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Company info */}
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
            {company.location && (
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
                </svg>
                {company.location}
              </span>
            )}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary-600 hover:underline dark:text-primary-400"
              >
                <GlobeAltIcon className="h-4 w-4" />
                {lang === 'es' ? 'Sitio web' : 'Website'}
              </a>
            )}
          </div>
        </div>

        {/* Members */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
            </div>
          ) : (
            <>
              {/* Current Members */}
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {lang === 'es' ? `Miembros actuales (${current.length})` : `Current members (${current.length})`}
                </h3>
                {current.length > 0 ? (
                  <div className="space-y-2">
                    {current.map((m) => (
                      <CompanyMemberCard
                        key={m.uid}
                        member={m}
                        companyId={company.id}
                        isVerified={isVerified}
                        lang={lang}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    {lang === 'es' ? 'Sin miembros actuales registrados' : 'No current members registered'}
                  </p>
                )}
              </div>

              {/* Alumni */}
              {alumni.length > 0 && (
                <div className="mb-6">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Alumni ({alumni.length})
                  </h3>
                  <div className="space-y-2">
                    {alumni.map((m) => (
                      <CompanyMemberCard
                        key={m.uid}
                        member={m}
                        companyId={company.id}
                        isAlumni
                        isVerified={isVerified}
                        lang={lang}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <a
            href={`/${lang}/companies/${company.slug}`}
            className="block w-full rounded-lg bg-primary-600 py-2.5 text-center font-medium text-white transition-colors hover:bg-primary-700"
          >
            {lang === 'es' ? 'Ver perfil completo' : 'View full profile'}
          </a>
        </div>
      </div>
    </>
  );
};

export default CompanyDrawer;
