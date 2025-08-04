import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// User creation trigger - set up initial user profile
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const {uid, email, displayName, photoURL} = user;

  // Create user profile document
  await admin.firestore().collection("users").doc(uid).set({
    email,
    displayName: displayName || "",
    photoURL: photoURL || "",
    firstName: "",
    lastName: "",
    role: "member",
    isActive: true,
    isVerified: false,
    membershipTier: "free",
    skills: [],
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
  return null;
});

// UNAM email verification
export const verifyUnamEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
    );
  }

  const {unamEmail, studentId, graduationYear} = data;
  const userId = context.auth.uid;

  // Validate UNAM email format
  if (!unamEmail.includes("@alumno.unam.mx") &&
      !unamEmail.includes("@unam.mx")) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Email must be from UNAM domain"
    );
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

    return {success: true, message: "UNAM verification completed"};
  } else {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "UNAM verification failed"
    );
  }
});

// Job matching algorithm
export const matchJobsForUser = functions.firestore
    .document("users/{userId}")
    .onUpdate(async (change, context) => {
      const {userId} = context.params;
      const afterData = change.after.data();

      // Only run if user is job searching
      if (!afterData.privacySettings?.jobSearching) {
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

      const matches: any[] = [];

      jobsSnapshot.forEach((doc) => {
        const job = doc.data();
        const jobRequirements = job.requirements || [];

        // Simple matching algorithm
        const matchingSkills = userSkills.filter((skill: string) =>
          jobRequirements.some((req: string) =>
            req.toLowerCase().includes(skill.toLowerCase())
          )
        );

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

      return {matchesFound: matches.length};
    });

// Clean up user data on deletion
export const onUserDelete = functions.auth.user().onDelete(async (user) => {
  const {uid} = user;

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