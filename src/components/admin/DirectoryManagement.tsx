// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { useTranslations } from '@/hooks/useTranslations';
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  doc,
  updateDoc,
  getDocs,
  DocumentSnapshot,
  Timestamp,
} from 'firebase/firestore';
import {
  Users,
  Search,
  Filter,
  Download,
  Eye,
  UserCheck,
  UserX,
  Crown,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Globe,
  ChevronRight,
  MoreHorizontal,
  Loader2,
  BookUser,
} from 'lucide-react';
import type { MemberStatus } from '@/types/member';
import { updateMemberStatus, getDirectoryStatsData } from '@/lib/members';
import { syncGroupMembership, GROUP_LABELS } from '@/lib/gcp-services';
import { StatusChangeModal } from './StatusChangeModal';
import { GroupManagementModal } from './GroupManagementModal';

interface DirectoryUser {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: string;
  photoURL?: string;
  registrationType?: string;
  verificationStatus?: string;
  numeroCuenta?: string;
  academicLevel?: string;
  campus?: string;
  generation?: string;
  graduationYear?: number;
  verificationDocumentUrl?: string;
  lifecycle?: {
    status: MemberStatus;
    statusChangedAt: any;
    statusChangedBy?: string;
    statusReason?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface DirectoryStats {
  totalMembers: number;
  byStatus: Record<string, number>;
  pendingApproval: number;
  newThisMonth: number;
}

const STATUS_CONFIG: Record<MemberStatus, { color: string; icon: any; esLabel: string; enLabel: string }> = {
  collaborator: { color: 'bg-blue-100 text-blue-800', icon: Users, esLabel: 'Colaborador', enLabel: 'Collaborator' },
  pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, esLabel: 'Pendiente', enLabel: 'Pending' },
  active: { color: 'bg-green-100 text-green-800', icon: CheckCircle, esLabel: 'Activo', enLabel: 'Active' },
  inactive: { color: 'bg-gray-100 text-gray-800', icon: XCircle, esLabel: 'Inactivo', enLabel: 'Inactive' },
  suspended: { color: 'bg-red-100 text-red-800', icon: AlertTriangle, esLabel: 'Suspendido', enLabel: 'Suspended' },
  alumni: { color: 'bg-purple-100 text-purple-800', icon: Crown, esLabel: 'Alumni', enLabel: 'Alumni' },
  deactivated: { color: 'bg-gray-100 text-gray-600', icon: XCircle, esLabel: 'Desactivado', enLabel: 'Deactivated' },
};

export const DirectoryManagement: React.FC = () => {
  const { userProfile, isAdmin } = useAuth();
  const { language } = useTranslations();
  const es = language === 'es';

  // Data state
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [stats, setStats] = useState<DirectoryStats | null>(null);

  // UI state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'groups'>('all');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    user: DirectoryUser | null;
    targetStatus: MemberStatus;
  }>({ isOpen: false, user: null, targetStatus: 'active' });

  const [groupModal, setGroupModal] = useState<{
    isOpen: boolean;
    user: DirectoryUser | null;
  }>({ isOpen: false, user: null });

  // Google Groups data
  const [groupData, setGroupData] = useState<Record<string, any> | null>(null);
  const [groupsLoading, setGroupsLoading] = useState(false);

  const USERS_PER_PAGE = 25;

  // Load users
  const loadUsers = async (isLoadMore = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
        setUsers([]);
        setLastDoc(null);
      } else {
        setIsLoadingMore(true);
      }

