/**
 * AdminMergeTool
 *
 * Top-level admin merge page component.
 *
 * Tab 1 — Request Queue: real-time list of merge requests (delegates to MergeRequestsQueue).
 * Tab 2 — Manual Merge: admin-initiated profile merge using a two-write pattern to ensure
 *          the Cloud Function (onDocumentUpdated) fires correctly.
 *
 * Two-write pattern (REQUIRED):
 *   1. setDoc with status 'pending' — creates the document
 *   2. updateDoc to status 'approved' — triggers the onDocumentUpdated Cloud Function
 *   Creating the document directly with 'approved' would NOT fire the Cloud Function.
 */

import React, { useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { MergeRequestsQueue } from './MergeRequestsQueue';
import { ProfileComparison } from '@/components/merge/ProfileComparison';
import type { FieldSelections, OldDocAction, FieldGroupKey, MergeRequest } from '@/types/merge';
import { Search, Loader2, GitMerge } from 'lucide-react';

const ALL_FIELD_GROUPS: FieldGroupKey[] = [
  'basicInfo',
  'professional',
  'experience',
  'skills',
  'socialLinks',
  'education',
  'privacySettings',
  'notificationSettings',
  'settings',
];

function buildDefaultSelections(): FieldSelections {
  return Object.fromEntries(
    ALL_FIELD_GROUPS.map((key) => [key, 'target'])
  ) as FieldSelections;
}

type TabId = 'queue' | 'manual';

type ProfileRole = 'source' | 'target';

interface SearchResult {
  uid: string;
  email?: string;
  displayName?: string;
  numeroCuenta?: string;
}

interface AdminMergeToolProps {
  lang?: 'es' | 'en';
}

export const AdminMergeTool: React.FC<AdminMergeToolProps> = ({ lang = 'es' }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('queue');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Role assignment
  const [sourceProfile, setSourceProfile] = useState<(SearchResult & Record<string, any>) | null>(null);
  const [targetProfile, setTargetProfile] = useState<(SearchResult & Record<string, any>) | null>(null);

  // Merge controls
  const [selections, setSelections] = useState<FieldSelections>(buildDefaultSelections());
  const [migrateReferences, setMigrateReferences] = useState(true);
  const [oldDocAction, setOldDocAction] = useState<OldDocAction>('soft-delete');
  const [reviewNotes, setReviewNotes] = useState('');

  // Execution state
  const [executing, setExecuting] = useState(false);
  const [executeError, setExecuteError] = useState<string | null>(null);
  const [executeSuccess, setExecuteSuccess] = useState(false);

  const isEs = lang === 'es';

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;

    setSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const usersRef = collection(db, 'users');

      const [emailSnap, cuentaSnap] = await Promise.all([
        getDocs(query(usersRef, where('email', '==', q))),
        getDocs(query(usersRef, where('numeroCuenta', '==', q))),
      ]);

      const seen = new Set<string>();
      const results: SearchResult[] = [];

      for (const snap of [emailSnap, cuentaSnap]) {
        for (const docSnap of snap.docs) {
          if (seen.has(docSnap.id)) continue;
          seen.add(docSnap.id);
          const data = docSnap.data();
          results.push({
            uid: docSnap.id,
            email: data.email,
            displayName: data.displayName,
            numeroCuenta: data.numeroCuenta,
            ...data,
          });
        }
      }

      setSearchResults(results);

      if (results.length === 0) {
        setSearchError(isEs ? 'No se encontraron perfiles.' : 'No profiles found.');
      }
    } catch (err) {
      console.error('AdminMergeTool search error:', err);
      setSearchError(isEs ? 'Error al buscar perfiles.' : 'Failed to search profiles.');
    } finally {
      setSearching(false);
    }
  };

  const assignRole = (result: SearchResult & Record<string, any>, role: ProfileRole) => {
    if (role === 'source') {
      setSourceProfile(result);
      if (targetProfile?.uid === result.uid) setTargetProfile(null);
    } else {
      setTargetProfile(result);
      if (sourceProfile?.uid === result.uid) setSourceProfile(null);
    }
  };

  const resetManual = () => {
    setSourceProfile(null);
    setTargetProfile(null);
    setSelections(buildDefaultSelections());
    setMigrateReferences(true);
    setOldDocAction('soft-delete');
    setReviewNotes('');
    setExecuteError(null);
    setExecuteSuccess(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleExecuteMerge = async () => {
    if (!sourceProfile || !targetProfile || !user) return;

    const numeroCuenta = sourceProfile.numeroCuenta ?? targetProfile.numeroCuenta ?? '';

    setExecuting(true);
    setExecuteError(null);

    try {
      const mergeRef = doc(collection(db, 'merge_requests'));

      // Step 1: Create with 'pending' status
      const baseDoc: Omit<MergeRequest, 'id'> = {
        sourceUid: sourceProfile.uid,
        targetUid: targetProfile.uid,
        matchedBy: 'numeroCuenta',
        numeroCuenta,
        fieldSelections: selections,
        migrateReferences,
        oldDocAction,
        status: 'pending',
        initiatedBy: 'admin',
        createdAt: serverTimestamp() as any,
        createdBy: user.uid,
        reviewNotes,
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp() as any,
      };
      await setDoc(mergeRef, { ...baseDoc, id: mergeRef.id });

      // Step 2: Update to 'approved' to trigger the onDocumentUpdated Cloud Function
      await updateDoc(mergeRef, { status: 'approved' });

      setExecuteSuccess(true);
      resetManual();
    } catch (err) {
      console.error('AdminMergeTool execute error:', err);
      setExecuteError(isEs ? 'Error al ejecutar la fusión.' : 'Failed to execute merge.');
      setExecuting(false);
    }
  };

  const tabs: Array<{ id: TabId; label: string }> = [
    {
      id: 'queue',
      label: isEs ? 'Cola de Solicitudes' : 'Request Queue',
    },
    {
      id: 'manual',
      label: isEs ? 'Fusión Manual' : 'Manual Merge',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.id === 'manual' && <GitMerge className="h-4 w-4" />}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'queue' && (
        <MergeRequestsQueue lang={lang} />
      )}

      {activeTab === 'manual' && (
        <div className="space-y-6">
          {executeSuccess && (
            <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300">
              {isEs
                ? 'Solicitud de fusión creada y aprobada. El motor de fusión la procesará en breve.'
                : 'Merge request created and approved. The merge engine will process it shortly.'}
            </div>
          )}

          {/* Search section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {isEs ? 'Buscar Perfil' : 'Search Profile'}
            </h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={isEs ? 'Email o número de cuenta...' : 'Email or account number...'}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {isEs ? 'Buscar' : 'Search'}
              </button>
            </div>

            {searchError && (
              <p className="text-sm text-red-600 dark:text-red-400">{searchError}</p>
            )}

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((result) => {
                  const isSource = sourceProfile?.uid === result.uid;
                  const isTarget = targetProfile?.uid === result.uid;

                  return (
                    <div
                      key={result.uid}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        isSource
                          ? 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20'
                          : isTarget
                            ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {result.displayName ?? result.email ?? result.uid}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {result.email}
                          {result.numeroCuenta && ` · ${result.numeroCuenta}`}
                        </p>
                        <p className="font-mono text-xs text-gray-400">{result.uid}</p>
                      </div>
                      <div className="ml-3 flex shrink-0 gap-2">
                        <button
                          onClick={() => assignRole(result as SearchResult & Record<string, any>, 'source')}
                          className={`rounded px-2.5 py-1 text-xs font-medium ${
                            isSource
                              ? 'bg-orange-600 text-white'
                              : 'border border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400'
                          }`}
                        >
                          {isEs ? 'Antiguo' : 'Old'}
                        </button>
                        <button
                          onClick={() => assignRole(result as SearchResult & Record<string, any>, 'target')}
                          className={`rounded px-2.5 py-1 text-xs font-medium ${
                            isTarget
                              ? 'bg-green-600 text-white'
                              : 'border border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400'
                          }`}
                        >
                          {isEs ? 'Nuevo' : 'New'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Profile comparison + merge controls (shown when both profiles are selected) */}
          {sourceProfile && targetProfile && (
            <div className="space-y-6">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                {isEs ? (
                  <>
                    <strong>Origen (Antiguo):</strong> {sourceProfile.displayName ?? sourceProfile.email} ({sourceProfile.uid})
                    {' · '}
                    <strong>Destino (Nuevo):</strong> {targetProfile.displayName ?? targetProfile.email} ({targetProfile.uid})
                  </>
                ) : (
                  <>
                    <strong>Source (Old):</strong> {sourceProfile.displayName ?? sourceProfile.email} ({sourceProfile.uid})
                    {' · '}
                    <strong>Target (New):</strong> {targetProfile.displayName ?? targetProfile.email} ({targetProfile.uid})
                  </>
                )}
              </div>

              <ProfileComparison
                sourceProfile={sourceProfile}
                targetProfile={targetProfile}
                selections={selections}
                onSelectionsChange={setSelections}
                lang={lang}
              />

              {/* Admin controls */}
              <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {isEs ? 'Opciones de Fusión' : 'Merge Options'}
                </h3>

                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={migrateReferences}
                    onChange={(e) => setMigrateReferences(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    {isEs ? 'Migrar referencias (jobs, events, etc.)' : 'Migrate references (jobs, events, etc.)'}
                  </span>
                </label>

                <fieldset>
                  <legend className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {isEs ? 'Acción para el documento original' : 'Action for old document'}
                  </legend>
                  <div className="flex gap-4">
                    {(['soft-delete', 'hard-delete', 'archive'] as OldDocAction[]).map((action) => (
                      <label key={action} className="flex cursor-pointer items-center gap-1.5 text-sm">
                        <input
                          type="radio"
                          name="manualOldDocAction"
                          value={action}
                          checked={oldDocAction === action}
                          onChange={() => setOldDocAction(action)}
                          className="text-blue-600"
                        />
                        <span className="text-gray-700 dark:text-gray-300">{action}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    {isEs ? 'Notas de revisión' : 'Review notes'}
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder={isEs ? 'Razón de la fusión manual...' : 'Reason for manual merge...'}
                  />
                </div>
              </div>

              {executeError && (
                <p className="text-sm text-red-600 dark:text-red-400">{executeError}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleExecuteMerge}
                  disabled={executing}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {executing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <GitMerge className="h-4 w-4" />
                  )}
                  {isEs ? 'Ejecutar Fusión' : 'Execute Merge'}
                </button>
                <button
                  onClick={resetManual}
                  disabled={executing}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {isEs ? 'Cancelar' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminMergeTool;
