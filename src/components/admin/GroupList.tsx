import React, { useState, useEffect, useMemo } from 'react';
import { usePermissions } from '@/lib/rbac/hooks';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';
import type { RBACGroup } from '@/lib/rbac/types';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

const labels: Record<string, Record<'es' | 'en', string>> = {
  title: { en: 'Group Management', es: 'Gestion de Grupos' },
  newGroup: { en: 'New Group', es: 'Nuevo Grupo' },
  searchPlaceholder: {
    en: 'Search groups...',
    es: 'Buscar grupos...',
  },
  name: { en: 'Name', es: 'Nombre' },
  description: { en: 'Description', es: 'Descripcion' },
  type: { en: 'Type', es: 'Tipo' },
  permissions: { en: 'Permissions', es: 'Permisos' },
  actions: { en: 'Actions', es: 'Acciones' },
  system: { en: 'System', es: 'Sistema' },
  custom: { en: 'Custom', es: 'Personalizado' },
  view: { en: 'View', es: 'Ver' },
  edit: { en: 'Edit', es: 'Editar' },
  delete: { en: 'Delete', es: 'Eliminar' },
  confirmDelete: {
    en: 'Are you sure you want to delete this group? This cannot be undone.',
    es: 'Estas seguro de que deseas eliminar este grupo? Esta accion no se puede deshacer.',
  },
  noGroups: {
    en: 'No groups found.',
    es: 'No se encontraron grupos.',
  },
  loading: { en: 'Loading groups...', es: 'Cargando grupos...' },
  errorLoading: {
    en: 'Error loading groups. Please try again.',
    es: 'Error al cargar grupos. Intenta de nuevo.',
  },
  groupCount: { en: 'groups', es: 'grupos' },
  permissionCount: { en: 'permissions', es: 'permisos' },
};

function t(key: string, lang: 'es' | 'en'): string {
  return labels[key]?.[lang] ?? key;
}

// ---------------------------------------------------------------------------
// Type badge
// ---------------------------------------------------------------------------

function TypeBadge({ isSystem, lang }: { isSystem: boolean; lang: 'es' | 'en' }) {
  if (isSystem) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
        <ShieldCheckIcon className="h-3 w-3" />
        {t('system', lang)}
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-300">
      {t('custom', lang)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface GroupListProps {
  lang?: 'es' | 'en';
}

export default function GroupList({ lang = 'es' }: GroupListProps) {
  const { can } = usePermissions();
  const [groups, setGroups] = useState<RBACGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const canView = can('groups', 'view');
  const canCreate = can('groups', 'create');
  const canEdit = can('groups', 'edit');
  const canDelete = can('groups', 'delete');

  useEffect(() => {
    let cancelled = false;

    async function loadGroups() {
      try {
        const q = query(
          collection(db, 'rbac_groups'),
          orderBy('isSystem', 'desc')
        );
        const snap = await getDocs(q);
        if (cancelled) return;

        const loaded: RBACGroup[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<RBACGroup, 'id'>),
        }));
        setGroups(loaded);
      } catch {
        if (!cancelled) setError(t('errorLoading', lang));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadGroups();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q)
    );
  }, [groups, search]);

  const handleDelete = async (group: RBACGroup) => {
    if (group.isSystem) return;
    if (!confirm(t('confirmDelete', lang))) return;
    try {
      await deleteDoc(doc(db, 'rbac_groups', group.id));
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
    } catch (err) {
      console.error('Error deleting group:', err);
    }
  };

  // Loading
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

  // Error
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
            href={`/${lang}/dashboard/admin/groups/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <PlusIcon className="h-4 w-4" />
            {t('newGroup', lang)}
          </a>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder', lang)}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Count */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {filtered.length} {t('groupCount', lang)}
      </p>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            {t('noGroups', lang)}
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
                  {t('description', lang)}
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                  {t('type', lang)}
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                  {t('permissions', lang)}
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">
                  {t('actions', lang)}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((group) => (
                <tr
                  key={group.id}
                  className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {group.name}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-gray-700 dark:text-gray-300">
                    {group.description || '\u2014'}
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge isSystem={group.isSystem} lang={lang} />
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      {group.permissions?.length ?? 0} {t('permissionCount', lang)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {canView && (
                        <a
                          href={`/${lang}/dashboard/admin/groups/${group.id}`}
                          title={t('view', lang)}
                          className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-blue-400"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </a>
                      )}
                      {canEdit && (
                        <a
                          href={`/${lang}/dashboard/admin/groups/edit/${group.id}`}
                          title={t('edit', lang)}
                          className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-primary-600 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-primary-400"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </a>
                      )}
                      {canDelete && !group.isSystem && (
                        <button
                          type="button"
                          onClick={() => handleDelete(group)}
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
