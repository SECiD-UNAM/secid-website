/**
 * Survey reads.
 */
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { logger } from '../logger';
import type { MemberSurveyResponse, SurveyAggregates } from '@/types/survey';

const log = logger.child('survey.queries');

export const SURVEY_COLLECTION = 'member_surveys';
export const AGGREGATES_COLLECTION = 'survey_aggregates';
export const GLOBAL_AGGREGATES_DOC = 'global';
export const ADMIN_AGGREGATES_DOC = 'admin';

export async function getSurvey(
  uid: string
): Promise<MemberSurveyResponse | null> {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, SURVEY_COLLECTION, uid));
    if (!snap.exists()) return null;
    return { uid, ...snap.data() } as MemberSurveyResponse;
  } catch (error) {
    log.error('getSurvey failed', { error, uid });
    return null;
  }
}

export async function getGlobalAggregates(): Promise<SurveyAggregates | null> {
  try {
    const snap = await getDoc(
      doc(db, AGGREGATES_COLLECTION, GLOBAL_AGGREGATES_DOC)
    );
    if (!snap.exists()) return null;
    return snap.data() as SurveyAggregates;
  } catch (error) {
    const code = (error as { code?: string } | undefined)?.code;
    if (code === 'permission-denied' || code === 'not-found') {
      return null;
    }
    log.error('getGlobalAggregates failed', { error });
    return null;
  }
}

/**
 * Admin-only uncensored aggregates. Rules restrict /admin to admin role.
 * Firestore returns 'permission-denied' (not 'not-found') for missing
 * docs to avoid leaking existence info — we silence that specific case
 * so first-load before the aggregator has run doesn't look like a failure.
 */
export async function getAdminAggregates(): Promise<SurveyAggregates | null> {
  try {
    const snap = await getDoc(
      doc(db, AGGREGATES_COLLECTION, ADMIN_AGGREGATES_DOC)
    );
    if (!snap.exists()) return null;
    return snap.data() as SurveyAggregates;
  } catch (error) {
    const code = (error as { code?: string } | undefined)?.code;
    if (code === 'permission-denied' || code === 'not-found') {
      // Doc not yet generated (first load before aggregator ran)
      return null;
    }
    log.error('getAdminAggregates failed', { error });
    return null;
  }
}
