// @vitest-environment node
/**
 * Rules coverage for `announcements/{id}` (ROADMAP F20).
 *
 * The collection is the audit trail of sendAnnouncement
 * (functions/src/announcements.ts), written by the callable with the Admin
 * SDK. The rules must let the people who can send (content-editor and
 * newsletter-editor carry `ac:p.a`, admins the wildcard) read the history
 * and keep everyone — admins included — from writing through the client.
 *
 * Order-independent (see event-registrations.rules.test.ts): idempotent
 * fixtures, own emulator project, cleared once in beforeAll.
 */
import { describe, it, beforeAll, afterAll } from 'vitest';
import {
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  adminToken,
  createTestEnv,
  emulatorReachable,
  groupToken,
  memberToken,
} from './harness';

const ANNOUNCEMENT_ID = 'ann-1';

const emulatorRunning = await emulatorReachable();
let testEnv: RulesTestEnvironment | undefined;

beforeAll(async () => {
  if (!emulatorRunning) return;
  testEnv = await createTestEnv('announcements');
  await testEnv.clearFirestore();
  await seedAnnouncement();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

function env(): RulesTestEnvironment {
  if (!testEnv) throw new Error('testEnv not initialized');
  return testEnv;
}

/** What sendAnnouncement records after a successful run. */
function announcementDoc() {
  return {
    subject: 'Asamblea anual',
    bodyMarkdown: 'Hola **a todos**',
    audience: { kind: 'all_active' },
    lang: 'es',
    recipientCount: 31,
    sentBy: 'editor-uid',
    sentAt: new Date(),
    status: 'sent',
  };
}

async function seedAnnouncement() {
  await env().withSecurityRulesDisabled(async (ctx) => {
    await setDoc(
      doc(ctx.firestore(), 'announcements', ANNOUNCEMENT_ID),
      announcementDoc()
    );
  });
}

const asAdmin = () =>
  env().authenticatedContext('admin-uid', adminToken()).firestore();
const asEditor = () =>
  env()
    .authenticatedContext('editor-uid', groupToken('content-editor'))
    .firestore();
const asNewsletterEditor = () =>
  env()
    .authenticatedContext('nl-uid', groupToken('newsletter-editor'))
    .firestore();
const asMember = () =>
  env().authenticatedContext('member-uid', memberToken()).firestore();

describe.skipIf(!emulatorRunning)('firestore.rules — announcements', () => {
  it('admin can read one announcement and list the history', async () => {
    await assertSucceeds(
      getDoc(doc(asAdmin(), 'announcements', ANNOUNCEMENT_ID))
    );
    await assertSucceeds(getDocs(collection(asAdmin(), 'announcements')));
  });

  it('content-editor (ac:p.a) and newsletter-editor can read the history', async () => {
    await assertSucceeds(getDocs(collection(asEditor(), 'announcements')));
    await assertSucceeds(
      getDocs(collection(asNewsletterEditor(), 'announcements'))
    );
  });

  it('a member cannot read announcements', async () => {
    await assertFails(
      getDoc(doc(asMember(), 'announcements', ANNOUNCEMENT_ID))
    );
    await assertFails(getDocs(collection(asMember(), 'announcements')));
  });

  it('an anonymous visitor cannot read announcements', async () => {
    await assertFails(
      getDoc(
        doc(
          env().unauthenticatedContext().firestore(),
          'announcements',
          ANNOUNCEMENT_ID
        )
      )
    );
  });

  it('nobody can create, update or delete through the client — not even admin', async () => {
    await assertFails(
      setDoc(doc(asAdmin(), 'announcements', 'ann-client'), announcementDoc())
    );
    await assertFails(
      setDoc(doc(asEditor(), 'announcements', 'ann-client'), announcementDoc())
    );
    await assertFails(
      updateDoc(doc(asAdmin(), 'announcements', ANNOUNCEMENT_ID), {
        status: 'failed',
      })
    );
    await assertFails(
      deleteDoc(doc(asAdmin(), 'announcements', ANNOUNCEMENT_ID))
    );
  });
});
