"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMemberGroupList = exports.updateMemberGroups = exports.syncGroupMembership = exports.onMemberStatusChange = exports.onUserDocCreated = exports.onNewJobPosted = exports.onUserDelete = exports.matchJobsForUser = exports.verifyUnamEmail = exports.onUserCreate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const identity_1 = require("firebase-functions/v2/identity");
const functionsV1 = require("firebase-functions/v1");
const admin = require("firebase-admin");
const email_service_1 = require("./email-service");
const google_admin_1 = require("./google-admin");
const group_config_1 = require("./group-config");
// Initialize Firebase Admin
admin.initializeApp();
// User creation trigger - set up initial user profile
exports.onUserCreate = (0, identity_1.beforeUserCreated)(async (event) => {
    const user = event.data;
    if (!user) {
        console.log("No user data in event");
        return;
    }
    const { uid, email, displayName, photoURL } = user;
    // Create user profile document — default to collaborator role
    // Users start as collaborators; membership requires admin approval
    await admin.firestore().collection("users").doc(uid).set({
        email,
        displayName: displayName || "",
        photoURL: photoURL || "",
        firstName: "",
        lastName: "",
        role: "collaborator",
        registrationType: "collaborator",
        verificationStatus: "none",
        isActive: true,
        isVerified: false,
        membershipTier: "free",
        skills: [],
        lifecycle: {
            status: "collaborator",
            statusChangedAt: admin.firestore.FieldValue.serverTimestamp(),
            statusHistory: [],
            lastActiveDate: admin.firestore.FieldValue.serverTimestamp(),
        },
        privacySettings: {
            profileVisible: true,
            contactVisible: false,
            jobSearching: false,
            mentorshipAvailable: false,
        },
        notificationSettings: {
            email: true,
            push: false,
            jobMatches: true,
            events: true,
            forums: true,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        profileCompleteness: 20,
    });
    console.log(`User profile created for ${uid}`);
});
// UNAM email verification
exports.verifyUnamEmail = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    const { unamEmail, studentId, graduationYear } = request.data;
    const userId = request.auth.uid;
    // Validate UNAM email format
    if (!unamEmail.includes("@alumno.unam.mx") &&
        !unamEmail.includes("@unam.mx")) {
        throw new https_1.HttpsError("invalid-argument", "Email must be from UNAM domain");
    }
    // In production, this would call UNAM's verification API
    // For now, we'll simulate verification
    const isValid = true; // Mock verification
    if (isValid) {
        await admin.firestore().collection("users").doc(userId).update({
            isVerified: true,
            unamEmail,
            studentId: studentId || "",
            graduationYear: graduationYear || 0,
            verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, message: "UNAM verification completed" };
    }
    else {
        throw new https_1.HttpsError("invalid-argument", "UNAM verification failed");
    }
});
// Job matching algorithm
exports.matchJobsForUser = (0, firestore_1.onDocumentUpdated)("users/{userId}", async (event) => {
    var _a, _b;
    const userId = event.params.userId;
    const afterData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.after.data();
    if (!afterData) {
        return null;
    }
    // Only run if user is job searching
    if (!((_b = afterData.privacySettings) === null || _b === void 0 ? void 0 : _b.jobSearching)) {
        return null;
    }
    const userSkills = afterData.skills || [];
    if (userSkills.length === 0) {
        return null;
    }
    // Find matching jobs
    const jobsSnapshot = await admin.firestore()
        .collection("jobs")
        .where("status", "==", "active")
        .get();
    const matches = [];
    jobsSnapshot.forEach((doc) => {
        const job = doc.data();
        const jobRequirements = job.requirements || [];
        // Simple matching algorithm
        const matchingSkills = userSkills.filter((skill) => jobRequirements.some((req) => req.toLowerCase().includes(skill.toLowerCase())));
        const matchScore = (matchingSkills.length / Math.max(jobRequirements.length, 1)) * 100;
        if (matchScore >= 30) {
            matches.push({
                jobId: doc.id,
                matchScore: Math.round(matchScore),
                title: job.title,
                company: job.company,
            });
        }
    });
    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);
    // Store top matches
    if (matches.length > 0) {
        await admin.firestore()
            .collection("users")
            .doc(userId)
            .collection("jobMatches")
            .doc("latest")
            .set({
            matches: matches.slice(0, 10),
            generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    return { matchesFound: matches.length };
});
// Clean up user data on deletion (using v1 API as v2 doesn't have onDelete trigger)
exports.onUserDelete = functionsV1.auth.user().onDelete(async (user) => {
    const { uid } = user;
    // Delete user profile
    await admin.firestore().collection("users").doc(uid).delete();
    // Clean up user's job applications
    const applicationsSnapshot = await admin.firestore()
        .collectionGroup("applications")
        .where("applicantId", "==", uid)
        .get();
    const batch = admin.firestore().batch();
    applicationsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`User data cleaned up for ${uid}`);
    return null;
});
// Trigger when a new job is posted
exports.onNewJobPosted = (0, firestore_1.onDocumentCreated)("jobs/{jobId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const jobData = snapshot.data();
    const jobId = event.params.jobId;
    // Only notify for published/active jobs
    if (jobData.status !== "active" && jobData.status !== "published")
        return;
    try {
        // Find users with job match notifications enabled
        const usersSnapshot = await admin.firestore()
            .collection("users")
            .where("notificationSettings.jobMatches", "==", true)
            .where("privacySettings.jobSearching", "==", true)
            .limit(100)
            .get();
        const siteUrl = process.env.SITE_URL || "https://secid.mx";
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            if (!userData.email)
                continue;
            // Simple skill matching score
            const userSkills = (userData.skills || []).map((s) => s.toLowerCase());
            const jobTags = (jobData.tags || []).map((t) => t.toLowerCase());
            const matchCount = userSkills.filter((s) => jobTags.includes(s)).length;
            const matchScore = jobTags.length > 0
                ? Math.round((matchCount / jobTags.length) * 100)
                : 50;
            // Only send if match score is above threshold
            if (matchScore < 30)
                continue;
            const html = (0, email_service_1.generateJobMatchEmail)({
                recipientName: userData.displayName || userData.firstName || "Miembro",
                jobTitle: jobData.title,
                company: jobData.company,
                matchScore,
                jobUrl: `${siteUrl}/es/jobs`,
            });
            await (0, email_service_1.sendEmail)({
                to: userData.email,
                subject: `Nueva oportunidad: ${jobData.title} en ${jobData.company}`,
                html,
            });
        }
        console.log(`Job notifications sent for job ${jobId}`);
    }
    catch (error) {
        console.error("Error sending job notifications:", error);
    }
});
// =============================================================================
// Google Admin Groups Sync
// =============================================================================
/**
 * When a new user document is created, add them to the collaborators group.
 */
