import { describe, it, expect } from 'vitest';
import { FIELD_GROUPS, getFieldsForGroup, applyFieldSelections } from '@/lib/merge/field-groups';
import type { FieldSelections } from '@/types/merge';

describe('FIELD_GROUPS', () => {
  it('should map basicInfo to correct Firestore paths', () => {
    expect(FIELD_GROUPS.basicInfo).toEqual([
      'firstName', 'lastName', 'displayName', 'photoURL',
    ]);
  });

  it('should map all 9 field groups', () => {
    const keys = Object.keys(FIELD_GROUPS);
    expect(keys).toHaveLength(9);
    expect(keys).toContain('professional');
    expect(keys).toContain('experience');
    expect(keys).toContain('skills');
    expect(keys).toContain('socialLinks');
    expect(keys).toContain('education');
    expect(keys).toContain('privacySettings');
    expect(keys).toContain('notificationSettings');
    expect(keys).toContain('settings');
  });
});

describe('getFieldsForGroup', () => {
  it('should return fields for a valid group key', () => {
    const fields = getFieldsForGroup('basicInfo');
    expect(fields).toContain('firstName');
    expect(fields).toContain('photoURL');
  });
});

describe('applyFieldSelections', () => {
  const sourceDoc = {
    firstName: 'Old',
    lastName: 'User',
    displayName: 'Old User',
    photoURL: 'old.jpg',
    profile: { company: 'OldCorp', position: 'Dev', bio: '', location: '', linkedin: '' },
    skills: ['python'],
  };
  const targetDoc = {
    firstName: 'New',
    lastName: 'User',
    displayName: 'New User',
    photoURL: 'new.jpg',
    profile: { company: 'NewCorp', position: 'Lead', bio: 'hi', location: 'MX', linkedin: 'li' },
    skills: ['typescript'],
  };

  it('should keep source fields when selection is source', () => {
    const selections: FieldSelections = {
      basicInfo: 'source',
      professional: 'target',
      experience: 'discard',
      skills: 'source',
      socialLinks: 'discard',
      education: 'discard',
      privacySettings: 'discard',
      notificationSettings: 'discard',
      settings: 'discard',
    };
    const result = applyFieldSelections(sourceDoc, targetDoc, selections);
    expect(result.firstName).toBe('Old');
    expect(result['profile.company']).toBeUndefined();
    expect(result.skills).toEqual(['python']);
  });

  it('should return empty object for all discard', () => {
    const selections: FieldSelections = {
      basicInfo: 'discard',
      professional: 'discard',
      experience: 'discard',
      skills: 'discard',
      socialLinks: 'discard',
      education: 'discard',
      privacySettings: 'discard',
      notificationSettings: 'discard',
      settings: 'discard',
    };
    const result = applyFieldSelections(sourceDoc, targetDoc, selections);
    expect(Object.keys(result)).toHaveLength(0);
  });
});
