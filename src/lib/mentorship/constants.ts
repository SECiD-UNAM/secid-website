/**
 * Shared constants and utility functions for the mentorship module.
 */

import { Timestamp } from 'firebase/firestore';

export const COLLECTIONS = {
  MENTORS: 'mentors',
  MENTEES: 'mentees',
  MATCHES: 'mentorship_matches',
  SESSIONS: 'mentorship_sessions',
  REQUESTS: 'mentorship_requests',
  FEEDBACK: 'mentorship_feedback',
  GOALS: 'mentorship_goals',
  RESOURCES: 'mentorship_resources'
} as const;

export const firestoreToDate = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
};

export const dateToFirestore = (date: Date) => {
  return Timestamp.fromDate(date);
};
