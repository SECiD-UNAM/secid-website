import {onDocumentUpdated, onDocumentCreated} from "firebase-functions/v2/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {beforeUserCreated, AuthBlockingEvent} from "firebase-functions/v2/identity";
import * as functionsV1 from "firebase-functions/v1";
import * as admin from "firebase-admin";
import {sendEmail, generateJobMatchEmail} from "./email-service";

// Initialize Firebase Admin
admin.initializeApp();

// User creation trigger - set up initial user profile
export const onUserCreate = beforeUserCreated(async (event: AuthBlockingEvent) => {
  const user = event.data;
  if (!user) {
    console.log("No user data in event");
    return;
  }
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
});

interface VerifyUnamEmailData {
  unamEmail: string;
  studentId?: string;
  graduationYear?: number;
}

// UNAM email verification
export const verifyUnamEmail = onCall<VerifyUnamEmailData>(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const {unamEmail, studentId, graduationYear} = request.data;
  const userId = request.auth.uid;

  // Validate UNAM email format
  if (!unamEmail.includes("@alumno.unam.mx") &&
      !unamEmail.includes("@unam.mx")) {
    throw new HttpsError(
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
    throw new HttpsError(
      "invalid-argument",
      "UNAM verification failed"
    );
  }
});

// Job matching algorithm
export const matchJobsForUser = onDocumentUpdated(
  "users/{userId}",
  async (event) => {
    const userId = event.params.userId;
    const afterData = event.data?.after.data();

    if (!afterData) {
      return null;
    }

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

    const matches: {
      jobId: string;
      matchScore: number;
      title: string;
      company: string;
    }[] = [];

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
  }
);

// Clean up user data on deletion (using v1 API as v2 doesn't have onDelete trigger)
export const onUserDelete = functionsV1.auth.user().onDelete(async (user) => {
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

// Trigger when a new job is posted
export const onNewJobPosted = onDocumentCreated("jobs/{jobId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const jobData = snapshot.data();
  const jobId = event.params.jobId;

  // Only notify for published/active jobs
  if (jobData.status !== "active" && jobData.status !== "published") return;

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
      if (!userData.email) continue;

      // Simple skill matching score
      const userSkills = (userData.skills || []).map((s: string) => s.toLowerCase());
      const jobTags = (jobData.tags || []).map((t: string) => t.toLowerCase());
      const matchCount = userSkills.filter((s: string) => jobTags.includes(s)).length;
      const matchScore = jobTags.length > 0
        ? Math.round((matchCount / jobTags.length) * 100)
        : 50;

      // Only send if match score is above threshold
      if (matchScore < 30) continue;

      const html = generateJobMatchEmail({
        recipientName: userData.displayName || userData.firstName || "Miembro",
        jobTitle: jobData.title,
        company: jobData.company,
        matchScore,
        jobUrl: `${siteUrl}/es/jobs`,
      });

      await sendEmail({
        to: userData.email,
        subject: `Nueva oportunidad: ${jobData.title} en ${jobData.company}`,
        html,
      });
    }

    console.log(`Job notifications sent for job ${jobId}`);
  } catch (error) {
    console.error("Error sending job notifications:", error);
  }
});
