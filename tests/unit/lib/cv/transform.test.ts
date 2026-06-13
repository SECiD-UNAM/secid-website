/**
 * Unit tests for MemberProfile -> CVData transformer.
 *
 * TC-cv-001 through TC-cv-009: covers all acceptance criteria
 * for the CVData transformation layer.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MemberProfile } from '@/types/member';
import type { CVData } from '@/types/cv';
import { transformProfileToCV, formatDate } from '@/lib/cv/transform';

/**
 * Creates a deterministic MemberProfile for testing.
 * Based on createMockMemberProfile() from mapper.ts but with
 * fixed values so assertions are predictable.
 */
function createTestMemberProfile(
  overrides: Partial<MemberProfile> = {}
): MemberProfile {
  return {
    uid: 'test-uid-001',
    email: 'maria@example.com',
    role: 'member',
    createdAt: new Date(2023, 0, 15),
    displayName: 'Maria Garcia Lopez',
    slug: 'maria-garcia-lopez',
    initials: 'MG',
    isOnline: true,
    lastSeen: new Date(2024, 5, 1),
    joinedAt: new Date(2023, 0, 15),
    profile: {
      firstName: 'Maria',
      lastName: 'Garcia Lopez',
      bio: 'Senior data scientist specializing in NLP and deep learning.',
      company: 'DataCorp',
      position: 'Senior Data Scientist',
      location: 'Mexico City',
      linkedin: 'https://linkedin.com/in/maria-garcia',
      skills: ['Python', 'TensorFlow', 'NLP', 'SQL', 'Docker'],
      photoURL: 'https://example.com/maria.jpg',
      graduationYear: 2018,
      degree: 'Data Science',
      specialization: 'NLP',
    },
    experience: {
      years: 6,
      level: 'senior',
      currentRole: 'Senior Data Scientist',
      previousRoles: [
        {
          id: 'exp-1',
          company: 'DataCorp',
          position: 'Senior Data Scientist',
          startDate: new Date(2022, 2, 1),
          current: true,
          description: 'Leading NLP team',
          technologies: ['Python', 'TensorFlow', 'AWS'],
        },
        {
          id: 'exp-2',
          company: 'TechStartup',
          position: 'Data Scientist',
          startDate: new Date(2020, 0, 15),
          endDate: new Date(2022, 1, 28),
          current: false,
          description: 'Built recommendation engine',
          technologies: ['Python', 'PyTorch'],
        },
        {
          id: 'exp-3',
          company: 'Acme Analytics',
          position: 'Junior Data Analyst',
          startDate: new Date(2018, 6, 1),
          endDate: new Date(2019, 11, 31),
          current: false,
          description: 'Data analysis and reporting',
          technologies: ['SQL', 'Excel'],
        },
      ],
      industries: ['Technology', 'Finance'],
    },
    social: {
      linkedin: 'https://linkedin.com/in/maria-garcia',
      github: 'https://github.com/mariagarcia',
      twitter: 'https://twitter.com/mariagarcia',
      portfolio: 'https://mariagarcia.dev',
    },
    networking: {
      connections: [],
      pendingConnections: [],
      blockedUsers: [],
      followers: [],
      following: [],
      mentorshipStatus: 'mentor',
      availableForMentoring: true,
      openToOpportunities: false,
    },
    privacy: {
      profileVisibility: 'public',
      showEmail: true,
      showPhone: false,
      showLocation: true,
      showCurrentCompany: true,
      showSalaryExpectations: false,
      allowMessages: 'all',
      allowConnectionRequests: true,
      showOnlineStatus: true,
      showLastSeen: true,
    },
    activity: {
      profileViews: 150,
      totalConnections: 42,
      postsCount: 10,
      commentsCount: 35,
      helpfulVotes: 20,
      reputation: 500,
      lastActive: new Date(),
    },
    portfolio: {
      projects: [
        {
          id: 'proj-1',
          title: 'NLP Sentiment Analyzer',
          description: 'Real-time sentiment analysis using transformers',
          technologies: ['Python', 'HuggingFace', 'FastAPI'],
          category: 'machine-learning',
          featured: true,
          createdAt: new Date(2023, 5, 1),
          githubUrl: 'https://github.com/mariagarcia/sentiment',
          liveUrl: 'https://sentiment.mariagarcia.dev',
        },
        {
          id: 'proj-2',
          title: 'Sales Dashboard',
          description: 'Interactive dashboard for sales analytics',
          technologies: ['React', 'D3.js', 'Node.js'],
          category: 'data-analysis',
          featured: false,
          createdAt: new Date(2022, 10, 15),
          githubUrl: 'https://github.com/mariagarcia/dashboard',
        },
      ],
      achievements: [],
      certifications: [
        {
          id: 'cert-1',
          name: 'AWS Machine Learning Specialty',
          issuer: 'Amazon Web Services',
          issueDate: new Date(2023, 3, 15),
          expiryDate: new Date(2026, 3, 15),
          credentialId: 'AWS-ML-12345',
          credentialUrl: 'https://aws.amazon.com/verify/AWS-ML-12345',
          verified: true,
        },
        {
          id: 'cert-2',
          name: 'TensorFlow Developer Certificate',
          issuer: 'Google',
          issueDate: new Date(2022, 8, 1),
          credentialId: 'TF-67890',
          verified: true,
        },
      ],
    },
    educationHistory: [
      {
        id: 'edu-1',
        institution: 'UNAM',
        degree: 'Licenciatura en Ciencia de Datos',
        fieldOfStudy: 'Data Science',
        startDate: new Date(2014, 7, 1),
        endDate: new Date(2018, 5, 30),
        current: false,
        gpa: 9.2,
        description: 'Thesis on NLP applications',
      },
      {
        id: 'edu-2',
        institution: 'MIT',
        degree: 'MicroMasters in Statistics and Data Science',
        fieldOfStudy: 'Statistics',
        startDate: new Date(2019, 0, 1),
        endDate: new Date(2020, 5, 30),
        current: false,
      },
    ],
    languages: [
      { id: 'lang-1', name: 'Spanish', proficiency: 'native' },
      { id: 'lang-2', name: 'English', proficiency: 'advanced' },
      { id: 'lang-3', name: 'French', proficiency: 'beginner' },
    ],
    cvVisibility: 'public',
    searchableKeywords: ['data', 'science', 'nlp', 'python'],
    featuredSkills: ['Python', 'TensorFlow', 'NLP'],
    isPremium: true,
    settings: {
      emailNotifications: true,
      profileVisibility: 'public',
      language: 'es',
    },
    ...overrides,
  };
}

