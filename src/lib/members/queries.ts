/**
 * Member read operations: profiles, search, stats, recommendations.
 */

import { db, isUsingMockAPI } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  getDocFromServer,
  query,
  where,
  limit,
  DocumentSnapshot,
} from 'firebase/firestore';
import type {
  MemberProfile,
  MemberSearchFilters,
  MemberSearchResult,
  MemberStats,
  MemberStatisticsData,
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
export async function getMemberProfiles(
  options: {
    filters?: Partial<MemberSearchFilters>;
    limit?: number;
    lastDoc?: DocumentSnapshot;
  } = {}
): Promise<MemberProfile[]> {
  if (isUsingMockAPI()) {
    const count = options.limit || 20;
    return Array.from({ length: count }, (_, i) =>
      createMockMemberProfile(i + 1)
    );
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
      q = query(q, where('createdAt', '>=', filters.joinedAfter));
    }

    const sortBy = filters.sortBy || 'joinDate';
    const sortOrder = filters.sortOrder || 'desc';

    // Note: Firestore orderBy excludes documents missing the ordered field
    // and persistent local cache can return stale results for indexed queries.
    // Fetch without orderBy and sort client-side for reliability.
    q = query(q, limit(queryLimit));

    const snapshot = await getDocs(q);
    let members = snapshot['docs'].map((doc) =>
      mapUserDocToMemberProfile(doc['id'], doc.data())
    );

    // Client-side role filtering
    if (filters?.memberType && filters.memberType !== 'all') {
      members = members.filter((m) => m.role === filters.memberType);
    }

    // Client-side sorting
    const multiplier = sortOrder === 'desc' ? -1 : 1;
    members.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return multiplier * a.displayName.localeCompare(b.displayName);
        case 'reputation':
          return (
            multiplier *
            ((a.activity.reputation || 0) - (b.activity.reputation || 0))
          );
        case 'activity': {
          const aTime = a.activity.lastActive?.getTime?.() || 0;
          const bTime = b.activity.lastActive?.getTime?.() || 0;
          return multiplier * (aTime - bTime);
        }
        case 'joinDate':
        default: {
          const aTime = a.joinedAt?.getTime?.() || 0;
          const bTime = b.joinedAt?.getTime?.() || 0;
          return multiplier * (aTime - bTime);
        }
      }
    });

    return members;
  } catch (error) {
    console.error('Error fetching member profiles:', error);
    throw error;
  }
}

/**
 * Search members with advanced filters
 */
export async function searchMembers(
  filters: MemberSearchFilters
): Promise<MemberSearchResult[]> {
  if (isUsingMockAPI()) {
    const mockMembers = Array.from({ length: 10 }, (_, i) =>
      createMockMemberProfile(i + 1)
    );
    return mockMembers.map((member) => ({
      member,
      matchScore: Math.floor(Math.random() * 40) + 60,
      matchReasons: ['Similar skills', 'Same location'],
      relevantSkills: member.featuredSkills.slice(0, 2),
    }));
  }

  try {
    let baseQuery = query(collection(db, COLLECTIONS.MEMBERS));

    if (filters.query) {
      const keywords = filters.query.toLowerCase().split(' ');
      baseQuery = query(
        baseQuery,
        where('searchableKeywords', 'array-contains-any', keywords)
      );
    }

    const snapshot = await getDocs(baseQuery);
    const members = snapshot['docs'].map((doc) =>
      mapUserDocToMemberProfile(doc['id'], doc.data())
    );

    return members.map((member) => ({
      member,
      matchScore: calculateMatchScore(member, filters),
      matchReasons: getMatchReasons(member, filters),
      relevantSkills: getRelevantSkills(member, filters),
    }));
  } catch (error) {
    console.error('Error searching members:', error);
    throw error;
  }
}

/**
 * Get a single member profile by UID or slug.
 * Slugs are detected by the presence of a hyphen (UIDs are alphanumeric).
 */
