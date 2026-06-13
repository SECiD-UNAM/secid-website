/**
 * Callable Cloud Function: backfill RBAC user group assignments.
 *
 * One-time migration that reads all existing users, maps their
 * legacy `role` field to RBAC groups, and writes `rbac_user_groups/{uid}`.
 * Writing that document triggers the `onUserGroupWrite` function
 * which resolves permissions and sets custom claims.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { admin } from '../init';
import { mapRoleToGroups } from './role-mapping';

// Re-export for consumers that import from this module
export { mapRoleToGroups } from './role-mapping';

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Batch-read documents for a list of uids from a collection using
 * `db.getAll` in chunks (same chunking pattern as get-salary-stats.ts).
 * Returns a map of uid → snapshot for existing AND missing docs.
 */
async function batchGetByUid(
  collection: string,
  uids: string[]
): Promise<Map<string, FirebaseFirestore.DocumentSnapshot>> {
  const db = admin.firestore();
  const snapshots = new Map<string, FirebaseFirestore.DocumentSnapshot>();
  for (let i = 0; i < uids.length; i += 10) {
    const batch = uids.slice(i, i + 10);
    const refs = batch.map((uid) => db.collection(collection).doc(uid));
    const results = await db.getAll(...refs);
    results.forEach((doc) => snapshots.set(doc.id, doc));
  }
  return snapshots;
}

// ---------------------------------------------------------------------------
// Callable Cloud Function
// ---------------------------------------------------------------------------

export const backfillRbacUsers = onCall(
  { timeoutSeconds: 540 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Verify admin role
    const callerDoc = await admin
      .firestore()
      .collection('users')
      .doc(request.auth.uid)
      .get();

    const callerData = callerDoc.data();
    if (!callerData || callerData.role !== 'admin') {
      throw new HttpsError(
        'permission-denied',
        'Only admins can run RBAC backfill'
      );
    }

    let processed = 0;
    let assigned = 0;
    let skipped = 0;
    let errors = 0;

    // Paginate through all users
    let pageToken: string | undefined;
    do {
      const listResult = await admin.auth().listUsers(1000, pageToken);
      const uids = listResult.users.map((userRecord) => userRecord.uid);

      // Batch-read existing assignments + user docs for the whole page
      // instead of two serial reads per user.
      const [assignmentSnaps, userSnaps] = await Promise.all([
        batchGetByUid('rbac_user_groups', uids),
        batchGetByUid('users', uids),
      ]);

      for (const uid of uids) {
        processed++;

        try {
          // Check if already assigned
          if (assignmentSnaps.get(uid)?.exists) {
            skipped++;
            continue;
          }

          const role = userSnaps.get(uid)?.data()?.role as string | undefined;
          const groups = mapRoleToGroups(role);

          // Write assignment (triggers onUserGroupWrite)
          await admin.firestore().collection('rbac_user_groups').doc(uid).set({
            userId: uid,
            groups,
            assignedBy: 'system:backfill',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          assigned++;
        } catch (error) {
          console.error(`Backfill error for user ${uid}:`, error);
          errors++;
        }
      }

      pageToken = listResult.pageToken;
    } while (pageToken);

    // Audit log
    await admin.firestore().collection('rbac_audit_log').add({
      action: 'users_backfilled',
      actorId: request.auth.uid,
      targetId: 'system',
      changes: { processed, assigned, skipped, errors },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `RBAC backfill: ${processed} processed, ${assigned} assigned, ` +
        `${skipped} skipped, ${errors} errors`
    );

    return { success: errors === 0, processed, assigned, skipped, errors };
  }
);