exports.onUserDocCreated = (0, firestore_1.onDocumentCreated)("users/{userId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const userData = snapshot.data();
    const email = userData.email;
    if (!email) {
        console.log("No email for user, skipping group add");
        return;
    }
    // Add to collaborators group by default
    const added = await (0, google_admin_1.addMemberToGroup)((0, group_config_1.getDefaultGroup)(), email);
    if (added) {
        console.log(`Added ${email} to collaborators group`);
    }
});
/**
 * When a user's lifecycle status changes, sync their Google Group membership.
 *
 * Transitions:
 * - collaborator → pending: no group change (still in colaboradores@)
 * - pending → active (approved): remove from colaboradores@, add to miembros@
 * - active → suspended/deactivated: remove from all groups
 * - active → alumni: remove from miembros@ (keep in colaboradores@ as alumni)
 * - suspended → active (reinstated): add back to miembros@
 * - any → collaborator (rejected/downgraded): ensure in colaboradores@, remove from miembros@
 */
exports.onMemberStatusChange = (0, firestore_1.onDocumentUpdated)("users/{userId}", async (event) => {
    var _a, _b, _c, _d;
    const beforeData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const afterData = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!beforeData || !afterData)
        return;
    const oldStatus = (_c = beforeData.lifecycle) === null || _c === void 0 ? void 0 : _c.status;
    const newStatus = (_d = afterData.lifecycle) === null || _d === void 0 ? void 0 : _d.status;
    // Only react to lifecycle status changes
    if (!newStatus || oldStatus === newStatus)
        return;
    const email = afterData.email;
    if (!email)
        return;
    console.log(`Status change for ${email}: ${oldStatus} → ${newStatus}`);
    switch (newStatus) {
        case "active":
            // Member approved or reinstated → add to miembros@, remove from colaboradores@
            await (0, google_admin_1.addMemberToGroup)((0, group_config_1.getMembersGroup)(), email);
            await (0, google_admin_1.removeMemberFromGroup)((0, group_config_1.getDefaultGroup)(), email);
            break;
        case "suspended":
        case "deactivated":
            // Suspended or deactivated → remove from all groups
            await (0, google_admin_1.removeMemberFromAllGroups)(email, (0, group_config_1.getAllGroups)());
            break;
        case "alumni":
            // Alumni → remove from miembros@, optionally keep in colaboradores@
            await (0, google_admin_1.removeMemberFromGroup)((0, group_config_1.getMembersGroup)(), email);
            break;
        case "collaborator":
            // Rejected or downgraded → ensure in colaboradores@, remove from miembros@
            await (0, google_admin_1.addMemberToGroup)((0, group_config_1.getDefaultGroup)(), email);
            await (0, google_admin_1.removeMemberFromGroup)((0, group_config_1.getMembersGroup)(), email);
            break;
        case "pending":
            // Membership requested → no group change (still in colaboradores@)
            break;
        default:
            console.log(`Unknown status: ${newStatus}`);
    }
});
/**
 * Callable function (admin-only): fetch Google Groups membership data
 * for the admin directory panel.
 */
