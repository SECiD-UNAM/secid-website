/**
 * Callable Cloud Function: backfill RBAC user group assignments.
 *
 * One-time migration that reads all existing users, maps their
 * legacy `role` field to RBAC groups, and writes `rbac_user_groups/{uid}`.
 * Writing that document triggers the `onUserGroupWrite` function
 * which resolves permissions and sets custom claims.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { admin } from "../init";
import { mapRoleToGroups } from "./role-mapping";

// Re-export for consumers that import from this module
export { mapRoleToGroups } from "./role-mapping";

// ---------------------------------------------------------------------------
// Callable Cloud Function
// ---------------------------------------------------------------------------

export const backfillRbacUsers = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Verify admin role
  const callerDoc = await admin
    .firestore()
    .collection("users")
    .doc(request.auth.uid)
    .get();

  const callerData = callerDoc.data();
  if (!callerData || callerData.role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Only admins can run RBAC backfill",
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

    for (const userRecord of listResult.users) {
      processed++;

      try {
        // Check if already assigned
        const existingAssignment = await admin
          .firestore()
          .collection("rbac_user_groups")
          .doc(userRecord.uid)
          .get();

        if (existingAssignment.exists) {
          skipped++;
          continue;
        }

        // Read user doc for role
        const userDoc = await admin
          .firestore()
          .collection("users")
          .doc(userRecord.uid)
          .get();

        const role = userDoc.data()?.role as string | undefined;
        const groups = mapRoleToGroups(role);

        // Write assignment (triggers onUserGroupWrite)
        await admin
          .firestore()
          .collection("rbac_user_groups")
          .doc(userRecord.uid)
          .set({
            userId: userRecord.uid,
            groups,
            assignedBy: "system:backfill",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        assigned++;
      } catch (error) {
        console.error(
          `Backfill error for user ${userRecord.uid}:`,
          error,
        );
        errors++;
      }
    }

    pageToken = listResult.pageToken;
  } while (pageToken);

  // Audit log
  await admin.firestore().collection("rbac_audit_log").add({
    action: "users_backfilled",
    actorId: request.auth.uid,
    targetId: "system",
    changes: { processed, assigned, skipped, errors },
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(
    `RBAC backfill: ${processed} processed, ${assigned} assigned, ` +
      `${skipped} skipped, ${errors} errors`,
  );

  return { success: errors === 0, processed, assigned, skipped, errors };
});
