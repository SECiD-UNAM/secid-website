/**
 * MemberProfile -> CVData transformer.
 *
 * Pure function with no side effects or external dependencies.
 * Maps the internal MemberProfile representation to a
 * presentation-layer CVData structure suitable for rendering
 * and PDF export.
 */

import type { MemberProfile } from '@/types/member';
import type { CVData } from '@/types/cv';

/**
 * Format a Date as "YYYY-MM" string for CV display.
 * Returns empty string for undefined, null, or non-Date values.
 */
export function formatDate(date: Date | undefined | null): string {
  if (!date || !(date instanceof Date)) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Transform a MemberProfile into a CVData structure.
 *
 * @param member - The source MemberProfile
 * @param lang - Language code for the CV (defaults to 'es')
 * @returns CVData ready for rendering
 */
export function transformProfileToCV(
  member: MemberProfile,
  lang: string = 'es'
): CVData {
  return {
    personal: buildPersonalSection(member),
    experience: buildExperienceSection(member),
    education: buildEducationSection(member),
    certifications: buildCertificationsSection(member),
    projects: buildProjectsSection(member),
    skills: member.profile.skills || [],
    languages: buildLanguagesSection(member),
    awards: buildAwardsSection(member),
    currentlyWorkingOn: buildCurrentlyWorkingOnSection(member),
    metadata: {
      generatedAt: new Date().toISOString(),
      memberSlug: member.slug,
      lang,
    },
  };
}

function buildPersonalSection(member: MemberProfile): CVData['personal'] {
  return {
    name: {
      first: member.profile.firstName,
      last: member.profile.lastName,
      full: member.displayName,
    },
    title: member.experience.currentRole || member.profile.position || '',
    location: member.profile.location || '',
    contact: {
      email: member.privacy.showEmail ? member.email : undefined,
      linkedin: member.social.linkedin,
      github: member.social.github,
      twitter: member.social.twitter,
      portfolio: member.social.portfolio,
    },
    profileImage: member.profile.photoURL,
    summary: member.profile.bio || '',
  };
}

function buildExperienceSection(member: MemberProfile): CVData['experience'] {
  return (member.experience.previousRoles || [])
    .sort(
      (a, b) =>
        (b.startDate?.getTime?.() || 0) - (a.startDate?.getTime?.() || 0)
    )
    .map((role) => ({
      title: role.position,
      company: role.company,
      startDate: formatDate(role.startDate),
      endDate: formatDate(role.endDate),
      current: role.current,
      description: role.description,
      technologies: role.technologies,
    }));
}

function buildEducationSection(member: MemberProfile): CVData['education'] {
  return (member.educationHistory || [])
    .sort(
      (a, b) =>
        (b.startDate?.getTime?.() || 0) - (a.startDate?.getTime?.() || 0)
    )
    .map((edu) => ({
      degree: edu.degree,
      institution: edu.institution,
      fieldOfStudy: edu.fieldOfStudy,
      startDate: formatDate(edu.startDate),
      endDate: formatDate(edu.endDate),
      current: edu.current,
      gpa: edu.gpa,
      description: edu.description,
    }));
}

function buildCertificationsSection(
  member: MemberProfile
): CVData['certifications'] {
  return (member.portfolio?.certifications || []).map((cert) => ({
    name: cert.name,
    issuer: cert.issuer,
    date: formatDate(cert.issueDate),
    expiryDate: formatDate(cert.expiryDate),
    credentialId: cert.credentialId,
    credentialUrl: cert.credentialUrl,
  }));
}

function buildProjectsSection(member: MemberProfile): CVData['projects'] {
  return (member.portfolio?.projects || [])
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    .map((proj) => ({
      title: proj.title,
      description: proj.description,
      category: proj.category,
      technologies: proj.technologies,
      githubUrl: proj.githubUrl,
      liveUrl: proj.liveUrl,
      featured: proj.featured,
    }));
}

function buildLanguagesSection(member: MemberProfile): CVData['languages'] {
  return (member.languages || []).map((language) => ({
    name: language.name,
    proficiency: language.proficiency,
  }));
}

function buildAwardsSection(member: MemberProfile): CVData['awards'] {
  const achievements = member.portfolio?.achievements || [];
  if (achievements.length === 0) return undefined;

  return achievements.map((a) => ({
    title: a.title,
    description: a.description,
    category: a.category,
    year: a.earnedAt?.getFullYear?.(),
  }));
}

function buildCurrentlyWorkingOnSection(
  member: MemberProfile
): CVData['currentlyWorkingOn'] {
  const currentEdu = (member.educationHistory || []).find((e) => e.current);
  const activeProjects = (member.portfolio?.projects || [])
    .filter((p) => p.featured)
    .slice(0, 3)
    .map((p) => ({
      title: p.title,
      description: p.description,
      technologies: p.technologies,
    }));

  if (!currentEdu && activeProjects.length === 0) return undefined;

  return {
    education: currentEdu
      ? {
          degree: currentEdu.degree,
          institution: currentEdu.institution,
        }
      : undefined,
    activeProjects: activeProjects.length > 0 ? activeProjects : undefined,
  };
}
