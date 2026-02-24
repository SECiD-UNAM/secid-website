import { db, storage } from './firebase';

/**
 * Mentorship Platform Firebase Operations
 * This module provides all Firebase operations for the mentorship system
 */

import {
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  writeBatch,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import {
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import type { 
  MentorProfile, 
  MenteeProfile, 
  MentorshipMatch, 
  MentorshipSession,
  MentorshipRequest,
  MentorshipFeedback,
  MentorshipGoal,
  MentorshipResource,
  MentorshipStats
} from '../types';

// Collection names
const COLLECTIONS = {
  MENTORS: 'mentors',
  MENTEES: 'mentees', 
  MATCHES: 'mentorship_matches',
  SESSIONS: 'mentorship_sessions',
  REQUESTS: 'mentorship_requests',
  FEEDBACK: 'mentorship_feedback',
  GOALS: 'mentorship_goals',
  RESOURCES: 'mentorship_resources'
} as const;

// Utility functions for date conversion
const firestoreToDate = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
};

const dateToFirestore = (date: Date) => {
  return Timestamp.fromDate(date);
};

// Mentor Profile Operations
export async function getMentorProfile(userId: string): Promise<MentorProfile | null> {
  try {
    const docRef = doc(db, COLLECTIONS.MENTORS, userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap['id'],
        joinedAt: firestoreToDate(data['joinedAt']),
        updatedAt: firestoreToDate(data['updatedAt'])
      } as unknown as MentorProfile;
    }

    return null;
  } catch (error) {
    console.error('Error getting mentor profile:', error);
    throw new Error('Failed to load mentor profile');
  }
}

export async function getMentorProfiles(filters?: {
  isActive?: boolean;
  expertiseAreas?: string[];
  limit?: number;
}): Promise<MentorProfile[]> {
  try {
    let q = query(collection(db, COLLECTIONS.MENTORS));
    
    if (filters?.isActive !== undefined) {
      q = query(q, where('isActive', '==', filters.isActive));
    }
    
    if (filters?.expertiseAreas && filters.expertiseAreas.length > 0) {
      q = query(q, where('expertiseAreas', 'array-contains-any', filters.expertiseAreas));
    }
    
    q = query(q, orderBy('rating', 'desc'));
    
    if (filters?.limit) {
      q = query(q, limit(filters.limit));
    }
    
    const querySnapshot = await getDocs(q);
    const mentors: MentorProfile[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      mentors.push({
        ...data,
        id: doc['id'],
        joinedAt: firestoreToDate(data['joinedAt']),
        updatedAt: firestoreToDate(data['updatedAt'])
      } as unknown as MentorProfile);
    });

    return mentors;
  } catch (error) {
    console.error('Error getting mentor profiles:', error);
    throw new Error('Failed to load mentor profiles');
  }
}

export async function createMentorProfile(profile: MentorProfile): Promise<MentorProfile> {
  try {
    const profileData = {
      ...profile,
      joinedAt: dateToFirestore(profile.joinedAt),
      updatedAt: dateToFirestore(profile['updatedAt'])
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.MENTORS), profileData);
    
    return {
      ...profile,
      id: docRef['id']
    };
  } catch (error) {
    console.error('Error creating mentor profile:', error);
    throw new Error('Failed to create mentor profile');
  }
}

export async function updateMentorProfile(
  userId: string, 
  updates: Partial<MentorProfile>
): Promise<MentorProfile> {
  try {
    const docRef = doc(db, COLLECTIONS.MENTORS, userId);
    const updateData: Record<string, any> = {
      ...updates,
      updatedAt: serverTimestamp()
    };

    if (updates.joinedAt) {
      updateData.joinedAt = dateToFirestore(updates.joinedAt);
    }

    await updateDoc(docRef, updateData);

    // Return updated profile
    const updatedProfile = await getMentorProfile(userId);
    if (!updatedProfile) {
      throw new Error('Profile not found after update');
    }

    return updatedProfile;
  } catch (error) {
    console.error('Error updating mentor profile:', error);
    throw new Error('Failed to update mentor profile');
  }
}

// Mentee Profile Operations
export async function getMenteeProfile(userId: string): Promise<MenteeProfile | null> {
  try {
    const docRef = doc(db, COLLECTIONS.MENTEES, userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap['id'],
        joinedAt: firestoreToDate(data['joinedAt']),
        updatedAt: firestoreToDate(data['updatedAt'])
      } as unknown as MenteeProfile;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting mentee profile:', error);
    throw new Error('Failed to load mentee profile');
  }
}

