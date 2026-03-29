import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getMemberProfiles,
  updateMemberProfile,
  updateMemberStatus,
  bulkUpdateMemberStatus,
} from '@/lib/members';
import type { MemberProfile, MemberStatus } from '@/types/member';
import type { VerificationStatus } from '@/types/user';
import { PencilIcon } from '@heroicons/react/24/outline';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useUniversalListing } from '@/hooks/useUniversalListing';
import { ClientSideAdapter } from '@lib/listing/adapters/ClientSideAdapter';
import {
  ListingSearch,
  ListingTable,
  ListingPagination,
} from '@components/listing';
import type { ColumnDefinition } from '@lib/listing/types';

/* ------------------------------------------------------------------ */
/* i18n helper                                                         */
/* ------------------------------------------------------------------ */

function tr(lang: 'es' | 'en', es: string, en: string): string {
  return lang === 'es' ? es : en;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

type MemberRole = 'member' | 'collaborator' | 'admin' | 'moderator';

const ROLE_OPTIONS: MemberRole[] = ['member', 'collaborator', 'admin', 'moderator'];
const STATUS_OPTIONS: MemberStatus[] = ['active', 'inactive', 'suspended', 'pending', 'alumni'];
const VERIFICATION_OPTIONS: VerificationStatus[] = ['approved', 'pending', 'rejected', 'none'];

type Lang = 'es' | 'en';

const ROLE_LABELS: Record<Lang, Record<MemberRole, string>> = {
  es: { member: 'Miembro', collaborator: 'Colaborador', admin: 'Admin', moderator: 'Moderador' },
  en: { member: 'Member', collaborator: 'Collaborator', admin: 'Admin', moderator: 'Moderator' },
};

const STATUS_LABELS: Record<Lang, Record<string, string>> = {
  es: { active: 'Activo', inactive: 'Inactivo', suspended: 'Suspendido', pending: 'Pendiente', alumni: 'Alumni' },
  en: { active: 'Active', inactive: 'Inactive', suspended: 'Suspended', pending: 'Pending', alumni: 'Alumni' },
};

const VERIFICATION_LABELS: Record<Lang, Record<string, string>> = {
  es: { approved: 'Aprobado', pending: 'Pendiente', rejected: 'Rechazado', none: 'Sin verificar' },
  en: { approved: 'Approved', pending: 'Pending', rejected: 'Rejected', none: 'None' },
};

const VERIFICATION_BADGE_STYLES: Record<string, string> = {
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  none: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const DEBOUNCE_MS = 300;
const ROW_HIGHLIGHT_MS = 1500;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: Date | undefined | null, lang: string): string {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '-';
  }
}

function formatRelativeTime(date: Date | undefined | null, lang: string): string {
  if (!date) return '-';
  try {
    const now = Date.now();
    const then = new Date(date).getTime();
    const diffMs = now - then;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return lang === 'es' ? 'Justo ahora' : 'Just now';
    if (diffMinutes < 60) return lang === 'es' ? `Hace ${diffMinutes} min` : `${diffMinutes}m ago`;
    if (diffHours < 24) return lang === 'es' ? `Hace ${diffHours}h` : `${diffHours}h ago`;
    if (diffDays < 30) return lang === 'es' ? `Hace ${diffDays}d` : `${diffDays}d ago`;
    return formatDate(date, lang);
  } catch {
    return '-';
  }
}

function getMemberVerificationStatus(member: MemberProfile): VerificationStatus {
  return (
    (member as unknown as { verificationStatus?: VerificationStatus }).verificationStatus ?? 'none'
  );
}

function getMemberLifecycleStatus(member: MemberProfile): MemberStatus {
  return member.lifecycle?.status ?? 'pending';
}

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

