/**
 * MergeRequestsQueue
 *
 * Admin component for reviewing and actioning profile merge requests.
 * Subscribes to the `merge_requests` Firestore collection in real-time
 * and provides approve/reject controls with field-level selection.
 */

import React, { useState, useEffect } from 'react';
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  orderBy,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileComparison } from '@/components/merge/ProfileComparison';
import { MergeRequestStatusBadge } from '@/components/merge/MergeRequestStatus';
import type { MergeRequest, FieldSelections, OldDocAction, FieldGroupKey } from '@/types/merge';
import { Loader2, Eye, XCircle, CheckCircle, RefreshCw } from 'lucide-react';

const MERGE_REQUESTS_COLLECTION = 'merge_requests';

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

function truncateUid(uid: string): string {
  return uid.length > 12 ? `${uid.slice(0, 6)}…${uid.slice(-4)}` : uid;
}

interface ReviewState {
  mergeRequest: MergeRequest;
  sourceProfile: Record<string, any> | null;
  targetProfile: Record<string, any> | null;
  selections: FieldSelections;
  migrateReferences: boolean;
  oldDocAction: OldDocAction;
  reviewNotes: string;
  loadingProfiles: boolean;
  submitting: boolean;
  error: string | null;
}

interface MergeRequestsQueueProps {
  lang?: 'es' | 'en';
  filterPending?: boolean;
}