export async function createMenteeProfile(profile: MenteeProfile): Promise<MenteeProfile> {
  try {
    const profileData = {
      ...profile,
      joinedAt: dateToFirestore(profile.joinedAt),
      updatedAt: dateToFirestore(profile['updatedAt'])
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.MENTEES), profileData);
    
    return {
      ...profile,
      id: docRef['id']
    };
  } catch (error) {
    console.error('Error creating mentee profile:', error);
    throw new Error('Failed to create mentee profile');
  }
}

export async function updateMenteeProfile(
  userId: string, 
  updates: Partial<MenteeProfile>
): Promise<MenteeProfile> {
  try {
    const docRef = doc(db, COLLECTIONS.MENTEES, userId);
    const updateData: Record<string, any> = {
      ...updates,
      updatedAt: serverTimestamp()
    };

    if (updates.joinedAt) {
      updateData.joinedAt = dateToFirestore(updates.joinedAt);
    }

    await updateDoc(docRef, updateData);

    // Return updated profile
    const updatedProfile = await getMenteeProfile(userId);
    if (!updatedProfile) {
      throw new Error('Profile not found after update');
    }

    return updatedProfile;
  } catch (error) {
    console.error('Error updating mentee profile:', error);
    throw new Error('Failed to update mentee profile');
  }
}

// Matching System
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
    
    compatibility.availability = sharedDays.length / 7; // Max 7 days
    
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
    const ratingBonus = (mentor.rating - 3) * 0.05; // Max 0.1 bonus
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

// Match Operations
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

// Request Operations
export async function getMentorshipRequests(filters: {
  mentorId?: string;
  menteeId?: string;
  requestId?: string;
  status?: string;
}): Promise<MentorshipRequest[]> {
  try {
    let q = query(collection(db, COLLECTIONS.REQUESTS));
    
    if (filters.requestId) {
      const docRef = doc(db, COLLECTIONS.REQUESTS, filters.requestId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return [{
          ...data,
          id: docSnap['id'],
          createdAt: firestoreToDate(data['createdAt']),
          respondedAt: data['respondedAt'] ? firestoreToDate(data['respondedAt']) : undefined
        } as unknown as MentorshipRequest];
      }
      
      return [];
    }
    
    if (filters.mentorId) {
      q = query(q, where('mentorId', '==', filters.mentorId));
    }
    
    if (filters.menteeId) {
      q = query(q, where('menteeId', '==', filters.menteeId));
    }
    
    if (filters['status']) {
      q = query(q, where('status', '==', filters['status']));
    }
    
    q = query(q, orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    const requests: MentorshipRequest[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        ...data,
        id: doc['id'],
        createdAt: firestoreToDate(data['createdAt']),
        respondedAt: data['respondedAt'] ? firestoreToDate(data['respondedAt']) : undefined
      } as unknown as MentorshipRequest);
    });
    
    return requests;
  } catch (error) {
    console.error('Error getting mentorship requests:', error);
    throw new Error('Failed to load requests');
  }
}

export async function createMentorshipRequest(
  request: Omit<MentorshipRequest, 'id' | 'createdAt' | 'respondedAt'>
): Promise<MentorshipRequest> {
  try {
    const requestData = {
      ...request,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.REQUESTS), requestData);
    
    return {
      ...request,
      id: docRef['id'],
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Error creating mentorship request:', error);
    throw new Error('Failed to create request');
  }
}

export async function updateMentorshipRequest(
  requestId: string,
  updates: Partial<MentorshipRequest>
): Promise<MentorshipRequest> {
  try {
    const docRef = doc(db, COLLECTIONS.REQUESTS, requestId);
    const updateData: Record<string, any> = { ...updates };

    if (updates.respondedAt) {
      updateData.respondedAt = dateToFirestore(updates.respondedAt);
    }

    await updateDoc(docRef, updateData);

    // If request is accepted, create a match
    if (updates['status'] === 'accepted') {
      const requestDoc = await getDoc(docRef);
      if (requestDoc.exists()) {
        const requestData = requestDoc.data() as MentorshipRequest;
        
        await createMentorshipMatch({
          mentorId: requestData.mentorId,
          menteeId: requestData.menteeId,
          status: 'active',
          matchScore: 0.8, // Default score for accepted requests
          matchReason: ['Accepted mentorship request'],
          requestMessage: requestData['message'],
          goals: requestData.goals,
          meetingFrequency: requestData.meetingFrequency || '',
          communicationPreference: requestData.communicationPreference || '',
          sessionsCompleted: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          startDate: new Date()
        });
      }
    }
    
    // Return updated request
    const requests = await getMentorshipRequests({ requestId });
    if (!requests[0]) {
      throw new Error('Request not found after update');
    }
    return requests[0];
  } catch (error) {
    console.error('Error updating mentorship request:', error);
    throw new Error('Failed to update request');
  }
}

