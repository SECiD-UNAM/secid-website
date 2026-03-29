/**
 * Callable Cloud Function: seed default RBAC system groups.
 *
 * Reads DEFAULT_GROUPS and creates any missing group documents in
 * the `rbac_groups` collection. Skips groups that already exist.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { admin } from "../init";
import { DEFAULT_GROUPS } from "./defaultGroups";

export const seedRbacGroups = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Verify admin role
  const userDoc = await admin
    .firestore()
    .collection("users")
    .doc(request.auth.uid)
    .get();

  const userData = userDoc.data();
  if (!userData || userData.role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Only admins can seed RBAC groups",
    );
  }

  let created = 0;
  let skipped = 0;

  for (const group of DEFAULT_GROUPS) {
    const docRef = admin.firestore().collection("rbac_groups").doc(group.id);
    const existing = await docRef.get();

    if (existing.exists) {
      skipped++;
      continue;
    }

    await docRef.set({
      name: group.name,
      description: group.description,
      permissions: group.permissions,
      isSystem: true,
      createdBy: "system",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    created++;
  }

  // Audit log
  await admin.firestore().collection("rbac_audit_log").add({
    action: "groups_seeded",
    actorId: request.auth.uid,
    targetId: "system",
    changes: { created, skipped, total: DEFAULT_GROUPS.length },
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`RBAC seed: ${created} created, ${skipped} skipped`);

  return { success: true, created, skipped };
});