export const MergeRequestsQueue: React.FC<MergeRequestsQueueProps> = ({
  lang = 'es',
  filterPending = false,
}) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MergeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewState | null>(null);

  const isEs = lang === 'es';

  // Real-time subscription to merge_requests collection
  useEffect(() => {
    let unsubscribe: Unsubscribe;

    const buildQuery = () => {
      const ref = collection(db, MERGE_REQUESTS_COLLECTION);
      if (filterPending) {
        return query(ref, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
      }
      return query(ref, orderBy('createdAt', 'desc'));
    };

    try {
      unsubscribe = onSnapshot(
        buildQuery(),
        (snapshot) => {
          const docs = snapshot.docs.map((d) => d.data() as MergeRequest);
          setRequests(docs);
          setLoading(false);
          setListError(null);
        },
        (err) => {
          console.error('MergeRequestsQueue snapshot error:', err);
          setListError(isEs ? 'Error al cargar solicitudes.' : 'Failed to load requests.');
          setLoading(false);
        }
      );
    } catch (err) {
      console.error('MergeRequestsQueue query error:', err);
      setListError(isEs ? 'Error al cargar solicitudes.' : 'Failed to load requests.');
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [filterPending, isEs]);

  const openReview = async (mergeRequest: MergeRequest) => {
    setReview({
      mergeRequest,
      sourceProfile: null,
      targetProfile: null,
      selections: mergeRequest.fieldSelections ?? buildDefaultSelections(),
      migrateReferences: mergeRequest.migrateReferences ?? true,
      oldDocAction: mergeRequest.oldDocAction ?? 'soft-delete',
      reviewNotes: mergeRequest.reviewNotes ?? '',
      loadingProfiles: true,
      submitting: false,
      error: null,
    });

    try {
      const [sourceSnap, targetSnap] = await Promise.all([
        getDoc(doc(db, 'users', mergeRequest.sourceUid)),
        getDoc(doc(db, 'users', mergeRequest.targetUid)),
      ]);

      setReview((prev) =>
        prev
          ? {
              ...prev,
              sourceProfile: sourceSnap.exists() ? (sourceSnap.data() as Record<string, any>) : {},
              targetProfile: targetSnap.exists() ? (targetSnap.data() as Record<string, any>) : {},
              loadingProfiles: false,
            }
          : null
      );
    } catch (err) {
      console.error('Error fetching profiles for review:', err);
      setReview((prev) =>
        prev
          ? {
              ...prev,
              loadingProfiles: false,
              error: isEs ? 'Error al cargar perfiles.' : 'Failed to load profiles.',
            }
          : null
      );
    }
  };

  const closeReview = () => setReview(null);

  const handleApprove = async () => {
    if (!review || !user) return;

    setReview((prev) => (prev ? { ...prev, submitting: true, error: null } : null));

    try {
      const mergeRef = doc(db, MERGE_REQUESTS_COLLECTION, review.mergeRequest.id);
      await updateDoc(mergeRef, {
        status: 'approved',
        fieldSelections: review.selections,
        migrateReferences: review.migrateReferences,
        oldDocAction: review.oldDocAction,
        reviewNotes: review.reviewNotes,
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp(),
      });
      setReview(null);
    } catch (err) {
      console.error('Error approving merge request:', err);
      setReview((prev) =>
        prev
          ? {
              ...prev,
              submitting: false,
              error: isEs ? 'Error al aprobar la solicitud.' : 'Failed to approve request.',
            }
          : null
      );
    }
  };

  const handleReject = async () => {
    if (!review || !user) return;

    setReview((prev) => (prev ? { ...prev, submitting: true, error: null } : null));

    try {
      const mergeRef = doc(db, MERGE_REQUESTS_COLLECTION, review.mergeRequest.id);
      await updateDoc(mergeRef, {
        status: 'rejected',
        reviewNotes: review.reviewNotes,
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp(),
      });
      setReview(null);
    } catch (err) {
      console.error('Error rejecting merge request:', err);
      setReview((prev) =>
        prev
          ? {
              ...prev,
              submitting: false,
              error: isEs ? 'Error al rechazar la solicitud.' : 'Failed to reject request.',
            }
          : null
      );
    }
  };

  const handleRetry = async (mergeRequest: MergeRequest) => {
    try {
      const mergeRef = doc(db, MERGE_REQUESTS_COLLECTION, mergeRequest.id);
      await updateDoc(mergeRef, {
        status: 'approved',
        error: null,
      });
    } catch (err) {
      console.error('Error retrying merge request:', err);
    }
  };

  // --- Review UI ---
  if (review) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEs ? 'Revisar Solicitud de Fusión' : 'Review Merge Request'}
          </h2>
          <button
            onClick={closeReview}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {isEs ? '← Volver a la lista' : '← Back to list'}
          </button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">
                {isEs ? 'Número de Cuenta' : 'Numero de Cuenta'}
              </dt>
              <dd className="text-gray-900 dark:text-white">{review.mergeRequest.numeroCuenta}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">
                {isEs ? 'Estado' : 'Status'}
              </dt>
              <dd>
                <MergeRequestStatusBadge status={review.mergeRequest.status} lang={lang} />
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">
                {isEs ? 'UID origen' : 'Source UID'}
              </dt>
              <dd className="font-mono text-gray-900 dark:text-white">
                {review.mergeRequest.sourceUid}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500 dark:text-gray-400">
                {isEs ? 'UID destino' : 'Target UID'}
              </dt>
              <dd className="font-mono text-gray-900 dark:text-white">
                {review.mergeRequest.targetUid}
              </dd>
            </div>
          </dl>
        </div>

        {review.loadingProfiles ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-500">
              {isEs ? 'Cargando perfiles...' : 'Loading profiles...'}
            </span>
          </div>
        ) : (
          <>
            <ProfileComparison
              sourceProfile={review.sourceProfile ?? {}}
              targetProfile={review.targetProfile ?? {}}
              selections={review.selections}
              onSelectionsChange={(selections) =>
                setReview((prev) => (prev ? { ...prev, selections } : null))
              }
              lang={lang}
            />

            {/* Admin controls */}
            <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {isEs ? 'Opciones de Admin' : 'Admin Options'}
              </h3>

              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={review.migrateReferences}
                  onChange={(e) =>
                    setReview((prev) =>
                      prev ? { ...prev, migrateReferences: e.target.checked } : null
                    )
                  }
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
                        name="oldDocAction"
                        value={action}
                        checked={review.oldDocAction === action}
                        onChange={() =>
                          setReview((prev) => (prev ? { ...prev, oldDocAction: action } : null))
                        }
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
                  value={review.reviewNotes}
                  onChange={(e) =>
                    setReview((prev) => (prev ? { ...prev, reviewNotes: e.target.value } : null))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder={isEs ? 'Comentarios opcionales...' : 'Optional comments...'}
                />
              </div>
            </div>

            {review.error && (
              <p className="text-sm text-red-600 dark:text-red-400">{review.error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={review.submitting}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {review.submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {isEs ? 'Aprobar y Ejecutar' : 'Approve & Execute'}
              </button>
              <button
                onClick={handleReject}
                disabled={review.submitting}
                className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                {review.submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {isEs ? 'Rechazar' : 'Reject'}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // --- List UI ---
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-500">
          {isEs ? 'Cargando solicitudes...' : 'Loading requests...'}
        </span>
      </div>
    );
  }

  if (listError) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{listError}</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isEs ? 'No hay solicitudes de fusión.' : 'No merge requests found.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div
          key={req.id}
          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {req.numeroCuenta}
              </span>
              <MergeRequestStatusBadge status={req.status} lang={lang} />
            </div>
            <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>
                {isEs ? 'Origen:' : 'Source:'}{' '}
                <span className="font-mono">{truncateUid(req.sourceUid)}</span>
              </span>
              <span>
                {isEs ? 'Destino:' : 'Target:'}{' '}
                <span className="font-mono">{truncateUid(req.targetUid)}</span>
              </span>
            </div>
            {req.error && (
              <p className="text-xs text-red-600 dark:text-red-400">{req.error}</p>
            )}
          </div>

          <div className="ml-4 flex shrink-0 gap-2">
            {req.status === 'pending' && (
              <button
                onClick={() => openReview(req)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <Eye className="h-3.5 w-3.5" />
                {isEs ? 'Revisar' : 'Review'}
              </button>
            )}
            {req.status === 'failed' && (
              <button
                onClick={() => handleRetry(req)}
                className="flex items-center gap-1.5 rounded-lg border border-orange-300 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {isEs ? 'Reintentar' : 'Retry'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MergeRequestsQueue;
