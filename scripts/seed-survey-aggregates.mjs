#!/usr/bin/env node
/**
 * One-shot seed of /survey_aggregates/{global,admin} by replicating the
 * Cloud Function logic locally against prod Firestore. Uses Application
 * Default Credentials.
 *
 * Run once after first deploy, or anytime you need to force an immediate
 * recompute outside the 6h schedule:
 *
 *   gcloud auth application-default login --account=contacto@secid.mx
 *   node scripts/seed-survey-aggregates.mjs            # dry-run
 *   node scripts/seed-survey-aggregates.mjs --commit   # write
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('../functions/node_modules/firebase-admin');

const COMMIT = process.argv.includes('--commit');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'secid-org' });
}

const K = 5;
const AGG_PUBLIC = 'survey_aggregates/global';
const AGG_ADMIN = 'survey_aggregates/admin';

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
let totalFallbackUsers = 0;
const surveyByUid = new Map();

for (const d of surveys.docs) {
  const x = d.data();
  surveyByUid.set(d.id, x);
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

// Per-field fallback to /users (matches the Cloud Function logic)
for (const d of users.docs) {
  const x = d.data();
  // Explicit allowlist: only fold members into member stats. Legacy docs
  // without a role are intentionally excluded (matches the Cloud Function).
  if (x.role !== 'member') continue;
  const survey = surveyByUid.get(d.id);
  if (!survey) totalFallbackUsers++;

  if (!survey?.generation && x.generation) add(byGeneration, x.generation);
  if (!survey?.academicLevel && x.academicLevel)
    add(byAcademicLevel, x.academicLevel);
  if (!Array.isArray(survey?.techStack) || survey.techStack.length === 0) {
    const skills = x.skills || x.profile?.skills;
    if (Array.isArray(skills)) {
      for (const s of skills) {
        if (typeof s === 'string') {
          add(byTechStack, s.toLowerCase().replace(/\s+/g, '-'));
        }
      }
    }
  }
}

const generatedFrom =
  totalRespondents > 0
    ? totalRespondents < users.size
      ? 'mixed'
      : 'survey'
    : 'user-profile-fallback';

const adminPayload = {
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

// Public doc: k-anonymity on EVERY dimension, and no totalFallbackUsers
// (it leaks how many members lack a survey doc). Matches the Cloud Function.
const publicPayload = {
  ...adminPayload,
  byIndustry: kAnon(byIndustry),
  bySeniority: kAnon(bySeniority),
  byJobFunction: kAnon(byJobFunction),
  byWorkMode: kAnon(byWorkMode),
  byGeneration: kAnon(byGeneration),
  byCountry: kAnon(byCountry),
  byAreaOfInterest: kAnon(byAreaOfInterest),
  byTechStack: kAnon(byTechStack),
  byMentorship: kAnon(byMentorship),
  byOpenToOpportunities: kAnon(byOpenToOpportunities),
  byReasonsForJoining: kAnon(byReasonsForJoining),
  byAcademicLevel: kAnon(byAcademicLevel),
};
delete publicPayload.totalFallbackUsers;

if (!COMMIT) {
  console.log('🟡 DRY RUN — would write /survey_aggregates/{global, admin}:');
  console.log('\n--- public (/survey_aggregates/global) ---');
  console.log(
    JSON.stringify(
      { ...publicPayload, updatedAt: '<serverTimestamp>' },
      null,
      2
    )
  );
  console.log('\n--- admin (/survey_aggregates/admin) ---');
  console.log(
    JSON.stringify({ ...adminPayload, updatedAt: '<serverTimestamp>' }, null, 2)
  );
  console.log('\nRe-run with --commit to write.');
  process.exit(0);
}

await Promise.all([
  db.doc(AGG_PUBLIC).set(publicPayload),
  db.doc(AGG_ADMIN).set(adminPayload),
]);

console.log('Seeded /survey_aggregates/{global, admin}');
console.log(`  totalRespondents   = ${totalRespondents}`);
console.log(`  totalCompleted     = ${totalCompleted}`);
console.log(`  totalFallbackUsers = ${totalFallbackUsers}`);
console.log(`  generatedFrom      = ${generatedFrom}`);
console.log(
  `  byTechStack keys   = ${Object.keys(adminPayload.byTechStack).length}`
);
console.log(
  `  byGeneration keys  = ${Object.keys(adminPayload.byGeneration).length}`
);
console.log(
  `  byAreaOfInterest   = ${Object.keys(adminPayload.byAreaOfInterest).length}`
);
console.log(
  `  byMentorship       = ${Object.keys(adminPayload.byMentorship).length}`
);
console.log(
  `  byAcademicLevel    = ${Object.keys(adminPayload.byAcademicLevel).length}`
);
console.log(
  `  byReasonsForJoining= ${Object.keys(adminPayload.byReasonsForJoining).length}`
);
process.exit(0);
