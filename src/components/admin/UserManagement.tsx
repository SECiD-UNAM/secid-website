import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { useTranslations } from '@/hooks/useTranslations';
import {
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import {
  Users,
  Trash2,
  Ban,
  UnlockKeyhole,
  Briefcase,
  Download,
  Plus,
  Eye,
  UserCheck,
  UserX,
  Crown,
  Shield,
} from 'lucide-react';
import { useUniversalListing } from '@/hooks/useUniversalListing';
import { FirestoreAdapter } from '@lib/listing/adapters/FirestoreAdapter';
import {
  ListingSearch,
  ListingFilters,
  ListingTable,
  ListingPagination,
} from '@components/listing';
import type { ColumnDefinition, FilterDefinition } from '@lib/listing/types';

interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: 'member' | 'admin' | 'moderator' | 'company';
  isVerified: boolean;
  isActive: boolean;
  membershipTier: 'free' | 'premium' | 'corporate';
  unamEmail?: string;
  studentId?: string;
  graduationYear?: number;
  program?: string;
  currentPosition?: string;
  currentCompany?: string;
  phoneNumber?: string;
  skills?: string[];
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  profileCompleteness?: number;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

function mapUserDoc(id: string, data: Record<string, unknown>): User {
  return {
    uid: id,
    email: data['email'] as string,
    firstName: data['firstName'] as string,
    lastName: data['lastName'] as string,
    displayName: data['displayName'] as string,
    role: data['role'] as User['role'],
    isVerified: data['isVerified'] as boolean,
    isActive: data['isActive'] as boolean,
    membershipTier: data['membershipTier'] as User['membershipTier'],
    unamEmail: data['unamEmail'] as string | undefined,
    studentId: data['studentId'] as string | undefined,
    graduationYear: data['graduationYear'] as number | undefined,
    program: data['program'] as string | undefined,
    currentPosition: data['currentPosition'] as string | undefined,
    currentCompany: data['currentCompany'] as string | undefined,
    phoneNumber: data['phoneNumber'] as string | undefined,
    skills: (data['skills'] as string[]) ?? [],
    linkedinUrl: data['linkedinUrl'] as string | undefined,
    githubUrl: data['githubUrl'] as string | undefined,
    portfolioUrl: data['portfolioUrl'] as string | undefined,
    profileCompleteness: data['profileCompleteness'] as number | undefined,
    photoURL: data['photoURL'] as string | undefined,
    createdAt: (data['createdAt'] as { toDate(): Date } | undefined)?.toDate() ?? new Date(),
    updatedAt: (data['updatedAt'] as { toDate(): Date } | undefined)?.toDate() ?? new Date(),
    lastLoginAt: (data['lastLoginAt'] as { toDate(): Date } | undefined)?.toDate(),
  };
}

function getRoleIcon(role: string) {
  switch (role) {
    case 'admin':
      return <Crown className="h-4 w-4 text-purple-600" />;
    case 'moderator':
      return <Shield className="h-4 w-4 text-blue-600" />;
    case 'company':
      return <Briefcase className="h-4 w-4 text-green-600" />;
    default:
      return <Users className="h-4 w-4 text-gray-600" />;
  }
}

function formatDate(date: Date, lang: string): string {
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export const UserManagement: React.FC = () => {
  const { userProfile, isAdmin, loading: authLoading } = useAuth();
  const { language } = useTranslations();
  const lang = language as 'es' | 'en';

  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [, setShowUserModal] = useState(false);
  const [, setSelectedUser] = useState<User | null>(null);
  const [bulkAction, setBulkAction] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const adapter = useMemo(
    () =>
      new FirestoreAdapter<User>({
        collectionName: 'users',
        mapDoc: mapUserDoc,
        searchFields: ['email', 'firstName', 'lastName', 'displayName'],
        defaultSort: { field: 'createdAt', direction: 'desc' },
        filterMap: {
          role: (v) => (v ? where('role', '==', v) : null),
          membershipTier: (v) => (v ? where('membershipTier', '==', v) : null),
          isVerified: (v) => (v !== '' ? where('isVerified', '==', v) : null),
          isActive: (v) => (v !== '' ? where('isActive', '==', v) : null),
          graduationYear: (v) => (v ? where('graduationYear', '==', Number(v)) : null),
          program: (v) => (v ? where('program', '==', v) : null),
        },
      }),
    []
  );

  const filterDefinitions: FilterDefinition[] = useMemo(
    () => [
      {
        key: 'role',
        label: lang === 'es' ? 'Rol' : 'Role',
        type: 'select',
        placeholder: lang === 'es' ? 'Todos' : 'All',
        options: [
          { value: 'member', label: lang === 'es' ? 'Miembro' : 'Member' },
          { value: 'admin', label: lang === 'es' ? 'Administrador' : 'Admin' },
          { value: 'moderator', label: lang === 'es' ? 'Moderador' : 'Moderator' },
          { value: 'company', label: lang === 'es' ? 'Empresa' : 'Company' },
        ],
      },
      {
        key: 'membershipTier',
        label: lang === 'es' ? 'Membresía' : 'Membership',
        type: 'select',
        placeholder: lang === 'es' ? 'Todas' : 'All',
        options: [
          { value: 'free', label: lang === 'es' ? 'Gratuita' : 'Free' },
          { value: 'premium', label: 'Premium' },
          { value: 'corporate', label: lang === 'es' ? 'Corporativa' : 'Corporate' },
        ],
      },
      {
        key: 'isVerified',
        label: lang === 'es' ? 'Verificado' : 'Verified',
        type: 'select',
        placeholder: lang === 'es' ? 'Todos' : 'All',
        options: [
          { value: 'true', label: lang === 'es' ? 'Verificados' : 'Verified' },
          { value: 'false', label: lang === 'es' ? 'No verificados' : 'Not verified' },
        ],
      },
      {
        key: 'isActive',
        label: lang === 'es' ? 'Estado' : 'Status',
        type: 'select',
        placeholder: lang === 'es' ? 'Todos' : 'All',
        options: [
          { value: 'true', label: lang === 'es' ? 'Activos' : 'Active' },
          { value: 'false', label: lang === 'es' ? 'Inactivos' : 'Inactive' },
        ],
      },
    ],
    [lang]
  );

  const {
    items: users,
    totalCount,
    loading,
    error,
    retry,
    query,
    setQuery,
    activeFilters,
    setFilter,
    clearFilters,
    sort,
    setSort,
    page,
    totalPages,
    hasMore,
    goToPage,
    loadMore,
  } = useUniversalListing<User>({
    adapter,
    defaultViewMode: 'table',
    defaultSort: { field: 'createdAt', direction: 'desc' },
    paginationMode: 'offset',
    filterDefinitions,
    lang,
  });

  const handleUserAction = async (action: string, userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);

      switch (action) {
        case 'verify':
          await updateDoc(userRef, { isVerified: true, updatedAt: Timestamp.now() });
          break;
        case 'unverify':
          await updateDoc(userRef, { isVerified: false, updatedAt: Timestamp.now() });
          break;
        case 'activate':
          await updateDoc(userRef, { isActive: true, updatedAt: Timestamp.now() });
          break;
        case 'deactivate':
          await updateDoc(userRef, { isActive: false, updatedAt: Timestamp.now() });
          break;
        case 'make_admin':
          await updateDoc(userRef, { role: 'admin', updatedAt: Timestamp.now() });
          break;
        case 'make_moderator':
          await updateDoc(userRef, { role: 'moderator', updatedAt: Timestamp.now() });
          break;
        case 'make_member':
          await updateDoc(userRef, { role: 'member', updatedAt: Timestamp.now() });
          break;
        case 'delete':
          if (
            confirm(
              lang === 'es'
                ? '¿Estás seguro de eliminar este usuario?'
                : 'Are you sure you want to delete this user?'
            )
          ) {
            await deleteDoc(userRef);
          }
          break;
        default:
          throw new Error('Unknown action');
      }

      retry();
    } catch (err) {
      console.error('Error performing user action:', err);
      setActionError(
        lang === 'es' ? 'Error al realizar la acción' : 'Error performing action'
      );
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.size === 0) return;

    try {
      const promises = Array.from(selectedUsers).map((userId) =>
        handleUserAction(bulkAction, userId)
      );
      await Promise.all(promises);
      setSelectedUsers(new Set());
      setBulkAction('');
    } catch (err) {
      console.error('Error performing bulk action:', err);
      setActionError(
        lang === 'es' ? 'Error en acción masiva' : 'Error in bulk action'
      );
    }
  };

  const exportUsers = () => {
    const csvData = users.map((user) => ({
      Email: user.email,
      'First Name': user.firstName,
      'Last Name': user.lastName,
      Role: user.role,
      'Membership Tier': user.membershipTier,
      Verified: user.isVerified ? 'Yes' : 'No',
      Active: user.isActive ? 'Yes' : 'No',
      'Graduation Year': user.graduationYear ?? '',
      Program: user.program ?? '',
      'Current Company': user.currentCompany ?? '',
      'Current Position': user.currentPosition ?? '',
      'Created At': user.createdAt.toISOString(),
      'Profile Completeness': user.profileCompleteness ?? 0,
    }));

    if (csvData.length === 0) return;

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      Object.keys(csvData[0] as Record<string, unknown>).join(',') +
      '\n' +
      csvData.map((row) => Object.values(row).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `users-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: ColumnDefinition<User>[] = useMemo(
    () => [
      {
        key: 'select',
        label: '',
        width: '40px',
        accessor: (user) => (
          <input
            type="checkbox"
            checked={selectedUsers.has(user.uid)}
            onChange={(e) => {
              const next = new Set(selectedUsers);
              if (e.target.checked) {
                next.add(user.uid);
              } else {
                next.delete(user.uid);
              }
              setSelectedUsers(next);
            }}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        ),
      },
      {
        key: 'displayName',
        label: lang === 'es' ? 'Usuario' : 'User',
        accessor: (user) => (
          <div className="flex items-center">
            <div className="h-10 w-10 flex-shrink-0">
              {user.photoURL ? (
                <img className="h-10 w-10 rounded-full" src={user.photoURL} alt="" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                  <Users className="h-5 w-5 text-gray-500" />
                </div>
              )}
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-sm text-gray-500">{user.email}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'role',
        label: lang === 'es' ? 'Rol' : 'Role',
        sortable: true,
        accessor: (user) => (
          <div className="flex items-center">
            {getRoleIcon(user.role)}
            <span className="ml-2 text-sm capitalize text-gray-900">{user.role}</span>
          </div>
        ),
      },
      {
        key: 'status',
        label: lang === 'es' ? 'Estado' : 'Status',
        accessor: (user) => (
          <div className="flex space-x-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                user.isVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {user.isVerified
                ? lang === 'es' ? 'Verificado' : 'Verified'
                : lang === 'es' ? 'No verificado' : 'Unverified'}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {user.isActive
                ? lang === 'es' ? 'Activo' : 'Active'
                : lang === 'es' ? 'Inactivo' : 'Inactive'}
            </span>
          </div>
        ),
      },
      {
        key: 'membershipTier',
        label: lang === 'es' ? 'Membresía' : 'Membership',
        sortable: true,
        accessor: (user) => (
          <span className="text-sm capitalize text-gray-900">{user.membershipTier}</span>
        ),
      },
      {
        key: 'createdAt',
        label: lang === 'es' ? 'Registro' : 'Joined',
        sortable: true,
        accessor: (user) => (
          <span className="text-sm text-gray-500">{formatDate(user.createdAt, lang)}</span>
        ),
      },
      {
        key: 'actions',
        label: lang === 'es' ? 'Acciones' : 'Actions',
        align: 'right',
        accessor: (user) => (
          <div className="flex items-center justify-end space-x-2">
            <button
              onClick={() => {
                setSelectedUser(user);
                setShowUserModal(true);
              }}
              className="text-blue-600 hover:text-blue-900"
              title={lang === 'es' ? 'Ver detalles' : 'View details'}
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleUserAction(user.isVerified ? 'unverify' : 'verify', user.uid)}
              className={user.isVerified ? 'text-gray-600 hover:text-gray-900' : 'text-green-600 hover:text-green-900'}
              title={
                user.isVerified
                  ? lang === 'es' ? 'Quitar verificación' : 'Unverify'
                  : lang === 'es' ? 'Verificar' : 'Verify'
              }
            >
              {user.isVerified ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
            </button>
            <button
              onClick={() => handleUserAction(user.isActive ? 'deactivate' : 'activate', user.uid)}
              className={user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
              title={
                user.isActive
                  ? lang === 'es' ? 'Desactivar' : 'Deactivate'
                  : lang === 'es' ? 'Activar' : 'Activate'
              }
            >
              {user.isActive ? <Ban className="h-4 w-4" /> : <UnlockKeyhole className="h-4 w-4" />}
            </button>
            <button
              onClick={() => handleUserAction('delete', user.uid)}
              className="text-red-600 hover:text-red-900"
              title={lang === 'es' ? 'Eliminar' : 'Delete'}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [lang, selectedUsers]
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Users className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            {lang === 'es' ? 'Acceso Denegado' : 'Access Denied'}
          </h1>
          <p className="text-gray-600">
            {lang === 'es'
              ? 'Se requieren privilegios de administrador para gestionar usuarios.'
              : 'Administrator privileges are required to manage users.'}
          </p>
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
            {lang === 'es' ? 'Gestión de Usuarios' : 'User Management'}
          </h1>
          <p className="mt-2 text-gray-600">
            {lang === 'es'
              ? 'Administrar y moderar usuarios de la plataforma'
              : 'Manage and moderate platform users'}
          </p>
        </div>
        <div className="mt-4 flex space-x-3 sm:mt-0">
          <button
            onClick={exportUsers}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Download className="mr-2 h-4 w-4" />
            {lang === 'es' ? 'Exportar' : 'Export'}
          </button>
          <button
            onClick={() => setShowUserModal(true)}
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="mr-2 h-4 w-4" />
            {lang === 'es' ? 'Nuevo Usuario' : 'New User'}
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <ListingSearch
            query={query}
            onQueryChange={setQuery}
            lang={lang}
            totalCount={totalCount}
          />
        </div>
        <ListingFilters
          definitions={filterDefinitions}
          activeFilters={activeFilters}
          onFilterChange={setFilter}
          onClearAll={clearFilters}
          filterMode="visible"
          lang={lang}
        />
      </div>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-blue-700">
                {selectedUsers.size}{' '}
                {lang === 'es' ? 'usuarios seleccionados' : 'users selected'}
              </span>
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">
                  {lang === 'es' ? 'Seleccionar acción' : 'Select action'}
                </option>
                <option value="verify">{lang === 'es' ? 'Verificar' : 'Verify'}</option>
                <option value="unverify">{lang === 'es' ? 'No verificar' : 'Unverify'}</option>
                <option value="activate">{lang === 'es' ? 'Activar' : 'Activate'}</option>
                <option value="deactivate">{lang === 'es' ? 'Desactivar' : 'Deactivate'}</option>
                <option value="delete">{lang === 'es' ? 'Eliminar' : 'Delete'}</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {lang === 'es' ? 'Aplicar' : 'Apply'}
              </button>
              <button
                onClick={() => setSelectedUsers(new Set())}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {lang === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select-all header */}
      {users.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <input
            type="checkbox"
            checked={users.length > 0 && selectedUsers.size === users.length}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedUsers(new Set(users.map((u) => u.uid)));
              } else {
                setSelectedUsers(new Set());
              }
            }}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-500">
            {lang === 'es' ? 'Seleccionar todo' : 'Select all'}
          </span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-600">
            {lang === 'es' ? 'Cargando usuarios...' : 'Loading users...'}
          </span>
        </div>
      )}

      {/* Error (action-level) */}
      {(error || actionError) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error ?? actionError}</p>
          {error && (
            <button
              onClick={retry}
              className="mt-2 text-sm font-medium text-red-700 underline"
            >
              {lang === 'es' ? 'Reintentar' : 'Retry'}
            </button>
          )}
        </div>
      )}

      {/* Users Table */}
      {!loading && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <ListingTable<User>
            items={users}
            columns={columns}
            keyExtractor={(u) => u.uid}
            sort={sort}
            onSortChange={setSort}
          />
          <div className="border-t border-gray-200 px-4 py-4">
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
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          {lang === 'es' ? 'Resumen' : 'Summary'}
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{totalCount.toLocaleString()}</p>
            <p className="text-sm text-gray-500">
              {lang === 'es' ? 'Total de usuarios' : 'Total users'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {users.filter((u) => u.isVerified).length}
            </p>
            <p className="text-sm text-gray-500">
              {lang === 'es' ? 'Verificados' : 'Verified'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {users.filter((u) => u.isActive).length}
            </p>
            <p className="text-sm text-gray-500">
              {lang === 'es' ? 'Activos' : 'Active'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {users.filter((u) => u.membershipTier === 'premium').length}
            </p>
            <p className="text-sm text-gray-500">Premium</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
