// @vitest-environment node
/**
 * Rules coverage for the event-registration flow (ROADMAP G24).
 *
 * The registration document is built by
 * src/lib/events/registrationPayload.ts — the same code
 * EventRegistrationForm writes with — so these tests assert that what the
 * client actually sends is what firestore.rules accept:
 *
 *   - events/{eventId}/registrations/{uid}: a verified, active member can
 *     create their own registration; the legacy shape (no eventId) and a
 *     registration for someone else are denied; the owner can read and
 *     delete it; a stranger cannot read it.
 *   - events/{eventId}.currentAttendees is NOT writable by a member (the
 *     counter is maintained by the Cloud Function trigger).
 *   - users/{uid}/registeredEvents/{eventId}: owner-only.
 *
 * Order-independent (see job-applications.rules.test.ts): idempotent
 * fixtures, own emulator project, cleared once in beforeAll.
 */
import { describe, it, beforeAll, afterAll } from 'vitest';
import {
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { buildEventRegistrationDoc } from '../../src/lib/events/registrationPayload';
import {
  createTestEnv,
  emulatorReachable,
  memberToken,
  verifiedMemberDoc,
} from './harness';

const MEMBER = 'member-uid';
const STRANGER = 'stranger-uid';
const ORGANIZER = 'organizer-uid';
const EVENT_ID = 'event-1';

const emulatorRunning = await emulatorReachable();
let testEnv: RulesTestEnvironment | undefined;

beforeAll(async () => {
  if (!emulatorRunning) return;
  testEnv = await createTestEnv('events');
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

function env(): RulesTestEnvironment {
  if (!testEnv) throw new Error('testEnv not initialized');
  return testEnv;
}

/** Firestore as a signed-in member carrying production-like claims. */
function memberDb(uid: string) {
  return env().authenticatedContext(uid, memberToken()).firestore();
}

async function seedMembersAndEvent() {
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
    await setDoc(doc(admin, 'events', EVENT_ID), {
      title: 'Webinar de prueba',
      description: 'd'.repeat(60),
      startDate: new Date(Date.now() + 86_400_000),
      createdBy: ORGANIZER,
      status: 'published',
      currentAttendees: 12,
      maxAttendees: 100,
    });
  });
}

function registration(userId = MEMBER) {
  return buildEventRegistrationDoc({
    eventId: EVENT_ID,
    userId,
    registrationId: 'reg-1',
    userName: 'Test Member',
    userEmail: 'member@example.com',
  });
}

describe.skipIf(!emulatorRunning)(
  'firestore.rules — events/{eventId}/registrations',
  () => {
    it('verified member can create the registration the form builds (doc id = uid)', async () => {
      await seedMembersAndEvent();
      const db = memberDb(MEMBER);
      await assertSucceeds(
        setDoc(
          doc(db, 'events', EVENT_ID, 'registrations', MEMBER),
          registration()
        )
      );
    });

    it('the legacy payload (no eventId) is denied', async () => {
      await seedMembersAndEvent();
      const db = memberDb(MEMBER);
      const { eventId: _eventId, ...legacy } = {
        ...registration(),
        eventId: EVENT_ID,
      };
      await assertFails(
        setDoc(doc(db, 'events', EVENT_ID, 'registrations', MEMBER), {
          ...legacy,
          registeredAt: serverTimestamp(),
        })
      );
    });

    it('a member cannot register someone else', async () => {
      await seedMembersAndEvent();
      const db = memberDb(STRANGER);
      await assertFails(
        setDoc(
          doc(db, 'events', EVENT_ID, 'registrations', MEMBER),
          registration()
        )
      );
    });

    // NOTE: the default member claims include ev:v.a ("view all events"),
    // which the read rule also honours for registrations, so a fellow
    // member CAN read this document; only a user without view-all cannot.
    it('owner can read and delete their registration; a user without ev:v.a cannot read it', async () => {
      await seedMembersAndEvent();
      await env().withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), 'events', EVENT_ID, 'registrations', 'owner-rw'),
          { ...registration('owner-rw'), registeredAt: new Date() }
        );
        await setDoc(
          doc(ctx.firestore(), 'users', 'owner-rw'),
          verifiedMemberDoc('owner-rw@example.com')
        );
      });
      const owner = memberDb('owner-rw');
      const ref = doc(owner, 'events', EVENT_ID, 'registrations', 'owner-rw');
      await assertSucceeds(getDoc(ref));
      const noViewAll = env()
        .authenticatedContext(STRANGER, { rbac: { g: [], p: '' } })
        .firestore();
      await assertFails(
        getDoc(doc(noViewAll, 'events', EVENT_ID, 'registrations', 'owner-rw'))
      );
      await assertSucceeds(deleteDoc(ref));
    });

    it('a member cannot bump events/{id}.currentAttendees themselves', async () => {
      await seedMembersAndEvent();
      const db = memberDb(MEMBER);
      await assertFails(
        updateDoc(doc(db, 'events', EVENT_ID), {
          currentAttendees: increment(1),
        })
      );
    });
  }
);

describe.skipIf(!emulatorRunning)(
  'firestore.rules — users/{uid}/registeredEvents',
  () => {
    const entry = () => ({
      eventId: EVENT_ID,
      eventTitle: 'Webinar de prueba',
      registrationId: 'reg-1',
      registeredAt: serverTimestamp(),
      status: 'registered',
    });

    it('owner can create, read and delete their entry', async () => {
      await seedMembersAndEvent();
      const db = memberDb(MEMBER);
      const ref = doc(db, 'users', MEMBER, 'registeredEvents', EVENT_ID);
      await assertSucceeds(setDoc(ref, entry()));
      await assertSucceeds(getDoc(ref));
      await assertSucceeds(deleteDoc(ref));
    });

    it('another member cannot read or write it', async () => {
      await seedMembersAndEvent();
      const db = memberDb(STRANGER);
      const ref = doc(db, 'users', MEMBER, 'registeredEvents', EVENT_ID);
      await assertFails(setDoc(ref, entry()));
      await assertFails(getDoc(ref));
    });
  }
);
