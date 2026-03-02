/**
 * Member read operations: profiles, search, stats, recommendations.
 */

import { db, isUsingMockAPI } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import type {
  MemberProfile,
  MemberSearchFilters,
  MemberSearchResult,
  MemberStats,
  MemberRecommendation,
  vCardData,
} from '@/types/member';
import type { DirectoryStats } from '@/types/admin';
import type { MemberStatus } from '@/types/member';
import { mapUserDocToMemberProfile, createMockMemberProfile } from './mapper';

const COLLECTIONS = {
  MEMBERS: 'users',
};

/**
 * Get member profiles with optional filters and pagination
 */
export async function getMemberProfiles(options: {
  filters?: Partial<MemberSearchFilters>;
  limit?: number;
  lastDoc?: DocumentSnapshot;
} = {}): Promise<MemberProfile[]> {
  if (isUsingMockAPI()) {
    const count = options.limit || 20;
    return Array.from({ length: count }, (_, i) => createMockMemberProfile(i + 1));
  }

  try {
    const { filters = {}, limit: queryLimit = 20, lastDoc } = options;
    let q = query(collection(db, COLLECTIONS.MEMBERS));

    if (filters?.experienceLevel?.length) {
      q = query(q, where('experience.level', 'in', filters.experienceLevel));
    }

    if (filters?.locations?.length) {
      q = query(q, where('profile.location', 'in', filters.locations));
    }

    if (filters.onlineStatus) {
      q = query(q, where('isOnline', '==', true));
    }

    if (filters.isPremium) {
      q = query(q, where('isPremium', '==', true));
    }

    if (filters.hasPortfolio) {
      q = query(q, where('portfolio.projects', '!=', null));
    }

    if (filters.joinedAfter) {
      q = query(q, where('joinedAt', '>=', filters.joinedAfter));
    }

    const sortBy = filters.sortBy || 'joinDate';
    const sortOrder = filters.sortOrder || 'desc';

    switch(sortBy) {
      case 'name':
        q = query(q, orderBy('displayName', sortOrder));
        break;
      case 'joinDate':
        q = query(q, orderBy('joinedAt', sortOrder));
        break;
      case 'reputation':
        q = query(q, orderBy('activity.reputation', sortOrder));
        break;
      case 'activity':
        q = query(q, orderBy('activity.lastActive', sortOrder));
        break;
      default:
        q = query(q, orderBy('createdAt', sortOrder));
    }

    if(lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    q = query(q, limit(queryLimit));

    const snapshot = await getDocs(q);
    return snapshot['docs'].map(doc => mapUserDocToMemberProfile(doc['id'], doc.data()));
  } catch (error) {
    console.error('Error fetching member profiles:', error);
    throw error;
  }
}

/**
 * Search members with advanced filters
 */
export async function searchMembers(filters: MemberSearchFilters): Promise<MemberSearchResult[]> {
  if (isUsingMockAPI()) {
    const mockMembers = Array.from({ length: 10 }, (_, i) => createMockMemberProfile(i + 1));
    return mockMembers.map(member => ({
      member,
      matchScore: Math.floor(Math.random() * 40) + 60,
      matchReasons: ['Similar skills', 'Same location'],
      relevantSkills: member.featuredSkills.slice(0, 2)
    }));
  }

  try {
    let baseQuery = query(collection(db, COLLECTIONS.MEMBERS));

    if (filters.query) {
      const keywords = filters.query.toLowerCase().split(' ');
      baseQuery = query(baseQuery, where('searchableKeywords', 'array-contains-any', keywords));
    }

    const snapshot = await getDocs(baseQuery);
    const members = snapshot['docs'].map(doc => mapUserDocToMemberProfile(doc['id'], doc.data()));

    return members.map(member => ({
      member,
      matchScore: calculateMatchScore(member, filters),
      matchReasons: getMatchReasons(member, filters),
      relevantSkills: getRelevantSkills(member, filters)
    }));
  } catch (error) {
    console.error('Error searching members:', error);
    throw error;
  }
}

/**
 * Get a single member profile by UID
 */
export async function getMemberProfile(uid: string): Promise<MemberProfile | null> {
  if (isUsingMockAPI()) {
    return createMockMemberProfile(1);
  }

  try {
    const docRef = doc(db, COLLECTIONS.MEMBERS, uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return mapUserDocToMemberProfile(docSnap['id'], docSnap.data());
    }

    return null;
  } catch (error) {
    console.error('Error fetching member profile:', error);
    throw error;
  }
}

/**
 * Get member statistics
 */
export async function getMemberStats(): Promise<MemberStats> {
  if (isUsingMockAPI()) {
    return {
      totalMembers: 1247,
      onlineMembers: 89,
      newMembersThisMonth: 23,
      topSkills: [
        { skill: 'Python', count: 892 },
        { skill: 'SQL', count: 756 },
        { skill: 'Machine Learning', count: 634 }
      ],
      topCompanies: [
        { company: 'Google', count: 45 },
        { company: 'Microsoft', count: 38 },
        { company: 'Amazon', count: 32 }
      ],
      topLocations: [
        { location: 'Mexico City', count: 234 },
        { location: 'Guadalajara', count: 123 },
        { location: 'Remote', count: 89 }
      ]
    };
  }

  try {
    const membersRef = collection(db, COLLECTIONS.MEMBERS);

    const totalSnapshot = await getDocs(query(membersRef));
    const totalMembers = totalSnapshot.size;

    const onlineSnapshot = await getDocs(query(membersRef, where('isOnline', '==', true)));
    const onlineMembers = onlineSnapshot.size;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newMembersSnapshot = await getDocs(
      query(membersRef, where('joinedAt', '>=', startOfMonth))
    );
    const newMembersThisMonth = newMembersSnapshot.size;

    return {
      totalMembers,
      onlineMembers,
      newMembersThisMonth,
      topSkills: [],
      topCompanies: [],
      topLocations: []
    };
  } catch (error) {
    console.error('Error fetching member stats:', error);
    throw error;
  }
}

/**
 * Get directory statistics
 */
export async function getDirectoryStatsData(): Promise<DirectoryStats> {
  if (isUsingMockAPI()) {
    return {
      totalMembers: 35,
      byStatus: {
        collaborator: 4,
        pending: 2,
        active: 25,
        inactive: 1,
        suspended: 0,
        alumni: 3,
        deactivated: 0,
      },
      newThisMonth: 3,
      pendingApproval: 2,
      recentlyActive: 20,
      dormant: 5,
      profileCompleteness: { complete: 15, partial: 12, minimal: 8 },
    };
  }

  const membersRef = collection(db, COLLECTIONS.MEMBERS);
  const snapshot = await getDocs(membersRef);

  const byStatus: Record<string, number> = {
    collaborator: 0,
    pending: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    alumni: 0,
    deactivated: 0,
  };

  let newThisMonth = 0;
  let pendingApproval = 0;
  let recentlyActive = 0;
  let dormant = 0;
  const completeness = { complete: 0, partial: 0, minimal: 0 };

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  snapshot.forEach((d) => {
    const data = d.data();
    const status = data.lifecycle?.status || (data.role === 'member' ? 'active' : 'collaborator');
    if (status && status in byStatus) {
      (byStatus as Record<string, number>)[status] = ((byStatus as Record<string, number>)[status] || 0) + 1;
    }

    const createdAt = data.createdAt?.toDate?.() || new Date(0);
    if (createdAt >= startOfMonth) newThisMonth++;

    if (data.verificationStatus === 'pending' || status === 'pending') pendingApproval++;

    const lastActive = data.lifecycle?.lastActiveDate?.toDate?.() || data.updatedAt?.toDate?.() || new Date(0);
    if (lastActive >= thirtyDaysAgo) {
      recentlyActive++;
    } else if (status === 'active') {
      dormant++;
    }

    const pc = data.profileCompleteness || 0;
    if (pc >= 80) completeness.complete++;
    else if (pc >= 40) completeness.partial++;
    else completeness.minimal++;
  });

  return {
    totalMembers: snapshot.size,
    byStatus: byStatus as Record<MemberStatus, number>,
    newThisMonth,
    pendingApproval,
    recentlyActive,
    dormant,
    profileCompleteness: completeness,
  };
}

/**
 * Export member data as vCard
 */
export function generateVCard(member: MemberProfile): vCardData {
  return {
    name: member.displayName,
    email: member['email'],
    phone: undefined,
    company: member.profile.company,
    title: member.profile.position,
    linkedin: member.social.linkedin,
    website: member.social.portfolio
  };
}

/**
 * Member recommendations
 */
export async function getMemberRecommendations(uid: string): Promise<MemberRecommendation[]> {
  if (isUsingMockAPI()) {
    const mockMembers = Array.from({ length: 5 }, (_, i) => createMockMemberProfile(i + 10));
    return mockMembers.map(member => ({
      member,
      reason: ['similar_skills', 'same_company', 'mutual_connections'][Math.floor(Math.random() * 3)] as any,
      score: Math.floor(Math.random() * 30) + 70,
      commonElements: ['Python', 'Machine Learning']
    }));
  }

  try {
    const userProfile = await getMemberProfile(uid);
    if (!userProfile) return [];

    const allMembers = await getMemberProfiles({ limit: 100 });

    return allMembers
      .filter(member => member.uid !== uid)
      .map(member => {
        const commonSkills = member.profile.skills.filter(skill =>
          userProfile.profile.skills.includes(skill)
        );

        let reason: MemberRecommendation['reason'] = 'similar_interests';
        let score = 50;

        if (commonSkills.length > 0) {
          reason = 'similar_skills';
          score += commonSkills.length * 10;
        }

        if (member.profile.company === userProfile.profile.company) {
          reason = 'same_company';
          score += 20;
        }

        if (member.profile.location === userProfile.profile.location) {
          score += 15;
        }

        return {
          member,
          reason,
          score: Math.min(score, 100),
          commonElements: commonSkills
        };
      })
      .filter(rec => rec.score > 60)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  } catch (error) {
    console.error('Error getting member recommendations:', error);
    return [];
  }
}

// --- Internal utility functions ---

function calculateMatchScore(member: MemberProfile, filters: MemberSearchFilters): number {
  let score = 0;

  if (filters?.skills?.length) {
    const commonSkills = member.profile.skills.filter(skill =>
      filters.skills!.some(filterSkill =>
        skill.toLowerCase().includes(filterSkill.toLowerCase())
      )
    );
    score += (commonSkills.length / filters.skills.length) * 40;
  }

  if (filters?.locations?.includes(member.profile.location)) {
    score += 20;
  }

  if (filters?.experienceLevel?.includes(member.experience.level)) {
    score += 15;
  }

  score += Math.min(member.activity.reputation / 10, 25);

  return Math.min(Math.round(score), 100);
}

function getMatchReasons(member: MemberProfile, filters: MemberSearchFilters): string[] {
  const reasons: string[] = [];

  if (filters?.skills?.some(skill => member.profile.skills.includes(skill))) {
    reasons.push('Similar skills');
  }

  if (filters?.locations?.includes(member.profile.location)) {
    reasons.push('Same location');
  }

  if (filters?.companies?.includes(member.profile.company)) {
    reasons.push('Same company');
  }

  return reasons;
}

function getRelevantSkills(member: MemberProfile, filters: MemberSearchFilters): string[] {
  if (!filters?.skills?.length) return [];

  return member.profile.skills.filter(skill =>
    filters.skills!.some(filterSkill =>
      skill.toLowerCase().includes(filterSkill.toLowerCase())
    )
  );
}
