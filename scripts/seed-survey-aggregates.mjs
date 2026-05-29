#!/usr/bin/env node
/**
 * One-shot seed of /survey_aggregates/global by replicating the Cloud
 * Function logic locally against prod Firestore. Uses Application Default
 * Credentials (or GOOGLE_APPLICATION_CREDENTIALS if set).
 *
 * Run once after first deploy, or anytime you need to force an immediate
 * recompute outside the 6h schedule:
 *
 *   gcloud auth application-default login   # if not already done
 *   node scripts/seed-survey-aggregates.mjs
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('../functions/node_modules/firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'secid-org' });
}

const K = 5;
const AGG = 'survey_aggregates/global';

function add(t, k, n = 1) {
  if (!k) return;
  t[k] = (t[k] || 0) + n;
}
function addMulti(t, arr) {
  if (!Array.isArray(arr)) return;
  for (const k of arr) if (typeof k === 'string') add(t, k);
}
function kAnon(c, other = 'other') {
  const out = {};
  let collapsed = 0;
  for (const [k, v] of Object.entries(c)) {
    if (v >= K) out[k] = v;
    else collapsed += v;
  }
  if (collapsed > 0) out[other] = (out[other] || 0) + collapsed;
  return out;
}

const db = admin.firestore();
const [surveys, users] = await Promise.all([
  db.collection('member_surveys').get(),
  db.collection('users').get(),
]);

const byIndustry = {};
const bySeniority = {};
const byJobFunction = {};
const byWorkMode = {};
const byGeneration = {};
const byCountry = {};
const byAreaOfInterest = {};
const byTechStack = {};
const byMentorship = {};
const byOpenToOpportunities = {};
const byReasonsForJoining = {};
const byAcademicLevel = {};

let totalRespondents = 0;
let totalCompleted = 0;
const seen = new Set();

for (const d of surveys.docs) {
  const x = d.data();
  seen.add(d.id);
  totalRespondents++;
  if (x.completedAt) totalCompleted++;
  add(byIndustry, x.industry);
  add(bySeniority, x.seniority);
  add(byJobFunction, x.jobFunction);
  add(byWorkMode, x.workMode);
  add(byGeneration, x.generation);
  add(byCountry, x.countryCode);
  add(byMentorship, x.mentorshipRole);
  add(byOpenToOpportunities, x.openToOpportunities);
  add(byAcademicLevel, x.academicLevel);
  addMulti(byAreaOfInterest, x.areasOfInterest);
  addMulti(byTechStack, x.techStack);
  addMulti(byReasonsForJoining, x.reasonsForJoining);
}

for (const d of users.docs) {
  if (seen.has(d.id)) continue;
  const x = d.data();
  if (x.role && x.role !== 'member') continue;
  add(byGeneration, x.generation);
  add(byAcademicLevel, x.academicLevel);
  const skills = x.skills || x.profile?.skills;
  if (Array.isArray(skills)) {
    for (const s of skills) {
      if (typeof s === 'string') {
        add(byTechStack, s.toLowerCase().replace(/\s+/g, '-'));
      }
    }
  }
}

const payload = {
  totalRespondents,
  totalCompleted,
  kAnonymityThreshold: K,
  byIndustry: kAnon(byIndustry),
  bySeniority,
  byJobFunction,
  byWorkMode,
  byGeneration,
  byCountry: kAnon(byCountry),
  byAreaOfInterest: kAnon(byAreaOfInterest),
  byTechStack: kAnon(byTechStack),
  byMentorship,
  byOpenToOpportunities,
  byReasonsForJoining,
  byAcademicLevel,
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  generatedFrom: totalRespondents > 0
    ? (totalRespondents < users.size ? 'mixed' : 'survey')
    : 'user-profile-fallback',
};

await db.doc(AGG).set(payload);

console.log('Seeded /survey_aggregates/global');
console.log(`  totalRespondents = ${totalRespondents}`);
console.log(`  totalCompleted   = ${totalCompleted}`);
console.log(`  generatedFrom    = ${payload.generatedFrom}`);
console.log(`  byTechStack keys = ${Object.keys(payload.byTechStack).length}`);
console.log(`  byGeneration keys= ${Object.keys(payload.byGeneration).length}`);
process.exit(0);
