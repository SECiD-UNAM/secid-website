/**
 * Mentorship matching algorithm and match CRUD operations.
 */

import { db } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  query,
  where,
} from 'firebase/firestore';
import type {
  MentorProfile,
  MenteeProfile,
  MentorshipMatch,
} from '../../types';
import { COLLECTIONS, firestoreToDate, dateToFirestore } from './constants';

export async function calculateMatchScore(
  mentee: MenteeProfile,
  mentor: MentorProfile
): Promise<{
  score: number;
  reasons: string[];
  compatibility: {
    skills: number;
    availability: number;
    style: number;
    language: number;
    experience: number;
  };
}> {
  try {
    const compatibility = {
      skills: 0,
      availability: 0,
      style: 0,
      language: 0,
      experience: 0
    };

    const reasons: string[] = [];

    // Skills compatibility (40% weight)
    const menteeInterests = mentee.interests.map(i => i.toLowerCase());
    const mentorExpertise = mentor.expertiseAreas.map(e => e.toLowerCase());
    const skillMatches = menteeInterests.filter(interest =>
      mentorExpertise.some(expertise =>
        expertise.includes(interest) || interest.includes(expertise)
      )
    );

    compatibility.skills = skillMatches.length / Math.max(menteeInterests.length, 1);

    if (skillMatches.length > 0) {
      reasons.push(`Shared expertise in: ${skillMatches.slice(0, 2).join(', ')}`);
    }

    // Availability compatibility (20% weight)
    const sharedDays = mentee.availability.preferredDays.filter(day =>
      mentor.availability.preferredDays.includes(day)
    );

    compatibility.availability = sharedDays.length / 7;

    if (sharedDays.length > 0) {
      reasons.push(`Available on shared days: ${sharedDays.slice(0, 3).join(', ')}`);
    }

    // Style compatibility (15% weight)
    const sharedStyles = mentee.preferredMentorshipStyle.filter(style =>
      mentor.mentorshipStyle.includes(style)
    );

    compatibility.style = sharedStyles.length / Math.max(mentee.preferredMentorshipStyle.length, 1);

    if (sharedStyles.length > 0) {
      reasons.push(`Compatible mentorship styles: ${sharedStyles?.[0]}`);
    }

    // Language compatibility (10% weight)
    const sharedLanguages = mentee.languages.filter(lang =>
      mentor.languages.includes(lang)
    );

    compatibility.language = sharedLanguages.length > 0 ? 1 : 0;

    if (sharedLanguages.length > 0) {
      reasons.push(`Shared languages: ${sharedLanguages.join(', ')}`);
    }

    // Experience level compatibility (15% weight)
    const experienceGap = mentor.experience.yearsInField - mentee.background.yearsOfExperience;

    if (experienceGap >= 3 && experienceGap <= 10) {
      compatibility.experience = 1;
      reasons.push(`Ideal experience gap for mentorship (${experienceGap} years)`);
    } else if (experienceGap >= 1) {
      compatibility.experience = 0.7;
    } else {
      compatibility.experience = 0.3;
    }

    // Calculate weighted score
    const weights = {
      skills: 0.4,
      availability: 0.2,
      style: 0.15,
      language: 0.1,
      experience: 0.15
    };

    const score = (
      compatibility.skills * weights.skills +
      compatibility.availability * weights.availability +
      compatibility.style * weights.style +
      compatibility.language * weights.language +
      compatibility.experience * weights.experience
    );

    // Add bonus for high mentor rating
    const ratingBonus = (mentor.rating - 3) * 0.05;
    const finalScore = Math.min(Math.max(score + ratingBonus, 0), 1);

    if (reasons.length === 0) {
      reasons.push('Basic compatibility based on profile information');
    }

    return {
      score: finalScore,
      reasons,
      compatibility
    };
  } catch (error) {
    console.error('Error calculating match score:', error);
    throw new Error('Failed to calculate compatibility');
  }
}

// --- Match CRUD Operations ---

export async function getUserMatches(userId: string): Promise<MentorshipMatch[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.MATCHES),
      where('mentorId', '==', userId)
    );

    const q2 = query(
      collection(db, COLLECTIONS.MATCHES),
      where('menteeId', '==', userId)
    );

    const [mentorMatches, menteeMatches] = await Promise.all([
      getDocs(q),
      getDocs(q2)
    ]);

    const matches: MentorshipMatch[] = [];

    [...mentorMatches.docs, ...menteeMatches.docs].forEach((doc) => {
      const data = doc.data();
      matches.push({
        ...data,
        id: doc['id'],
        createdAt: firestoreToDate(data['createdAt']),
        updatedAt: firestoreToDate(data['updatedAt']),
        startDate: data['startDate'] ? firestoreToDate(data['startDate']) : undefined,
        endDate: data['endDate'] ? firestoreToDate(data['endDate']) : undefined,
        lastActivity: data['lastActivity'] ? firestoreToDate(data['lastActivity']) : undefined
      } as unknown as MentorshipMatch);
    });

    return matches.sort((a, b) => b['updatedAt'].getTime() - a['updatedAt'].getTime());
  } catch (error) {
    console.error('Error getting user matches:', error);
    throw new Error('Failed to load matches');
  }
}

export async function createMentorshipMatch(match: Omit<MentorshipMatch, 'id'>): Promise<MentorshipMatch> {
  try {
    const matchData = {
      ...match,
      createdAt: dateToFirestore(match['createdAt']),
      updatedAt: dateToFirestore(match['updatedAt']),
      startDate: match.startDate ? dateToFirestore(match.startDate) : null,
      endDate: match.endDate ? dateToFirestore(match.endDate) : null,
      lastActivity: match.lastActivity ? dateToFirestore(match.lastActivity) : null
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.MATCHES), matchData);

    return {
      ...match,
      id: docRef['id']
    };
  } catch (error) {
    console.error('Error creating mentorship match:', error);
    throw new Error('Failed to create match');
  }
}
