/**
 * Survey writes. Increments version + updatedAt on every save.
 */
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase';
import { logger } from '../logger';
import { SURVEY_COLLECTION } from './queries';
import { SURVEY_CURRENT_VERSION } from '@/types/survey';
import type { SurveyInput } from '@/types/survey';

const log = logger.child('survey.mutations');

/**
 * Create or update the member's survey. Always merges so partial answers
 * are preserved. Sets completedAt the first time `markComplete` is true.
 */
export async function upsertSurvey(
  uid: string,
  input: SurveyInput,
  options: { markComplete?: boolean } = {}
): Promise<void> {
  if (!uid) throw new Error('upsertSurvey: uid required');

  const ref = doc(db, SURVEY_COLLECTION, uid);
  const existing = await getDoc(ref);

  const payload: Record<string, unknown> = {
    ...stripUndefined(input as Record<string, unknown>),
    visibility: input.visibility ?? existing.data()?.visibility ?? 'aggregate-only',
    updatedAt: serverTimestamp(),
    schemaVersion: SURVEY_CURRENT_VERSION,
  };

  if (!existing.exists()) {
    payload.createdAt = serverTimestamp();
    payload.version = 1;
  } else {
    payload.version = increment(1);
  }

  if (options.markComplete && !existing.data()?.completedAt) {
    payload.completedAt = serverTimestamp();
  }

  try {
    await setDoc(ref, payload, { merge: true });
  } catch (error) {
    log.error('upsertSurvey failed', { error, uid });
    throw error;
  }
}

export async function markSurveyComplete(uid: string): Promise<void> {
  await upsertSurvey(uid, {}, { markComplete: true });
}

export async function resetSurvey(uid: string): Promise<void> {
  if (!uid) throw new Error('resetSurvey: uid required');
  const ref = doc(db, SURVEY_COLLECTION, uid);
  try {
    await setDoc(
      ref,
      {
        // Null-out answer fields but keep the doc so we know they reset.
        industry: null,
        jobFunction: null,
        seniority: null,
        workMode: null,
        yearsOfExperience: null,
        countryCode: null,
        city: null,
        areasOfInterest: null,
        techStack: null,
        toolProficiency: null,
        mentorshipRole: null,
        openToOpportunities: null,
        reasonsForJoining: null,
        heardAboutUsFrom: null,
        salaryRange: null,
        remoteAvailability: null,
        freelanceAvailability: null,
        customAnswers: null,
        completedAt: null,
        updatedAt: serverTimestamp(),
        version: increment(1),
      },
      { merge: true }
    );
  } catch (error) {
    log.error('resetSurvey failed', { error, uid });
    throw error;
  }
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