// Session Operations
export async function getMentorshipSessions(filters: {
  matchId?: string;
  userId?: string;
  sessionId?: string;
  status?: string;
}): Promise<MentorshipSession[]> {
  try {
    let q = query(collection(db, COLLECTIONS.SESSIONS));
    
    if (filters.sessionId) {
      const docRef = doc(db, COLLECTIONS.SESSIONS, filters.sessionId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return [{
          ...data,
          id: docSnap['id'],
          scheduledAt: firestoreToDate(data['scheduledAt']),
          createdAt: firestoreToDate(data['createdAt']),
          updatedAt: firestoreToDate(data['updatedAt']),
          homework: data['homework']?.map((hw: any) => ({
            ...hw,
            dueDate: hw.dueDate ? firestoreToDate(hw.dueDate) : undefined
          }))
        } as unknown as MentorshipSession];
      }
      
      return [];
    }
    
    if (filters.matchId) {
      q = query(q, where('matchId', '==', filters.matchId));
    }
    
    if (filters['userId']) {
      q = query(q, where('mentorId', '==', filters['userId']));
      // TODO: Also query for menteeId - need compound query
    }
    
    if (filters['status']) {
      q = query(q, where('status', '==', filters['status']));
    }
    
    q = query(q, orderBy('scheduledAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    const sessions: MentorshipSession[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      sessions.push({
        ...data,
        id: doc['id'],
        scheduledAt: firestoreToDate(data['scheduledAt']),
        createdAt: firestoreToDate(data['createdAt']),
        updatedAt: firestoreToDate(data['updatedAt']),
        homework: data['homework']?.map((hw: any) => ({
          ...hw,
          dueDate: hw.dueDate ? firestoreToDate(hw.dueDate) : undefined
        }))
      } as unknown as MentorshipSession);
    });
    
    return sessions;
  } catch (error) {
    console.error('Error getting mentorship sessions:', error);
    throw new Error('Failed to load sessions');
  }
}

export async function getUpcomingSessions(userId: string): Promise<MentorshipSession[]> {
  try {
    const now = new Date();
    
    // Query for sessions where user is mentor
    const mentorQuery = query(
      collection(db, COLLECTIONS.SESSIONS),
      where('mentorId', '==', userId),
      where('scheduledAt', '>', dateToFirestore(now)),
      where('status', '==', 'scheduled'),
      orderBy('scheduledAt', 'asc'),
      limit(10)
    );
    
    // Query for sessions where user is mentee
    const menteeQuery = query(
      collection(db, COLLECTIONS.SESSIONS),
      where('menteeId', '==', userId),
      where('scheduledAt', '>', dateToFirestore(now)),
      where('status', '==', 'scheduled'),
      orderBy('scheduledAt', 'asc'),
      limit(10)
    );
    
    const [mentorSessions, menteeSessions] = await Promise.all([
      getDocs(mentorQuery),
      getDocs(menteeQuery)
    ]);
    
    const sessions: MentorshipSession[] = [];
    
    [...mentorSessions.docs, ...menteeSessions.docs].forEach((doc) => {
      const data = doc.data();
      sessions.push({
        ...data,
        id: doc['id'],
        scheduledAt: firestoreToDate(data['scheduledAt']),
        createdAt: firestoreToDate(data['createdAt']),
        updatedAt: firestoreToDate(data['updatedAt']),
        homework: data['homework']?.map((hw: any) => ({
          ...hw,
          dueDate: hw.dueDate ? firestoreToDate(hw.dueDate) : undefined
        }))
      } as unknown as MentorshipSession);
    });
    
    // Remove duplicates and sort by date
    const uniqueSessions = sessions.filter((session, index, self) =>
      index === self.findIndex(s => s['id'] === session['id'])
    );
    
    return uniqueSessions.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  } catch (error) {
    console.error('Error getting upcoming sessions:', error);
    throw new Error('Failed to load upcoming sessions');
  }
}

