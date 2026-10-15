/**
 * Unit tests for mapUserDocToMemberProfile auto-population logic.
 *
 * TC-mapper-001 through TC-mapper-010: covers auto-creation of work history
 * and education entries from registration data when member has no manual entries.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { mapUserDocToMemberProfile } from '@/lib/members/mapper';

/**
 * Creates a minimal Firestore document shape for testing.
 * Simulates what Cloud Functions write to the `users` collection.
 */
function createFirestoreDoc(
  overrides: Record<string, any> = {}
): Record<string, any> {
  return {
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria@example.com',
    ...overrides,
  };
}

describe('mapUserDocToMemberProfile', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic mapping', () => {
    it('TC-mapper-001: maps uid and basic fields correctly', () => {
      /** Verifies: basic field mapping */
      const doc = createFirestoreDoc();
      const result = mapUserDocToMemberProfile('uid-001', doc);

      expect(result.uid).toBe('uid-001');
      expect(result.email).toBe('maria@example.com');
      expect(result.displayName).toBe('Maria Garcia');
    });
  });

  describe('auto-populate work history from registration data', () => {
    it('TC-mapper-002: creates work history entry when previousRoles is empty and company exists in profile', () => {
      /** Verifies: AC auto-create work history */
      const doc = createFirestoreDoc({
        profile: {
          company: 'BBVA',
          position: 'Data Scientist',
        },
      });

      const result = mapUserDocToMemberProfile('uid-002', doc);

      expect(result.experience.previousRoles).toHaveLength(1);
      const role = result.experience.previousRoles[0];
      expect(role.company).toBe('BBVA');
      expect(role.position).toBe('Data Scientist');
      expect(role.current).toBe(true);
      expect(role.id).toMatch(/^auto-/);
    });

    it('TC-mapper-003: creates work history entry when company exists as top-level currentCompany', () => {
      /** Verifies: AC auto-create work history from flat fields */
      const doc = createFirestoreDoc({
        currentCompany: 'Google',
        currentPosition: 'ML Engineer',
      });

      const result = mapUserDocToMemberProfile('uid-003', doc);

      expect(result.experience.previousRoles).toHaveLength(1);
      const role = result.experience.previousRoles[0];
      expect(role.company).toBe('Google');
      expect(role.position).toBe('ML Engineer');
      expect(role.current).toBe(true);
    });

    it('TC-mapper-004: does NOT auto-create work history when previousRoles already exist', () => {
      /** Verifies: AC no overwrite of existing data */
      const existingRole = {
        id: 'manual-1',
        company: 'Amazon',
        position: 'SDE',
        startDate: new Date(2022, 0, 1),
        current: true,
        description: '',
        technologies: [],
        achievements: [],
      };

      const doc = createFirestoreDoc({
        profile: {
          company: 'BBVA',
          position: 'Data Scientist',
        },
        experience: {
          years: 3,
          level: 'mid',
          currentRole: 'SDE',
          previousRoles: [existingRole],
          industries: ['Technology'],
        },
      });

      const result = mapUserDocToMemberProfile('uid-004', doc);

      expect(result.experience.previousRoles).toHaveLength(1);
      expect(result.experience.previousRoles[0].id).toBe('manual-1');
      expect(result.experience.previousRoles[0].company).toBe('Amazon');
    });

    it('TC-mapper-005: does NOT auto-create work history when no company data exists', () => {
      /** Verifies: AC no phantom entries */
      const doc = createFirestoreDoc();

      const result = mapUserDocToMemberProfile('uid-005', doc);

      expect(result.experience.previousRoles).toHaveLength(0);
    });

    it('TC-mapper-006: prefers profile.company over currentCompany for auto-created entry', () => {
      /** Verifies: AC field priority */
      const doc = createFirestoreDoc({
        profile: {
          company: 'BBVA',
          position: 'Lead DS',
        },
        currentCompany: 'OldCo',
        currentPosition: 'Intern',
      });

      const result = mapUserDocToMemberProfile('uid-006', doc);

      expect(result.experience.previousRoles).toHaveLength(1);
      expect(result.experience.previousRoles[0].company).toBe('BBVA');
      expect(result.experience.previousRoles[0].position).toBe('Lead DS');
    });

    it('TC-mapper-007: includes companyId in auto-created entry when available', () => {
      /** Verifies: AC companyId propagation */
      const doc = createFirestoreDoc({
        profile: {
          company: 'BBVA',
          companyId: 'company-bbva-123',
          position: 'Data Scientist',
        },
      });

      const result = mapUserDocToMemberProfile('uid-007', doc);

      expect(result.experience.previousRoles[0].companyId).toBe(
        'company-bbva-123'
      );
    });
  });

  describe('auto-populate education history from UNAM data', () => {
    it('TC-mapper-008: creates education entry when educationHistory is empty and campus exists', () => {
      /** Verifies: AC auto-create education from UNAM data */
      const doc = createFirestoreDoc({
        campus: 'IIMAS',
        academicLevel: 'licenciatura',
        generation: '2020',
      });

      const result = mapUserDocToMemberProfile('uid-008', doc);

      expect(result.educationHistory).toHaveLength(1);
      const edu = result.educationHistory[0];
      expect(edu.institution).toBe(
        'Universidad Nacional Autónoma de México (UNAM)'
      );
      expect(edu.degree).toBe('Licenciatura en Ciencia de Datos');
      expect(edu.fieldOfStudy).toBe('Ciencia de Datos');
      expect(edu.campus).toBe('IIMAS');
      expect(edu.generation).toBe('2020');
      expect(edu.current).toBe(true);
      expect(edu.id).toMatch(/^auto-edu-/);
      // Start date derived from generation year
      expect(edu.startDate.getFullYear()).toBe(2020);
    });

    it('TC-mapper-009: maps academic levels to degree names correctly', () => {
      /** Verifies: AC academic level mapping */
      const levels: Record<string, string> = {
        licenciatura: 'Licenciatura en Ciencia de Datos',
        posgrado: 'Posgrado en Ciencia de Datos',
        curso: 'Curso de Actualización en Ciencia de Datos',
      };

      for (const [level, expectedDegree] of Object.entries(levels)) {
        const doc = createFirestoreDoc({
          campus: 'FC',
          academicLevel: level,
        });

        const result = mapUserDocToMemberProfile(`uid-level-${level}`, doc);
        expect(result.educationHistory[0].degree).toBe(expectedDegree);
      }
    });

    it('TC-mapper-010: does NOT auto-create education when educationHistory already has entries', () => {
      /** Verifies: AC no overwrite of existing education */
      const existingEdu = {
        id: 'manual-edu-1',
        institution: 'MIT',
        degree: 'PhD',
        fieldOfStudy: 'Computer Science',
        startDate: { toDate: () => new Date(2018, 0, 1) },
        endDate: { toDate: () => new Date(2022, 5, 1) },
        current: false,
      };

      const doc = createFirestoreDoc({
        campus: 'IIMAS',
        academicLevel: 'licenciatura',
        generation: '2020',
        educationHistory: [existingEdu],
      });

      const result = mapUserDocToMemberProfile('uid-010', doc);

      expect(result.educationHistory).toHaveLength(1);
      expect(result.educationHistory[0].id).toBe('manual-edu-1');
      expect(result.educationHistory[0].institution).toBe('MIT');
    });

    it('TC-mapper-011: does NOT auto-create education when no campus or academic level data exists', () => {
      /** Verifies: AC no phantom education entries */
      const doc = createFirestoreDoc();

      const result = mapUserDocToMemberProfile('uid-011', doc);

      expect(result.educationHistory).toHaveLength(0);
    });

    it('TC-mapper-012: sets endDate from graduationYear when available', () => {
      /** Verifies: AC graduation year mapping */
      const doc = createFirestoreDoc({
        campus: 'IIMAS',
        academicLevel: 'licenciatura',
        generation: '2020',
        profile: {
          graduationYear: 2024,
        },
      });

      const result = mapUserDocToMemberProfile('uid-012', doc);

      expect(result.educationHistory[0].current).toBe(false);
      expect(result.educationHistory[0].endDate?.getFullYear()).toBe(2024);
    });

    it('TC-mapper-013: includes numeroCuenta in auto-created education entry', () => {
      /** Verifies: AC numeroCuenta propagation */
      const doc = createFirestoreDoc({
        campus: 'FC',
        academicLevel: 'licenciatura',
        numeroCuenta: '316123456',
      });

      const result = mapUserDocToMemberProfile('uid-013', doc);

      expect(result.educationHistory[0].numeroCuenta).toBe('316123456');
    });

    it('TC-mapper-014: falls back to raw academic level when not in map', () => {
      /** Verifies: AC graceful fallback for unknown levels */
      const doc = createFirestoreDoc({
        campus: 'FC',
        academicLevel: 'diplomado',
      });

      const result = mapUserDocToMemberProfile('uid-014', doc);

      expect(result.educationHistory[0].degree).toBe('diplomado');
    });
  });

  describe('skills and social pre-fill verification', () => {
    it('TC-mapper-015: maps skills from top-level data.skills', () => {
      /** Verifies: AC skills pre-fill */
      const doc = createFirestoreDoc({
        skills: ['Python', 'SQL', 'Machine Learning'],
      });

      const result = mapUserDocToMemberProfile('uid-015', doc);

      expect(result.profile.skills).toEqual([
        'Python',
        'SQL',
        'Machine Learning',
      ]);
    });

    it('TC-mapper-016: maps social links from registrationData.socialMedia', () => {
      /** Verifies: AC social links pre-fill */
      const doc = createFirestoreDoc({
        registrationData: {
          socialMedia: {
            linkedin: 'https://linkedin.com/in/maria',
            github: 'https://github.com/maria',
            twitter: 'https://twitter.com/maria',
          },
        },
      });

      const result = mapUserDocToMemberProfile('uid-016', doc);

      expect(result.social.linkedin).toBe('https://linkedin.com/in/maria');
      expect(result.social.github).toBe('https://github.com/maria');
      expect(result.social.twitter).toBe('https://twitter.com/maria');
    });
  });
});
