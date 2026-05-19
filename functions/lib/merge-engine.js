"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onMergeRequestApproved = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const db = admin.firestore();
// Field group -> Firestore paths mapping (must match src/lib/merge/field-groups.ts)
const FIELD_GROUPS = {
    basicInfo: ["firstName", "lastName", "displayName", "photoURL"],
    professional: [
        "profile.company",
        "profile.companyId",
        "profile.position",
        "profile.bio",
        "profile.location",
    ],
    experience: ["experience"],
    skills: ["skills"],
    socialLinks: ["socialMedia", "profile.linkedin"],
    education: [
        "numeroCuenta",
        "academicLevel",
        "campus",
        "generation",
        "graduationYear",
        "profile.degree",
        "profile.specialization",
    ],
    privacySettings: ["privacySettings"],
    notificationSettings: ["notificationSettings"],
    settings: ["settings"],
};
// Collections to migrate with their UID field(s)
const SIMPLE_COLLECTIONS = [
    { collection: "jobs", field: "postedBy" },
    { collection: "applications", field: "applicantId" },
    { collection: "events", field: "createdBy" },
    { collection: "eventRegistrations", field: "userId" },
    { collection: "connectionRequests", field: "from" },
    { collection: "connectionRequests", field: "to" },
    { collection: "messages", field: "senderId" },
    { collection: "messages", field: "recipientId" },
    { collection: "resources", field: "uploadedBy" },
    { collection: "resource_downloads", field: "userId" },
    { collection: "resource_activities", field: "userId" },
    { collection: "blog", field: "authorId" },
    { collection: "companies", field: "createdBy" },
    { collection: "commission_members", field: "userId" },
    { collection: "reports", field: "reportedBy" },
    { collection: "resource_reviews", field: "reviewerId" },
    { collection: "resource_bookmarks", field: "userId" },
    { collection: "resource_collections", field: "createdBy" },
    { collection: "mentorship_matches", field: "mentorId" },
    { collection: "mentorship_matches", field: "menteeId" },
    { collection: "mentorship_sessions", field: "mentorId" },
    { collection: "mentorship_sessions", field: "menteeId" },
    { collection: "mentorship_requests", field: "fromUserId" },
    { collection: "mentorship_requests", field: "toUserId" },
    { collection: "mentorship_feedback", field: "fromUserId" },
    { collection: "mentorship_feedback", field: "toUserId" },
    { collection: "mentorship_goals", field: "mentorId" },
    { collection: "mentorship_goals", field: "menteeId" },
    { collection: "mentorship_resources", field: "sharedBy" },
    { collection: "mentorship", field: "mentorId" },
    { collection: "mentorship", field: "menteeId" },
    { collection: "spotlights", field: "featuredMemberId" },
];
const NETWORKING_FIELDS = [
    "networking.connections",
    "networking.pendingConnections",
    "networking.followers",
    "networking.following",
    "networking.blockedUsers",
];
function getNestedValue(obj, path) {
    return path
        .split(".")
        .reduce((curr, key) => curr != null && typeof curr === "object"
        ? curr[key]
        : undefined, obj);
}
/**
 * Merge engine: triggers when a merge_request status changes to 'approved'.
 *
 * Executes the full merge workflow:
 * 1. Apply field selections from source to target user doc
 * 2. Migrate all references across collections
 * 3. Handle old document (soft-delete/archive/hard-delete)
 * 4. Disable old Auth account
 * 5. Clean up merge artifacts
 *
 * Tracks progress in `migratedCollections` for resumability on retry.
 */
