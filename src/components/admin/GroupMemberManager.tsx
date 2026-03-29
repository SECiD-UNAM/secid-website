import React, { useState, useEffect, useCallback } from 'react';
import { usePermissions } from '@/lib/rbac/hooks';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  limit,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

const labels: Record<string, Record<'es' | 'en', string>> = {
  title: { en: 'Group Members', es: 'Miembros del Grupo' },
  searchUsers: { en: 'Search users to add...', es: 'Buscar usuarios para agregar...' },
  search: { en: 'Search', es: 'Buscar' },
  add: { en: 'Add', es: 'Agregar' },
  remove: { en: 'Remove', es: 'Quitar' },
  noMembers: { en: 'No members assigned to this group yet.', es: 'No hay miembros asignados a este grupo aun.' },
  noResults: { en: 'No users found.', es: 'No se encontraron usuarios.' },
  loading: { en: 'Loading members...', es: 'Cargando miembros...' },
  memberCount: { en: 'members', es: 'miembros' },
  confirmRemove: {
    en: 'Remove this user from the group?',
    es: 'Quitar este usuario del grupo?',
  },
  errorLoading: {
    en: 'Error loading members.',
    es: 'Error al cargar miembros.',
  },
  noPermission: {
    en: 'You do not have permission to manage group members.',
    es: 'No tienes permiso para gestionar miembros del grupo.',
  },
  errorAddUser: {
    en: 'Failed to add user to group. Please try again.',
    es: 'Error al agregar usuario al grupo. Intenta de nuevo.',
  },
  errorRemoveUser: {
    en: 'Failed to remove user from group. Please try again.',
    es: 'Error al quitar usuario del grupo. Intenta de nuevo.',
  },
};

