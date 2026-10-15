/**
 * Section navigation definitions for the CV viewer.
 *
 * Pure functions describing which sections exist and which are visible
 * given a CVData payload. No React or DOM dependencies — kept here so
 * other consumers (e.g. tests, alternative layouts) can reuse the
 * visibility logic without touching the rendering layer.
 */

import type { CVData } from '@/types/cv';
import type { Labels } from './labels';

export interface NavSection {
  id: string;
  labelKey: keyof Labels;
}

export const ALL_SECTIONS: NavSection[] = [
  { id: 'about', labelKey: 'about' },
  { id: 'currentlyWorkingOn', labelKey: 'currentlyWorkingOn' },
  { id: 'experience', labelKey: 'experience' },
  { id: 'education', labelKey: 'education' },
  { id: 'certifications', labelKey: 'certifications' },
  { id: 'skills', labelKey: 'skills' },
  { id: 'projects', labelKey: 'projects' },
  { id: 'languages', labelKey: 'languages' },
  { id: 'awards', labelKey: 'awards' },
  { id: 'download', labelKey: 'download' },
];

export function getVisibleSections(cvData: CVData): NavSection[] {
  return ALL_SECTIONS.filter((section) => {
    switch (section.id) {
      case 'about':
      case 'download':
        return true;
      case 'currentlyWorkingOn':
        return !!cvData.currentlyWorkingOn;
      case 'experience':
        return cvData.experience.length > 0;
      case 'education':
        return cvData.education.length > 0;
      case 'certifications':
        return cvData.certifications.length > 0;
      case 'skills':
        return cvData.skills.length > 0;
      case 'projects':
        return cvData.projects.length > 0;
      case 'languages':
        return cvData.languages.length > 0;
      case 'awards':
        return !!cvData.awards && cvData.awards.length > 0;
      default:
        return false;
    }
  });
}