exports.onMergeRequestApproved = (0, firestore_1.onDocumentUpdated)({
    document: "merge_requests/{requestId}",
    timeoutSeconds: 120,
    memory: "256MiB",
}, async (event) => {
    var _a, _b, _c;
    const beforeData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const afterData = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!beforeData || !afterData)
        return;
    // Only trigger on transition TO 'approved'
    if (beforeData.status === "approved" || afterData.status !== "approved")
        return;
    const requestId = event.params.requestId;
    const requestRef = db.collection("merge_requests").doc(requestId);
    const { sourceUid, targetUid, fieldSelections, migrateReferences, oldDocAction, migratedCollections: alreadyMigrated, } = afterData;
    console.log(`Executing merge: ${sourceUid} → ${targetUid} (request ${requestId})`);
    try {
        // Step 1: Set status to executing
        await requestRef.update({ status: "executing" });
        // Step 2: Read both docs
        const [sourceSnap, targetSnap] = await Promise.all([
            db.collection("users").doc(sourceUid).get(),
            db.collection("users").doc(targetUid).get(),
        ]);
        if (!sourceSnap.exists)
            throw new Error(`Source user ${sourceUid} not found`);
        if (!targetSnap.exists)
            throw new Error(`Target user ${targetUid} not found`);
        const sourceDoc = sourceSnap.data();
        // Step 3: Apply field selections
        const updates = {};
        for (const [groupKey, selection] of Object.entries(fieldSelections)) {
            if (selection !== "source")
                continue;
            const fields = FIELD_GROUPS[groupKey];
            if (!fields)
                continue;
            for (const fieldPath of fields) {
                const value = getNestedValue(sourceDoc, fieldPath);
                if (value !== undefined) {
                    updates[fieldPath] = value;
                }
            }
        }
        // Write a merge-in-progress flag to prevent onMemberStatusChange from firing
        updates["_mergeInProgress"] = true;
        updates["updatedAt"] = admin.firestore.FieldValue.serverTimestamp();
        if (Object.keys(updates).length > 1) {
            await db.collection("users").doc(targetUid).update(updates);
        }
        // Step 4: Migrate references
        const migrated = alreadyMigrated || [];
        if (migrateReferences !== false) {
            // 4a: Simple collection field updates
            for (const { collection: collName, field } of SIMPLE_COLLECTIONS) {
                const collKey = `${collName}:${field}`;
                if (migrated.includes(collKey))
                    continue;
                await migrateSimpleCollection(collName, field, sourceUid, targetUid);
                migrated.push(collKey);
                await requestRef.update({ migratedCollections: migrated });
            }
            // 4b: Subcollection updates
            await migrateSubcollections(sourceUid, targetUid, migrated, requestRef);
            // 4c: Document-ID-keyed collections (mentors, mentees)
            await migrateDocIdCollections(sourceUid, targetUid, migrated, requestRef);
            // 4d: Networking arrays on other users
            await migrateNetworkingArrays(sourceUid, targetUid, migrated, requestRef);
            // 4e: Conversations participants array
            await migrateConversations(sourceUid, targetUid, migrated, requestRef);
        }
        // Step 5: Handle old doc
        const action = oldDocAction || "soft-delete";
        if (action === "soft-delete") {
            await db.collection("users").doc(sourceUid).update({
                merged: true,
                mergedInto: targetUid,
                mergedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        else if (action === "archive") {
            await db.collection("archived_users").doc(sourceUid).set(sourceDoc);
            await db.collection("users").doc(sourceUid).delete();
        }
        else if (action === "hard-delete") {
            await db.collection("users").doc(sourceUid).delete();
        }
        // Step 6: Disable old Firebase Auth account
        try {
            await admin.auth().updateUser(sourceUid, { disabled: true });
        }
        catch (authErr) {
            const msg = authErr instanceof Error ? authErr.message : String(authErr);
            console.warn(`Could not disable auth for ${sourceUid}: ${msg}`);
        }
        // Step 7: Clean up target doc
        await db.collection("users").doc(targetUid).update({
            potentialMergeMatch: admin.firestore.FieldValue.delete(),
            _mergeInProgress: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Step 8: Delete old index entry
        const numeroCuenta = afterData.numeroCuenta;
        if (numeroCuenta) {
            const indexRef = db
                .collection("numero_cuenta_index")
                .doc(numeroCuenta);
            const indexSnap = await indexRef.get();
            if (indexSnap.exists && ((_c = indexSnap.data()) === null || _c === void 0 ? void 0 : _c.uid) === sourceUid) {
                await indexRef.delete();
            }
        }
        // Step 9: Mark complete
        await requestRef.update({
            status: "completed",
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            migratedCollections: migrated,
        });
        console.log(`Merge completed: ${sourceUid} → ${targetUid}`);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Merge failed for request ${requestId}:`, err);
        await requestRef.update({
            status: "failed",
            error: msg,
        });
    }
});
// ---- Helper functions ----
async function migrateSimpleCollection(collName, field, sourceUid, targetUid) {
    const q = db.collection(collName).where(field, "==", sourceUid);
    const snap = await q.get();
    if (snap.empty)
        return;
    let batch = db.batch();
    let count = 0;
    for (const docSnap of snap.docs) {
        batch.update(docSnap.ref, { [field]: targetUid });
        count++;
        if (count >= 500) {
            await batch.commit();
            batch = db.batch(); // new batch after commit
            count = 0;
        }
    }
    if (count > 0)
        await batch.commit();
}
async function migrateSubcollections(sourceUid, targetUid, migrated, requestRef) {
    const subcollections = [
        { parent: "forums", sub: "posts", field: "authorId" },
        { parent: "jobs", sub: "applications", field: "applicantId" },
        { parent: "events", sub: "registrations", field: "userId" },
    ];
    for (const { parent, sub, field } of subcollections) {
        const key = `${parent}/*/${sub}:${field}`;
        if (migrated.includes(key))
            continue;
        const q = db.collectionGroup(sub).where(field, "==", sourceUid);
        const snap = await q.get();
        if (!snap.empty) {
            let batch = db.batch();
            let count = 0;
            for (const docSnap of snap.docs) {
                batch.update(docSnap.ref, { [field]: targetUid });
                count++;
                if (count >= 500) {
                    await batch.commit();
                    batch = db.batch();
                    count = 0;
                }
            }
            if (count > 0)
                await batch.commit();
        }
        migrated.push(key);
        await requestRef.update({ migratedCollections: migrated });
    }
    // Forum replies (nested deeper)
    const repliesKey = "forums/*/posts/*/replies:authorId";
    if (!migrated.includes(repliesKey)) {
        const q = db
            .collectionGroup("replies")
            .where("authorId", "==", sourceUid);
        const snap = await q.get();
        if (!snap.empty) {
            let batch = db.batch();
            let count = 0;
            for (const docSnap of snap.docs) {
                batch.update(docSnap.ref, { authorId: targetUid });
                count++;
                if (count >= 500) {
                    await batch.commit();
                    batch = db.batch();
                    count = 0;
                }
            }
            if (count > 0)
                await batch.commit();
        }
        migrated.push(repliesKey);
        await requestRef.update({ migratedCollections: migrated });
    }
}
async function migrateDocIdCollections(sourceUid, targetUid, migrated, requestRef) {
    for (const collName of ["mentors", "mentees"]) {
        const key = `${collName}:docId`;
        if (migrated.includes(key))
            continue;
        const sourceRef = db.collection(collName).doc(sourceUid);
        const snap = await sourceRef.get();
        if (snap.exists) {
            await db.collection(collName).doc(targetUid).set(snap.data());
            await sourceRef.delete();
        }
        migrated.push(key);
        await requestRef.update({ migratedCollections: migrated });
    }
}
async function migrateNetworkingArrays(sourceUid, targetUid, migrated, requestRef) {
    const key = "users:networking-arrays";
    if (migrated.includes(key))
        return;
    for (const fieldPath of NETWORKING_FIELDS) {
        const q = db
            .collection("users")
            .where(fieldPath, "array-contains", sourceUid);
        const snap = await q.get();
        if (snap.empty)
            continue;
        // Two passes: arrayRemove first, then arrayUnion.
        // Cannot combine in a single batch.update() call on the same doc
        // because only the last update per doc takes effect in a batch.
        let batch = db.batch();
        let count = 0;
        for (const docSnap of snap.docs) {
            batch.update(docSnap.ref, {
                [fieldPath]: admin.firestore.FieldValue.arrayRemove(sourceUid),
            });
            count++;
            if (count >= 500) {
                await batch.commit();
                batch = db.batch();
                count = 0;
            }
        }
        if (count > 0)
            await batch.commit();
        batch = db.batch();
        count = 0;
        for (const docSnap of snap.docs) {
            batch.update(docSnap.ref, {
                [fieldPath]: admin.firestore.FieldValue.arrayUnion(targetUid),
            });
            count++;
            if (count >= 500) {
                await batch.commit();
                batch = db.batch();
                count = 0;
            }
        }
        if (count > 0)
            await batch.commit();
    }
    migrated.push(key);
    await requestRef.update({ migratedCollections: migrated });
}
async function migrateConversations(sourceUid, targetUid, migrated, requestRef) {
    const key = "conversations:participants";
    if (migrated.includes(key))
        return;
    const q = db
        .collection("conversations")
        .where("participants", "array-contains", sourceUid);
    const snap = await q.get();
    for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const participants = data.participants || [];
        const updated = participants.map((uid) => uid === sourceUid ? targetUid : uid);
        await docSnap.ref.update({ participants: updated });
    }
    migrated.push(key);
    await requestRef.update({ migratedCollections: migrated });
}
//# sourceMappingURL=merge-engine.js.map