export async function createMentorshipSession(
  session: Omit<MentorshipSession, 'id'>
): Promise<MentorshipSession> {
  try {
    // Get match details to populate mentor/mentee IDs
    const matchDoc = await getDoc(doc(db, COLLECTIONS.MATCHES, session.matchId));
    if (!matchDoc.exists()) {
      throw new Error('Match not found');
    }
    
    const matchData = matchDoc['data']();
    
    const sessionData = {
      ...session,
      mentorId: matchData.mentorId,
      menteeId: matchData.menteeId,
      scheduledAt: dateToFirestore(session.scheduledAt),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      homework: session?.homework?.map((hw: { dueDate?: Date; [key: string]: any }) => ({
        ...hw,
        dueDate: hw.dueDate ? dateToFirestore(hw.dueDate) : null
      }))
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.SESSIONS), sessionData);
    
    return {
      ...session,
      id: docRef['id'],
      mentorId: matchData.mentorId,
      menteeId: matchData.menteeId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error creating mentorship session:', error);
    throw new Error('Failed to create session');
  }
}

export async function updateMentorshipSession(
  sessionId: string,
  updates: Partial<MentorshipSession>
): Promise<MentorshipSession> {
  try {
    const docRef = doc(db, COLLECTIONS.SESSIONS, sessionId);
    const updateData: Record<string, any> = { ...updates };

    if (updates.scheduledAt) {
      updateData.scheduledAt = dateToFirestore(updates.scheduledAt);
    }

    if (updates.homework) {
      updateData.homework = updates.homework.map((hw: { dueDate?: Date; [key: string]: any }) => ({
        ...hw,
        dueDate: hw.dueDate ? dateToFirestore(hw.dueDate) : null
      }));
    }

    updateData['updatedAt'] = serverTimestamp();

    await updateDoc(docRef, updateData);

    // Return updated session
    const sessions = await getMentorshipSessions({ sessionId });
    if (!sessions[0]) {
      throw new Error('Session not found after update');
    }
    return sessions[0];
  } catch (error) {
    console.error('Error updating mentorship session:', error);
    throw new Error('Failed to update session');
  }
}

// Feedback Operations
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
    // Get all feedback for this mentor
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
    
    // Calculate average rating
    const totalRating = feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0);
    const averageRating = totalRating / feedbacks.length;
    
    // Update mentor profile
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

// Statistics
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
    
    // Calculate success rate (matches that completed successfully)
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

// File Upload Operations
export async function uploadProfileImage(userId: string, file: File): Promise<string> {
  try {
    const imageRef = storageRef(storage, `mentorship/profiles/${userId}/${file['name']}`);
    const snapshot = await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(snapshot['ref']);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw new Error('Failed to upload image');
  }
}

// Real-time Subscriptions
export function subscribeMentorshipRequests(
  userId: string,
  callback: (requests: MentorshipRequest[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTIONS.REQUESTS),
    where('mentorId', '==', userId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const requests: MentorshipRequest[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        ...data,
        id: doc['id'],
        createdAt: firestoreToDate(data['createdAt']),
        respondedAt: data['respondedAt'] ? firestoreToDate(data['respondedAt']) : undefined
      } as unknown as MentorshipRequest);
    });
    
    callback(requests);
  }, (error) => {
    console.error('Error in requests subscription:', error);
  });
}

export function subscribeUpcomingSessions(
  userId: string,
  callback: (sessions: MentorshipSession[]) => void
): () => void {
  const now = new Date();
  
  const q = query(
    collection(db, COLLECTIONS.SESSIONS),
    where('mentorId', '==', userId),
    where('scheduledAt', '>', dateToFirestore(now)),
    where('status', '==', 'scheduled'),
    orderBy('scheduledAt', 'asc'),
    limit(5)
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const sessions: MentorshipSession[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      sessions.push({
        ...data,
        id: doc['id'],
        scheduledAt: firestoreToDate(data['scheduledAt']),
        createdAt: firestoreToDate(data['createdAt']),
        updatedAt: firestoreToDate(data['updatedAt'])
      } as unknown as MentorshipSession);
    });
    
    callback(sessions);
  }, (error) => {
    console.error('Error in sessions subscription:', error);
  });
}

// Resource Management
export async function createMentorshipResource(
  resource: Omit<MentorshipResource, 'id' | 'createdAt' | 'updatedAt'>
): Promise<MentorshipResource> {
  try {
    const resourceData = {
      ...resource,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.RESOURCES), resourceData);
    
    return {
      ...resource,
      id: docRef['id'],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error creating mentorship resource:', error);
    throw new Error('Failed to create resource');
  }
}

