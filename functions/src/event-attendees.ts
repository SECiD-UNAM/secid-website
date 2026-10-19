/**
 * events/{eventId}.currentAttendees counter.
 *
 * firestore.rules let a verified member create and delete their own
 * events/{eventId}/registrations/{uid} document but not update the event
 * itself (only RBAC event editors can), so the counter the listing and
 * the detail page show is maintained here: +1 on registration create,
 * -1 on delete, clamped at 0, inside a transaction so concurrent
 * registrations do not lose increments.
 */
import {
  onDocumentCreated,
  onDocumentDeleted,
} from 'firebase-functions/v2/firestore';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import './init';

const REGISTRATION_PATH = 'events/{eventId}/registrations/{registrationId}';

/**
 * Adds `delta` to the event's currentAttendees (never below 0).
 * Returns the new value, or null when the event document does not exist.
 */
export async function adjustAttendeeCount(
  db: Firestore,
  eventId: string,
  delta: number
): Promise<number | null> {
  const eventRef = db.collection('events').doc(eventId);
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(eventRef);
    if (!snapshot.exists) {
      console.warn(`event-attendees: events/${eventId} not found, skipping`);
      return null;
    }
    const current = Number(snapshot.data()?.currentAttendees ?? 0);
    const next = Math.max(0, current + delta);
    tx.update(eventRef, { currentAttendees: next });
    return next;
  });
}

export const onEventRegistrationCreated = onDocumentCreated(
  REGISTRATION_PATH,
  async (event) => {
    await adjustAttendeeCount(getFirestore(), event.params.eventId, 1);
  }
);

export const onEventRegistrationDeleted = onDocumentDeleted(
  REGISTRATION_PATH,
  async (event) => {
    await adjustAttendeeCount(getFirestore(), event.params.eventId, -1);
  }
);
