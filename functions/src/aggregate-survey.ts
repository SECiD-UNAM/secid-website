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
  const surveyByUid = new Map<string, Record<string, unknown>>();

  // First pass: survey responses (highest fidelity per field)
  for (const doc of surveysSnap.docs) {
    const data = doc.data();
    surveyByUid.set(doc.id, data);
    totalRespondents++;
    if (data.completedAt) totalCompleted++;

    add(byIndustry, data.industry as string | undefined);
    add(bySeniority, data.seniority as string | undefined);
    add(byJobFunction, data.jobFunction as string | undefined);
    add(byWorkMode, data.workMode as string | undefined);
    add(byGeneration, data.generation as string | undefined);
    add(byCountry, data.countryCode as string | undefined);
    add(byMentorship, data.mentorshipRole as string | undefined);
    add(byOpenToOpportunities, data.openToOpportunities as string | undefined);
    add(byAcademicLevel, data.academicLevel as string | undefined);
    addMulti(byAreaOfInterest, data.areasOfInterest);
    addMulti(byTechStack, data.techStack);
    addMulti(byReasonsForJoining, data.reasonsForJoining);
  }

  // Second pass: fall back to /users PER FIELD. A user can have a
  // partial survey response (e.g. legacy import only has generation +
  // academicLevel + areasOfInterest) — for the OTHER fields we still
  // want to count their profile data. So we only fall back where the
  // survey doc is missing that specific field.
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    if (data.role && data.role !== "member") continue;
    const survey = surveyByUid.get(doc.id);

    if (!survey) totalFallbackUsers++;

    // Generation: prefer survey, fall back to user profile
    if (!survey?.generation && data.generation) {
      add(byGeneration, data.generation);
    }
    if (!survey?.academicLevel && data.academicLevel) {
      add(byAcademicLevel, data.academicLevel);
    }
    // Tech stack: aggregate from user skills if survey didn't supply
    // (legacy imports often won't have techStack). We DON'T require
    // "no survey at all" — we require "no techStack in their survey".
    if (!Array.isArray(survey?.techStack) || (survey?.techStack as unknown[]).length === 0) {
      const skills = data.skills || data.profile?.skills;
      if (Array.isArray(skills)) {
        for (const s of skills) {
          if (typeof s !== "string") continue;
          const norm = s.toLowerCase().replace(/\s+/g, "-");
          add(byTechStack, norm);
        }
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