export async function getMemberProfile(
  idOrSlug: string
): Promise<MemberProfile | null> {
  if (isUsingMockAPI()) {
    return createMockMemberProfile(1);
  }

  const isSlug = idOrSlug.includes('-');

  if (isSlug) {
    return getMemberBySlug(idOrSlug);
  }

  try {
    const docRef = doc(db, COLLECTIONS.MEMBERS, idOrSlug);
    let docSnap = await getDoc(docRef);

    // Fallback to server if persistent cache returns a miss
    if (!docSnap.exists()) {
      docSnap = await getDocFromServer(docRef);
    }

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
 * Look up a member by their URL slug (derived from displayName).
 */
async function getMemberBySlug(slug: string): Promise<MemberProfile | null> {
  try {
    const snapshot = await getDocs(
      query(collection(db, COLLECTIONS.MEMBERS), limit(200))
    );

    for (const d of snapshot.docs) {
      const profile = mapUserDocToMemberProfile(d.id, d.data());
      if (profile.slug === slug) {
        return profile;
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching member by slug:', error);
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
        { skill: 'Machine Learning', count: 634 },
      ],
      topCompanies: [
        { company: 'Google', count: 45 },
        { company: 'Microsoft', count: 38 },
        { company: 'Amazon', count: 32 },
      ],
      topLocations: [
        { location: 'Mexico City', count: 234 },
        { location: 'Guadalajara', count: 123 },
        { location: 'Remote', count: 89 },
      ],
    };
  }

  try {
    const membersRef = collection(db, COLLECTIONS.MEMBERS);

    const totalSnapshot = await getDocs(query(membersRef));
    const totalMembers = totalSnapshot.size;

    const onlineSnapshot = await getDocs(
      query(membersRef, where('isOnline', '==', true))
    );
    const onlineMembers = onlineSnapshot.size;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newMembersSnapshot = await getDocs(
      query(membersRef, where('createdAt', '>=', startOfMonth))
    );
    const newMembersThisMonth = newMembersSnapshot.size;

    return {
      totalMembers,
      onlineMembers,
      newMembersThisMonth,
      topSkills: [],
      topCompanies: [],
      topLocations: [],
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
    const status =
      data.lifecycle?.status ||
      (data.role === 'member' ? 'active' : 'collaborator');
    if (status && status in byStatus) {
      (byStatus as Record<string, number>)[status] =
        ((byStatus as Record<string, number>)[status] || 0) + 1;
    }

    const createdAt = data.createdAt?.toDate?.() || new Date(0);
    if (createdAt >= startOfMonth) newThisMonth++;

    if (data.verificationStatus === 'pending' || status === 'pending')
      pendingApproval++;

    const lastActive =
      data.lifecycle?.lastActiveDate?.toDate?.() ||
      data.updatedAt?.toDate?.() ||
      new Date(0);
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
 * Get aggregated member statistics for the statistics view
 */
export async function getMemberStatistics(): Promise<MemberStatisticsData> {
  if (isUsingMockAPI()) {
    return {
      totalMembers: 21,
      campusComposition: [
        { label: 'IIMAS', count: 18 },
        { label: 'FES Acatlán', count: 3 },
      ],
      degreeComposition: [
        { label: 'Licenciatura', count: 18 },
        { label: 'Maestría', count: 3 },
      ],
      genderComposition: [
        { label: 'Masculino', count: 18 },
        { label: 'Femenino', count: 3 },
      ],
      generationDistribution: [
        { year: '2019', count: 4 },
        { year: '2020', count: 6 },
        { year: '2021', count: 4 },
        { year: '2022', count: 4 },
        { year: '2023', count: 1 },
        { year: '2024', count: 2 },
      ],
      initiativeImportance: [
        { initiative: 'Bolsa de Trabajo', avgScore: 4 },
        { initiative: 'Cursos', avgScore: 4 },
        { initiative: 'Seminarios', avgScore: 3.5 },
        { initiative: 'Hackatones', avgScore: 3.1 },
        { initiative: 'Mentoría', avgScore: 3.1 },
        { initiative: 'Newsletter', avgScore: 3 },
        { initiative: 'Asesorías', avgScore: 2.7 },
      ],
      skillsDistribution: [
        { skill: 'Python', count: 15 },
        { skill: 'SQL', count: 12 },
        { skill: 'Machine Learning', count: 10 },
        { skill: 'R', count: 8 },
        { skill: 'Tableau', count: 5 },
      ],
      experienceDistribution: [
        { level: 'Intermedio', count: 10 },
        { level: 'Avanzado', count: 6 },
        { level: 'Principiante', count: 3 },
        { level: 'Experto', count: 2 },
      ],
      professionalStatusDistribution: [
        { status: 'Empleado', count: 16 },
        { status: 'Freelance', count: 3 },
        { status: 'Buscando empleo', count: 2 },
      ],
    };
  }

  try {
    const membersRef = collection(db, COLLECTIONS.MEMBERS);
    const snapshot = await getDocs(membersRef);

    let totalMembers = 0;
    const campusMap = new Map<string, number>();
    const degreeMap = new Map<string, number>();
    const genderMap = new Map<string, number>();
    const generationMap = new Map<string, number>();
    const skillsMap = new Map<string, number>();
    const experienceMap = new Map<string, number>();
    const professionalStatusMap = new Map<string, number>();

    const priorityKeys = [
      'bolsaTrabajo',
      'cursosEspecializados',
      'seminarios',
      'hackatones',
      'mentoria',
      'newsletter',
      'asesorias',
    ];
    const prioritySums = new Map<string, number>();
    const priorityCounts = new Map<string, number>();
    for (const key of priorityKeys) {
      prioritySums.set(key, 0);
      priorityCounts.set(key, 0);
    }

    snapshot.forEach((d) => {
      const data = d.data();

      // Skip collaborators — statistics are members-only
      if (data.role === 'collaborator') return;

      totalMembers++;

      // Campus
      const campus = data.campus;
      if (campus) {
        campusMap.set(campus, (campusMap.get(campus) || 0) + 1);
      }

      // Generation
      const generation = data.generation;
      if (generation) {
        generationMap.set(
          String(generation),
          (generationMap.get(String(generation)) || 0) + 1
        );
      }

      // Gender (from registrationData)
      const gender = data.registrationData?.gender || data.gender;
      if (gender) {
        genderMap.set(gender, (genderMap.get(gender) || 0) + 1);
      }

      // Max degree (from registrationData, fallback to academicLevel)
      const maxDegree = data.registrationData?.maxDegree || data.academicLevel;
      if (maxDegree) {
        degreeMap.set(maxDegree, (degreeMap.get(maxDegree) || 0) + 1);
      }

      // Initiative priorities — values are Spanish strings or numbers
      const priorityScaleMap: Record<string, number> = {
        'Muy bajo': 1,
        Bajo: 2,
        Medio: 3,
        Alto: 4,
        'Muy alto': 5,
      };
      const priorities = data.registrationData?.priorities || data.priorities;
      if (priorities) {
        for (const key of priorityKeys) {
          const raw = priorities[key];
          const val =
            typeof raw === 'number'
              ? raw
              : (priorityScaleMap[raw] ?? parseFloat(raw));
          if (!isNaN(val)) {
            prioritySums.set(key, (prioritySums.get(key) || 0) + val);
            priorityCounts.set(key, (priorityCounts.get(key) || 0) + 1);
          }
        }
      }

      // Skills (top-level array or nested under profile)
      const skills: string[] = data.skills || data.profile?.skills || [];
      for (const skill of skills) {
        if (skill) {
          skillsMap.set(skill, (skillsMap.get(skill) || 0) + 1);
        }
      }

      // Experience level
      const experienceLevel = data.registrationData?.experienceLevel;
      if (experienceLevel) {
        experienceMap.set(
          experienceLevel,
          (experienceMap.get(experienceLevel) || 0) + 1
        );
      }

      // Professional status
      const professionalStatus = data.registrationData?.professionalStatus;
      if (professionalStatus) {
        professionalStatusMap.set(
          professionalStatus,
          (professionalStatusMap.get(professionalStatus) || 0) + 1
        );
      }
    });

    const priorityLabels: Record<string, string> = {
      bolsaTrabajo: 'Bolsa de Trabajo',
      cursosEspecializados: 'Cursos',
      seminarios: 'Seminarios',
      hackatones: 'Hackatones',
      mentoria: 'Mentoría',
      newsletter: 'Newsletter',
      asesorias: 'Asesorías',
    };

    const mapToArray = (map: Map<string, number>) =>
      Array.from(map.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);

    return {
      totalMembers,
      campusComposition: mapToArray(campusMap),
      degreeComposition: mapToArray(degreeMap),
      genderComposition: mapToArray(genderMap),
      generationDistribution: Array.from(generationMap.entries())
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year.localeCompare(b.year)),
      initiativeImportance: priorityKeys
        .map((key) => {
          const count = priorityCounts.get(key) || 0;
          const sum = prioritySums.get(key) || 0;
          return {
            initiative: priorityLabels[key] || key,
            avgScore: count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
          };
        })
        .filter((item) => item.avgScore > 0)
        .sort((a, b) => b.avgScore - a.avgScore),
      skillsDistribution: Array.from(skillsMap.entries())
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      experienceDistribution: Array.from(experienceMap.entries())
        .map(([level, count]) => ({ level, count }))
        .sort((a, b) => b.count - a.count),
      professionalStatusDistribution: Array.from(
        professionalStatusMap.entries()
      )
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count),
    };
  } catch (error) {
    console.error('Error fetching member statistics:', error);
    throw error;
  }
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
    website: member.social.portfolio,
  };
}

/**
 * Member recommendations
 */
export async function getMemberRecommendations(
  uid: string
): Promise<MemberRecommendation[]> {
  if (isUsingMockAPI()) {
    const mockMembers = Array.from({ length: 5 }, (_, i) =>
      createMockMemberProfile(i + 10)
    );
    return mockMembers.map((member) => ({
      member,
      reason: ['similar_skills', 'same_company', 'mutual_connections'][
        Math.floor(Math.random() * 3)
      ] as any,
      score: Math.floor(Math.random() * 30) + 70,
      commonElements: ['Python', 'Machine Learning'],
    }));
  }

  try {
    const userProfile = await getMemberProfile(uid);
    if (!userProfile) return [];

    const allMembers = await getMemberProfiles({ limit: 100 });

    return allMembers
      .filter((member) => member.uid !== uid)
      .map((member) => {
        const commonSkills = member.profile.skills.filter((skill) =>
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
          commonElements: commonSkills,
        };
      })
      .filter((rec) => rec.score > 60)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  } catch (error) {
    console.error('Error getting member recommendations:', error);
    return [];
  }
}

// --- Internal utility functions ---

function calculateMatchScore(
  member: MemberProfile,
  filters: MemberSearchFilters
): number {
  let score = 0;

  if (filters?.skills?.length) {
    const commonSkills = member.profile.skills.filter((skill) =>
      filters.skills!.some((filterSkill) =>
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

function getMatchReasons(
  member: MemberProfile,
  filters: MemberSearchFilters
): string[] {
  const reasons: string[] = [];

  if (filters?.skills?.some((skill) => member.profile.skills.includes(skill))) {
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

function getRelevantSkills(
  member: MemberProfile,
  filters: MemberSearchFilters
): string[] {
  if (!filters?.skills?.length) return [];

  return member.profile.skills.filter((skill) =>
    filters.skills!.some((filterSkill) =>
      skill.toLowerCase().includes(filterSkill.toLowerCase())
    )
  );
}
