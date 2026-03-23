/**
 * CV (Curriculum Vitae) data type definitions.
 *
 * CVData is a presentation-layer type that represents a member's
 * professional profile in a format suitable for CV rendering and
 * PDF export. It is produced by transforming a MemberProfile.
 */

export interface CVData {
  personal: {
    name: { first: string; last: string; full: string };
    title: string;
    location: string;
    contact: {
      email?: string;
      linkedin?: string;
      github?: string;
      twitter?: string;
      portfolio?: string;
    };
    profileImage?: string;
    summary: string;
  };
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description?: string;
    technologies?: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    fieldOfStudy?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    gpa?: number;
    description?: string;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    date: string;
    expiryDate?: string;
    credentialId?: string;
    credentialUrl?: string;
  }>;
  projects: Array<{
    title: string;
    description: string;
    category: string;
    technologies: string[];
    githubUrl?: string;
    liveUrl?: string;
    featured: boolean;
  }>;
  skills: string[];
  languages: Array<{
    name: string;
    proficiency: string;
  }>;
  awards?: Array<{
    title: string;
    description?: string;
    year?: number;
    category?: string;
  }>;
  currentlyWorkingOn?: {
    education?: {
      degree: string;
      institution: string;
      progress?: number;
      expectedCompletion?: string;
    };
    activeProjects?: Array<{
      title: string;
      description: string;
      technologies: string[];
    }>;
  };
  metadata: {
    generatedAt: string;
    memberSlug: string;
    lang: string;
  };
}
