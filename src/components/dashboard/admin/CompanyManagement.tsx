import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCompanies,
  getPendingReviewCompanies,
  approveCompany,
  rejectCompany,
  updateCompany,
  deleteCompany,
  createCompany,
  uploadCompanyLogo,
} from '@/lib/companies';
import { CompanyLogo } from '@/components/shared/CompanyLogo';
import type {
  Company,
  CompanyCreateInput,
  CompanyUpdateInput,
} from '@/types/company';
import {
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  ArrowPathIcon,
  BuildingOffice2Icon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

/* ------------------------------------------------------------------ */
/* i18n helper                                                         */
/* ------------------------------------------------------------------ */

function t(lang: 'es' | 'en', es: string, en: string): string {
  return lang === 'es' ? es : en;
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type TabKey = 'all' | 'review';

interface CompanyFormData {
  name: string;
  domain: string;
  industry: string;
  location: string;
  website: string;
  description: string;
}

const EMPTY_FORM: CompanyFormData = {
  name: '',
  domain: '',
  industry: '',
  location: '',
  website: '',
  description: '',
};

interface Props {
  lang: 'es' | 'en';
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const CompanyManagement: React.FC<Props> = ({ lang }) => {
  const { user } = useAuth();

  /* ---- data state ---- */
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pendingCompanies, setPendingCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---- ui state ---- */
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>(EMPTY_FORM);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showTokenSettings, setShowTokenSettings] = useState(false);
  const [logoDevToken, setLogoDevToken] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('logoDevApiToken') || ''
      : ''
  );
  const [fetchingLogo, setFetchingLogo] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [bulkFetching, setBulkFetching] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, success: 0 });

  /* ---- data loading ---- */

  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [all, pending] = await Promise.all([
        getCompanies(),
        getPendingReviewCompanies(),
      ]);
      setCompanies(all);
      setPendingCompanies(pending);
    } catch (err) {
      console.error('Error loading companies:', err);
      setError(
        t(lang, 'Error al cargar las empresas', 'Error loading companies')
      );
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  /* ---- modal helpers ---- */

  function openAddModal() {
    setEditingCompany(null);
    setFormData(EMPTY_FORM);
    setLogoFile(null);
    setLogoPreview(null);
    setModalOpen(true);
  }

  function openEditModal(company: Company) {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      domain: company.domain,
      industry: company.industry ?? '',
      location: company.location ?? '',
      website: company.website ?? '',
      description: company.description ?? '',
    });
    setLogoFile(null);
    setLogoPreview(company.logoUrl ?? null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingCompany(null);
    setFormData(EMPTY_FORM);
    setLogoFile(null);
    setLogoPreview(null);
  }

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    }
  }

  /* ---- fetch logo client-side (Logo.dev or Google favicon) ---- */

  // Helper: load image via <img> tag (avoids CORS) and convert to blob via canvas
  function imageUrlToBlob(url: string): Promise<Blob | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  async function handleFetchLogo() {
    const domain = formData.domain.trim();
    if (!domain) return;

    setFetchingLogo(true);
    try {
      const storedToken = localStorage.getItem('logoDevApiToken');
      let logoBlob: Blob | null = null;

      // Try Logo.dev if token configured (use pk_ public token, not sk_ secret)
      if (storedToken) {
        logoBlob = await imageUrlToBlob(
          `https://img.logo.dev/${domain}?token=${storedToken}&format=png&size=200`
        );
      }

      // Fallback: Google Favicon via img tag (avoids CORS)
      if (!logoBlob) {
        logoBlob = await imageUrlToBlob(
          `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
        );
      }

      if (!logoBlob) throw new Error('Could not fetch logo');

      const file = new File([logoBlob], 'logo.png', { type: 'image/png' });

      if (editingCompany) {
        const logoUrl = await uploadCompanyLogo(editingCompany.id, file);
        await updateCompany(editingCompany.id, { logoUrl });
        setLogoPreview(logoUrl);
      } else {
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(logoBlob));
      }
      setLogoFile(null);
    } catch (err) {
      console.error('Error fetching logo:', err);
      setError(t(lang, 'Error al obtener el logo', 'Error fetching logo'));
    } finally {
      setFetchingLogo(false);
    }
  }

  /* ---- bulk fetch logos for companies without one ---- */

  async function handleBulkFetchLogos() {
    const missing = companies.filter((c) => !c.logoUrl && c.domain);
    if (missing.length === 0) return;

    setBulkFetching(true);
    setBulkProgress({ done: 0, total: missing.length, success: 0 });

    let successCount = 0;
    for (let i = 0; i < missing.length; i++) {
      const company = missing[i]!;
      try {
        const storedToken = localStorage.getItem('logoDevApiToken');
        let logoBlob: Blob | null = null;

        if (storedToken) {
          logoBlob = await imageUrlToBlob(
            `https://img.logo.dev/${company.domain}?token=${storedToken}&format=png&size=200`
          );
        }
        if (!logoBlob) {
          logoBlob = await imageUrlToBlob(
            `https://www.google.com/s2/favicons?domain=${company.domain}&sz=128`
          );
        }
        if (logoBlob) {
          const file = new File([logoBlob], 'logo.png', { type: 'image/png' });
          const logoUrl = await uploadCompanyLogo(company.id, file);
          await updateCompany(company.id, { logoUrl });
          successCount++;
        }
      } catch (err) {
        console.error(`Failed to fetch logo for ${company.name}:`, err);
      }
      setBulkProgress({ done: i + 1, total: missing.length, success: successCount });
    }

    setBulkFetching(false);
    await loadCompanies();
  }

  /* ---- save (create or update) ---- */

  async function handleSave() {
    if (!formData.name.trim() || !formData.domain.trim()) return;
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      if (editingCompany) {
        const updates: CompanyUpdateInput = {
          name: formData.name.trim(),
          domain: formData.domain.trim(),
          industry: formData.industry.trim() || undefined,
          location: formData.location.trim() || undefined,
          website: formData.website.trim() || undefined,
          description: formData.description.trim() || undefined,
        };
        await updateCompany(editingCompany.id, updates);

        if (logoFile) {
          const logoUrl = await uploadCompanyLogo(editingCompany.id, logoFile);
          await updateCompany(editingCompany.id, { logoUrl });
        }
      } else {
        const input: CompanyCreateInput = {
          name: formData.name.trim(),
          domain: formData.domain.trim(),
          industry: formData.industry.trim() || undefined,
          location: formData.location.trim() || undefined,
          website: formData.website.trim() || undefined,
          description: formData.description.trim() || undefined,
        };
        const newId = await createCompany(input, user.uid);

        if (logoFile) {
          const logoUrl = await uploadCompanyLogo(newId, logoFile);
          await updateCompany(newId, { logoUrl });
        }
      }

      closeModal();
      await loadCompanies();
    } catch (err) {
      console.error('Error saving company:', err);
      setError(t(lang, 'Error al guardar la empresa', 'Error saving company'));
    } finally {
      setSaving(false);
    }
  }

  /* ---- row actions ---- */

  async function handleApprove(companyId: string) {
    if (!user) return;
    setActionInProgress(companyId);
    try {
      await approveCompany(companyId, user.uid);
      await loadCompanies();
    } catch (err) {
      console.error('Error approving company:', err);
      setError(
        t(lang, 'Error al aprobar la empresa', 'Error approving company')
      );
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleReject(companyId: string) {
    const confirmed = window.confirm(
      t(
        lang,
        'Esta empresa sera eliminada al rechazarla. Continuar?',
        'This company will be deleted when rejected. Continue?'
      )
    );
    if (!confirmed) return;

    setActionInProgress(companyId);
    try {
      await rejectCompany(companyId);
      await loadCompanies();
    } catch (err) {
      console.error('Error rejecting company:', err);
      setError(
        t(lang, 'Error al rechazar la empresa', 'Error rejecting company')
      );
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleDelete(companyId: string) {
    const confirmed = window.confirm(
      t(
        lang,
        'Estas seguro de eliminar esta empresa? Esta accion no se puede deshacer.',
        'Are you sure you want to delete this company? This action cannot be undone.'
      )
    );
    if (!confirmed) return;

    setActionInProgress(companyId);
    try {
      await deleteCompany(companyId);
      await loadCompanies();
    } catch (err) {
      console.error('Error deleting company:', err);
      setError(
        t(lang, 'Error al eliminar la empresa', 'Error deleting company')
      );
    } finally {
      setActionInProgress(null);
    }
  }

  /* ---- derived data ---- */

  const displayedCompanies =
    activeTab === 'review' ? pendingCompanies : companies;

  /* ---- renders ---- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          {t(lang, 'Cargando empresas...', 'Loading companies...')}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-1 text-xs font-medium text-red-600 underline hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          >
            {t(lang, 'Cerrar', 'Dismiss')}
          </button>
        </div>
      )}

      {/* Tab bar + Add button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex space-x-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
          <TabButton
            active={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
            label={t(lang, 'Todas las empresas', 'All Companies')}
            count={companies.length}
          />
          <TabButton
            active={activeTab === 'review'}
            onClick={() => setActiveTab('review')}
            label={t(lang, 'Cola de revision', 'Review Queue')}
            count={pendingCompanies.length}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTokenSettings(!showTokenSettings)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            title={t(
              lang,
              'Configurar Logo.dev API token',
              'Configure Logo.dev API token'
            )}
          >
            <Cog6ToothIcon className="h-4 w-4" />
          </button>
          <button
            onClick={handleBulkFetchLogos}
            disabled={bulkFetching || companies.filter((c) => !c.logoUrl && c.domain).length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            title={t(lang, 'Obtener logos faltantes', 'Fetch missing logos')}
          >
            {bulkFetching ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowPathIcon className="h-4 w-4" />
            )}
            {bulkFetching
              ? `${bulkProgress.done}/${bulkProgress.total}`
              : t(lang, 'Logos faltantes', 'Missing logos')}
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            <PlusIcon className="h-4 w-4" />
            {t(lang, 'Agregar empresa', 'Add Company')}
          </button>
        </div>
      </div>

      {/* Logo.dev Token Settings */}
      {showTokenSettings && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <h3 className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-200">
            Logo.dev API Token
          </h3>
          <p className="mb-3 text-xs text-blue-700 dark:text-blue-300">
            {t(
              lang,
              'Configura tu token de Logo.dev para obtener logos de alta calidad. Sin token, se usará Google Favicon (baja calidad). Obtén uno gratis en logo.dev',
              'Set your Logo.dev token for high-quality logos. Without it, Google Favicon (low quality) is used. Get one free at logo.dev'
            )}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={logoDevToken}
              onChange={(e) => setLogoDevToken(e.target.value)}
              placeholder="pk_..."
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={() => {
                localStorage.setItem('logoDevApiToken', logoDevToken);
                setShowTokenSettings(false);
              }}
              className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {t(lang, 'Guardar', 'Save')}
            </button>
          </div>
        </div>
      )}

      {/* Company table */}
      {displayedCompanies.length === 0 ? (
        <EmptyState lang={lang} isReviewTab={activeTab === 'review'} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <Th>{t(lang, 'Empresa', 'Company')}</Th>
                  <Th>{t(lang, 'Dominio', 'Domain')}</Th>
                  <Th>{t(lang, 'Industria', 'Industry')}</Th>
                  <Th>{t(lang, 'Miembros', 'Members')}</Th>
                  <Th>{t(lang, 'Estado', 'Status')}</Th>
                  <Th>{t(lang, 'Acciones', 'Actions')}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {displayedCompanies.map((company) => (
                  <tr
                    key={company.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    {/* Logo + Name */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-3">
                        <CompanyLogo company={company} size="sm" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {company.name}
                        </span>
                      </div>
                    </td>

                    {/* Domain */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {company.domain}
                    </td>

                    {/* Industry */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {company.industry ?? '-'}
                    </td>

                    {/* Member count */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {company.memberCount}
                    </td>

                    {/* Status badge */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <StatusBadge
                        pending={company.pendingReview}
                        lang={lang}
                      />
                    </td>

                    {/* Actions */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Edit */}
                        <ActionButton
                          title={t(lang, 'Editar', 'Edit')}
                          onClick={() => openEditModal(company)}
                          disabled={actionInProgress === company.id}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </ActionButton>

                        {/* Approve (pending only) */}
                        {company.pendingReview && (
                          <ActionButton
                            title={t(lang, 'Aprobar', 'Approve')}
                            onClick={() => handleApprove(company.id)}
                            disabled={actionInProgress === company.id}
                            className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </ActionButton>
                        )}

                        {/* Reject (pending only) */}
                        {company.pendingReview && (
                          <ActionButton
                            title={t(lang, 'Rechazar', 'Reject')}
                            onClick={() => handleReject(company.id)}
                            disabled={actionInProgress === company.id}
                            className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </ActionButton>
                        )}

                        {/* Delete */}
                        <ActionButton
                          title={t(lang, 'Eliminar', 'Delete')}
                          onClick={() => handleDelete(company.id)}
                          disabled={actionInProgress === company.id}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <CompanyModal
          lang={lang}
          isEdit={editingCompany !== null}
          formData={formData}
          logoPreview={logoPreview}
          fetchingLogo={fetchingLogo}
          saving={saving}
          canFetchLogo={true}
          onChange={handleFormChange}
          onLogoFileChange={handleLogoFileChange}
          onFetchLogo={handleFetchLogo}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

/* ================================================================== */
/* Sub-components                                                      */
/* ================================================================== */

/* ---- Tab button ---- */

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
      }`}
    >
      {label}
      <span
        className={`ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${
          active
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
            : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/* ---- Table header cell ---- */

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
      {children}
    </th>
  );
}

/* ---- Status badge ---- */

function StatusBadge({
  pending,
  lang,
}: {
  pending: boolean;
  lang: 'es' | 'en';
}) {
  if (pending) {
    return (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        {t(lang, 'Pendiente', 'Pending')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
      {t(lang, 'Aprobada', 'Approved')}
    </span>
  );
}

/* ---- Action icon button ---- */

function ActionButton({
  title,
  onClick,
  disabled,
  className = 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded p-1.5 transition-colors disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

/* ---- Empty state ---- */

function EmptyState({
  lang,
  isReviewTab,
}: {
  lang: 'es' | 'en';
  isReviewTab: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-12 dark:border-gray-700 dark:bg-gray-800">
      <BuildingOffice2Icon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        {isReviewTab
          ? t(
              lang,
              'No hay empresas pendientes de revision',
              'No companies pending review'
            )
          : t(lang, 'No hay empresas registradas', 'No companies registered')}
      </p>
    </div>
  );
}

/* ---- Company modal (add / edit) ---- */

function CompanyModal({
  lang,
  isEdit,
  formData,
  logoPreview,
  fetchingLogo,
  saving,
  canFetchLogo,
  onChange,
  onLogoFileChange,
  onFetchLogo,
  onSave,
  onClose,
}: {
  lang: 'es' | 'en';
  isEdit: boolean;
  formData: CompanyFormData;
  logoPreview: string | null;
  fetchingLogo: boolean;
  saving: boolean;
  canFetchLogo: boolean;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onLogoFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFetchLogo: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEdit
              ? t(lang, 'Editar empresa', 'Edit Company')
              : t(lang, 'Agregar empresa', 'Add Company')}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-4">
          {/* Name */}
          <FormField
            label={t(lang, 'Nombre', 'Name')}
            name="name"
            value={formData.name}
            onChange={onChange}
            required
          />

          {/* Domain + Fetch Logo */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t(lang, 'Dominio', 'Domain')} *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="domain"
                value={formData.domain}
                onChange={onChange}
                placeholder="example.com"
                required
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
              />
              {canFetchLogo && (
                <button
                  type="button"
                  onClick={onFetchLogo}
                  disabled={fetchingLogo || !formData.domain.trim()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  {fetchingLogo ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <MagnifyingGlassIcon className="h-4 w-4" />
                  )}
                  {t(lang, 'Buscar logo', 'Fetch Logo')}
                </button>
              )}
            </div>
          </div>

          {/* Industry */}
          <FormField
            label={t(lang, 'Industria', 'Industry')}
            name="industry"
            value={formData.industry}
            onChange={onChange}
          />

          {/* Location */}
          <FormField
            label={t(lang, 'Ubicacion', 'Location')}
            name="location"
            value={formData.location}
            onChange={onChange}
          />

          {/* Website */}
          <FormField
            label={t(lang, 'Sitio web', 'Website')}
            name="website"
            value={formData.website}
            onChange={onChange}
            placeholder="https://example.com"
          />

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t(lang, 'Descripcion', 'Description')}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={onChange}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* Logo upload + preview */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t(lang, 'Logo', 'Logo')}
            </label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-12 w-12 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={onLogoFileChange}
                className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 dark:text-gray-400 dark:file:bg-blue-900/30 dark:file:text-blue-400"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t(lang, 'Cancelar', 'Cancel')}
          </button>
          <button
            onClick={onSave}
            disabled={
              saving || !formData.name.trim() || !formData.domain.trim()
            }
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-800"
          >
            {saving && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
            {isEdit
              ? t(lang, 'Guardar cambios', 'Save Changes')
              : t(lang, 'Crear empresa', 'Create Company')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Reusable form field ---- */

function FormField({
  label,
  name,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && ' *'}
      </label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
      />
    </div>
  );
}

export default CompanyManagement;