exports.syncGroupMembership = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    // Verify admin role
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(request.auth.uid)
        .get();
    const userData = userDoc.data();
    if (!userData || !["admin", "moderator"].includes(userData.role)) {
        throw new https_1.HttpsError("permission-denied", "Only admins and moderators can sync group membership");
    }
    try {
        // Fetch all groups and their members
        const groups = await (0, google_admin_1.listAllGroups)();
        const groupData = {};
        for (const group of groups) {
            const members = await (0, google_admin_1.listGroupMembers)(group.email);
            groupData[group.email] = {
                name: group.name,
                description: group.description,
                memberCount: group.directMembersCount,
                members: members.map((m) => ({
                    email: m.email,
                    role: m.role,
                    status: m.status,
                })),
            };
        }
        return { success: true, groups: groupData };
    }
    catch (error) {
        console.error("Error syncing group membership:", error === null || error === void 0 ? void 0 : error.message);
        throw new https_1.HttpsError("internal", "Failed to sync group membership");
    }
});
/**
 * Callable function (admin-only): add/remove a member from specific Google Groups.
 */
exports.updateMemberGroups = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    // Verify admin role
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(request.auth.uid)
        .get();
    const userData = userDoc.data();
    if (!userData || !["admin", "moderator"].includes(userData.role)) {
        throw new https_1.HttpsError("permission-denied", "Only admins and moderators can manage group membership");
    }
    const { memberEmail, addToGroups, removeFromGroups } = request.data;
    if (!memberEmail) {
        throw new https_1.HttpsError("invalid-argument", "memberEmail is required");
    }
    // Validate group emails against known groups
    const validGroups = Object.values(group_config_1.GROUP_MAP);
    const allRequested = [...(addToGroups || []), ...(removeFromGroups || [])];
    for (const g of allRequested) {
        if (!validGroups.includes(g)) {
            throw new https_1.HttpsError("invalid-argument", `Invalid group: ${g}`);
        }
    }
    const results = {
        added: [],
        removed: [],
        errors: [],
    };
    // Add to groups
    for (const groupEmail of (addToGroups || [])) {
        const success = await (0, google_admin_1.addMemberToGroup)(groupEmail, memberEmail);
        if (success) {
            results.added.push(groupEmail);
        }
        else {
            results.errors.push(`Failed to add to ${groupEmail}`);
        }
    }
    // Remove from groups
    for (const groupEmail of (removeFromGroups || [])) {
        const success = await (0, google_admin_1.removeMemberFromGroup)(groupEmail, memberEmail);
        if (success) {
            results.removed.push(groupEmail);
        }
        else {
            results.errors.push(`Failed to remove from ${groupEmail}`);
        }
    }
    return { success: results.errors.length === 0, results };
});
/**
 * Callable function (admin-only): get all groups a specific member belongs to.
 */
exports.getMemberGroupList = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    // Verify admin role
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(request.auth.uid)
        .get();
    const userData = userDoc.data();
    if (!userData || !["admin", "moderator"].includes(userData.role)) {
        throw new https_1.HttpsError("permission-denied", "Only admins and moderators can view group membership");
    }
    const { memberEmail } = request.data;
    if (!memberEmail) {
        throw new https_1.HttpsError("invalid-argument", "memberEmail is required");
    }
    const groups = await (0, google_admin_1.getMemberGroups)(memberEmail, (0, group_config_1.getAllGroups)());
    return { success: true, groups };
});
//# sourceMappingURL=index.js.map