import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface CompleteRegistrationData {
  registrationType: "member" | "collaborator" | "recruiter";
  // Member-specific
  numeroCuenta?: string;
  academicLevel?: string;
  campus?: string;
  generation?: string;
  graduationYear?: number;
  verificationDocumentUrl?: string;
  // Recruiter-specific
  companyName?: string;
  companyPosition?: string;
  companyWebsite?: string;
  // Common
  firstName?: string;
  lastName?: string;
}

export const completeRegistration = onCall(
  { cors: [/secid\.mx$/, /secid\.org$/, "localhost"] },
  async (request) => {
  // 1. Validate caller is authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be authenticated");
  }

  const uid = request.auth.uid;
  const data = request.data as CompleteRegistrationData;

  // 2. Validate registrationType
  if (
    !["member", "collaborator", "recruiter"].includes(data.registrationType)
  ) {
    throw new HttpsError("invalid-argument", "Invalid registration type");
  }

  // 3. Idempotency check
  const userDoc = await db.collection("users").doc(uid).get();
  const userData = userDoc.data();
  if (
    userData &&
    userData.registrationType === data.registrationType &&
    userData.lifecycle?.status !== "collaborator"
  ) {
    return { success: true, alreadyCompleted: true };
  }

  // 4. Process by registration type
  if (data.registrationType === "member") {
    return handleMemberRegistration(uid, data);
  } else if (data.registrationType === "recruiter") {
    return handleRecruiterRegistration(uid, data);
  } else {
    // Collaborator — minimal update
    await db.collection("users").doc(uid).update({
      registrationType: "collaborator",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, registrationType: "collaborator" };
  }
});

async function handleMemberRegistration(
  uid: string,
  data: CompleteRegistrationData
) {
  // Validate required fields
  if (!data.numeroCuenta) {
    throw new HttpsError(
      "invalid-argument",
      "numeroCuenta is required for members"
    );
  }

  if (!/^\d{9}$/.test(data.numeroCuenta)) {
    throw new HttpsError(
      "invalid-argument",
      "numeroCuenta must be exactly 9 digits"
    );
  }

  const updateData: Record<string, any> = {
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

  // Calculate updated profile completeness
  const currentDoc = await db.collection("users").doc(uid).get();
  const merged = { ...currentDoc.data(), ...updateData };
  updateData.profileCompleteness = calculateProfileCompleteness(merged);

  await db.collection("users").doc(uid).update(updateData);

  return { success: true, registrationType: "member" };
}

async function handleRecruiterRegistration(
  uid: string,
  data: CompleteRegistrationData
) {
  // Validate required fields
  if (!data.companyName || !data.companyPosition) {
    throw new HttpsError(
      "invalid-argument",
      "companyName and companyPosition are required for recruiters"
    );
  }

  // Find or create company using a transaction
  const nameLower = data.companyName.toLowerCase().trim();
  let companyId: string = "";

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
    } else {
      // Also try exact name match (for companies without nameLower)
      const exactQuery = await db
        .collection("companies")
        .where("name", "==", data.companyName!.trim())
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
      } else {
        // Create new company
        const companyRef = db.collection("companies").doc();
        companyId = companyRef.id;
        transaction.set(companyRef, {
          name: data.companyName!.trim(),
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

    // Calculate profile completeness for recruiter
    const currentUserDoc = await transaction.get(db.collection("users").doc(uid));
    const currentData = currentUserDoc.data() || {};
    const mergedData = {
      ...currentData,
      role: "company",
      registrationType: "recruiter",
      profile: { ...currentData.profile, company: data.companyName!.trim(), position: data.companyPosition },
    };
    const completeness = calculateProfileCompleteness(mergedData);

    // Update user doc
    transaction.update(db.collection("users").doc(uid), {
      role: "company",
      registrationType: "recruiter",
      isVerified: true,
      "profile.company": data.companyName!.trim(),
      "profile.companyId": companyId,
      "profile.position": data.companyPosition,
      "lifecycle.status": "active",
      "lifecycle.statusChangedAt": admin.firestore.FieldValue.serverTimestamp(),
      profileCompleteness: completeness,
      _skipGroupSync: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  // Alert admins about new recruiter registration
  try {
    await db.collection("admin_alerts").add({
      type: "new_recruiter_registration",
      userId: uid,
      companyName: data.companyName,
      companyPosition: data.companyPosition,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });
  } catch (alertErr) {
    // Non-blocking: alert failure shouldn't break registration
    console.warn("Failed to create admin alert:", alertErr);
  }

  return { success: true, registrationType: "recruiter", companyId };
}

function calculateProfileCompleteness(userData: Record<string, any>): number {
  let score = 0;
  // Name (10%)
  if (userData.firstName || userData.profile?.firstName) score += 5;
  if (userData.lastName || userData.profile?.lastName) score += 5;
  // Photo (10%)
  if (userData.photoURL || userData.profile?.photoURL) score += 10;
  // Registration type completed (20%)
  if (userData.registrationType && userData.registrationType !== "collaborator") score += 20;
  if (userData.registrationType === "collaborator") score += 10;
  // Education (15%)
  if (userData.academicLevel || userData.profile?.degree) score += 15;
  // Career (15%)
  if (userData.profile?.position || userData.profile?.company) score += 15;
  // Skills (10%)
  const skills = userData.profile?.skills || userData.skills || [];
  if (skills.length >= 3) score += 10;
  else if (skills.length > 0) score += 5;
  // Bio/headline (10%)
  if (userData.profile?.bio) score += 10;
  return Math.min(score, 100);
}
