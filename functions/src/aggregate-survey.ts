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
const AGGREGATES_PATH = "survey_aggregates/global";

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

async function buildAggregates(): Promise<Record<string, unknown>> {
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

  return {
    totalRespondents,
    totalCompleted,
    kAnonymityThreshold: K,
    byIndustry: applyKAnonymity(byIndustry),
    bySeniority,
    byJobFunction,
    byWorkMode,
    byGeneration,
    byCountry: applyKAnonymity(byCountry),
    byAreaOfInterest: applyKAnonymity(byAreaOfInterest),
    byTechStack: applyKAnonymity(byTechStack),
    byMentorship,
    byOpenToOpportunities,
    byReasonsForJoining,
    byAcademicLevel,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    generatedFrom: totalRespondents > 0
      ? (totalRespondents < usersSnap.size ? "mixed" : "survey")
      : "user-profile-fallback",
  };
}

export const aggregateSurveyResponses = onSchedule(
  {
    schedule: "every 6 hours",
    timeZone: "America/Mexico_City",
    region: "us-central1",
  },
  async () => {
    try {
      const payload = await buildAggregates();
      await admin.firestore().doc(AGGREGATES_PATH).set(payload);
      logger.info("survey aggregates updated", {
        total: payload.totalRespondents,
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
    const payload = await buildAggregates();
    await admin.firestore().doc(AGGREGATES_PATH).set(payload);
    return { ok: true, ...payload };
  }
);