export async function getMentorshipResources(filters?: {
  category?: string;
  difficulty?: string;
  sharedBy?: string;
  tags?: string[];
}): Promise<MentorshipResource[]> {
  try {
    let q = query(collection(db, COLLECTIONS.RESOURCES));
    
    if (filters?.category) {
      q = query(q, where('category', '==', filters.category));
    }
    
    if (filters?.difficulty) {
      q = query(q, where('difficulty', '==', filters.difficulty));
    }
    
    if (filters?.sharedBy) {
      q = query(q, where('sharedBy', '==', filters.sharedBy));
    }
    
    if (filters?.tags && filters.tags.length > 0) {
      q = query(q, where('tags', 'array-contains-any', filters.tags));
    }
    
    q = query(q, orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    const resources: MentorshipResource[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      resources.push({
        ...data,
        id: doc['id'],
        createdAt: firestoreToDate(data['createdAt']),
        updatedAt: firestoreToDate(data['updatedAt'])
      } as unknown as MentorshipResource);
    });
    
    return resources;
  } catch (error) {
    console.error('Error getting mentorship resources:', error);
    throw new Error('Failed to load resources');
  }
}

// Goal Management
export async function createMentorshipGoal(
  goal: Omit<MentorshipGoal, 'id' | 'createdAt' | 'updatedAt'>
): Promise<MentorshipGoal> {
  try {
    const goalData = {
      ...goal,
      targetDate: goal.targetDate ? dateToFirestore(goal.targetDate) : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      milestones: goal.milestones.map((milestone: { completedAt?: Date; [key: string]: any }) => ({
        ...milestone,
        completedAt: milestone.completedAt ? dateToFirestore(milestone.completedAt) : null
      }))
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.GOALS), goalData);
    
    return {
      ...goal,
      id: docRef['id'],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error creating mentorship goal:', error);
    throw new Error('Failed to create goal');
  }
}

export async function updateMentorshipGoal(
  goalId: string,
  updates: Partial<MentorshipGoal>
): Promise<MentorshipGoal> {
  try {
    const docRef = doc(db, COLLECTIONS.GOALS, goalId);
    const updateData: Record<string, any> = { ...updates };

    if (updates.targetDate) {
      updateData.targetDate = dateToFirestore(updates.targetDate);
    }

    if (updates.milestones) {
      updateData.milestones = updates.milestones.map((milestone: { completedAt?: Date; [key: string]: any }) => ({
        ...milestone,
        completedAt: milestone.completedAt ? dateToFirestore(milestone.completedAt) : null
      }));
    }

    updateData['updatedAt'] = serverTimestamp();
    
    await updateDoc(docRef, updateData);
    
    // Return updated goal
    const updatedDoc = await getDoc(docRef);
    if (updatedDoc.exists()) {
      const data = updatedDoc['data']();
      return {
        ...data,
        id: updatedDoc['id'],
        targetDate: data.targetDate ? firestoreToDate(data['targetDate']) : undefined,
        createdAt: firestoreToDate(data['createdAt']),
        updatedAt: firestoreToDate(data['updatedAt']),
        milestones: data['milestones'].map((milestone: any) => ({
          ...milestone,
          completedAt: milestone.completedAt ? firestoreToDate(milestone.completedAt) : undefined
        }))
      } as unknown as MentorshipGoal;
    }
    
    throw new Error('Goal not found after update');
  } catch (error) {
    console.error('Error updating mentorship goal:', error);
    throw new Error('Failed to update goal');
  }
}

export async function getMentorshipGoals(matchId: string): Promise<MentorshipGoal[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.GOALS),
      where('matchId', '==', matchId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const goals: MentorshipGoal[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      goals.push({
        ...data,
        id: doc['id'],
        targetDate: data['targetDate'] ? firestoreToDate(data['targetDate']) : undefined,
        createdAt: firestoreToDate(data['createdAt']),
        updatedAt: firestoreToDate(data['updatedAt']),
        milestones: data['milestones'].map((milestone: any) => ({
          ...milestone,
          completedAt: milestone.completedAt ? firestoreToDate(milestone.completedAt) : undefined
        }))
      } as unknown as MentorshipGoal);
    });
    
    return goals;
  } catch (error) {
    console.error('Error getting mentorship goals:', error);
    throw new Error('Failed to load goals');
  }
}