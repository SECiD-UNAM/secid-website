/**
 * UNAM campuses a member can pick as `users.campus` (profile → education)
 * and the "por sede" audience of the announcement composer reads back.
 * Keep the values stable: they are stored verbatim on user docs.
 */
export const UNAM_CAMPUSES = [
  'IIMAS',
  'FES Acatlan',
  'Facultad de Ciencias',
  'FI',
  'FC',
  'FES Aragon',
  'Other',
] as const;

export type UnamCampus = (typeof UNAM_CAMPUSES)[number];