describe('formatDate', () => {
  /**
   * TC-cv-007: Certifications date formatting
   * Verifies: date formatting edge cases
   */
  it('should format a valid Date as YYYY-MM', () => {
    expect(formatDate(new Date(2023, 0, 15))).toBe('2023-01');
    expect(formatDate(new Date(2024, 11, 1))).toBe('2024-12');
  });

  it('should return empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('should return empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('should return empty string for non-Date values', () => {
    expect(formatDate('2023-01' as unknown as Date)).toBe('');
  });

  it('should pad single-digit months with leading zero', () => {
    expect(formatDate(new Date(2023, 2, 1))).toBe('2023-03');
    expect(formatDate(new Date(2023, 8, 1))).toBe('2023-09');
  });
});

describe('transformProfileToCV - personal mapping', () => {
  /**
   * TC-cv-001: Basic personal mapping (name, title, location, bio)
   * Verifies: AC-personal-mapping
   */
  it('should map name fields correctly', () => {
    const member = createTestMemberProfile();
    const cv = transformProfileToCV(member);

    expect(cv.personal.name.first).toBe('Maria');
    expect(cv.personal.name.last).toBe('Garcia Lopez');
    expect(cv.personal.name.full).toBe('Maria Garcia Lopez');
  });

  it('should map title from experience.currentRole', () => {
    const member = createTestMemberProfile();
    const cv = transformProfileToCV(member);

    expect(cv.personal.title).toBe('Senior Data Scientist');
  });

  it('should fall back to profile.position when currentRole is empty', () => {
    const member = createTestMemberProfile({
      experience: {
        years: 6,
        level: 'senior',
        currentRole: '',
        previousRoles: [],
        industries: [],
      },
    });
    const cv = transformProfileToCV(member);

    expect(cv.personal.title).toBe('Senior Data Scientist');
  });

  it('should map location from profile.location', () => {
    const member = createTestMemberProfile();
    const cv = transformProfileToCV(member);

    expect(cv.personal.location).toBe('Mexico City');
  });

  it('should map summary from profile.bio', () => {
    const member = createTestMemberProfile();
    const cv = transformProfileToCV(member);

    expect(cv.personal.summary).toBe(
      'Senior data scientist specializing in NLP and deep learning.'
    );
  });

  it('should map profile image from profile.photoURL', () => {
    const member = createTestMemberProfile();
    const cv = transformProfileToCV(member);

    expect(cv.personal.profileImage).toBe('https://example.com/maria.jpg');
  });

  it('should map social contact links', () => {
    const member = createTestMemberProfile();
    const cv = transformProfileToCV(member);

    expect(cv.personal.contact.linkedin).toBe(
      'https://linkedin.com/in/maria-garcia'
    );
    expect(cv.personal.contact.github).toBe('https://github.com/mariagarcia');
    expect(cv.personal.contact.twitter).toBe('https://twitter.com/mariagarcia');
    expect(cv.personal.contact.portfolio).toBe('https://mariagarcia.dev');
  });
});

describe('transformProfileToCV - privacy', () => {
  /**
   * TC-cv-009: Privacy: email hidden when showEmail is false
   * Verifies: AC-privacy-email
   */
  it('should include email when showEmail is true', () => {
    const member = createTestMemberProfile();
    const cv = transformProfileToCV(member);

    expect(cv.personal.contact.email).toBe('maria@example.com');
  });

  it('should exclude email when showEmail is false', () => {
    const member = createTestMemberProfile({
      privacy: {
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false,
        showLocation: true,
        showCurrentCompany: true,
        showSalaryExpectations: false,
        allowMessages: 'all',
        allowConnectionRequests: true,
        showOnlineStatus: true,
        showLastSeen: true,
      },
    });
    const cv = transformProfileToCV(member);

    expect(cv.personal.contact.email).toBeUndefined();
  });
});

describe('transformProfileToCV - experience', () => {
  /**
   * TC-cv-002: Experience sorted by date descending
   * Verifies: AC-experience-sort
   */
  it('should sort experience by start date descending (most recent first)', () => {
    const member = createTestMemberProfile();
    const cv = transformProfileToCV(member);

    expect(cv.experience).toHaveLength(3);
    expect(cv.experience[0].company).toBe('DataCorp');
    expect(cv.experience[1].company).toBe('TechStartup');
    expect(cv.experience[2].company).toBe('Acme Analytics');
  });

  it('should map experience fields correctly', () => {
    const member = createTestMemberProfile();
    const cv = transformProfileToCV(member);

    const firstRole = cv.experience[0];
    expect(firstRole.title).toBe('Senior Data Scientist');
    expect(firstRole.company).toBe('DataCorp');
    expect(firstRole.startDate).toBe('2022-03');
    expect(firstRole.endDate).toBe('');
    expect(firstRole.current).toBe(true);
    expect(firstRole.description).toBe('Leading NLP team');
    expect(firstRole.technologies).toEqual(['Python', 'TensorFlow', 'AWS']);
  });

  it('should format endDate for non-current roles', () => {
    const member = createTestMemberProfile();
    const cv = transformProfileToCV(member);

    const secondRole = cv.experience[1];
    expect(secondRole.startDate).toBe('2020-01');
    expect(secondRole.endDate).toBe('2022-02');
    expect(secondRole.current).toBe(false);
  });
});

describe('transformProfileToCV - education', () => {
  /**
   * TC-cv-003: Education mapping
   * Verifies: AC-education-mapping
   */
  it('should sort education by start date descending', () => {
    const member = createTestMemberProfile();
    const cv = transformProfileToCV(member);

    expect(cv.education).toHaveLength(2);
    expect(cv.education[0].institution).toBe('MIT');
    expect(cv.education[1].institution).toBe('UNAM');
  });

  it('should map education fields correctly', () => {
    const member = createTestMemberProfile();
    const cv = transformProfileToCV(member);

    const unam = cv.education[1];
    expect(unam.degree).toBe('Licenciatura en Ciencia de Datos');
    expect(unam.institution).toBe('UNAM');
    expect(unam.fieldOfStudy).toBe('Data Science');
    expect(unam.startDate).toBe('2014-08');
    expect(unam.endDate).toBe('2018-06');
    expect(unam.current).toBe(false);
    expect(unam.gpa).toBe(9.2);
    expect(unam.description).toBe('Thesis on NLP applications');
  });
});

describe('transformProfileToCV - empty arrays', () => {
  /**
   * TC-cv-004: Empty arrays produce empty CV arrays
   * Verifies: AC-empty-arrays
   */
  it('should produce empty arrays when member has no data', () => {
    const member = createTestMemberProfile({
      experience: {
        years: 0,
        level: 'junior',
        currentRole: '',
        previousRoles: [],
        industries: [],
      },
      educationHistory: [],
      languages: [],
      portfolio: {
        projects: [],
        achievements: [],
        certifications: [],
      },
      profile: {
        firstName: 'Test',
        lastName: 'User',
        bio: '',
        company: '',
        position: '',
        location: '',
        linkedin: '',
        skills: [],
        photoURL: undefined,
      },
    });
    const cv = transformProfileToCV(member);

    expect(cv.experience).toEqual([]);
    expect(cv.education).toEqual([]);
    expect(cv.certifications).toEqual([]);
    expect(cv.projects).toEqual([]);
    expect(cv.skills).toEqual([]);
    expect(cv.languages).toEqual([]);
  });

  it('should handle undefined portfolio gracefully', () => {
    const member = createTestMemberProfile();
    // portfolio is optional on MemberProfile
    (member as any).portfolio = undefined;
    const cv = transformProfileToCV(member);

    expect(cv.certifications).toEqual([]);
    expect(cv.projects).toEqual([]);
  });
});

describe('transformProfileToCV - skills', () => {
  /**
   * TC-cv-005: Skills passthrough
   * Verifies: AC-skills-passthrough
   */
  it('should pass through skills array unchanged', () => {
    const member = createTestMemberProfile();
    const cv = transformProfileToCV(member);

    expect(cv.skills).toEqual(['Python', 'TensorFlow', 'NLP', 'SQL', 'Docker']);
  });
});

describe('transformProfileToCV - languages', () => {
  /**
   * TC-cv-006: Language proficiency mapping
   * Verifies: AC-languages
   */
  it('should map languages with name and proficiency', () => {
    const member = createTestMemberProfile();
    const cv = transformProfileToCV(member);

    expect(cv.languages).toHaveLength(3);
    expect(cv.languages[0]).toEqual({
      name: 'Spanish',
      proficiency: 'native',
    });
    expect(cv.languages[1]).toEqual({
      name: 'English',
      proficiency: 'advanced',
    });
    expect(cv.languages[2]).toEqual({
      name: 'French',
      proficiency: 'beginner',
    });
  });
});

describe('transformProfileToCV - certifications', () => {
  /**
   * TC-cv-007: Certifications date formatting
   * Verifies: AC-certifications-dates
   */
  it('should map certification fields with formatted dates', () => {
    const member = createTestMemberProfile();
    const cv = transformProfileToCV(member);

    expect(cv.certifications).toHaveLength(2);

    const awsCert = cv.certifications[0];
    expect(awsCert.name).toBe('AWS Machine Learning Specialty');
    expect(awsCert.issuer).toBe('Amazon Web Services');
    expect(awsCert.date).toBe('2023-04');
    expect(awsCert.expiryDate).toBe('2026-04');
    expect(awsCert.credentialId).toBe('AWS-ML-12345');
    expect(awsCert.credentialUrl).toBe(
      'https://aws.amazon.com/verify/AWS-ML-12345'
    );
  });

  it('should handle certifications without expiry date', () => {
    const member = createTestMemberProfile();
    const cv = transformProfileToCV(member);

    const tfCert = cv.certifications[1];
    expect(tfCert.name).toBe('TensorFlow Developer Certificate');
    expect(tfCert.issuer).toBe('Google');
    expect(tfCert.date).toBe('2022-09');
    expect(tfCert.expiryDate).toBe('');
  });
});

describe('transformProfileToCV - projects', () => {
  /**
   * TC-cv-008: Projects sorted by featured first
   * Verifies: AC-projects-sort
   */
  it('should sort projects with featured first', () => {
    const member = createTestMemberProfile();
    const cv = transformProfileToCV(member);

    expect(cv.projects).toHaveLength(2);
    expect(cv.projects[0].featured).toBe(true);
    expect(cv.projects[0].title).toBe('NLP Sentiment Analyzer');
    expect(cv.projects[1].featured).toBe(false);
    expect(cv.projects[1].title).toBe('Sales Dashboard');
  });

  it('should map project fields correctly', () => {
    const member = createTestMemberProfile();
    const cv = transformProfileToCV(member);

    const proj = cv.projects[0];
    expect(proj.title).toBe('NLP Sentiment Analyzer');
    expect(proj.description).toBe(
      'Real-time sentiment analysis using transformers'
    );
    expect(proj.category).toBe('machine-learning');
    expect(proj.technologies).toEqual(['Python', 'HuggingFace', 'FastAPI']);
    expect(proj.githubUrl).toBe('https://github.com/mariagarcia/sentiment');
    expect(proj.liveUrl).toBe('https://sentiment.mariagarcia.dev');
  });
});

describe('transformProfileToCV - metadata', () => {
  it('should set metadata with memberSlug and lang', () => {
    const member = createTestMemberProfile();
    const cv = transformProfileToCV(member, 'en');

    expect(cv.metadata.memberSlug).toBe('maria-garcia-lopez');
    expect(cv.metadata.lang).toBe('en');
    expect(cv.metadata.generatedAt).toBeDefined();
    // generatedAt should be a valid ISO string
    expect(() => new Date(cv.metadata.generatedAt)).not.toThrow();
    expect(new Date(cv.metadata.generatedAt).toISOString()).toBe(
      cv.metadata.generatedAt
    );
  });

  it('should default lang to "es"', () => {
    const member = createTestMemberProfile();
    const cv = transformProfileToCV(member);

    expect(cv.metadata.lang).toBe('es');
  });
});
