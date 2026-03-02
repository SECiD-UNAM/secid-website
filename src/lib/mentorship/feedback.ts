/**
 * Mentorship feedback, statistics, and rating operations.
 */

import { db } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  addDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import type {
  MentorProfile,
  MentorshipMatch,
  MentorshipFeedback,
  MentorshipStats
} from '../../types';
import { COLLECTIONS, firestoreToDate } from './constants';

export async function createMentorshipFeedback(
  feedback: Omit<MentorshipFeedback, 'id' | 'createdAt'>
): Promise<MentorshipFeedback> {
  try {
    const feedbackData = {
      ...feedback,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.FEEDBACK), feedbackData);

    // Update mentor's rating if this is feedback for a mentor
    if (feedback['type'] === 'session' || feedback['type'] === 'overall') {
      await updateMentorRating(feedback.toUserId);
    }

    return {
      ...feedback,
      id: docRef['id'],
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Error creating mentorship feedback:', error);
    throw new Error('Failed to create feedback');
  }
}

async function updateMentorRating(mentorId: string): Promise<void> {
  try {
    const q = query(
      collection(db, COLLECTIONS.FEEDBACK),
      where('toUserId', '==', mentorId)
    );

    const querySnapshot = await getDocs(q);
    const feedbacks: MentorshipFeedback[] = [];

    querySnapshot.forEach((doc) => {
      feedbacks.push({ ...doc.data(), id: doc['id'] } as unknown as MentorshipFeedback);
    });

    if (feedbacks.length === 0) return;

    const totalRating = feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0);
    const averageRating = totalRating / feedbacks.length;

    const mentorRef = doc(db, COLLECTIONS.MENTORS, mentorId);
    await updateDoc(mentorRef, {
      rating: averageRating,
      totalSessions: feedbacks.filter(f => f['type'] === 'session').length,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating mentor rating:', error);
  }
}

export async function getMentorshipStats(): Promise<MentorshipStats> {
  try {
    const [mentorsSnap, menteesSnap, matchesSnap, feedbackSnap] = await Promise.all([
      getDocs(query(collection(db, COLLECTIONS.MENTORS), where('isActive', '==', true))),
      getDocs(query(collection(db, COLLECTIONS.MENTEES), where('isActive', '==', true))),
      getDocs(query(collection(db, COLLECTIONS.MATCHES), where('status', '==', 'active'))),
      getDocs(collection(db, COLLECTIONS.FEEDBACK))
    ]);

    const mentors: MentorProfile[] = [];
    mentorsSnap.forEach((doc) => {
      const data = doc.data();
      mentors.push({
        ...data,
        id: doc['id'],
        joinedAt: firestoreToDate(data['joinedAt']),
        updatedAt: firestoreToDate(data['updatedAt'])
      } as unknown as MentorProfile);
    });

    const feedbacks: MentorshipFeedback[] = [];
    feedbackSnap.forEach((doc) => {
      feedbacks.push({ ...doc.data(), id: doc['id'] } as unknown as MentorshipFeedback);
    });

    // Calculate popular skills
    const skillCounts: Record<string, number> = {};
    mentors.forEach(mentor => {
      mentor.expertiseAreas.forEach((skill: string) => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });

    const popularSkills = Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate success rate
    const completedMatches = await getDocs(
      query(collection(db, COLLECTIONS.MATCHES), where('status', '==', 'completed'))
    );

    const totalMatches = matchesSnap.size + completedMatches.size;
    const successRate = totalMatches > 0 ? completedMatches.size / totalMatches : 0;

    // Calculate average rating
    const averageRating = feedbacks.length > 0
      ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
      : 0;

    // Calculate average match score
    const matches: MentorshipMatch[] = [];
    matchesSnap.forEach((doc) => {
      matches.push({ ...doc.data(), id: doc['id'] } as unknown as MentorshipMatch);
    });

    const averageMatchScore = matches.length > 0
      ? matches.reduce((sum, m) => sum + m.matchScore, 0) / matches.length
      : 0;

    return {
      totalMentors: mentorsSnap.size,
      totalMentees: menteesSnap.size,
      activeMatches: matchesSnap.size,
      completedSessions: feedbacks.filter(f => f['type'] === 'session').length,
      averageRating,
      averageMatchScore,
      topExpertise: popularSkills,
      popularSkills,
      successRate
    };
  } catch (error) {
    console.error('Error getting mentorship stats:', error);
    throw new Error('Failed to load statistics');
  }
}
