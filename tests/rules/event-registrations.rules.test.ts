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
 *     delete it; a fellow member (who carries ev:v.a) cannot read or list
 *     it (G27a); the event creator, event editors (ev:e.a) and admins can.
 *   - events/{eventId}.currentAttendees is NOT writable by a member (the
 *     counter is maintained by the Cloud Function trigger).
 *   - users/{uid}/registeredEvents/{eventId}: owner-only.
 *   - users/{uid}/savedEvents/{eventId} ("Guardar evento", G27b): owner can
 *     create the shape EventDetail.handleSaveEvent writes, read and delete
 *     it; another member cannot.
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
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { buildEventRegistrationDoc } from '../../src/lib/events/registrationPayload';
import {
  adminToken,
  createTestEnv,
  emulatorReachable,
  groupToken,
  memberToken,
  verifiedMemberDoc,
} from './harness';

const MEMBER = 'member-uid';
const STRANGER = 'stranger-uid';
const ORGANIZER = 'organizer-uid';
/** Pre-seeded attendee the read tests target (never written by MEMBER's
 *  create test, which would otherwise turn into an update). */
const ATTENDEE = 'attendee-uid';
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

/** Existing registration (+ its verified users doc) written as the server. */
async function seedRegistration(userId: string) {
  await env().withSecurityRulesDisabled(async (ctx) => {
    await setDoc(
      doc(ctx.firestore(), 'events', EVENT_ID, 'registrations', userId),
      { ...registration(userId), registeredAt: new Date() }
    );
    await setDoc(
      doc(ctx.firestore(), 'users', userId),
      verifiedMemberDoc(`${userId}@example.com`)
    );
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

    it('owner can read and delete their registration', async () => {
      await seedMembersAndEvent();
      await seedRegistration('owner-rw');
      const owner = memberDb('owner-rw');
      const ref = doc(owner, 'events', EVENT_ID, 'registrations', 'owner-rw');
      await assertSucceeds(getDoc(ref));
      await assertSucceeds(deleteDoc(ref));
    });

    // G27(a): the default member claims carry ev:v.a ("view all events"),
    // which must NOT expose other attendees' name and email.
    it("a fellow member (ev:v.a) cannot read or list another member's registration", async () => {
      await seedMembersAndEvent();
      await seedRegistration(ATTENDEE);
      const db = memberDb(STRANGER);
      await assertFails(
        getDoc(doc(db, 'events', EVENT_ID, 'registrations', ATTENDEE))
      );
      await assertFails(
        getDocs(collection(db, 'events', EVENT_ID, 'registrations'))
      );
    });

    it('a member can list only their own registrations (query scoped to userId)', async () => {
      await seedMembersAndEvent();
      await seedRegistration(ATTENDEE);
      const db = memberDb(MEMBER);
      await assertSucceeds(
        getDocs(
          query(
            collection(db, 'events', EVENT_ID, 'registrations'),
            where('userId', '==', MEMBER)
          )
        )
      );
    });

    it('the event creator, an event editor (ev:e.a) and an admin can read and list registrations', async () => {
      await seedMembersAndEvent();
      await seedRegistration(ATTENDEE);
      const readers = [
        env().authenticatedContext(ORGANIZER, memberToken()).firestore(),
        env()
          .authenticatedContext('editor-uid', groupToken('event-manager'))
          .firestore(),
        env().authenticatedContext('admin-uid', adminToken()).firestore(),
      ];
      for (const db of readers) {
        await assertSucceeds(
          getDoc(doc(db, 'events', EVENT_ID, 'registrations', ATTENDEE))
        );
        await assertSucceeds(
          getDocs(collection(db, 'events', EVENT_ID, 'registrations'))
        );
      }
    });

    it('a user with no RBAC claims cannot read a registration', async () => {
      await seedMembersAndEvent();
      await seedRegistration(ATTENDEE);
      const noClaims = env()
        .authenticatedContext(STRANGER, { rbac: { g: [], p: '' } })
        .firestore();
      await assertFails(
        getDoc(doc(noClaims, 'events', EVENT_ID, 'registrations', ATTENDEE))
      );
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

describe.skipIf(!emulatorRunning)(
  'firestore.rules — users/{uid}/savedEvents',
  () => {
    /** What EventDetail.handleSaveEvent writes. */
    const saved = () => ({
      eventId: EVENT_ID,
      eventTitle: 'Webinar de prueba',
      eventDate: new Date(Date.now() + 86_400_000),
      savedAt: serverTimestamp(),
    });

    it('owner can save, read and unsave an event', async () => {
      await seedMembersAndEvent();
      const db = memberDb(MEMBER);
      const ref = doc(db, 'users', MEMBER, 'savedEvents', EVENT_ID);
      await assertSucceeds(setDoc(ref, saved()));
      await assertSucceeds(getDoc(ref));
      await assertSucceeds(deleteDoc(ref));
    });

    it('the saved entry must point at the event it is filed under', async () => {
      await seedMembersAndEvent();
      const db = memberDb(MEMBER);
      await assertFails(
        setDoc(doc(db, 'users', MEMBER, 'savedEvents', 'other-event'), saved())
      );
    });

    it('another member cannot read, write or delete it', async () => {
      await seedMembersAndEvent();
      // Own owner uid: the owner test above creates MEMBER's entry itself
      // and tests run shuffled, so a pre-seeded doc there would turn its
      // setDoc into an (unallowed) update.
      const owner = 'saved-owner-uid';
      await env().withSecurityRulesDisabled(async (ctx) => {
        await setDoc(
          doc(ctx.firestore(), 'users', owner, 'savedEvents', EVENT_ID),
          { ...saved(), savedAt: new Date() }
        );
      });
      const db = memberDb(STRANGER);
      const ref = doc(db, 'users', owner, 'savedEvents', EVENT_ID);
      await assertFails(getDoc(ref));
      await assertFails(setDoc(ref, saved()));
      await assertFails(deleteDoc(ref));
    });
  }
);
