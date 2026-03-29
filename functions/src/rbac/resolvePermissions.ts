/**
 * RBAC Permission Resolution Cloud Functions (Firestore Triggers).
 *
 * Triggers:
 * - onUserGroupWrite: resolves permissions when a user's groups change
 * - onGroupWrite: re-resolves all affected users when a group definition changes
 *
 * Pure resolution logic lives in ./resolution-logic.ts for testability.
 */
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { admin } from "../init";
import type { PermissionGrant } from "./defaultGroups";
import {
  resolveGroupPermissions,
  encodeClaimsPermissions,
  buildClaimsPayload,
  type GroupDoc,
} from "./resolution-logic";

// Re-export pure functions so they remain accessible from the barrel
export {
  resolveGroupPermissions,
  encodeClaimsPermissions,
  buildClaimsPayload,
} from "./resolution-logic";

// ---------------------------------------------------------------------------
// Firestore Triggers
// ---------------------------------------------------------------------------

/**
 * Triggered when `rbac_user_groups/{userId}` is written.
 *
 * Resolves the user's effective permissions from all assigned groups,
 * encodes them into a compressed string, and sets Firebase Auth custom claims.
 */
export const onUserGroupWrite = onDocumentWritten(
  "rbac_user_groups/{userId}",
  async (event) => {
    const userId = event.params.userId;
    const afterData = event.data?.after?.data();

    // Document deleted — clear RBAC claims
    if (!afterData) {
      try {
        const currentUser = await admin.auth().getUser(userId);
        const newClaims = { ...(currentUser.customClaims ?? {}) };
        delete newClaims.rbac;
        await admin.auth().setCustomUserClaims(userId, newClaims);
        await writeAuditLog(
          "permissions_resolved",
          "system",
          userId,
          { action: "cleared", reason: "user_groups_deleted" },
        );
      } catch (error) {
        console.error(`Failed to clear claims for ${userId}:`, error);
      }
      return;
    }

    const groupIds: string[] = afterData.groups ?? [];

    try {
      // Fetch all assigned group documents
      const groupDocs = await fetchGroupDocs(groupIds);

      // Resolve effective permissions
      const resolved = resolveGroupPermissions(groupDocs);

      // Encode into compressed claims string
      const encoded = encodeClaimsPermissions(resolved);

      // Get existing role from Firestore user doc
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(userId)
        .get();
      const existingRole = userDoc.data()?.role as string | undefined;

      // Build and set custom claims
      const currentUser = await admin.auth().getUser(userId);
      const existingClaims = currentUser.customClaims ?? {};
      const newClaims = {
        ...existingClaims,
        ...buildClaimsPayload(groupIds, encoded, existingRole),
      };

      await admin.auth().setCustomUserClaims(userId, newClaims);

      // Audit log
      await writeAuditLog("permissions_resolved", "system", userId, {
        groups: groupIds,
        grantCount: resolved.length,
        encodedLength: encoded.length,
      });

      console.log(
        `Resolved ${resolved.length} permissions for user ${userId} ` +
          `from ${groupDocs.length} groups`,
      );
    } catch (error) {
      console.error(`Failed to resolve permissions for ${userId}:`, error);
    }
  },
);

/**
 * Triggered when `rbac_groups/{groupId}` is written.
 *
 * Re-resolves permissions for ALL users assigned to this group.
 * Uses Promise.allSettled with a concurrency limit of 10.
 */
export const onGroupWrite = onDocumentWritten(
  "rbac_groups/{groupId}",
  async (event) => {
    const groupId = event.params.groupId;

    try {
      // Find all users assigned to this group
      const userGroupsSnapshot = await admin
        .firestore()
        .collection("rbac_user_groups")
        .where("groups", "array-contains", groupId)
        .get();

      if (userGroupsSnapshot.empty) {
        console.log(`No users assigned to group ${groupId}`);
        return;
      }

      const userIds = userGroupsSnapshot.docs.map((doc) => doc.id);
      console.log(
        `Group ${groupId} updated — re-resolving for ${userIds.length} users`,
      );

      // Process with concurrency limit of 10
      const results = await processWithConcurrency(
        userIds,
        10,
        resolveUserPermissions,
      );

      const succeeded = results.filter(
        (r) => r.status === "fulfilled",
      ).length;
      const failed = results.filter((r) => r.status === "rejected").length;

      await writeAuditLog("group_updated", "system", groupId, {
        affectedUserIds: userIds,
        affectedUsers: userIds.length,
        succeeded,
        failed,
      });

      console.log(
        `Group ${groupId} update: ${succeeded} succeeded, ${failed} failed`,
      );
    } catch (error) {
      console.error(
        `Failed to process group update for ${groupId}:`,
        error,
      );
    }
  },
);

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

async function fetchGroupDocs(groupIds: string[]): Promise<GroupDoc[]> {
  if (groupIds.length === 0) return [];

  const docs = await Promise.all(
    groupIds.map((id) =>
      admin.firestore().collection("rbac_groups").doc(id).get(),
    ),
  );

  return docs
    .filter((doc) => doc.exists)
    .map((doc) => ({
      id: doc.id,
      name: (doc.data()?.name as string) ?? "",
      permissions: (doc.data()?.permissions as PermissionGrant[]) ?? [],
    }));
}

async function resolveUserPermissions(userId: string): Promise<void> {
  const userGroupDoc = await admin
    .firestore()
    .collection("rbac_user_groups")
    .doc(userId)
    .get();

  const groupIds: string[] = userGroupDoc.data()?.groups ?? [];
  const groupDocs = await fetchGroupDocs(groupIds);
  const resolved = resolveGroupPermissions(groupDocs);
  const encoded = encodeClaimsPermissions(resolved);

  const userDoc = await admin
    .firestore()
    .collection("users")
    .doc(userId)
    .get();
  const existingRole = userDoc.data()?.role as string | undefined;

  const currentUser = await admin.auth().getUser(userId);
  const existingClaims = currentUser.customClaims ?? {};

  await admin.auth().setCustomUserClaims(userId, {
    ...existingClaims,
    ...buildClaimsPayload(groupIds, encoded, existingRole),
  });

  await writeAuditLog("permissions_resolved", "system", userId, {
    groups: groupIds,
    grantCount: resolved.length,
    trigger: "group_change",
  });
}

async function processWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<PromiseSettledResult<void>[]> {
  const results: PromiseSettledResult<void>[] = [];

  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const batchResults = await Promise.allSettled(batch.map(fn));
    results.push(...batchResults);
  }

  return results;
}

async function writeAuditLog(
  action: string,
  actorId: string,
  targetId: string,
  changes: Record<string, unknown>,
): Promise<void> {
  try {
    await admin.firestore().collection("rbac_audit_log").add({
      action,
      actorId,
      targetId,
      changes,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
