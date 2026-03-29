import React, { useState, useEffect, useMemo } from 'react';
import {
  getAllSpotlights,
  deleteSpotlight,
  updateSpotlight,
} from '@/lib/spotlights';
import type { AlumniSpotlight } from '@/types/spotlight';
import { usePermissions } from '@/lib/rbac/hooks';
import { useAuth } from '@/contexts/AuthContext';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

const labels: Record<string, Record<string, string>> = {
  title: { en: 'Spotlights Management', es: 'Gestion de Historias' },
  newSpotlight: { en: 'New Spotlight', es: 'Nueva Historia' },
  searchPlaceholder: {
    en: 'Search by name, title or company...',
    es: 'Buscar por nombre, titulo o empresa...',
  },
  allStatuses: { en: 'All statuses', es: 'Todos los estados' },
  draft: { en: 'Draft', es: 'Borrador' },
  published: { en: 'Published', es: 'Publicado' },
  name: { en: 'Name', es: 'Nombre' },
  position: { en: 'Position', es: 'Puesto' },
  company: { en: 'Company', es: 'Empresa' },
  status: { en: 'Status', es: 'Estado' },
  actions: { en: 'Actions', es: 'Acciones' },
  edit: { en: 'Edit', es: 'Editar' },
  delete: { en: 'Delete', es: 'Eliminar' },
  publish: { en: 'Publish', es: 'Publicar' },
  unpublish: { en: 'Unpublish', es: 'Despublicar' },
  confirmDelete: {
    en: 'Are you sure you want to delete this spotlight?',
    es: 'Estas seguro de que deseas eliminar esta historia?',
  },
  noSpotlights: {
    en: 'No spotlights found.',
    es: 'No se encontraron historias.',
  },
  loading: { en: 'Loading spotlights...', es: 'Cargando historias...' },
  errorLoading: {
    en: 'Error loading spotlights. Please try again.',
    es: 'Error al cargar historias. Intenta de nuevo.',
  },
  spotlightCount: { en: 'spotlights', es: 'historias' },
};

function t(key: string, lang: string): string {
  return labels[key]?.[lang] ?? key;
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status, lang }: { status: string; lang: string }) {
  const colorMap: Record<string, string> = {
    draft:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    published:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colorMap[status] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {t(status, lang)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SpotlightManageListProps {
  lang?: 'es' | 'en';
}

export default function SpotlightManageList({
  lang = 'es',
}: SpotlightManageListProps) {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [spotlights, setSpotlights] = useState<AlumniSpotlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const canCreate = can('spotlights', 'create');
  const canEdit = can('spotlights', 'edit');
  const canDelete = can('spotlights', 'delete');
  const canPublish = can('spotlights', 'publish');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getAllSpotlights();
        if (!cancelled) setSpotlights(data);
      } catch {
        if (!cancelled) setError(t('errorLoading', lang));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const filtered = useMemo(() => {
    let result = spotlights;

    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.title.toLowerCase().includes(q) ||
          s.company.toLowerCase().includes(q)
      );
    }

    return result;
  }, [spotlights, statusFilter, search]);

  const handleDelete = async (spotlight: AlumniSpotlight) => {
    if (!confirm(t('confirmDelete', lang))) return;
    try {
      await deleteSpotlight(spotlight.id);
      setSpotlights((prev) => prev.filter((s) => s.id !== spotlight.id));
    } catch (err) {
      console.error('Error deleting spotlight:', err);
    }
  };

  const handleTogglePublish = async (spotlight: AlumniSpotlight) => {
    if (!user) return;
    const newStatus =
      spotlight.status === 'published' ? 'draft' : 'published';
    try {
      await updateSpotlight(spotlight.id, { status: newStatus });
      setSpotlights((prev) =>
        prev.map((s) =>
          s.id === spotlight.id ? { ...s, status: newStatus } : s
        )
      );
    } catch (err) {
      console.error('Error toggling publish status:', err);
    }
  };

  // -- Loading ----------------------------------------------------------------
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-12 rounded bg-gray-200 dark:bg-gray-700" />
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      </div>
    );
  }

  // -- Error ------------------------------------------------------------------
  if (error) {
    return (
      <div className="mx-auto max-w-5xl rounded-lg border border-red-300 bg-red-50 p-6 text-center text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('title', lang)}
        </h1>
        {canCreate && (
          <a
            href={`/${lang}/dashboard/spotlights/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <PlusIcon className="h-4 w-4" />
            {t('newSpotlight', lang)}
          </a>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder', lang)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="all">{t('allStatuses', lang)}</option>
          <option value="draft">{t('draft', lang)}</option>
          <option value="published">{t('published', lang)}</option>
        </select>
      </div>

      {/* Count */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {filtered.length} {t('spotlightCount', lang)}
      </p>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            {t('noSpotlights', lang)}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow dark:bg-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                  {t('name', lang)}
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                  {t('position', lang)}
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                  {t('company', lang)}
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                  {t('status', lang)}
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                  {t('actions', lang)}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((spotlight) => (
                <tr
                  key={spotlight.id}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {spotlight.name}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {spotlight.title}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {spotlight.company}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={spotlight.status} lang={lang} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {canPublish && (
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(spotlight)}
                          title={
                            spotlight.status === 'published'
                              ? t('unpublish', lang)
                              : t('publish', lang)
                          }
                          className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-blue-400"
                        >
                          {spotlight.status === 'published' ? (
                            <EyeSlashIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      {canEdit && (
                        <a
                          href={`/${lang}/dashboard/spotlights/edit/${spotlight.id}`}
                          title={t('edit', lang)}
                          className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-primary-400"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </a>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(spotlight)}
                          title={t('delete', lang)}
                          className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-red-400"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
