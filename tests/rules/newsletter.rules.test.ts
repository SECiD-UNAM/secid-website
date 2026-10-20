// @vitest-environment node
/**
 * Rules coverage for the newsletter double opt-in and send (ROADMAP F21).
 *
 *   - newsletter/{id}: the subscription doc now carries `status`,
 *     `confirmTokenHash` and `unsubscribeToken`, written only by the
 *     Cloud Functions (subscribeNewsletter / confirmNewsletter /
 *     unsubscribeNewsletter). The public form never writes Firestore
 *     directly: anonymous create with exactly the fields the function
 *     writes is still denied, nobody anonymous can read or flip `status`,
 *     members cannot read, and `nl:v.a` holders (newsletter-editor,
 *     admin) can.
 *   - newsletter_archive/{id}: `sentAt`, `recipientCount` and `sentBy` are
 *     the send receipt sendNewsletterIssue writes with the Admin SDK; a
 *     client — editor or admin — cannot set or forge them, while the
 *     editor keeps editing the issue itself.
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
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
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

const SUB_ID = 'sub-1';
const ISSUE_ID = 'issue-1';
const EDITOR = 'nl-editor-uid';

const emulatorRunning = await emulatorReachable();
let testEnv: RulesTestEnvironment | undefined;

beforeAll(async () => {
  if (!emulatorRunning) return;
  testEnv = await createTestEnv('newsletter');
  await testEnv.clearFirestore();
  await seed();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

function env(): RulesTestEnvironment {
  if (!testEnv) throw new Error('testEnv not initialized');
  return testEnv;
}

/** Exactly what subscribeNewsletter writes for a new address. */
function pendingSubscription() {
  return {
    email: 'ana@example.com',
    name: 'Ana',
    interests: ['jobs'],
    subscribedAt: new Date(),
    source: 'website',
    lang: 'es',
    ipHash: 'a'.repeat(64),
    status: 'pending',
    confirmTokenHash: 'b'.repeat(64),
    unsubscribeToken: 'c'.repeat(64),
  };
}

function issue() {
  return {
    title: 'Boletín #7',
    issueNumber: 7,
    content: '<p>Hola</p>',
    excerpt: 'Resumen del boletín',
    status: 'draft',
    createdBy: EDITOR,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
  };
}

async function seed() {
  await env().withSecurityRulesDisabled(async (ctx) => {
    const admin = ctx.firestore();
    await setDoc(doc(admin, 'newsletter', SUB_ID), pendingSubscription());
    await setDoc(doc(admin, 'newsletter_archive', ISSUE_ID), issue());
  });
}

const asAnon = () => env().unauthenticatedContext().firestore();
const asMember = () =>
  env().authenticatedContext('member-uid', memberToken()).firestore();
const asEditor = () =>
  env()
    .authenticatedContext(EDITOR, groupToken('newsletter-editor'))
    .firestore();
const asAdmin = () =>
  env().authenticatedContext('admin-uid', adminToken()).firestore();

describe.skipIf(!emulatorRunning)('firestore.rules — newsletter (F21)', () => {
  it('anonymous cannot create a subscription, even with the exact fields the function writes', async () => {
    await assertFails(
      addDoc(collection(asAnon(), 'newsletter'), pendingSubscription())
    );
  });

  it('anonymous cannot read subscriptions nor confirm one by flipping status', async () => {
    await assertFails(getDoc(doc(asAnon(), 'newsletter', SUB_ID)));
    await assertFails(getDocs(collection(asAnon(), 'newsletter')));
    await assertFails(
      updateDoc(doc(asAnon(), 'newsletter', SUB_ID), { status: 'confirmed' })
    );
  });

  it('a member cannot read or update subscriptions', async () => {
    await assertFails(getDoc(doc(asMember(), 'newsletter', SUB_ID)));
    await assertFails(
      updateDoc(doc(asMember(), 'newsletter', SUB_ID), {
        status: 'confirmed',
      })
    );
  });

  it('newsletter-editor (nl:v.a) and admin can read subscriptions', async () => {
    await assertSucceeds(getDocs(collection(asEditor(), 'newsletter')));
    await assertSucceeds(getDoc(doc(asAdmin(), 'newsletter', SUB_ID)));
  });
});

describe.skipIf(!emulatorRunning)(
  'firestore.rules — newsletter_archive send receipt (F21)',
  () => {
    it('the editor can still edit the issue', async () => {
      await assertSucceeds(
        updateDoc(doc(asEditor(), 'newsletter_archive', ISSUE_ID), {
          title: 'Boletín #7 (corregido)',
          updatedAt: new Date(),
        })
      );
    });

    it('neither editor nor admin can set sentAt / recipientCount / sentBy from the client', async () => {
      for (const db of [asEditor(), asAdmin()]) {
        await assertFails(
          updateDoc(doc(db, 'newsletter_archive', ISSUE_ID), {
            sentAt: new Date(),
          })
        );
        await assertFails(
          updateDoc(doc(db, 'newsletter_archive', ISSUE_ID), {
            recipientCount: 999,
          })
        );
        await assertFails(
          updateDoc(doc(db, 'newsletter_archive', ISSUE_ID), {
            sentBy: 'someone',
          })
        );
      }
    });

    it('a new issue cannot be created with a send receipt', async () => {
      // Same shape createNewsletter (src/lib/newsletter.ts) writes, which
      // the create rule accepts, plus the forged receipt.
      const payload = {
        ...issue(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await assertSucceeds(
        setDoc(doc(asEditor(), 'newsletter_archive', 'issue-ok'), payload)
      );
      await assertFails(
        setDoc(doc(asEditor(), 'newsletter_archive', 'issue-forged'), {
          ...payload,
          sentAt: new Date(),
          recipientCount: 1,
        })
      );
    });
  }
);
