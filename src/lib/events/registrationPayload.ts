import { serverTimestamp, type DocumentData } from 'firebase/firestore';

/**
 * Builds the `events/{eventId}/registrations/{uid}` document that
 * EventRegistrationForm writes. Kept out of the component so tests/rules
 * can assert that exactly what the client sends is what firestore.rules
 * accept.
 *
 * firestore.rules require on create: userId == request.auth.uid,
 * eventId == {eventId}, registeredAt == request.time. The document id is
 * the member's uid (EventDetail reads/deletes `registrations/{uid}`), and
 * `events/{eventId}.currentAttendees` is maintained by the Cloud Function
 * triggers in functions/src/event-attendees.ts — members may not update
 * the event document.
 */
export interface EventRegistrationInput {
  eventId: string;
  userId: string;
  registrationId: string;
  userName: string;
  userEmail: string;
}

export function buildEventRegistrationDoc(
  input: EventRegistrationInput
): DocumentData {
  return {
    ...input,
    registeredAt: serverTimestamp(),
    attendanceStatus: 'registered',
  };
}
