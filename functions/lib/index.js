"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = exports.backfillRbacUsers = exports.seedRbacGroups = exports.onGroupWrite = exports.onUserGroupWrite = exports.refreshSurveyAggregates = exports.aggregateSurveyResponses = exports.getSalaryStats = exports.sendContactMessage = exports.subscribeNewsletter = exports.submitPublicJob = exports.confirmAlternateEmail = exports.requestAlternateEmail = exports.completeRegistration = exports.onMergeRequestApproved = exports.onUserNumeroCuentaChange = exports.onMemberCompanyChange = exports.getMemberGroupList = exports.updateMemberGroups = exports.syncGroupMembership = exports.onMemberStatusChange = exports.onUserDocCreated = exports.onNewJobPosted = exports.onUserDelete = exports.matchJobsForUser = exports.verifyUnamEmail = exports.onUserCreate = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const identity_1 = require("firebase-functions/v2/identity");
const functionsV1 = require("firebase-functions/v1");
const init_1 = require("./init"); // Must be first — initializes Firebase before other imports
const email_service_1 = require("./email-service");
const email_templates_1 = require("./email-templates");
const env_1 = require("./env");
const google_admin_1 = require("./google-admin");
const group_config_1 = require("./group-config");
const numero_cuenta_index_1 = require("./numero-cuenta-index");
Object.defineProperty(exports, "onUserNumeroCuentaChange", { enumerable: true, get: function () { return numero_cuenta_index_1.onUserNumeroCuentaChange; } });
const merge_engine_1 = require("./merge-engine");
Object.defineProperty(exports, "onMergeRequestApproved", { enumerable: true, get: function () { return merge_engine_1.onMergeRequestApproved; } });
const complete_registration_1 = require("./complete-registration");
Object.defineProperty(exports, "completeRegistration", { enumerable: true, get: function () { return complete_registration_1.completeRegistration; } });
const alternate_email_1 = require("./alternate-email");
Object.defineProperty(exports, "requestAlternateEmail", { enumerable: true, get: function () { return alternate_email_1.requestAlternateEmail; } });
Object.defineProperty(exports, "confirmAlternateEmail", { enumerable: true, get: function () { return alternate_email_1.confirmAlternateEmail; } });
const public_job_submit_1 = require("./public-job-submit");
Object.defineProperty(exports, "submitPublicJob", { enumerable: true, get: function () { return public_job_submit_1.submitPublicJob; } });
const public_forms_1 = require("./public-forms");
Object.defineProperty(exports, "subscribeNewsletter", { enumerable: true, get: function () { return public_forms_1.subscribeNewsletter; } });
Object.defineProperty(exports, "sendContactMessage", { enumerable: true, get: function () { return public_forms_1.sendContactMessage; } });
// Firebase Admin initialized in ./init.ts (imported above)
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
    await init_1.admin
        .firestore()
        .collection("users")
        .doc(uid)
        .set({
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
            statusChangedAt: init_1.admin.firestore.FieldValue.serverTimestamp(),
            statusHistory: [],
            lastActiveDate: init_1.admin.firestore.FieldValue.serverTimestamp(),
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
        createdAt: init_1.admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: init_1.admin.firestore.FieldValue.serverTimestamp(),
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
    // UNAM verification API not yet integrated — block auto-approval
    // to prevent privilege escalation. Admin can manually verify members
    // via the admin panel until the real API is connected.
    throw new https_1.HttpsError("unimplemented", "UNAM email verification is not yet available. Contact an administrator for manual verification.");
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
    const jobsSnapshot = await init_1.admin
        .firestore()
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
        await init_1.admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("jobMatches")
            .doc("latest")
            .set({
            matches: matches.slice(0, 10),
            generatedAt: init_1.admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    return { matchesFound: matches.length };
});
// Clean up user data on deletion (using v1 API as v2 doesn't have onDelete trigger)
exports.onUserDelete = functionsV1.auth.user().onDelete(async (user) => {
    const { uid } = user;
    // Delete user profile
    await init_1.admin.firestore().collection("users").doc(uid).delete();
    // Clean up user's job applications
    const applicationsSnapshot = await init_1.admin
        .firestore()
        .collectionGroup("applications")
        .where("applicantId", "==", uid)
        .get();
    const batch = init_1.admin.firestore().batch();
    applicationsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`User data cleaned up for ${uid}`);
    return null;
});
// Trigger when a new job is posted
exports.onNewJobPosted = (0, firestore_1.onDocumentCreated)("jobs/{jobId}", async (event) => {
    var _a, _b;
    const snapshot = event.data;
    if (!snapshot)
        return;
    const jobData = snapshot.data();
    const jobId = event.params.jobId;
    // Auto-publish for company-role users
    if (jobData.status === "draft") {
        const posterUid = jobData.postedBy;
        if (posterUid) {
            const posterDoc = await init_1.admin
                .firestore()
                .collection("users")
                .doc(posterUid)
                .get();
            if (((_a = posterDoc.data()) === null || _a === void 0 ? void 0 : _a.role) === "company") {
                await ((_b = event.data) === null || _b === void 0 ? void 0 : _b.ref.update({
                    status: "active",
                    approvedAt: init_1.admin.firestore.FieldValue.serverTimestamp(),
                }));
                // Continue to send notifications since job is now active
            }
            else {
                return; // Non-company draft jobs wait for admin approval
            }
        }
        else {
            return;
        }
    }
    else if (jobData.status !== "active" && jobData.status !== "published") {
        return;
    }
    try {
        // Find users with job match notifications enabled
        const usersSnapshot = await init_1.admin
            .firestore()
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
        console.log("No email for user, skipping group add + welcome email");
        return;
    }
    // 1. Add to default collaborators Google Group.
    const added = await (0, google_admin_1.addMemberToGroup)((0, group_config_1.getDefaultGroup)(), email);
    if (added) {
        console.log(`Added ${email} to collaborators group`);
    }
    // 2. Send welcome email pointing the user at /onboarding (Phase 0 #1
    // from docs/qa/2026-05-24-user-journey-validation-and-improvement-plan.md).
    // Best-effort: log + continue on failure so Group sync above stays the
    // contract of this trigger.
    try {
        const lang = userData.lang ||
            userData.locale ||
            "es";
        const recipientName = userData.firstName ||
            userData.displayName ||
            (typeof email === "string" ? email.split("@")[0] : "");
        // /onboarding doesn't exist as a route. The signup wizard
        // (src/components/auth/SignUpForm.tsx) detects an existing auth
        // session and skips the 'account' step, so /signup is where the
        // user resumes completing their profile (numeroCuenta, proof,
        // membership type) after email verification.
        const { subject, html } = (0, email_templates_1.generateWelcomeEmail)({
            recipientName,
            onboardingUrl: `${(0, env_1.getAppUrl)()}/${lang}/signup`,
            lang,
        });
        await (0, email_service_1.sendEmail)({ to: email, subject, html });
        console.log(`Welcome email queued for ${email}`);
    }
    catch (err) {
        console.error(`Failed to queue welcome email for ${email}:`, err);
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
    var _a, _b, _c, _d, _e;
    const beforeData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const afterData = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!beforeData || !afterData)
        return;
    // Skip during merge operations to prevent unintended group changes
    if (afterData._mergeInProgress)
        return;
    // Skip during registration to prevent unintended group changes for recruiters
    if (afterData._skipGroupSync) {
        await ((_c = event.data) === null || _c === void 0 ? void 0 : _c.after.ref.update({
            _skipGroupSync: init_1.admin.firestore.FieldValue.delete(),
        }));
        return;
    }
    const oldStatus = (_d = beforeData.lifecycle) === null || _d === void 0 ? void 0 : _d.status;
    const newStatus = (_e = afterData.lifecycle) === null || _e === void 0 ? void 0 : _e.status;
    // Only react to lifecycle status changes
    if (!newStatus || oldStatus === newStatus)
        return;
    const email = afterData.email;
    if (!email)
        return;
    console.log(`Status change for ${email}: ${oldStatus} → ${newStatus}`);
    // Common bits for the email payloads below.
    const lang = afterData.lang ||
        afterData.locale ||
        "es";
    const recipientName = afterData.firstName ||
        afterData.displayName ||
        (typeof email === "string" ? email.split("@")[0] : "");
    const contactEmail = process.env.ADMIN_EMAIL || "contacto@secid.mx";
    const baseUrl = (0, env_1.getAppUrl)();
    // Best-effort email helper — never let an email failure block the
    // Google Group sync below.
    const queueEmail = async (to, payload) => {
        try {
            await (0, email_service_1.sendEmail)({ to, subject: payload.subject, html: payload.html });
        }
        catch (err) {
            console.error(`Failed to queue email to ${to}:`, err);
        }
    };
    // Resolve the recipient list for admin-targeted notifications.
    // Query every user with role='admin' and email set (so notifications
    // fanout to the whole admin team instead of dying with one stale
    // ADMIN_EMAIL inbox). Fallback to env so bootstrap / empty-DB
    // scenarios still work.
    const resolveAdminRecipients = async () => {
        try {
            const snap = await init_1.admin
                .firestore()
                .collection("users")
                .where("role", "==", "admin")
                .get();
            const emails = snap.docs
                .map((d) => String(d.data().email || "").trim())
                .filter((e) => e.length > 0);
            const deduped = Array.from(new Set(emails));
            if (deduped.length > 0)
                return deduped;
        }
        catch (err) {
            console.warn("Failed to resolve admin recipients from Firestore:", err);
        }
        return [contactEmail];
    };
    switch (newStatus) {
        case "active":
            // Member approved or reinstated → add to miembros@, remove from colaboradores@
            await (0, google_admin_1.addMemberToGroup)((0, group_config_1.getMembersGroup)(), email);
            await (0, google_admin_1.removeMemberFromGroup)((0, group_config_1.getDefaultGroup)(), email);
            // Notify the user that they were approved (Phase 0 #3).
            // QA round 3 found my original guard `oldStatus === 'pending'` was
            // too strict: the AdminMembersTable shows "Pendiente" as the
            // default UI label when lifecycle.status is undefined, but the
            // ACTUAL stored value is undefined or 'collaborator'. So real
            // admin approvals manifest as `undefined → active` or
            // `'collaborator' → active`, not `'pending' → active`. Relax
            // the guard: send the approval email for any → active EXCEPT
            // when reactivating from suspended/deactivated (which gets the
            // reactivation copy).
            if (oldStatus === "suspended" || oldStatus === "deactivated") {
                await queueEmail(email, (0, email_templates_1.generateStatusChangeEmail)({
                    recipientName,
                    newStatus: "alumni", // reuse template; phrasing fits reactivation context loosely
                    contactEmail,
                    lang,
                }));
            }
            else {
                await queueEmail(email, (0, email_templates_1.generateApprovedEmail)({
                    recipientName,
                    dashboardUrl: `${baseUrl}/${lang}/dashboard`,
                    lang,
                }));
            }
            break;
        case "suspended":
        case "deactivated":
            // Suspended or deactivated → remove from all groups
            await (0, google_admin_1.removeMemberFromAllGroups)(email, (0, group_config_1.getAllGroups)());
            await queueEmail(email, (0, email_templates_1.generateStatusChangeEmail)({
                recipientName,
                newStatus,
                contactEmail,
                lang,
            }));
            break;
        case "alumni":
            // Alumni → remove from miembros@, optionally keep in colaboradores@
            await (0, google_admin_1.removeMemberFromGroup)((0, group_config_1.getMembersGroup)(), email);
            await queueEmail(email, (0, email_templates_1.generateStatusChangeEmail)({
                recipientName,
                newStatus: "alumni",
                contactEmail,
                lang,
            }));
            break;
        case "collaborator":
            // Rejected or downgraded → ensure in colaboradores@, remove from miembros@
            await (0, google_admin_1.addMemberToGroup)((0, group_config_1.getDefaultGroup)(), email);
            await (0, google_admin_1.removeMemberFromGroup)((0, group_config_1.getMembersGroup)(), email);
            // Only email the user if this is a real rejection (was pending),
            // not just an initial creation that landed at collaborator.
            if (oldStatus === "pending") {
                await queueEmail(email, (0, email_templates_1.generateRejectedEmail)({
                    recipientName,
                    reason: afterData.rejectionReason,
                    contactEmail,
                    lang,
                }));
            }
            break;
        case "pending":
            // Membership requested → no group change (still in colaboradores@).
            // Phase 0 #2: notify admins that there's something to review.
            // Skip if already notified (defensive against re-fires of the
            // same transition by a Firestore retry).
            if (oldStatus !== "pending") {
                // Fanout to every user with role='admin', not just a single
                // ADMIN_EMAIL env var (QA round 4 redesign — single inbox was
                // a stale-inbox risk).
                const adminRecipients = await resolveAdminRecipients();
                const adminPayload = (0, email_templates_1.generateAdminPendingNotif)({
                    memberName: recipientName,
                    memberEmail: email,
                    numeroCuenta: afterData.numeroCuenta,
                    registrationType: afterData.registrationType,
                    // /admin/users doesn't exist; the actual admin members page is here.
                    adminPanelUrl: `${baseUrl}/${lang}/dashboard/admin/members?status=pending`,
                });
                for (const adminTo of adminRecipients) {
                    await queueEmail(adminTo, adminPayload);
                }
                console.log(`Admin pending notif fanout to ${adminRecipients.length} recipient(s)`);
            }
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
    const userDoc = await init_1.admin
        .firestore()
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
    const userDoc = await init_1.admin
        .firestore()
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
    for (const groupEmail of addToGroups || []) {
        const success = await (0, google_admin_1.addMemberToGroup)(groupEmail, memberEmail);
        if (success) {
            results.added.push(groupEmail);
        }
        else {
            results.errors.push(`Failed to add to ${groupEmail}`);
        }
    }
    // Remove from groups
    for (const groupEmail of removeFromGroups || []) {
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
    const userDoc = await init_1.admin
        .firestore()
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
var companies_1 = require("./companies");
Object.defineProperty(exports, "onMemberCompanyChange", { enumerable: true, get: function () { return companies_1.onMemberCompanyChange; } });
// LinkedIn OAuth: disabled — requires LINKEDIN_CLIENT_ID secret in Secret Manager
// export { linkedinAuthRedirect, linkedinAuthCallback, exchangeLinkedInCode } from "./linkedin-auth";
// LinkedIn PDF Parser: extract text from a base64-encoded LinkedIn PDF export
// Disabled — pdf-parse module not installed
// export { parseLinkedInPdf } from "./parse-linkedin-pdf";
// Salary stats: aggregated compensation analytics with tiered privacy enforcement
var get_salary_stats_1 = require("./get-salary-stats");
Object.defineProperty(exports, "getSalaryStats", { enumerable: true, get: function () { return get_salary_stats_1.getSalaryStats; } });
// Member inscription survey: scheduled aggregation + admin-triggered refresh
var aggregate_survey_1 = require("./aggregate-survey");
Object.defineProperty(exports, "aggregateSurveyResponses", { enumerable: true, get: function () { return aggregate_survey_1.aggregateSurveyResponses; } });
Object.defineProperty(exports, "refreshSurveyAggregates", { enumerable: true, get: function () { return aggregate_survey_1.refreshSurveyAggregates; } });
// RBAC: permission resolution triggers + admin callable functions
var resolvePermissions_1 = require("./rbac/resolvePermissions");
Object.defineProperty(exports, "onUserGroupWrite", { enumerable: true, get: function () { return resolvePermissions_1.onUserGroupWrite; } });
Object.defineProperty(exports, "onGroupWrite", { enumerable: true, get: function () { return resolvePermissions_1.onGroupWrite; } });
var seedGroups_1 = require("./rbac/seedGroups");
Object.defineProperty(exports, "seedRbacGroups", { enumerable: true, get: function () { return seedGroups_1.seedRbacGroups; } });
var backfillUsers_1 = require("./rbac/backfillUsers");
Object.defineProperty(exports, "backfillRbacUsers", { enumerable: true, get: function () { return backfillUsers_1.backfillRbacUsers; } });
// RBAC: Express-style middleware for Cloud Function HTTP endpoints (Layer 2)
var middleware_1 = require("./rbac/middleware");
Object.defineProperty(exports, "requirePermission", { enumerable: true, get: function () { return middleware_1.requirePermission; } });
//# sourceMappingURL=index.js.map