interface Props {
  lang: 'es' | 'en';
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export const AdminMembersTable: React.FC<Props> = ({ lang }) => {
  const { user, isAdmin } = useAuth();

  /* ---- RBAC group assignments per user ---- */
  const [userGroups, setUserGroups] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    getDocs(collection(db, 'rbac_user_groups'))
      .then((snap) => {
        const map = new Map<string, string[]>();
        snap.forEach((doc) => {
          const data = doc.data();
          if (data.groups) map.set(doc.id, data.groups);
        });
        setUserGroups(map);
      })
      .catch(() => {/* ignore — groups column will be empty */});
  }, []);

  /* ---- inline editing state (not managed by listing) ---- */
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());
  const [highlightedRows, setHighlightedRows] = useState<Set<string>>(new Set());
  const [rowErrors, setRowErrors] = useState<Map<string, string>>(new Map());
  const [actionError, setActionError] = useState<string | null>(null);

  /* ---- selection state ---- */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /* ---- bulk action state ---- */
  const [bulkRole, setBulkRole] = useState<MemberRole>('member');
  const [bulkStatus, setBulkStatus] = useState<MemberStatus>('active');

  /* ---- multiselect filter state (pill toggles, not managed by listing) ---- */
  const [roleFilter, setRoleFilter] = useState<Set<MemberRole>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<MemberStatus>>(new Set());
  const [verificationFilter, setVerificationFilter] = useState<Set<VerificationStatus>>(new Set());

  /* ---- local members cache for optimistic updates ---- */
  const [memberOverrides, setMemberOverrides] = useState<Map<string, Partial<MemberProfile>>>(
    new Map()
  );

  /* ---- adapter (stable ref, fetchAll loads once then cached) ---- */
  const adapterRef = useRef(
    new ClientSideAdapter<MemberProfile>({
      fetchAll: () => getMemberProfiles({ limit: 200 }),
      searchFields: ['displayName', 'email'],
      getId: (m) => m.uid,
      toSearchable: (m) => `${m.displayName} ${m.email}`,
    })
  );

  /* ---- Derive extra filters to apply after listing search ---- */
  const extraFilters = useMemo<Record<string, unknown>>(() => {
    const result: Record<string, unknown> = {};
    if (roleFilter.size > 0) result['role'] = Array.from(roleFilter);
    if (statusFilter.size > 0) result['_lifecycleStatus'] = Array.from(statusFilter);
    if (verificationFilter.size > 0) result['_verificationStatus'] = Array.from(verificationFilter);
    return result;
  }, [roleFilter, statusFilter, verificationFilter]);

  const {
    items: rawItems,
    totalCount,
    loading,
    error,
    retry,
    query,
    setQuery,
    page,
    totalPages,
    hasMore,
    goToPage,
    loadMore,
  } = useUniversalListing<MemberProfile>({
    adapter: adapterRef.current,
    defaultViewMode: 'table',
    defaultSort: { field: 'displayName', direction: 'asc' },
    paginationMode: 'offset',
    defaultPageSize: 50,
    debounceMs: DEBOUNCE_MS,
    lang,
  });

  /* Apply multiselect filters client-side (adapter handles text search) */
  const filteredMembers = useMemo(() => {
    let result = rawItems.map((m) => {
      const override = memberOverrides.get(m.uid);
      return override ? { ...m, ...override } : m;
    });

    if (roleFilter.size > 0) {
      result = result.filter((m) => roleFilter.has(m.role as MemberRole));
    }
    if (statusFilter.size > 0) {
      result = result.filter((m) => statusFilter.has(getMemberLifecycleStatus(m)));
    }
    if (verificationFilter.size > 0) {
      result = result.filter((m) => verificationFilter.has(getMemberVerificationStatus(m)));
    }

    return result;
  }, [rawItems, memberOverrides, roleFilter, statusFilter, verificationFilter]);

  /* ---------------------------------------------------------------- */
  /* Row highlight helpers                                             */
  /* ---------------------------------------------------------------- */

  const highlightRow = useCallback((uid: string) => {
    setHighlightedRows((prev) => new Set(prev).add(uid));
    setTimeout(() => {
      setHighlightedRows((prev) => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
    }, ROW_HIGHLIGHT_MS);
  }, []);

  const showRowError = useCallback((uid: string, message: string) => {
    setRowErrors((prev) => new Map(prev).set(uid, message));
    setTimeout(() => {
      setRowErrors((prev) => {
        const next = new Map(prev);
        next.delete(uid);
        return next;
      });
    }, 3000);
  }, []);

  /* ---------------------------------------------------------------- */
  /* Inline role change                                                */
  /* ---------------------------------------------------------------- */

  const handleRoleChange = useCallback(
    async (uid: string, newRole: MemberRole) => {
      setSavingRows((prev) => new Set(prev).add(uid));
      try {
        await updateMemberProfile(uid, { role: newRole } as Partial<MemberProfile>);
        setMemberOverrides((prev) => new Map(prev).set(uid, { ...(prev.get(uid) ?? {}), role: newRole }));
        highlightRow(uid);
      } catch (err) {
        showRowError(uid, err instanceof Error ? err.message : tr(lang, 'Error al actualizar rol', 'Error updating role'));
      } finally {
        setSavingRows((prev) => {
          const next = new Set(prev);
          next.delete(uid);
          return next;
        });
      }
    },
    [lang, highlightRow, showRowError]
  );

  /* ---------------------------------------------------------------- */
  /* Inline status change                                              */
  /* ---------------------------------------------------------------- */

  const handleStatusChange = useCallback(
    async (uid: string, newStatus: MemberStatus) => {
      if (!user?.uid) return;
      setSavingRows((prev) => new Set(prev).add(uid));
      try {
        await updateMemberStatus(uid, newStatus, user.uid);
        setMemberOverrides((prev) => {
          const existing = prev.get(uid) ?? {};
          return new Map(prev).set(uid, {
            ...existing,
            lifecycle: {
              ...(existing.lifecycle ?? {}),
              status: newStatus,
              statusChangedAt: new Date(),
              statusChangedBy: user.uid,
              statusHistory: existing.lifecycle?.statusHistory ?? [],
              lastActiveDate: existing.lifecycle?.lastActiveDate ?? new Date(),
            },
          });
        });
        highlightRow(uid);
      } catch (err) {
        showRowError(uid, err instanceof Error ? err.message : tr(lang, 'Error al actualizar estado', 'Error updating status'));
      } finally {
        setSavingRows((prev) => {
          const next = new Set(prev);
          next.delete(uid);
          return next;
        });
      }
    },
    [user, lang, highlightRow, showRowError]
  );

  /* ---------------------------------------------------------------- */
  /* Bulk actions                                                      */
  /* ---------------------------------------------------------------- */

  const handleBulkRoleChange = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(tr(lang, `¿Cambiar el rol de ${selectedIds.size} miembro(s) a "${ROLE_LABELS[lang][bulkRole]}"?`, `Change role of ${selectedIds.size} member(s) to "${ROLE_LABELS[lang][bulkRole]}"?`))) return;

    try {
      const uids = Array.from(selectedIds);
      await Promise.all(uids.map((uid) => updateMemberProfile(uid, { role: bulkRole } as Partial<MemberProfile>)));
      setMemberOverrides((prev) => {
        const next = new Map(prev);
        uids.forEach((uid) => next.set(uid, { ...(next.get(uid) ?? {}), role: bulkRole }));
        return next;
      });
      uids.forEach(highlightRow);
      setSelectedIds(new Set());
    } catch (err) {
      setActionError(err instanceof Error ? err.message : tr(lang, 'Error al cambiar roles', 'Error changing roles'));
    }
  }, [selectedIds, bulkRole, lang, highlightRow]);

  const handleBulkStatusChange = useCallback(async () => {
    if (selectedIds.size === 0 || !user?.uid) return;
    if (!window.confirm(tr(lang, `¿Cambiar el estado de ${selectedIds.size} miembro(s) a "${STATUS_LABELS[lang][bulkStatus]}"?`, `Change status of ${selectedIds.size} member(s) to "${STATUS_LABELS[lang][bulkStatus]}"?`))) return;

    try {
      const uids = Array.from(selectedIds);
      await bulkUpdateMemberStatus(uids, bulkStatus, user.uid);
      setMemberOverrides((prev) => {
        const next = new Map(prev);
        uids.forEach((uid) => {
          const existing = next.get(uid) ?? {};
          next.set(uid, {
            ...existing,
            lifecycle: {
              ...(existing.lifecycle ?? {}),
              status: bulkStatus,
              statusChangedAt: new Date(),
              statusChangedBy: user.uid,
              statusHistory: existing.lifecycle?.statusHistory ?? [],
              lastActiveDate: existing.lifecycle?.lastActiveDate ?? new Date(),
            },
          });
        });
        return next;
      });
      uids.forEach(highlightRow);
      setSelectedIds(new Set());
    } catch (err) {
      setActionError(err instanceof Error ? err.message : tr(lang, 'Error al cambiar estados', 'Error changing statuses'));
    }
  }, [selectedIds, bulkStatus, user, lang, highlightRow]);

  const handleBulkApprove = useCallback(async () => {
    if (selectedIds.size === 0 || !user?.uid) return;
    if (!window.confirm(tr(lang, `¿Aprobar ${selectedIds.size} miembro(s) seleccionado(s)?`, `Approve ${selectedIds.size} selected member(s)?`))) return;

    try {
      const uids = Array.from(selectedIds);
      await bulkUpdateMemberStatus(uids, 'active', user.uid, 'Bulk approval');
      setMemberOverrides((prev) => {
        const next = new Map(prev);
        uids.forEach((uid) => {
          const existing = next.get(uid) ?? {};
          next.set(uid, {
            ...existing,
            lifecycle: {
              ...(existing.lifecycle ?? {}),
              status: 'active' as MemberStatus,
              statusChangedAt: new Date(),
              statusChangedBy: user.uid,
              statusHistory: existing.lifecycle?.statusHistory ?? [],
              lastActiveDate: existing.lifecycle?.lastActiveDate ?? new Date(),
            },
          });
        });
        return next;
      });
      uids.forEach(highlightRow);
      setSelectedIds(new Set());
    } catch (err) {
      setActionError(err instanceof Error ? err.message : tr(lang, 'Error al aprobar miembros', 'Error approving members'));
    }
  }, [selectedIds, user, lang, highlightRow]);

  /* ---------------------------------------------------------------- */
  /* Filter toggle                                                     */
  /* ---------------------------------------------------------------- */

  const toggleFilter = useCallback(
    <T,>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) => {
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(value)) {
          next.delete(value);
        } else {
          next.add(value);
        }
        return next;
      });
    },
    []
  );

  /* ---------------------------------------------------------------- */
  /* Selection logic                                                   */
  /* ---------------------------------------------------------------- */

  const allVisibleSelected =
    filteredMembers.length > 0 &&
    filteredMembers.every((m) => selectedIds.has(m.uid));

  const toggleSelectAll = useCallback(() => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMembers.map((m) => m.uid)));
    }
  }, [allVisibleSelected, filteredMembers]);

  const toggleSelectRow = useCallback((uid: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  }, []);

  /* ---------------------------------------------------------------- */
  /* Columns                                                           */
  /* ---------------------------------------------------------------- */

  const columns: ColumnDefinition<MemberProfile>[] = useMemo(
    () => [
      {
        key: 'select',
        label: '',
        width: '40px',
        accessor: (member) => (
          <input
            type="checkbox"
            checked={selectedIds.has(member.uid)}
            onChange={() => toggleSelectRow(member.uid)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
            aria-label={`${tr(lang, 'Seleccionar', 'Select')} ${member.displayName}`}
          />
        ),
      },
      {
        key: 'displayName',
        label: tr(lang, 'Nombre', 'Name'),
        sortable: true,
        accessor: (member) => (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {(member as unknown as { initials?: string }).initials || getInitials(member.displayName)}
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {member.displayName}
            </span>
          </div>
        ),
      },
      {
        key: 'email',
        label: tr(lang, 'Email', 'Email'),
        accessor: (member) => (
          <span className="text-sm text-gray-600 dark:text-gray-300">{member.email}</span>
        ),
      },
      {
        key: 'company',
        label: tr(lang, 'Empresa', 'Company'),
        accessor: (member) => (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {(member.profile as { company?: string } | undefined)?.company || '-'}
          </span>
        ),
      },
      {
        key: 'role',
        label: tr(lang, 'Rol', 'Role'),
        accessor: (member) => {
          const isSaving = savingRows.has(member.uid);
          return (
            <select
              value={member.role}
              onChange={(e) => handleRoleChange(member.uid, e.target.value as MemberRole)}
              disabled={isSaving}
              className="rounded border-0 bg-transparent py-0.5 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 dark:text-white"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[lang][r]}
                </option>
              ))}
            </select>
          );
        },
      },
      {
        key: 'groups',
        label: tr(lang, 'Grupos', 'Groups'),
        accessor: (member) => {
          const groups = userGroups.get(member.uid);
          if (!groups || groups.length === 0) {
            return <span className="text-xs text-gray-400">—</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {groups.map((g) => (
                <a
                  key={g}
                  href={`/${lang}/dashboard/admin/groups/${g}`}
                  className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                >
                  {g}
                </a>
              ))}
            </div>
          );
        },
      },
      {
        key: 'status',
        label: tr(lang, 'Estado', 'Status'),
        accessor: (member) => {
          const lifecycleStatus = getMemberLifecycleStatus(member);
          const isSaving = savingRows.has(member.uid);
          return (
            <select
              value={lifecycleStatus}
              onChange={(e) => handleStatusChange(member.uid, e.target.value as MemberStatus)}
              disabled={isSaving}
              className="rounded border-0 bg-transparent py-0.5 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 dark:text-white"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[lang][s]}
                </option>
              ))}
            </select>
          );
        },
      },
      {
        key: 'verification',
        label: tr(lang, 'Verificación', 'Verification'),
        accessor: (member) => {
          const verificationStatus = getMemberVerificationStatus(member);
          return (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                VERIFICATION_BADGE_STYLES[verificationStatus] ?? VERIFICATION_BADGE_STYLES.none
              }`}
            >
              {VERIFICATION_LABELS[lang][verificationStatus] ?? verificationStatus}
            </span>
          );
        },
      },
      {
        key: 'joinedAt',
        label: tr(lang, 'Registro', 'Joined'),
        sortable: true,
        accessor: (member) => (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {formatDate(member.joinedAt, lang)}
          </span>
        ),
      },
      {
        key: 'lastActive',
        label: tr(lang, 'Última actividad', 'Last Active'),
        accessor: (member) => (
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {formatRelativeTime((member.activity as { lastActive?: Date } | undefined)?.lastActive, lang)}
          </span>
        ),
      },
      {
        key: 'actions',
        label: tr(lang, 'Acciones', 'Actions'),
        width: '64px',
        accessor: (member) => (
          <a
            href={`/${lang}/dashboard/admin/members/${member.uid}/edit`}
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            title={tr(lang, 'Editar', 'Edit')}
          >
            <PencilIcon className="h-4 w-4" />
            {tr(lang, 'Editar', 'Edit')}
          </a>
        ),
      },
    ],
    [lang, selectedIds, savingRows, toggleSelectRow, handleRoleChange, handleStatusChange]
  );

  /* ---------------------------------------------------------------- */
  /* Render: Loading state                                             */
  /* ---------------------------------------------------------------- */

  if (loading && rawItems.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          {tr(lang, 'Cargando miembros...', 'Loading members...')}
        </span>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Render: Error state                                               */
  /* ---------------------------------------------------------------- */

  if (error && rawItems.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={retry}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {tr(lang, 'Reintentar', 'Retry')}
        </button>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Render: Main                                                      */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-4">
      {/* Non-fatal error banner */}
      {(error || actionError) && rawItems.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error ?? actionError}
          <button
            onClick={() => setActionError(null)}
            className="ml-2 font-medium underline"
          >
            {tr(lang, 'Cerrar', 'Dismiss')}
          </button>
        </div>
      )}

      {/* Search + pill filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4">
          <ListingSearch
            query={query}
            onQueryChange={setQuery}
            lang={lang}
            totalCount={totalCount}
          />
        </div>

        <div className="flex flex-wrap gap-4">
          {/* Role filter */}
          <div>
            <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              {tr(lang, 'Rol', 'Role')}
            </span>
            <div className="flex flex-wrap gap-1">
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role}
                  onClick={() => toggleFilter(setRoleFilter, role)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    roleFilter.has(role)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {ROLE_LABELS[lang][role]}
                </button>
              ))}
            </div>
          </div>

          {/* Status filter */}
          <div>
            <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              {tr(lang, 'Estado', 'Status')}
            </span>
            <div className="flex flex-wrap gap-1">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  onClick={() => toggleFilter(setStatusFilter, status)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    statusFilter.has(status)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {STATUS_LABELS[lang][status]}
                </button>
              ))}
            </div>
          </div>

          {/* Verification filter */}
          <div>
            <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              {tr(lang, 'Verificación', 'Verification')}
            </span>
            <div className="flex flex-wrap gap-1">
              {VERIFICATION_OPTIONS.map((vs) => (
                <button
                  key={vs}
                  onClick={() => toggleFilter(setVerificationFilter, vs)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    verificationFilter.has(vs)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {VERIFICATION_LABELS[lang][vs]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk actions toolbar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-lg bg-blue-600 px-4 py-3 text-sm text-white shadow-lg">
          <span className="font-medium">
            {selectedIds.size} {tr(lang, 'seleccionados', 'selected')}
          </span>

          <div className="mx-2 h-5 w-px bg-blue-400" />

          <div className="flex items-center gap-1">
            <select
              value={bulkRole}
              onChange={(e) => setBulkRole(e.target.value as MemberRole)}
              className="rounded border border-blue-400 bg-blue-700 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[lang][r]}</option>
              ))}
            </select>
            <button
              onClick={handleBulkRoleChange}
              className="rounded bg-white px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
            >
              {tr(lang, 'Cambiar Rol', 'Change Role')}
            </button>
          </div>

          <div className="mx-2 h-5 w-px bg-blue-400" />

          <div className="flex items-center gap-1">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as MemberStatus)}
              className="rounded border border-blue-400 bg-blue-700 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[lang][s]}</option>
              ))}
            </select>
            <button
              onClick={handleBulkStatusChange}
              className="rounded bg-white px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
            >
              {tr(lang, 'Cambiar Estado', 'Change Status')}
            </button>
          </div>

          <div className="mx-2 h-5 w-px bg-blue-400" />

          <button
            onClick={handleBulkApprove}
            className="rounded bg-green-500 px-3 py-1 text-xs font-medium text-white hover:bg-green-600"
          >
            {tr(lang, 'Aprobar', 'Approve')}
          </button>

          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto rounded border border-blue-400 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            {tr(lang, 'Limpiar Selección', 'Clear Selection')}
          </button>
        </div>
      )}

      {/* Select-all header + table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {filteredMembers.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            {tr(lang, 'No se encontraron miembros', 'No members found')}
          </div>
        ) : (
          <>
            {/* Select-all checkbox in its own row above ListingTable */}
            <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  aria-label={tr(lang, 'Seleccionar todos', 'Select all')}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {tr(lang, 'Seleccionar todos', 'Select all')}
                </span>
              </label>
            </div>
            <ListingTable<MemberProfile>
              items={filteredMembers}
              columns={columns}
              keyExtractor={(m) => m.uid}
              className={undefined}
            />
          </>
        )}
      </div>

      {/* Pagination */}
      <ListingPagination
        page={page}
        totalPages={totalPages}
        hasMore={hasMore}
        paginationMode="offset"
        onPageChange={goToPage}
        onLoadMore={loadMore}
        loading={loading}
        lang={lang}
      />

      {/* Row error toasts */}
      {rowErrors.size > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {Array.from(rowErrors.entries()).map(([uid, message]) => (
            <div
              key={uid}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 shadow-lg dark:border-red-800 dark:bg-red-900/80 dark:text-red-300"
            >
              {message}
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="text-right text-xs text-gray-500 dark:text-gray-400">
        {tr(
          lang,
          `Mostrando ${filteredMembers.length} de ${totalCount} miembros`,
          `Showing ${filteredMembers.length} of ${totalCount} members`
        )}
      </div>
    </div>
  );
};

export default AdminMembersTable;
