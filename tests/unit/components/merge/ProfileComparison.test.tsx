/**
 * TC-MERGE-COMP-001 through TC-MERGE-COMP-004
 * Unit tests for ProfileComparison component.
 *
 * Verifies: AC-MERGE-008 — side-by-side field group comparison with radio selection
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileComparison } from '@/components/merge/ProfileComparison';
import type { FieldSelections } from '@/types/merge';

const sourceProfile = {
  firstName: 'Juan',
  lastName: 'Garcia',
  displayName: 'Juan Garcia',
  photoURL: 'old.jpg',
  profile: {
    company: 'OldCorp',
    position: 'Dev',
    bio: 'Old bio',
    location: 'CDMX',
    linkedin: '',
  },
  skills: ['python', 'sql'],
};

const targetProfile = {
  firstName: 'Juan',
  lastName: 'Garcia',
  displayName: 'Juan G',
  photoURL: 'new.jpg',
  profile: {
    company: 'NewCorp',
    position: 'Lead',
    bio: 'New bio',
    location: 'MTY',
    linkedin: 'li/juang',
  },
  skills: ['typescript'],
};

const defaultSelections: FieldSelections = {
  basicInfo: 'target',
  professional: 'target',
  experience: 'target',
  skills: 'target',
  socialLinks: 'target',
  education: 'target',
  privacySettings: 'target',
  notificationSettings: 'target',
  settings: 'target',
};

describe('ProfileComparison — renders profile data', () => {
  /**
   * TC-MERGE-COMP-001
   * Verifies: both source and target profile field values are displayed
   */
  it('TC-MERGE-COMP-001: should render source and target profile data', () => {
    render(
      <ProfileComparison
        sourceProfile={sourceProfile}
        targetProfile={targetProfile}
        selections={defaultSelections}
        onSelectionsChange={vi.fn()}
      />
    );
    expect(screen.getByText('OldCorp')).toBeTruthy();
    expect(screen.getByText('NewCorp')).toBeTruthy();
  });
});

describe('ProfileComparison — radio buttons', () => {
  /**
   * TC-MERGE-COMP-002
   * Verifies: 27 radio buttons rendered (9 field groups × 3 options each)
   */
  it('TC-MERGE-COMP-002: should render radio buttons for each field group', () => {
    render(
      <ProfileComparison
        sourceProfile={sourceProfile}
        targetProfile={targetProfile}
        selections={defaultSelections}
        onSelectionsChange={vi.fn()}
      />
    );
    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBe(27); // 9 groups × 3 options
  });
});

describe('ProfileComparison — onChange callback', () => {
  /**
   * TC-MERGE-COMP-003
   * Verifies: clicking a radio calls onSelectionsChange with updated selections
   */
  it('TC-MERGE-COMP-003: should call onSelectionsChange when radio is clicked', () => {
    const onChange = vi.fn();
    render(
      <ProfileComparison
        sourceProfile={sourceProfile}
        targetProfile={targetProfile}
        selections={defaultSelections}
        onSelectionsChange={onChange}
      />
    );
    const radios = screen.getAllByRole('radio');
    fireEvent.click(radios[0]);
    expect(onChange).toHaveBeenCalled();
  });
});

describe('ProfileComparison — readOnly mode', () => {
  /**
   * TC-MERGE-COMP-004
   * Verifies: all radio inputs are disabled when readOnly prop is true
   */
  it('TC-MERGE-COMP-004: should disable radios when readOnly', () => {
    render(
      <ProfileComparison
        sourceProfile={sourceProfile}
        targetProfile={targetProfile}
        selections={defaultSelections}
        onSelectionsChange={vi.fn()}
        readOnly
      />
    );
    const radios = screen.getAllByRole('radio');
    radios.forEach((radio) => expect(radio).toBeDisabled());
  });
});
