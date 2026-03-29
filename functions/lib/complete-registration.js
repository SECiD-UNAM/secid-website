"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeRegistration = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const db = admin.firestore();
exports.completeRegistration = (0, https_1.onCall)(async (request) => {
    var _a;
    // 1. Validate caller is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Must be authenticated");
    }
    const uid = request.auth.uid;
    const data = request.data;
    // 2. Validate registrationType
    if (!["member", "collaborator", "recruiter"].includes(data.registrationType)) {
        throw new https_1.HttpsError("invalid-argument", "Invalid registration type");
    }
    // 3. Idempotency check
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();
    if (userData &&
        userData.registrationType === data.registrationType &&
        ((_a = userData.lifecycle) === null || _a === void 0 ? void 0 : _a.status) !== "collaborator") {
        return { success: true, alreadyCompleted: true };
    }
    // 4. Process by registration type
    if (data.registrationType === "member") {
        return handleMemberRegistration(uid, data);
    }
    else if (data.registrationType === "recruiter") {
        return handleRecruiterRegistration(uid, data);
    }
    else {
        // Collaborator — minimal update
        await db.collection("users").doc(uid).update({
            registrationType: "collaborator",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true, registrationType: "collaborator" };
    }
});
async function handleMemberRegistration(uid, data) {
    // Validate required fields
    if (!data.numeroCuenta) {
        throw new https_1.HttpsError("invalid-argument", "numeroCuenta is required for members");
    }
    const updateData = {
        registrationType: "member",
        verificationStatus: "pending",
        numeroCuenta: data.numeroCuenta,
        academicLevel: data.academicLevel || null,
        campus: data.campus || null,
        generation: data.generation || null,
        "lifecycle.status": "pending",
        "lifecycle.statusChangedAt": admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (data.graduationYear) {
        updateData["profile.graduationYear"] = data.graduationYear;
    }
    if (data.verificationDocumentUrl) {
        updateData.verificationDocumentUrl = data.verificationDocumentUrl;
    }
    if (data.firstName) {
        updateData.firstName = data.firstName;
    }
    if (data.lastName) {
        updateData.lastName = data.lastName;
    }
    await db.collection("users").doc(uid).update(updateData);
    return { success: true, registrationType: "member" };
}
async function handleRecruiterRegistration(uid, data) {
    // Validate required fields
    if (!data.companyName || !data.companyPosition) {
        throw new https_1.HttpsError("invalid-argument", "companyName and companyPosition are required for recruiters");
    }
    // Find or create company using a transaction
    const nameLower = data.companyName.toLowerCase().trim();
    let companyId = "";
    await db.runTransaction(async (transaction) => {
        // Query for existing company by nameLower
        const companyQuery = await db
            .collection("companies")
            .where("nameLower", "==", nameLower)
            .limit(1)
            .get();
        if (!companyQuery.empty) {
            // Link to existing company
            const existingDoc = companyQuery.docs[0];
            companyId = existingDoc.id;
            transaction.update(existingDoc.ref, {
                memberCount: admin.firestore.FieldValue.increment(1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        else {
            // Also try exact name match (for companies without nameLower)
            const exactQuery = await db
                .collection("companies")
                .where("name", "==", data.companyName.trim())
                .limit(1)
                .get();
            if (!exactQuery.empty) {
                const existingDoc = exactQuery.docs[0];
                companyId = existingDoc.id;
                transaction.update(existingDoc.ref, {
                    nameLower,
                    memberCount: admin.firestore.FieldValue.increment(1),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
            else {
                // Create new company
                const companyRef = db.collection("companies").doc();
                companyId = companyRef.id;
                transaction.set(companyRef, {
                    name: data.companyName.trim(),
                    nameLower,
                    website: data.companyWebsite || "",
                    createdBy: uid,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    memberCount: 1,
                    status: "active",
                });
            }
        }
        // Update user doc
        transaction.update(db.collection("users").doc(uid), {
            role: "company",
            registrationType: "recruiter",
            isVerified: true,
            "profile.company": data.companyName.trim(),
            "profile.companyId": companyId,
            "profile.position": data.companyPosition,
            "lifecycle.status": "active",
            "lifecycle.statusChangedAt": admin.firestore.FieldValue.serverTimestamp(),
            _skipGroupSync: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
    return { success: true, registrationType: "recruiter", companyId };
}
//# sourceMappingURL=complete-registration.js.map