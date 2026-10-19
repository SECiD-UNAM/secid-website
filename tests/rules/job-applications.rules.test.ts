// @vitest-environment node
/**
 * Rules coverage for the job-application flow (ROADMAP G23).
 *
 * The documents under test are built by src/lib/jobs/applicationPayload.ts,
 * the same code JobApplicationModal writes with, so these tests assert
 * that what the client actually sends is what firestore.rules accept:
 *
 *   - jobs/{jobId}/applications/{id}: verified, active member can create
 *     the doc the modal builds; the legacy shape (status 'pending', no
 *     jobId/createdAt) is denied; a stranger cannot read it.
 *   - users/{uid}/applications/{id}: owner can create and read the mirror
 *     the dashboard lists; the owner may only withdraw (status
 *     'withdrawn'), never promote the status; nobody else reads it.
 */
// vitest.config.ts runs tests concurrently, so the suite is written to be
// order-independent: the fixtures are seeded idempotently (same ids, same
// data), each test that needs a fixed document id uses its own, and the
// emulator project (its own, see createTestEnv) is cleared once up front —
// a per-test clearFirestore() races the other tests' seeded docs.
import { describe, it, beforeAll, afterAll } from 'vitest';
import {
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  buildApplicationMirrorDoc,
  buildJobApplicationDoc,
} from '../../src/lib/jobs/applicationPayload';
import { createTestEnv, emulatorReachable, verifiedMemberDoc } from './harness';

const MEMBER = 'member-uid';
const STRANGER = 'stranger-uid';
const POSTER = 'poster-uid';
const JOB_ID = 'job-1';

const emulatorRunning = await emulatorReachable();
let testEnv: RulesTestEnvironment | undefined;

beforeAll(async () => {
  if (!emulatorRunning) return;
  testEnv = await createTestEnv('jobs');
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

function env(): RulesTestEnvironment {
  if (!testEnv) throw new Error('testEnv not initialized');
  return testEnv;
}

async function seedMemberAndJob() {
  await env().withSecurityRulesDisabled(async (ctx) => {
    const admin = ctx.firestore();
    await setDoc(
      doc(admin, 'users', MEMBER),
      verifiedMemberDoc('member@example.com')
    );
    await setDoc(
      doc(admin, 'users', STRANGER),
      verifiedMemberDoc('stranger@example.com')
    );
    await setDoc(doc(admin, 'jobs', JOB_ID), {
      title: 'Data Scientist',
      company: 'Acme',
      description: 'x'.repeat(60),
      postedBy: POSTER,
      status: 'active',
    });
  });
}

function applicationInput() {
  return {
    jobId: JOB_ID,
    applicantId: MEMBER,
    applicantName: 'Test Member',
    applicantEmail: 'member@example.com',
    applicantProfile: { skills: [], experience: [], education: [] },
    coverLetter: 'c'.repeat(120),
    resumeUrl: undefined,
    phoneNumber: '+52 55 1234 5678',
    yearsOfExperience: '1-3',
    educationLevel: 'master',
  };
}

describe.skipIf(!emulatorRunning)(
  'firestore.rules — jobs/{jobId}/applications',
  { concurrent: false },
  () => {
    it('verified member can create the application the modal builds', async () => {
      await seedMemberAndJob();
      const db = env().authenticatedContext(MEMBER).firestore();
      await assertSucceeds(
        addDoc(
          collection(db, 'jobs', JOB_ID, 'applications'),
          buildJobApplicationDoc(applicationInput())
        )
      );
    });

    it('the legacy payload (status "pending", no jobId/createdAt) is denied', async () => {
      await seedMemberAndJob();
      const db = env().authenticatedContext(MEMBER).firestore();
      const { jobId: _jobId, resumeUrl: _r, ...rest } = applicationInput();
      await assertFails(
        addDoc(collection(db, 'jobs', JOB_ID, 'applications'), {
          ...rest,
          appliedAt: serverTimestamp(),
          status: 'pending',
        })
      );
    });

    it('a member cannot apply on behalf of someone else', async () => {
      await seedMemberAndJob();
      const db = env().authenticatedContext(STRANGER).firestore();
      await assertFails(
        addDoc(
          collection(db, 'jobs', JOB_ID, 'applications'),
          buildJobApplicationDoc(applicationInput())
        )
      );
    });

    it('applicant can query their own application; a stranger cannot read it', async () => {
      await seedMemberAndJob();
      const member = env().authenticatedContext(MEMBER).firestore();
      const ref = await addDoc(
        collection(member, 'jobs', JOB_ID, 'applications'),
        buildJobApplicationDoc(applicationInput())
      );
      await assertSucceeds(
        getDocs(
          query(
            collection(member, 'jobs', JOB_ID, 'applications'),
            where('applicantId', '==', MEMBER)
          )
        )
      );
      const stranger = env().authenticatedContext(STRANGER).firestore();
      await assertFails(
        getDoc(doc(stranger, 'jobs', JOB_ID, 'applications', ref.id))
      );
    });
  }
);

describe.skipIf(!emulatorRunning)(
  'firestore.rules — users/{uid}/applications (dashboard mirror)',
  { concurrent: false },
  () => {
    const mirror = () =>
      buildApplicationMirrorDoc({
        jobId: JOB_ID,
        applicationId: 'app-1',
        jobTitle: 'Data Scientist',
        company: 'Acme',
      });

    it('owner can create and list their mirror docs', async () => {
      await seedMemberAndJob();
      const db = env().authenticatedContext(MEMBER).firestore();
      await assertSucceeds(
        addDoc(collection(db, 'users', MEMBER, 'applications'), mirror())
      );
      await assertSucceeds(
        getDocs(collection(db, 'users', MEMBER, 'applications'))
      );
    });

    it('another member cannot read or write someone else’s mirror', async () => {
      await seedMemberAndJob();
      const db = env().authenticatedContext(STRANGER).firestore();
      await assertFails(
        addDoc(collection(db, 'users', MEMBER, 'applications'), mirror())
      );
      await assertFails(
        getDocs(collection(db, 'users', MEMBER, 'applications'))
      );
    });

    it('owner may withdraw but not promote the status', async () => {
      await seedMemberAndJob();
      await env().withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), 'users', MEMBER, 'applications', 'app-withdraw'),
          { ...mirror(), appliedAt: new Date(), createdAt: new Date() }
        );
      });
      const db = env().authenticatedContext(MEMBER).firestore();
      const ref = doc(db, 'users', MEMBER, 'applications', 'app-withdraw');
      await assertFails(updateDoc(ref, { status: 'hired' }));
      await assertFails(updateDoc(ref, { jobTitle: 'CTO' }));
      await assertSucceeds(
        updateDoc(ref, {
          status: 'withdrawn',
          withdrawnAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        })
      );
    });
  }
);