      let userQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        limit(USERS_PER_PAGE)
      );

      // Apply status filter
      if (statusFilter !== 'all') {
        userQuery = query(userQuery, where('lifecycle.status', '==', statusFilter));
      }

      // Pending tab shortcut
      if (activeTab === 'pending') {
        userQuery = query(
          collection(db, 'users'),
          where('verificationStatus', '==', 'pending'),
          orderBy('createdAt', 'desc'),
          limit(USERS_PER_PAGE)
        );
      }

      if (isLoadMore && lastDoc) {
        userQuery = query(userQuery, startAfter(lastDoc));
      }

      const snapshot = await getDocs(userQuery);
      const loaded: DirectoryUser[] = [];

      snapshot.forEach((d) => {
        const data = d.data();
        loaded.push({
          uid: d.id,
          email: data.email || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          displayName: data.displayName || '',
          role: data.role || 'collaborator',
          photoURL: data.photoURL,
          registrationType: data.registrationType,
          verificationStatus: data.verificationStatus,
          numeroCuenta: data.numeroCuenta,
          academicLevel: data.academicLevel,
          campus: data.campus,
          generation: data.generation,
          graduationYear: data.graduationYear,
          verificationDocumentUrl: data.verificationDocumentUrl,
          lifecycle: data.lifecycle
            ? {
                status: data.lifecycle.status,
                statusChangedAt: data.lifecycle.statusChangedAt,
                statusChangedBy: data.lifecycle.statusChangedBy,
                statusReason: data.lifecycle.statusReason,
              }
            : undefined,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
        });
      });

      if (isLoadMore) {
        setUsers((prev) => [...prev, ...loaded]);
      } else {
        setUsers(loaded);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === USERS_PER_PAGE);
    } catch (err) {
      console.error('Error loading directory:', err);
      setError(es ? 'Error al cargar el directorio' : 'Error loading directory');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Load stats
  const loadStats = async () => {
    try {
      const data = await getDirectoryStatsData();
      setStats({
        totalMembers: data.totalMembers,
        byStatus: data.byStatus,
        pendingApproval: data.pendingApproval,
        newThisMonth: data.newThisMonth,
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  // Load Google Groups
  const loadGoogleGroups = async () => {
    setGroupsLoading(true);
    try {
      const result = await syncGroupMembership();
      if (result.success) {
        setGroupData(result.groups);
      }
    } catch (err) {
      console.error('Error loading Google Groups:', err);
    } finally {
      setGroupsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setError('Unauthorized');
      setLoading(false);
      return;
    }
    loadUsers();
    loadStats();
  }, [isAdmin, statusFilter, activeTab]);

  // Handle status change
  const handleStatusChange = async (user: DirectoryUser, newStatus: MemberStatus) => {
    setStatusModal({ isOpen: true, user, targetStatus: newStatus });
  };

  const confirmStatusChange = async (newStatus: MemberStatus, reason: string) => {
    const user = statusModal.user;
    if (!user || !userProfile) return;

    try {
      await updateMemberStatus(user.uid, newStatus, userProfile.uid || userProfile.email, reason);
      setStatusModal({ isOpen: false, user: null, targetStatus: 'active' });
      loadUsers();
      loadStats();
    } catch (err) {
      console.error('Error changing status:', err);
      setError(es ? 'Error al cambiar el estado' : 'Error changing status');
    }
  };

  // Handle approve/reject
  const handleApprove = (user: DirectoryUser) => {
    handleStatusChange(user, 'active');
  };

  const handleReject = (user: DirectoryUser) => {
    handleStatusChange(user, 'collaborator');
  };

  // Bulk actions
  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.size === 0 || !userProfile) return;
    try {
      const promises = Array.from(selectedUsers).map((uid) => {
        const user = users.find((u) => u.uid === uid);
        if (!user) return Promise.resolve();
        return updateMemberStatus(uid, bulkAction as MemberStatus, userProfile.uid || userProfile.email, 'Bulk action');
      });
      await Promise.all(promises);
      setSelectedUsers(new Set());
      setBulkAction('');
      loadUsers();
      loadStats();
    } catch (err) {
      console.error('Bulk action error:', err);
      setError(es ? 'Error en acción masiva' : 'Bulk action error');
    }
  };

  // Export
  const exportCSV = () => {
    const rows = users.map((u) => ({
      Email: u.email,
      Nombre: u.firstName,
      Apellido: u.lastName,
      Estado: u.lifecycle?.status || u.role,
      Tipo: u.registrationType || '',
      'Número de Cuenta': u.numeroCuenta || '',
      'Nivel Académico': u.academicLevel || '',
      Campus: u.campus || '',
      Generación: u.generation || '',
      Verificación: u.verificationStatus || '',
      'Fecha de Registro': u.createdAt.toISOString().split('T')[0],
    }));

    if (rows.length === 0) return;

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      Object.keys(rows[0]).join(',') +
      '\n' +
      rows.map((r) => Object.values(r).join(',')).join('\n');

    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `directorio-secid-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(es ? 'es-MX' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const getStatus = (user: DirectoryUser): MemberStatus => {
    return user.lifecycle?.status || (user.role === 'member' ? 'active' : 'collaborator');
  };

  // Filter users client-side for search
  const filteredUsers = searchTerm
    ? users.filter(
        (u) =>
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (u.numeroCuenta && u.numeroCuenta.includes(searchTerm))
      )
    : users;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <BookUser className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {es ? 'Acceso Denegado' : 'Access Denied'}
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {es ? 'Directorio' : 'Directory'}
          </h1>
          <p className="mt-2 text-gray-600">
            {es
              ? 'Gestionar miembros, colaboradores y Google Groups'
              : 'Manage members, collaborators and Google Groups'}
          </p>
        </div>
        <div className="mt-4 flex space-x-3 sm:mt-0">
          <button
            onClick={exportCSV}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Download className="mr-2 h-4 w-4" />
            {es ? 'Exportar CSV' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          <StatsCard
            label={es ? 'Total' : 'Total'}
            value={stats.totalMembers}
            color="text-gray-900"
            bg="bg-gray-50"
          />
          <StatsCard
            label={es ? 'Activos' : 'Active'}
            value={stats.byStatus.active || 0}
            color="text-green-700"
            bg="bg-green-50"
          />
          <StatsCard
            label={es ? 'Colaboradores' : 'Collaborators'}
            value={stats.byStatus.collaborator || 0}
            color="text-blue-700"
            bg="bg-blue-50"
          />
          <StatsCard
            label={es ? 'Pendientes' : 'Pending'}
            value={stats.pendingApproval}
            color="text-yellow-700"
            bg="bg-yellow-50"
            onClick={() => setActiveTab('pending')}
            clickable
          />
          <StatsCard
            label="Alumni"
            value={stats.byStatus.alumni || 0}
            color="text-purple-700"
            bg="bg-purple-50"
          />
          <StatsCard
            label={es ? 'Nuevos este mes' : 'New this month'}
            value={stats.newThisMonth}
            color="text-indigo-700"
            bg="bg-indigo-50"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'all', label: es ? 'Todos' : 'All' },
            { key: 'pending', label: es ? 'Pendientes de Aprobación' : 'Pending Approval', badge: stats?.pendingApproval },
            { key: 'groups', label: 'Google Groups' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                if (tab.key === 'groups' && !groupData) loadGoogleGroups();
              }}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Google Groups Tab */}
      {activeTab === 'groups' && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {es ? 'Google Groups de SECiD' : 'SECiD Google Groups'}
              </h3>
              <button
                onClick={loadGoogleGroups}
                disabled={groupsLoading}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {groupsLoading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="mr-1.5 h-4 w-4" />
                )}
                {es ? 'Sincronizar' : 'Sync'}
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {groupsLoading && !groupData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-gray-600">
                  {es ? 'Cargando grupos de Google...' : 'Loading Google Groups...'}
                </span>
              </div>
            ) : groupData ? (
              Object.entries(groupData).map(([email, data]: [string, any]) => (
                <div key={email} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {GROUP_LABELS[email]?.[es ? 'es' : 'en'] || data.name}
                      </h4>
                      <p className="text-sm text-gray-500">{email}</p>
                      {data.description && (
                        <p className="mt-1 text-xs text-gray-400">{data.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
                        {data.members?.length || data.memberCount || 0}{' '}
                        {es ? 'miembros' : 'members'}
                      </span>
                    </div>
                  </div>
                  {data.members && data.members.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {data.members.slice(0, 10).map((m: any) => (
                        <span
                          key={m.email}
                          className="inline-flex items-center rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {m.email}
                          {m.role === 'OWNER' && (
                            <Crown className="ml-1 h-3 w-3 text-yellow-500" />
                          )}
                          {m.role === 'MANAGER' && (
                            <Shield className="ml-1 h-3 w-3 text-blue-500" />
                          )}
                        </span>
                      ))}
                      {data.members.length > 10 && (
                        <span className="text-xs text-gray-400">
                          +{data.members.length - 10} {es ? 'más' : 'more'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center text-sm text-gray-500">
                {es
                  ? 'Haz clic en "Sincronizar" para cargar los grupos de Google'
                  : 'Click "Sync" to load Google Groups'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Directory Table (all & pending tabs) */}
      {activeTab !== 'groups' && (
        <>
          {/* Filters */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    es
                      ? 'Buscar por nombre, email o número de cuenta...'
                      : 'Search by name, email or student ID...'
                  }
                  className="w-full rounded-md border-gray-300 pl-10 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {activeTab === 'all' && (
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as MemberStatus | 'all')}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="all">{es ? 'Todos los estados' : 'All statuses'}</option>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {es ? cfg.esLabel : cfg.enLabel}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center">
                <button
                  onClick={() => loadUsers()}
                  className="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  {es ? 'Filtrar' : 'Filter'}
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.size > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-blue-700">
                    {selectedUsers.size} {es ? 'seleccionados' : 'selected'}
                  </span>
                  <select
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value)}
                    className="rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">{es ? 'Seleccionar acción' : 'Select action'}</option>
                    <option value="active">{es ? 'Aprobar como Miembro' : 'Approve as Member'}</option>
                    <option value="suspended">{es ? 'Suspender' : 'Suspend'}</option>
                    <option value="deactivated">{es ? 'Desactivar' : 'Deactivate'}</option>
                    <option value="alumni">{es ? 'Marcar Alumni' : 'Mark Alumni'}</option>
                  </select>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleBulkAction}
                    disabled={!bulkAction}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {es ? 'Aplicar' : 'Apply'}
                  </button>
                  <button
                    onClick={() => setSelectedUsers(new Set())}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {es ? 'Cancelar' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      <input
                        type="checkbox"
                        checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers(new Set(filteredUsers.map((u) => u.uid)));
                          } else {
                            setSelectedUsers(new Set());
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      {es ? 'Usuario' : 'User'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      {es ? 'Tipo' : 'Type'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      {es ? 'Estado' : 'Status'}
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 lg:table-cell">
                      {es ? 'No. Cuenta' : 'Student ID'}
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 md:table-cell">
                      {es ? 'Registro' : 'Joined'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                      {es ? 'Acciones' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredUsers.map((user) => {
                    const status = getStatus(user);
                    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.collaborator;
                    const isExpanded = expandedUser === user.uid;

                    return (
                      <React.Fragment key={user.uid}>
                        <tr className={selectedUsers.has(user.uid) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedUsers.has(user.uid)}
                              onChange={(e) => {
                                const next = new Set(selectedUsers);
                                if (e.target.checked) next.add(user.uid);
                                else next.delete(user.uid);
                                setSelectedUsers(next);
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <div className="h-9 w-9 flex-shrink-0">
                                {user.photoURL ? (
                                  <img className="h-9 w-9 rounded-full" src={user.photoURL} alt="" />
                                ) : (
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200">
                                    <Users className="h-4 w-4 text-gray-500" />
                                  </div>
                                )}
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">
                                  {user.firstName} {user.lastName}
                                </p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                user.registrationType === 'member'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {user.registrationType === 'member'
                                ? es ? 'Miembro' : 'Member'
                                : es ? 'Colaborador' : 'Collaborator'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                              {es ? cfg.esLabel : cfg.enLabel}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 text-sm text-gray-500 lg:table-cell">
                            {user.numeroCuenta || '-'}
                          </td>
                          <td className="hidden px-4 py-3 text-sm text-gray-500 md:table-cell">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {/* Quick approve for pending users */}
                              {(status === 'pending' || user.verificationStatus === 'pending') && (
                                <>
                                  <button
                                    onClick={() => handleApprove(user)}
                                    className="rounded p-1 text-green-600 hover:bg-green-50"
                                    title={es ? 'Aprobar' : 'Approve'}
                                  >
                                    <UserCheck className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleReject(user)}
                                    className="rounded p-1 text-red-600 hover:bg-red-50"
                                    title={es ? 'Rechazar' : 'Reject'}
                                  >
                                    <UserX className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              {/* Expand details */}
                              <button
                                onClick={() => setExpandedUser(isExpanded ? null : user.uid)}
                                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                title={es ? 'Ver detalles' : 'View details'}
                              >
                                <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                              {/* More actions */}
                              <div className="relative">
                                <ActionMenu
                                  user={user}
                                  status={status}
                                  language={language}
                                  onStatusChange={handleStatusChange}
                                  onManageGroups={() => setGroupModal({ isOpen: true, user })}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded details row */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="bg-gray-50 px-8 py-4">
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div>
                                  <h4 className="text-xs font-medium uppercase text-gray-500">
                                    {es ? 'Datos Académicos' : 'Academic Data'}
                                  </h4>
                                  <dl className="mt-2 space-y-1 text-sm">
                                    <DetailRow label={es ? 'No. Cuenta' : 'Student ID'} value={user.numeroCuenta} />
                                    <DetailRow label={es ? 'Nivel' : 'Level'} value={user.academicLevel} />
                                    <DetailRow label="Campus" value={user.campus} />
                                    <DetailRow label={es ? 'Generación' : 'Generation'} value={user.generation} />
                                    <DetailRow label={es ? 'Año de Graduación' : 'Grad Year'} value={user.graduationYear?.toString()} />
                                  </dl>
                                </div>
                                <div>
                                  <h4 className="text-xs font-medium uppercase text-gray-500">
                                    {es ? 'Verificación' : 'Verification'}
                                  </h4>
                                  <dl className="mt-2 space-y-1 text-sm">
                                    <DetailRow
                                      label={es ? 'Estado' : 'Status'}
                                      value={user.verificationStatus || 'none'}
                                    />
                                    {user.verificationDocumentUrl && (
                                      <div className="flex items-center text-sm">
                                        <a
                                          href={user.verificationDocumentUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline"
                                        >
                                          {es ? 'Ver documento' : 'View document'}
                                        </a>
                                      </div>
                                    )}
                                  </dl>
                                </div>
                                <div>
                                  <h4 className="text-xs font-medium uppercase text-gray-500">
                                    {es ? 'Ciclo de Vida' : 'Lifecycle'}
                                  </h4>
                                  <dl className="mt-2 space-y-1 text-sm">
                                    <DetailRow
                                      label={es ? 'Cambio por' : 'Changed by'}
                                      value={user.lifecycle?.statusChangedBy}
                                    />
                                    <DetailRow
                                      label={es ? 'Razón' : 'Reason'}
                                      value={user.lifecycle?.statusReason}
                                    />
                                  </dl>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Loading / Empty states */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-sm text-gray-600">
                  {es ? 'Cargando directorio...' : 'Loading directory...'}
                </span>
              </div>
            )}

            {!loading && filteredUsers.length === 0 && (
              <div className="py-12 text-center text-sm text-gray-500">
                {es ? 'No se encontraron usuarios' : 'No users found'}
              </div>
            )}

            {/* Load more */}
            {hasMore && !loading && (
              <div className="border-t border-gray-200 px-6 py-4">
                <button
                  onClick={() => loadUsers(true)}
                  disabled={isLoadingMore}
                  className="inline-flex w-full items-center justify-center rounded-md bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 disabled:opacity-50"
                >
                  {isLoadingMore
                    ? es ? 'Cargando...' : 'Loading...'
                    : es ? 'Cargar más' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Modals */}
      <StatusChangeModal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal({ isOpen: false, user: null, targetStatus: 'active' })}
        onConfirm={confirmStatusChange}
        currentStatus={statusModal.user ? getStatus(statusModal.user) : 'collaborator'}
        targetStatus={statusModal.targetStatus}
        memberName={statusModal.user ? `${statusModal.user.firstName} ${statusModal.user.lastName}` : ''}
        memberEmail={statusModal.user?.email || ''}
        language={language}
      />

      <GroupManagementModal
        isOpen={groupModal.isOpen}
        onClose={() => setGroupModal({ isOpen: false, user: null })}
        memberEmail={groupModal.user?.email || ''}
        memberName={groupModal.user ? `${groupModal.user.firstName} ${groupModal.user.lastName}` : ''}
        language={language}
        onSuccess={() => {
          loadUsers();
          if (groupData) loadGoogleGroups();
        }}
      />
    </div>
  );
};

// --- Sub-components ---

function StatsCard({
  label,
  value,
  color,
  bg,
  onClick,
  clickable,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
  onClick?: () => void;
  clickable?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-4 ${bg} ${clickable ? 'cursor-pointer hover:opacity-80' : ''}`}
      onClick={onClick}
    >
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function ActionMenu({
  user,
  status,
  language,
  onStatusChange,
  onManageGroups,
}: {
  user: DirectoryUser;
  status: MemberStatus;
  language: string;
  onStatusChange: (user: DirectoryUser, status: MemberStatus) => void;
  onManageGroups: () => void;
}) {
  const [open, setOpen] = useState(false);
  const es = language === 'es';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
            {status !== 'active' && (
              <MenuButton
                label={es ? 'Aprobar como Miembro' : 'Approve as Member'}
                onClick={() => { onStatusChange(user, 'active'); setOpen(false); }}
              />
            )}
            {status !== 'suspended' && status !== 'deactivated' && (
              <MenuButton
                label={es ? 'Suspender' : 'Suspend'}
                onClick={() => { onStatusChange(user, 'suspended'); setOpen(false); }}
                danger
              />
            )}
            {(status === 'suspended' || status === 'inactive') && (
              <MenuButton
                label={es ? 'Reactivar' : 'Reactivate'}
                onClick={() => { onStatusChange(user, 'active'); setOpen(false); }}
              />
            )}
            {status === 'active' && (
              <MenuButton
                label={es ? 'Marcar Alumni' : 'Mark Alumni'}
                onClick={() => { onStatusChange(user, 'alumni'); setOpen(false); }}
              />
            )}
            {status !== 'collaborator' && (
              <MenuButton
                label={es ? 'Revertir a Colaborador' : 'Revert to Collaborator'}
                onClick={() => { onStatusChange(user, 'collaborator'); setOpen(false); }}
              />
            )}
            <hr className="my-1" />
            <MenuButton
              label={es ? 'Gestionar Grupos' : 'Manage Groups'}
              onClick={() => { onManageGroups(); setOpen(false); }}
            />
          </div>
        </>
      )}
    </div>
  );
}

function MenuButton({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-2 text-left text-sm ${
        danger ? 'text-red-700 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
}

export default DirectoryManagement;
