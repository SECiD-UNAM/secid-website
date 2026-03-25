import React, { useState, useEffect } from 'react';
import { usePermissions } from '@/lib/rbac/hooks';
import RequirePermission from '@/components/rbac/RequirePermission';
import PermissionMatrixPicker from '@/components/rbac/PermissionMatrixPicker';
import GroupMemberManager from './GroupMemberManager';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { RBACGroup } from '@/lib/rbac/types';
import {
  ShieldCheckIcon,
  PencilSquareIcon,
  ArrowLeftIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

const labels: Record<string, Record<'es' | 'en', string>> = {
  title: { en: 'Group Details', es: 'Detalles del Grupo' },
  name: { en: 'Name', es: 'Nombre' },
  description: { en: 'Description', es: 'Descripcion' },
  permissions: { en: 'Permissions', es: 'Permisos' },
  type: { en: 'Type', es: 'Tipo' },
  system: { en: 'System', es: 'Sistema' },
  custom: { en: 'Custom', es: 'Personalizado' },
  edit: { en: 'Edit Group', es: 'Editar Grupo' },
  backToList: { en: 'Back to Groups', es: 'Volver a Grupos' },
  notFound: { en: 'Group not found.', es: 'Grupo no encontrado.' },
  loading: { en: 'Loading group...', es: 'Cargando grupo...' },
  errorLoading: { en: 'Error loading group.', es: 'Error al cargar grupo.' },
  created: { en: 'Created', es: 'Creado' },
  permissionCount: { en: 'permissions', es: 'permisos' },
  noDescription: { en: 'No description provided.', es: 'Sin descripcion.' },
};

function t(key: string, lang: 'es' | 'en'): string {
  return labels[key]?.[lang] ?? key;
}

// ---------------------------------------------------------------------------
// Inner detail (rendered inside permission gate)
// ---------------------------------------------------------------------------

interface GroupDetailInnerProps {
  lang: 'es' | 'en';
  groupId: string;
}

function GroupDetailInner({ lang, groupId }: GroupDetailInnerProps) {
  const { can } = usePermissions();
  const canEdit = can('groups', 'edit');

  const [group, setGroup] = useState<RBACGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchGroup() {
      try {
        const snap = await getDoc(doc(db, 'rbac_groups', groupId));
        if (cancelled) return;
        if (!snap.exists()) {
          setError(t('notFound', lang));
          setLoading(false);
          return;
        }
        setGroup({
          id: snap.id,
          ...(snap.data() as Omit<RBACGroup, 'id'>),
        });
      } catch {
        if (!cancelled) setError(t('errorLoading', lang));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchGroup();
    return () => {
      cancelled = true;
    };
  }, [groupId, lang]);

  // Loading
  if (loading) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse space-y-6">
        <div className="h-8 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div className="space-y-4">
            <div className="h-6 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
        <div className="h-64 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  // Error / not found
  if (error || !group) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-center text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error ?? t('notFound', lang)}
        </div>
        <div className="mt-4">
          <a
            href={`/${lang}/dashboard/admin/groups`}
            className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {t('backToList', lang)}
          </a>
        </div>
      </div>
    );
  }

  function formatTimestamp(ts: unknown): string {
    if (!ts) return '\u2014';
    // Firestore Timestamp has toDate()
    const dateObj = typeof (ts as { toDate?: () => Date }).toDate === 'function'
      ? (ts as { toDate: () => Date }).toDate()
      : new Date(ts as string);
    return dateObj.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <a
          href={`/${lang}/dashboard/admin/groups`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t('backToList', lang)}
        </a>
        {canEdit && (
          <a
            href={`/${lang}/dashboard/admin/groups/edit/${group.id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            <PencilSquareIcon className="h-4 w-4" />
            {t('edit', lang)}
          </a>
        )}
      </div>

      {/* Group Info Card */}
      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {group.name}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {group.description || t('noDescription', lang)}
            </p>
          </div>
          {group.isSystem && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
              <ShieldCheckIcon className="h-3.5 w-3.5" />
              {t('system', lang)}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1">
            <CalendarDaysIcon className="h-4 w-4" />
            {t('created', lang)}: {formatTimestamp(group.createdAt)}
          </span>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            {group.permissions?.length ?? 0} {t('permissionCount', lang)}
          </span>
        </div>
      </div>

      {/* Permissions Matrix (read-only) */}
      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {t('permissions', lang)}
        </h2>
        <PermissionMatrixPicker
          value={group.permissions ?? []}
          onChange={() => {}}
          disabled={true}
          lang={lang}
        />
      </div>

      {/* Member Manager */}
      <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <GroupMemberManager lang={lang} groupId={group.id} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported component with permission gate
// ---------------------------------------------------------------------------

interface GroupDetailProps {
  lang?: 'es' | 'en';
  groupId: string;
}

export default function GroupDetail({ lang = 'es', groupId }: GroupDetailProps) {
  return (
    <RequirePermission resource="groups" operation="view">
      <GroupDetailInner lang={lang} groupId={groupId} />
    </RequirePermission>
  );
}