function t(key: string, lang: 'es' | 'en'): string {
  return labels[key]?.[lang] ?? key;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AssignedUser {
  uid: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
}

interface SearchResult {
  uid: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface GroupMemberManagerProps {
  lang?: 'es' | 'en';
  groupId: string;
}

export default function GroupMemberManager({
  lang = 'es',
  groupId,
}: GroupMemberManagerProps) {
  const { user } = useAuth();
  const { can } = usePermissions();
  const canAssign = can('groups', 'assign');

  const [members, setMembers] = useState<AssignedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [memberUids, setMemberUids] = useState<Set<string>>(new Set());

  // Fetch all users assigned to this group
  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      try {
        // Query rbac_user_groups for docs where groups array contains groupId
        const q = query(
          collection(db, 'rbac_user_groups'),
          where('groups', 'array-contains', groupId)
        );
        const snap = await getDocs(q);
        if (cancelled) return;

        const uids = snap.docs.map((d) => d.id);
        setMemberUids(new Set(uids));

        // Now fetch user profile data for each
        const userPromises = uids.map(async (uid) => {
          try {
            const userSnap = await getDoc(doc(db, 'users', uid));
            if (userSnap.exists()) {
              const data = userSnap.data();
              return {
                uid,
                email: data.email ?? '',
                displayName: data.displayName,
                firstName: data.firstName,
                lastName: data.lastName,
              } as AssignedUser;
            }
            return { uid, email: uid } as AssignedUser;
          } catch {
            return { uid, email: uid } as AssignedUser;
          }
        });

        const loaded = await Promise.all(userPromises);
        if (!cancelled) setMembers(loaded);
      } catch {
        if (!cancelled) setError(t('errorLoading', lang));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMembers();
    return () => {
      cancelled = true;
    };
  }, [groupId, lang]);

  // Search users
  const handleSearch = useCallback(async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // Search by email prefix (Firestore range query)
      const q = query(
        collection(db, 'users'),
        where('email', '>=', trimmed.toLowerCase()),
        where('email', '<=', trimmed.toLowerCase() + '\uf8ff'),
        limit(10)
      );
      const snap = await getDocs(q);

      const results: SearchResult[] = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            email: data.email ?? '',
            displayName: data.displayName,
            firstName: data.firstName,
            lastName: data.lastName,
          };
        })
        // Exclude users already in the group
        .filter((u) => !memberUids.has(u.uid));

      setSearchResults(results);
    } catch (err) {
      console.error('Error searching users:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, memberUids]);

  // Add user to group
  const handleAddUser = useCallback(
    async (userToAdd: SearchResult) => {
      if (!user) return;
      setOperationError(null);
      try {
        const assignmentRef = doc(db, 'rbac_user_groups', userToAdd.uid);
        const snap = await getDoc(assignmentRef);

        if (snap.exists()) {
          await updateDoc(assignmentRef, {
            groups: arrayUnion(groupId),
            assignedBy: user.uid,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(assignmentRef, {
            userId: userToAdd.uid,
            groups: [groupId],
            assignedBy: user.uid,
            updatedAt: serverTimestamp(),
          });
        }

        // Update local state
        setMembers((prev) => [
          ...prev,
          {
            uid: userToAdd.uid,
            email: userToAdd.email,
            displayName: userToAdd.displayName,
            firstName: userToAdd.firstName,
            lastName: userToAdd.lastName,
          },
        ]);
        setMemberUids((prev) => new Set([...prev, userToAdd.uid]));
        setSearchResults((prev) => prev.filter((r) => r.uid !== userToAdd.uid));
      } catch (err) {
        console.error('Error adding user to group:', err);
        setOperationError(t('errorAddUser', lang));
      }
    },
    [groupId, user]
  );

  // Remove user from group
  const handleRemoveUser = useCallback(
    async (uid: string) => {
      if (!user) return;
      if (!confirm(t('confirmRemove', lang))) return;

      setOperationError(null);
      try {
        await updateDoc(doc(db, 'rbac_user_groups', uid), {
          groups: arrayRemove(groupId),
          assignedBy: user.uid,
          updatedAt: serverTimestamp(),
        });

        setMembers((prev) => prev.filter((m) => m.uid !== uid));
        setMemberUids((prev) => {
          const next = new Set(prev);
          next.delete(uid);
          return next;
        });
      } catch (err) {
        console.error('Error removing user from group:', err);
        setOperationError(t('errorRemoveUser', lang));
      }
    },
    [groupId, user, lang]
  );

  function displayName(u: AssignedUser | SearchResult): string {
    if (u.displayName) return u.displayName;
    if (u.firstName || u.lastName) return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    return u.email;
  }

  if (!canAssign) {
    return (
      <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
        {t('noPermission', lang)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
        {t('title', lang)}
      </h2>

      {/* Search to add users */}
      <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder={t('searchUsers', lang)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {t('search', lang)}
          </button>
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="mt-3 divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
            {searchResults.map((result) => (
              <div
                key={result.uid}
                className="flex items-center justify-between px-4 py-2"
              >
                <div className="flex items-center gap-2">
                  <UserCircleIcon className="h-6 w-6 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {displayName(result)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {result.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddUser(result)}
                  className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-green-700"
                >
                  <PlusIcon className="h-3 w-3" />
                  {t('add', lang)}
                </button>
              </div>
            ))}
          </div>
        )}

        {searching && (
          <div className="mt-3 text-center text-sm text-gray-500">
            <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        )}

        {!searching && searchQuery.trim() && searchResults.length === 0 && (
          <p className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('noResults', lang)}
          </p>
        )}
      </div>

      {/* Operation error feedback */}
      {operationError && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
          {operationError}
        </div>
      )}

      {/* Current members list */}
      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center shadow dark:bg-gray-800">
          <UserCircleIcon className="mx-auto mb-2 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">
            {t('noMembers', lang)}
          </p>
        </div>
      ) : (
        <div>
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            {members.length} {t('memberCount', lang)}
          </p>
          <div className="divide-y divide-gray-200 rounded-lg bg-white shadow dark:divide-gray-700 dark:bg-gray-800">
            {members.map((member) => (
              <div
                key={member.uid}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <UserCircleIcon className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {displayName(member)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {member.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveUser(member.uid)}
                  className="inline-flex items-center gap-1 rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <XMarkIcon className="h-3 w-3" />
                  {t('remove', lang)}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
