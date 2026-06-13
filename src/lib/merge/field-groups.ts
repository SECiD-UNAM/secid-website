import type { FieldGroupKey, FieldSelections } from '@/types/merge';

/**
 * Maps each logical field group to the Firestore document paths it controls.
 *
 * Dot-notation paths (e.g. 'profile.company') are used for nested fields
 * within the user document and are interpreted by `applyFieldSelections`
 * when reading source/target values and by the merge engine when writing
 * Firestore update payloads.
 */
export const FIELD_GROUPS: Record<FieldGroupKey, string[]> = {
  basicInfo: ['firstName', 'lastName', 'displayName', 'photoURL'],
  professional: [
    'profile.company',
    'profile.companyId',
    'profile.position',
    'profile.bio',
    'profile.location',
  ],
  experience: ['experience'],
  skills: ['skills'],
  socialLinks: ['socialMedia', 'profile.linkedin'],
  education: [
    'numeroCuenta',
    'academicLevel',
    'campus',
    'generation',
    'graduationYear',
    'profile.degree',
    'profile.specialization',
  ],
  privacySettings: ['privacySettings'],
  notificationSettings: ['notificationSettings'],
  settings: ['settings'],
};

/**
 * Returns the list of Firestore paths controlled by a given field group.
 */
export function getFieldsForGroup(groupKey: FieldGroupKey): string[] {
  return FIELD_GROUPS[groupKey] ?? [];
}

/**
 * Builds a Firestore update payload from field selections.
 *
 * For each group selected as 'source', copies the corresponding fields
 * from `sourceDoc` into the returned update object using dot-notation keys.
 * Groups selected as 'target' or 'discard' are omitted — 'target' fields
 * are already present on the target document and need no update, while
 * 'discard' fields should not appear in the merged result.
 *
 * @param sourceDoc  The old profile document (flat or nested).
 * @param _targetDoc The new profile document (not read; present for API symmetry).
 * @param selections One selection per field group.
 * @returns A partial Firestore update payload with dot-notation keys.
 */
export function applyFieldSelections(
  sourceDoc: Record<string, unknown>,
  _targetDoc: Record<string, unknown>,
  selections: FieldSelections
): Record<string, unknown> {
  const updates: Record<string, unknown> = {};

  for (const [groupKey, selection] of Object.entries(selections)) {
    if (selection !== 'source') continue;

    const fields = FIELD_GROUPS[groupKey as FieldGroupKey];
    if (!fields) continue;

    for (const fieldPath of fields) {
      const value = getNestedValue(sourceDoc, fieldPath);
      if (value !== undefined) {
        updates[fieldPath] = value;
      }
    }
  }

  return updates;
}

/**
 * Reads a value from a nested object using dot-notation path.
 * Returns `undefined` if any segment along the path is absent.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}
