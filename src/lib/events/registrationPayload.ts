import { serverTimestamp, type DocumentData } from 'firebase/firestore';

/**
 * Builds the `events/{eventId}/registrations/{uid}` document that
 * EventRegistrationForm writes. Kept out of the component so tests/rules
 * can assert that exactly what the client sends is what firestore.rules
 * accept.
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
  const { eventId: _eventId, ...rest } = input;
  return {
    ...rest,
    registeredAt: serverTimestamp(),
    attendanceStatus: 'registered',
  };
}
