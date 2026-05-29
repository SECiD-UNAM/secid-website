/**
 * Survey aggregation Cloud Function.
 *
 * Runs every 6 hours (and on-demand via callable). Walks /member_surveys,
 * folds in /users for members who haven't completed the survey yet,
 * applies a k-anonymity threshold of 5 (buckets below collapse into 'other'),
 * and writes the result to /survey_aggregates/global so charts on
 * /es/members can read with a single get.
 */
import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";

const K = 5;
const AGGREGATES_PATH_PUBLIC = "survey_aggregates/global";
const AGGREGATES_PATH_ADMIN = "survey_aggregates/admin";

type Count = Record<string, number>;

function add(target: Count, key: string | undefined | null, n = 1) {
  if (!key) return;
  target[key] = (target[key] || 0) + n;
}

function addMulti(target: Count, arr: unknown) {
  if (!Array.isArray(arr)) return;
  for (const k of arr) {
    if (typeof k === "string") add(target, k);
  }
}

function applyKAnonymity(counts: Count, otherKey = "other"): Count {
  const result: Count = {};
  let collapsed = 0;
  for (const [k, v] of Object.entries(counts)) {
    if (v >= K) result[k] = v;
    else collapsed += v;
  }
  if (collapsed > 0) {
    result[otherKey] = (result[otherKey] || 0) + collapsed;
  }
  return result;
}

/**
 * Build two parallel payloads:
 * - public: k-anonymity applied to sensitive buckets; written to /global
 * - admin: raw counts, no censorship; written to /admin
 * Public charts read /global. Admin dashboard reads /admin via rules.
 */
async function buildAggregates(): Promise<{
  publicPayload: Record<string, unknown>;
  adminPayload: Record<string, unknown>;
}> {
  const db = admin.firestore();
  const surveysSnap = await db.collection("member_surveys").get();
  const usersSnap = await db.collection("users").get();

  const byIndustry: Count = {};
  const bySeniority: Count = {};
  const byJobFunction: Count = {};
  const byWorkMode: Count = {};
  const byGeneration: Count = {};
  const byCountry: Count = {};
  const byAreaOfInterest: Count = {};
  const byTechStack: Count = {};
  const byMentorship: Count = {};
  const byOpenToOpportunities: Count = {};
  const byReasonsForJoining: Count = {};
  const byAcademicLevel: Count = {};

  let totalRespondents = 0;
  let totalCompleted = 0;
  let totalFallbackUsers = 0;
  const seenUids = new Set<string>();

  // First pass: survey responses (highest fidelity)
  for (const doc of surveysSnap.docs) {
    const data = doc.data();
    seenUids.add(doc.id);
    totalRespondents++;
    if (data.completedAt) totalCompleted++;

    add(byIndustry, data.industry);
    add(bySeniority, data.seniority);
    add(byJobFunction, data.jobFunction);
    add(byWorkMode, data.workMode);
    add(byGeneration, data.generation);
    add(byCountry, data.countryCode);
    add(byMentorship, data.mentorshipRole);
    add(byOpenToOpportunities, data.openToOpportunities);
    add(byAcademicLevel, data.academicLevel);
    addMulti(byAreaOfInterest, data.areasOfInterest);
    addMulti(byTechStack, data.techStack);
    addMulti(byReasonsForJoining, data.reasonsForJoining);
  }

  // Second pass: fall back to /users for members without surveys, so
  // pre-existing community state isn't invisible until surveys roll in.
  for (const doc of usersSnap.docs) {
    if (seenUids.has(doc.id)) continue;
    const data = doc.data();
    if (data.role && data.role !== "member") continue;
    totalFallbackUsers++;
    add(byGeneration, data.generation);
    add(byAcademicLevel, data.academicLevel);
    // Skills array from profile maps loosely to areasOfInterest if present
    const skills = data.skills || data.profile?.skills;
    if (Array.isArray(skills)) {
      for (const s of skills) {
        if (typeof s !== "string") continue;
        const norm = s.toLowerCase().replace(/\s+/g, "-");
        add(byTechStack, norm);
      }
    }
  }

  const generatedFrom = totalRespondents > 0
    ? (totalRespondents < usersSnap.size ? "mixed" : "survey")
    : "user-profile-fallback";

  // Raw / admin view — uncensored counts; admin dashboard reads this
  const adminPayload: Record<string, unknown> = {
    totalRespondents,
    totalCompleted,
    totalFallbackUsers,
    kAnonymityThreshold: K,
    byIndustry: { ...byIndustry },
    bySeniority: { ...bySeniority },
    byJobFunction: { ...byJobFunction },
    byWorkMode: { ...byWorkMode },
    byGeneration: { ...byGeneration },
    byCountry: { ...byCountry },
    byAreaOfInterest: { ...byAreaOfInterest },
    byTechStack: { ...byTechStack },
    byMentorship: { ...byMentorship },
    byOpenToOpportunities: { ...byOpenToOpportunities },
    byReasonsForJoining: { ...byReasonsForJoining },
    byAcademicLevel: { ...byAcademicLevel },
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    generatedFrom,
  };

  // Public view — k-anonymized; everyone reads this
  const publicPayload: Record<string, unknown> = {
    totalRespondents,
    totalCompleted,
    totalFallbackUsers,
    kAnonymityThreshold: K,
    byIndustry: applyKAnonymity(byIndustry),
    bySeniority: applyKAnonymity(bySeniority),
    byJobFunction: applyKAnonymity(byJobFunction),
    byWorkMode,
    byGeneration,
    byCountry: applyKAnonymity(byCountry),
    byAreaOfInterest: applyKAnonymity(byAreaOfInterest),
    byTechStack: applyKAnonymity(byTechStack),
    byMentorship,
    byOpenToOpportunities,
    byReasonsForJoining: applyKAnonymity(byReasonsForJoining),
    byAcademicLevel,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    generatedFrom,
  };

  return { publicPayload, adminPayload };
}

export const aggregateSurveyResponses = onSchedule(
  {
    schedule: "every 6 hours",
    timeZone: "America/Mexico_City",
    region: "us-central1",
  },
  async () => {
    try {
      const { publicPayload, adminPayload } = await buildAggregates();
      const db = admin.firestore();
      await Promise.all([
        db.doc(AGGREGATES_PATH_PUBLIC).set(publicPayload),
        db.doc(AGGREGATES_PATH_ADMIN).set(adminPayload),
      ]);
      logger.info("survey aggregates updated", {
        total: publicPayload.totalRespondents,
        fallback: publicPayload.totalFallbackUsers,
      });
    } catch (err) {
      logger.error("aggregateSurveyResponses failed", err);
      throw err;
    }
  }
);

export const refreshSurveyAggregates = onCall(
  { region: "us-central1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }
    const adminDoc = await admin
      .firestore()
      .doc(`users/${request.auth.uid}`)
      .get();
    const role = adminDoc.data()?.role;
    if (role !== "admin" && role !== "moderator") {
      throw new HttpsError("permission-denied", "Admin only");
    }
    const { publicPayload, adminPayload } = await buildAggregates();
    const db = admin.firestore();
    await Promise.all([
      db.doc(AGGREGATES_PATH_PUBLIC).set(publicPayload),
      db.doc(AGGREGATES_PATH_ADMIN).set(adminPayload),
    ]);
    return { ok: true, ...adminPayload };
  }
);
