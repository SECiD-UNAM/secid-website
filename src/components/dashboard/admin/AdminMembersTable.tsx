import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getMemberProfiles,
  updateMemberProfile,
  updateMemberStatus,
  bulkUpdateMemberStatus,
} from '@/lib/members';
import type { MemberProfile, MemberStatus } from '@/types/member';
import type { VerificationStatus } from '@/types/user';
import { PencilIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

/* ------------------------------------------------------------------ */
/* i18n helper                                                         */
/* ------------------------------------------------------------------ */

function t(lang: 'es' | 'en', es: string, en: string): string {
  return lang === 'es' ? es : en;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

type MemberRole = 'member' | 'collaborator' | 'admin' | 'moderator';

const ROLE_OPTIONS: MemberRole[] = [
  'member',
  'collaborator',
  'admin',
  'moderator',
];
const STATUS_OPTIONS: MemberStatus[] = [
  'active',
  'inactive',
  'suspended',
  'pending',
  'alumni',
];
const VERIFICATION_OPTIONS: VerificationStatus[] = [
  'approved',
  'pending',
  'rejected',
  'none',
];

type Lang = 'es' | 'en';

const ROLE_LABELS: Record<Lang, Record<MemberRole, string>> = {
  es: {
    member: 'Miembro',
    collaborator: 'Colaborador',
    admin: 'Admin',
    moderator: 'Moderador',
  },
  en: {
    member: 'Member',
    collaborator: 'Collaborator',
    admin: 'Admin',
    moderator: 'Moderator',
  },
};

const STATUS_LABELS: Record<Lang, Record<string, string>> = {
  es: {
    active: 'Activo',
    inactive: 'Inactivo',
    suspended: 'Suspendido',
    pending: 'Pendiente',
    alumni: 'Alumni',
  },
  en: {
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
    pending: 'Pending',
    alumni: 'Alumni',
  },
};

const VERIFICATION_LABELS: Record<Lang, Record<string, string>> = {
  es: {
    approved: 'Aprobado',
    pending: 'Pendiente',
    rejected: 'Rechazado',
    none: 'Sin verificar',
  },
  en: {
    approved: 'Approved',
    pending: 'Pending',
    rejected: 'Rejected',
    none: 'None',
  },
};

const VERIFICATION_BADGE_STYLES: Record<string, string> = {
  approved:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  pending:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
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
    return new Date(date).toLocaleDateString(
      lang === 'es' ? 'es-MX' : 'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }
    );
  } catch {
    return '-';
  }
}

function formatRelativeTime(
  date: Date | undefined | null,
  lang: string
): string {
  if (!date) return '-';
  try {
    const now = Date.now();
    const then = new Date(date).getTime();
    const diffMs = now - then;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return lang === 'es' ? 'Justo ahora' : 'Just now';
    if (diffMinutes < 60)
      return lang === 'es' ? `Hace ${diffMinutes} min` : `${diffMinutes}m ago`;
    if (diffHours < 24)
      return lang === 'es' ? `Hace ${diffHours}h` : `${diffHours}h ago`;
    if (diffDays < 30)
      return lang === 'es' ? `Hace ${diffDays}d` : `${diffDays}d ago`;
    return formatDate(date, lang);
  } catch {
    return '-';
  }
}

function getMemberVerificationStatus(
  member: MemberProfile
): VerificationStatus {
  return (
    (member as unknown as { verificationStatus?: VerificationStatus })
      .verificationStatus ?? 'none'
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

  /* ---- data state ---- */
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---- filter state ---- */
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Set<MemberRole>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<MemberStatus>>(
    new Set()
  );
  const [verificationFilter, setVerificationFilter] = useState<
    Set<VerificationStatus>
  >(new Set());

  /* ---- selection state ---- */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /* ---- bulk action state ---- */
  const [bulkRole, setBulkRole] = useState<MemberRole>('member');
  const [bulkStatus, setBulkStatus] = useState<MemberStatus>('active');

  /* ---- row highlight state ---- */
  const [highlightedRows, setHighlightedRows] = useState<Set<string>>(
    new Set()
  );
  const [rowErrors, setRowErrors] = useState<Map<string, string>>(new Map());

  /* ---- inline saving state ---- */
  const [savingRows, setSavingRows] = useState<Set<string>>(new Set());

  /* ---------------------------------------------------------------- */
  /* Data loading                                                      */
  /* ---------------------------------------------------------------- */

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMemberProfiles({ limit: 200 });
      setMembers(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t(lang, 'Error al cargar miembros', 'Error loading members');
      setError(message);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  /* ---- debounced search ---- */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* ---------------------------------------------------------------- */
  /* Filtered members                                                  */
  /* ---------------------------------------------------------------- */

  const filteredMembers = useMemo(() => {
    let result = members;

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (m) =>
          m.displayName.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
      );
    }

    if (roleFilter.size > 0) {
      result = result.filter((m) => roleFilter.has(m.role as MemberRole));
    }

    if (statusFilter.size > 0) {
      result = result.filter((m) =>
        statusFilter.has(getMemberLifecycleStatus(m))
      );
    }

    if (verificationFilter.size > 0) {
      result = result.filter((m) =>
        verificationFilter.has(getMemberVerificationStatus(m))
      );
    }

    return result;
  }, [members, debouncedSearch, roleFilter, statusFilter, verificationFilter]);

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
  /* Row highlight                                                     */
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
        await updateMemberProfile(uid, {
          role: newRole,
        } as Partial<MemberProfile>);
        setMembers((prev) =>
          prev.map((m) => (m.uid === uid ? { ...m, role: newRole } : m))
        );
        highlightRow(uid);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : t(lang, 'Error al actualizar rol', 'Error updating role');
        showRowError(uid, message);
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
        setMembers((prev) =>
          prev.map((m) =>
            m.uid === uid
              ? {
                  ...m,
                  lifecycle: {
                    ...m.lifecycle,
                    status: newStatus,
                    statusChangedAt: new Date(),
                    statusChangedBy: user.uid,
                    statusHistory: m.lifecycle?.statusHistory ?? [],
                    lastActiveDate: m.lifecycle?.lastActiveDate ?? new Date(),
                  },
                }
              : m
          )
        );
        highlightRow(uid);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : t(lang, 'Error al actualizar estado', 'Error updating status');
        showRowError(uid, message);
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
    const confirmMessage = t(
      lang,
      `¿Cambiar el rol de ${selectedIds.size} miembro(s) a "${ROLE_LABELS[lang][bulkRole]}"?`,
      `Change role of ${selectedIds.size} member(s) to "${ROLE_LABELS[lang][bulkRole]}"?`
    );
    if (!window.confirm(confirmMessage)) return;

    try {
      const uids = Array.from(selectedIds);
      await Promise.all(
        uids.map((uid) =>
          updateMemberProfile(uid, { role: bulkRole } as Partial<MemberProfile>)
        )
      );
      setMembers((prev) =>
        prev.map((m) => (selectedIds.has(m.uid) ? { ...m, role: bulkRole } : m))
      );
      uids.forEach(highlightRow);
      setSelectedIds(new Set());
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t(lang, 'Error al cambiar roles', 'Error changing roles');
      setError(message);
    }
  }, [selectedIds, bulkRole, lang, highlightRow]);

  const handleBulkStatusChange = useCallback(async () => {
    if (selectedIds.size === 0 || !user?.uid) return;
    const confirmMessage = t(
      lang,
      `¿Cambiar el estado de ${selectedIds.size} miembro(s) a "${STATUS_LABELS[lang][bulkStatus]}"?`,
      `Change status of ${selectedIds.size} member(s) to "${STATUS_LABELS[lang][bulkStatus]}"?`
    );
    if (!window.confirm(confirmMessage)) return;

    try {
      const uids = Array.from(selectedIds);
      await bulkUpdateMemberStatus(uids, bulkStatus, user.uid);
      setMembers((prev) =>
        prev.map((m) =>
          selectedIds.has(m.uid)
            ? {
                ...m,
                lifecycle: {
                  ...m.lifecycle,
                  status: bulkStatus,
                  statusChangedAt: new Date(),
                  statusChangedBy: user.uid,
                  statusHistory: m.lifecycle?.statusHistory ?? [],
                  lastActiveDate: m.lifecycle?.lastActiveDate ?? new Date(),
                },
              }
            : m
        )
      );
      uids.forEach(highlightRow);
      setSelectedIds(new Set());
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t(lang, 'Error al cambiar estados', 'Error changing statuses');
      setError(message);
    }
  }, [selectedIds, bulkStatus, user, lang, highlightRow]);

  const handleBulkApprove = useCallback(async () => {
    if (selectedIds.size === 0 || !user?.uid) return;
    const confirmMessage = t(
      lang,
      `¿Aprobar ${selectedIds.size} miembro(s) seleccionado(s)?`,
      `Approve ${selectedIds.size} selected member(s)?`
    );
    if (!window.confirm(confirmMessage)) return;

    try {
      const uids = Array.from(selectedIds);
      await bulkUpdateMemberStatus(uids, 'active', user.uid, 'Bulk approval');
      setMembers((prev) =>
        prev.map((m) =>
          selectedIds.has(m.uid)
            ? {
                ...m,
                lifecycle: {
                  ...m.lifecycle,
                  status: 'active' as MemberStatus,
                  statusChangedAt: new Date(),
                  statusChangedBy: user.uid,
                  statusHistory: m.lifecycle?.statusHistory ?? [],
                  lastActiveDate: m.lifecycle?.lastActiveDate ?? new Date(),
                },
              }
            : m
        )
      );
      uids.forEach(highlightRow);
      setSelectedIds(new Set());
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t(lang, 'Error al aprobar miembros', 'Error approving members');
      setError(message);
    }
  }, [selectedIds, user, lang, highlightRow]);

  /* ---------------------------------------------------------------- */
  /* Filter toggles                                                    */
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
  /* Render: Loading state                                             */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          {t(lang, 'Cargando miembros...', 'Loading members...')}
        </span>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Render: Error state                                               */
  /* ---------------------------------------------------------------- */

  if (error && members.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={loadMembers}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t(lang, 'Reintentar', 'Retry')}
        </button>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Render: Main                                                      */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-4">
      {/* ---- Non-fatal error banner ---- */}
      {error && members.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 font-medium underline"
          >
            {t(lang, 'Cerrar', 'Dismiss')}
          </button>
        </div>
      )}

      {/* ---- Filters ---- */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        {/* Search */}
        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(
              lang,
              'Buscar por nombre o email...',
              'Search by name or email...'
            )}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </div>

        {/* Filter rows */}
        <div className="flex flex-wrap gap-4">
          {/* Role filter */}
          <div>
            <span className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              {t(lang, 'Rol', 'Role')}
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
              {t(lang, 'Estado', 'Status')}
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
              {t(lang, 'Verificación', 'Verification')}
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

      {/* ---- Bulk actions toolbar ---- */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-lg bg-blue-600 px-4 py-3 text-sm text-white shadow-lg">
          <span className="font-medium">
            {selectedIds.size} {t(lang, 'seleccionados', 'selected')}
          </span>

          <div className="mx-2 h-5 w-px bg-blue-400" />

          {/* Bulk role */}
          <div className="flex items-center gap-1">
            <select
              value={bulkRole}
              onChange={(e) => setBulkRole(e.target.value as MemberRole)}
              className="rounded border border-blue-400 bg-blue-700 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[lang][r]}
                </option>
              ))}
            </select>
            <button
              onClick={handleBulkRoleChange}
              className="rounded bg-white px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
            >
              {t(lang, 'Cambiar Rol', 'Change Role')}
            </button>
          </div>

          <div className="mx-2 h-5 w-px bg-blue-400" />

          {/* Bulk status */}
          <div className="flex items-center gap-1">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as MemberStatus)}
              className="rounded border border-blue-400 bg-blue-700 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[lang][s]}
                </option>
              ))}
            </select>
            <button
              onClick={handleBulkStatusChange}
              className="rounded bg-white px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
            >
              {t(lang, 'Cambiar Estado', 'Change Status')}
            </button>
          </div>

          <div className="mx-2 h-5 w-px bg-blue-400" />

          <button
            onClick={handleBulkApprove}
            className="rounded bg-green-500 px-3 py-1 text-xs font-medium text-white hover:bg-green-600"
          >
            {t(lang, 'Aprobar', 'Approve')}
          </button>

          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto rounded border border-blue-400 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            {t(lang, 'Limpiar Selección', 'Clear Selection')}
          </button>
        </div>
      )}

      {/* ---- Table ---- */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {filteredMembers.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            {t(lang, 'No se encontraron miembros', 'No members found')}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                {/* Checkbox header */}
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    aria-label={t(lang, 'Seleccionar todos', 'Select all')}
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t(lang, 'Nombre', 'Name')}
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t(lang, 'Email', 'Email')}
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t(lang, 'Empresa', 'Company')}
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t(lang, 'Rol', 'Role')}
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t(lang, 'Estado', 'Status')}
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t(lang, 'Verificación', 'Verification')}
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t(lang, 'Registro', 'Joined')}
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t(lang, 'Última actividad', 'Last Active')}
                </th>
                <th className="w-16 px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {t(lang, 'Acciones', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMembers.map((member) => {
                const verificationStatus = getMemberVerificationStatus(member);
                const lifecycleStatus = getMemberLifecycleStatus(member);
                const isHighlighted = highlightedRows.has(member.uid);
                const rowError = rowErrors.get(member.uid);
                const isSaving = savingRows.has(member.uid);

                return (
                  <tr
                    key={member.uid}
                    className={`transition-colors duration-500 ${
                      isHighlighted
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    } ${isSaving ? 'opacity-70' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(member.uid)}
                        onChange={() => toggleSelectRow(member.uid)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                        aria-label={`${t(lang, 'Seleccionar', 'Select')} ${member.displayName}`}
                      />
                    </td>

                    {/* Name + avatar */}
                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          {member.initials || getInitials(member.displayName)}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {member.displayName}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {member.email}
                    </td>

                    {/* Company */}
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {member.profile?.company || '-'}
                    </td>

                    {/* Role dropdown */}
                    <td className="whitespace-nowrap px-3 py-3">
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(
                            member.uid,
                            e.target.value as MemberRole
                          )
                        }
                        disabled={isSaving}
                        className="rounded border-0 bg-transparent py-0.5 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 dark:text-white"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[lang][r]}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Status dropdown */}
                    <td className="whitespace-nowrap px-3 py-3">
                      <select
                        value={lifecycleStatus}
                        onChange={(e) =>
                          handleStatusChange(
                            member.uid,
                            e.target.value as MemberStatus
                          )
                        }
                        disabled={isSaving}
                        className="rounded border-0 bg-transparent py-0.5 text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 dark:text-white"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[lang][s]}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Verification badge */}
                    <td className="whitespace-nowrap px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          VERIFICATION_BADGE_STYLES[verificationStatus] ??
                          VERIFICATION_BADGE_STYLES.none
                        }`}
                      >
                        {VERIFICATION_LABELS[lang][verificationStatus] ??
                          verificationStatus}
                      </span>
                    </td>

                    {/* Joined date */}
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(member.joinedAt, lang)}
                    </td>

                    {/* Last active */}
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {formatRelativeTime(member.activity?.lastActive, lang)}
                    </td>

                    {/* Actions */}
                    <td className="whitespace-nowrap px-3 py-3">
                      <a
                        href={`/${lang}/dashboard/admin/members/${member.uid}/edit`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title={t(lang, 'Editar', 'Edit')}
                      >
                        <PencilIcon className="h-4 w-4" />
                        {t(lang, 'Editar', 'Edit')}
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ---- Row error toasts ---- */}
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

      {/* ---- Summary ---- */}
      <div className="text-right text-xs text-gray-500 dark:text-gray-400">
        {t(
          lang,
          `Mostrando ${filteredMembers.length} de ${members.length} miembros`,
          `Showing ${filteredMembers.length} of ${members.length} members`
        )}
      </div>
    </div>
  );
};

export default AdminMembersTable;
