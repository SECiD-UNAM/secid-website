import React, { useState, useEffect } from 'react';
import { useAuth} from '@/contexts/AuthContext';
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
  deleteDoc,
  getDocs,
  DocumentSnapshot,
  Timestamp
} from 'firebase/firestore';
import {
  Users,
  Search,
  Filter,
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
  Shield
} from 'lucide-react';

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

interface UserFilters {
  role: string;
  membershipTier: string;
  isVerified: boolean | null;
  isActive: boolean | null;
  graduationYear: string;
  program: string;
  searchTerm: string;
}

export const UserManagement: React.FC = () => {
  const { userProfile, isAdmin } = useAuth();
  const { language } = useTranslations();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [, setShowUserModal] = useState(false);
  const [, setSelectedUser] = useState<User | null>(null);
  const [bulkAction, setBulkAction] = useState('');
  
  const [filters, setFilters] = useState<UserFilters>({
    role: 'all',
    membershipTier: 'all',
    isVerified: null,
    isActive: null,
    graduationYear: 'all',
    program: 'all',
    searchTerm: ''
  });

  const USERS_PER_PAGE = 20;

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

      // Apply filters
      if (filters['role'] !== 'all') {
        userQuery = query(userQuery, where('role', '==', filters['role']));
      }
      if (filters.membershipTier !== 'all') {
        userQuery = query(userQuery, where('membershipTier', '==', filters.membershipTier));
      }
      if (filters.isVerified !== null) {
        userQuery = query(userQuery, where('isVerified', '==', filters.isVerified));
      }
      if (filters.isActive !== null) {
        userQuery = query(userQuery, where('isActive', '==', filters.isActive));
      }
      if (filters.graduationYear !== 'all') {
        userQuery = query(userQuery, where('graduationYear', '==', parseInt(filters.graduationYear)));
      }
      if (filters.program !== 'all') {
        userQuery = query(userQuery, where('program', '==', filters.program));
      }

      if (isLoadMore && lastDoc) {
        userQuery = query(userQuery, startAfter(lastDoc));
      }

      const snapshot = await getDocs(userQuery);
      const loadedUsers: User[] = [];

      snapshot.forEach((doc) => {
        const data = doc['data']();
        loadedUsers.push({
          uid: doc['id'],
          email: data['email'],
          firstName: data['firstName'],
          lastName: data['lastName'],
          displayName: data['displayName'],
          role: data['role'],
          isVerified: data['isVerified'],
          isActive: data['isActive'],
          membershipTier: data['membershipTier'],
          unamEmail: data['unamEmail'],
          studentId: data['studentId'],
          graduationYear: data['graduationYear'],
          program: data['program'],
          currentPosition: data['currentPosition'],
          currentCompany: data['currentCompany'],
          phoneNumber: data['phoneNumber'],
          skills: data['skills'] || [],
          linkedinUrl: data['linkedinUrl'],
          githubUrl: data['githubUrl'],
          portfolioUrl: data['portfolioUrl'],
          profileCompleteness: data['profileCompleteness'],
          photoURL: data['photoURL'],
          createdAt: data['createdAt']?.toDate() || new Date(),
          updatedAt: data['updatedAt']?.toDate() || new Date(),
          lastLoginAt: data?.['lastLoginAt']?.toDate()
        });
      });

      if(isLoadMore) {
        setUsers(prev => [...prev, ...loadedUsers]);
      } else {
        setUsers(loadedUsers);
      }

      setLastDoc(snapshot['docs'][snapshot['docs'].length - 1] || null);
      setHasMore(snapshot['docs'].length === USERS_PER_PAGE);

      // Get total count (simplified for demo)
      if (!isLoadMore) {
        setTotalUsers(loadedUsers.length + (hasMore ? 100 : 0)); // Approximate
      }

    } catch (err) {
      console.error('Error loading users:', err);
      setError(language === 'es' ? 'Error al cargar usuarios' : 'Error loading users');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setError('Unauthorized access. Admin privileges required.');
      setLoading(false);
      return;
    }

    loadUsers();
  }, [isAdmin, filters]);

  const handleUserAction = async (action: string, userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      
      switch(action) {
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
          if (confirm(language === 'es' ? '¿Estás seguro de eliminar este usuario?' : 'Are you sure you want to delete this user?')) {
            await deleteDoc(userRef);
          }
          break;
        default:
          throw new Error('Unknown action');
      }

      // TODO: Add to activity log (implement collection)
      // await addDoc(collection(db, 'admin_activity_log'), {
      //   adminId: userProfile?.uid,
      //   adminEmail: userProfile?.email,
      //   action,
      //   targetUserId: userId,
      //   timestamp: Timestamp.now(),
      //   description: `${action} user ${userId}`
      // });

      // Reload users
      loadUsers();
    } catch (err) {
      console.error('Error performing user action:', err);
      setError(language === 'es' ? 'Error al realizar la acción' : 'Error performing action');
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedUsers.size === 0) return;

    try {
      const promises = Array.from(selectedUsers).map(userId => 
        handleUserAction(bulkAction, userId)
      );
      
      await Promise.all(promises);
      setSelectedUsers(new Set());
      setBulkAction('');
    } catch (err) {
      console.error('Error performing bulk action:', err);
      setError(language === 'es' ? 'Error en acción masiva' : 'Error in bulk action');
    }
  };

  const exportUsers = () => {
    const csvData = users.map(user => ({
      Email: user['email'],
      'First Name': user.firstName,
      'Last Name': user.lastName,
      Role: user['role'],
      'Membership Tier': user.membershipTier,
      Verified: user.isVerified ? 'Yes' : 'No',
      Active: user.isActive ? 'Yes' : 'No',
      'Graduation Year': user.graduationYear || '',
      Program: user.program || '',
      'Current Company': user.currentCompany || '',
      'Current Position': user.currentPosition || '',
      'Created At': user['createdAt'].toISOString(),
      'Profile Completeness': user.profileCompleteness || 0
    }));

    if (csvData.length === 0) return;

    const csvContent = "data:text/csv;charset=utf-8," +
      Object.keys(csvData[0] as Record<string, unknown>).join(",") + "\n" +
      csvData.map(row => Object.values(row).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document['createElement']("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `users-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document['body'].removeChild(link);
  };

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'admin': return <Crown className="w-4 h-4 text-purple-600" />;
      case 'moderator': return <Shield className="w-4 h-4 text-blue-600" />;
      case 'company': return <Briefcase className="w-4 h-4 text-green-600" />;
      default: return <Users className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Users className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {language === 'es' ? 'Acceso Denegado' : 'Access Denied'}
          </h1>
          <p className="text-gray-600">
            {language === 'es' 
              ? 'Se requieren privilegios de administrador para gestionar usuarios.'
              : 'Administrator privileges are required to manage users.'
            }
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
            {language === 'es' ? 'Gestión de Usuarios' : 'User Management'}
          </h1>
          <p className="mt-2 text-gray-600">
            {language === 'es' ? 'Administrar y moderar usuarios de la plataforma' : 'Manage and moderate platform users'}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={exportUsers}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Exportar' : 'Export'}
          </button>
          <button
            onClick={() => setShowUserModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Nuevo Usuario' : 'New User'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {language === 'es' ? 'Buscar' : 'Search'}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                placeholder={language === 'es' ? 'Buscar usuarios...' : 'Search users...'}
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {language === 'es' ? 'Rol' : 'Role'}
            </label>
            <select
              value={filters['role']}
              onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">{language === 'es' ? 'Todos' : 'All'}</option>
              <option value="member">{language === 'es' ? 'Miembro' : 'Member'}</option>
              <option value="admin">{language === 'es' ? 'Administrador' : 'Admin'}</option>
              <option value="moderator">{language === 'es' ? 'Moderador' : 'Moderator'}</option>
              <option value="company">{language === 'es' ? 'Empresa' : 'Company'}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {language === 'es' ? 'Membresía' : 'Membership'}
            </label>
            <select
              value={filters.membershipTier}
              onChange={(e) => setFilters(prev => ({ ...prev, membershipTier: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">{language === 'es' ? 'Todas' : 'All'}</option>
              <option value="free">{language === 'es' ? 'Gratuita' : 'Free'}</option>
              <option value="premium">{language === 'es' ? 'Premium' : 'Premium'}</option>
              <option value="corporate">{language === 'es' ? 'Corporativa' : 'Corporate'}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {language === 'es' ? 'Verificado' : 'Verified'}
            </label>
            <select
              value={filters.isVerified === null ? 'all' : filters.isVerified.toString()}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                isVerified: e.target.value === 'all' ? null : e.target.value === 'true' 
              }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">{language === 'es' ? 'Todos' : 'All'}</option>
              <option value="true">{language === 'es' ? 'Verificados' : 'Verified'}</option>
              <option value="false">{language === 'es' ? 'No verificados' : 'Not verified'}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {language === 'es' ? 'Estado' : 'Status'}
            </label>
            <select
              value={filters.isActive === null ? 'all' : filters.isActive.toString()}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                isActive: e.target.value === 'all' ? null : e.target.value === 'true' 
              }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">{language === 'es' ? 'Todos' : 'All'}</option>
              <option value="true">{language === 'es' ? 'Activos' : 'Active'}</option>
              <option value="false">{language === 'es' ? 'Inactivos' : 'Inactive'}</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => loadUsers()}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Filter className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Filtrar' : 'Filter'}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-blue-700">
                {selectedUsers.size} {language === 'es' ? 'usuarios seleccionados' : 'users selected'}
              </span>
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">{language === 'es' ? 'Seleccionar acción' : 'Select action'}</option>
                <option value="verify">{language === 'es' ? 'Verificar' : 'Verify'}</option>
                <option value="unverify">{language === 'es' ? 'No verificar' : 'Unverify'}</option>
                <option value="activate">{language === 'es' ? 'Activar' : 'Activate'}</option>
                <option value="deactivate">{language === 'es' ? 'Desactivar' : 'Deactivate'}</option>
                <option value="delete">{language === 'es' ? 'Eliminar' : 'Delete'}</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {language === 'es' ? 'Aplicar' : 'Apply'}
              </button>
              <button
                onClick={() => setSelectedUsers(new Set())}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && selectedUsers.size === users.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(new Set(users.map(u => u.uid)));
                      } else {
                        setSelectedUsers(new Set());
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {language === 'es' ? 'Usuario' : 'User'}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {language === 'es' ? 'Rol' : 'Role'}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {language === 'es' ? 'Estado' : 'Status'}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {language === 'es' ? 'Membresía' : 'Membership'}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {language === 'es' ? 'Registro' : 'Joined'}
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">{language === 'es' ? 'Acciones' : 'Actions'}</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.uid} className={selectedUsers.has(user.uid) ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.uid)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedUsers);
                        if (e.target.checked) {
                          newSelected.add(user.uid);
                        } else {
                          newSelected.delete(user.uid);
                        }
                        setSelectedUsers(newSelected);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {user.photoURL ? (
                          <img className="h-10 w-10 rounded-full" src={user.photoURL} alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{user['email']}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getRoleIcon(user['role'])}
                      <span className="ml-2 text-sm text-gray-900 capitalize">{user['role']}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.isVerified 
                          ? (language === 'es' ? 'Verificado' : 'Verified')
                          : (language === 'es' ? 'No verificado' : 'Unverified')
                        }
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive 
                          ? (language === 'es' ? 'Activo' : 'Active')
                          : (language === 'es' ? 'Inactivo' : 'Inactive')
                        }
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                    {user.membershipTier}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user['createdAt'])}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title={language === 'es' ? 'Ver detalles' : 'View details'}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUserAction(user.isVerified ? 'unverify' : 'verify', user.uid)}
                        className={user.isVerified ? 'text-gray-600 hover:text-gray-900' : 'text-green-600 hover:text-green-900'}
                        title={user.isVerified 
                          ? (language === 'es' ? 'Quitar verificación' : 'Unverify')
                          : (language === 'es' ? 'Verificar' : 'Verify')
                        }
                      >
                        {user.isVerified ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleUserAction(user.isActive ? 'deactivate' : 'activate', user.uid)}
                        className={user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                        title={user.isActive 
                          ? (language === 'es' ? 'Desactivar' : 'Deactivate')
                          : (language === 'es' ? 'Activar' : 'Activate')
                        }
                      >
                        {user.isActive ? <Ban className="w-4 h-4" /> : <UnlockKeyhole className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleUserAction('delete', user.uid)}
                        className="text-red-600 hover:text-red-900"
                        title={language === 'es' ? 'Eliminar' : 'Delete'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="px-6 py-4 border-t border-gray-200">
            <button
              onClick={() => loadUsers(true)}
              disabled={isLoadingMore}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoadingMore 
                ? (language === 'es' ? 'Cargando...' : 'Loading...')
                : (language === 'es' ? 'Cargar más' : 'Load more')
              }
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {language === 'es' ? 'Resumen' : 'Summary'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{totalUsers.toLocaleString()}</p>
            <p className="text-sm text-gray-500">{language === 'es' ? 'Total de usuarios' : 'Total users'}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {users.filter(u => u.isVerified).length}
            </p>
            <p className="text-sm text-gray-500">{language === 'es' ? 'Verificados' : 'Verified'}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {users.filter(u => u.isActive).length}
            </p>
            <p className="text-sm text-gray-500">{language === 'es' ? 'Activos' : 'Active'}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {users.filter(u => u.membershipTier === 'premium').length}
            </p>
            <p className="text-sm text-gray-500">{language === 'es' ? 'Premium' : 'Premium'}</p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">
            {language === 'es' ? 'Cargando usuarios...' : 'Loading users...'}
          </span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;