import React, { useEffect, useState } from 'react';
import type { Audience, AudienceKind, GroupOption } from '@/lib/announcements';
import { listGroupOptions } from '@/lib/announcements';
import { UNAM_CAMPUSES } from '@/lib/campuses';
import { t, type Lang } from './i18n';

interface Props {
  lang: Lang;
  value: Audience;
  onChange: (audience: Audience) => void;
  disabled?: boolean;
}

const KINDS: Array<{
  kind: AudienceKind;
  label: 'audienceAll' | 'audienceCampus' | 'audienceGroup';
}> = [
  { kind: 'all_active', label: 'audienceAll' },
  { kind: 'campus', label: 'audienceCampus' },
  { kind: 'rbac_group', label: 'audienceGroup' },
];

export const selectClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white';

/** Audience kind plus the campus / group picker the kind needs. */
export default function AudienceSelect({
  lang,
  value,
  onChange,
  disabled,
}: Props) {
  const [groups, setGroups] = useState<GroupOption[]>([]);

  useEffect(() => {
    listGroupOptions().then(setGroups);
  }, []);

  const setKind = (kind: AudienceKind) => {
    if (kind === 'campus') onChange({ kind, campus: UNAM_CAMPUSES[0] });
    else if (kind === 'rbac_group') {
      onChange({ kind, groupId: groups[0]?.id ?? 'member' });
    } else onChange({ kind });
  };

  return (
    <div className="space-y-3">
      <fieldset disabled={disabled} className="space-y-2">
        <legend className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('audience', lang)}
        </legend>
        {KINDS.map(({ kind, label }) => (
          <label
            key={kind}
            className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200"
          >
            <input
              type="radio"
              name="audience-kind"
              value={kind}
              checked={value.kind === kind}
              onChange={() => setKind(kind)}
            />
            {t(label, lang)}
          </label>
        ))}
      </fieldset>
      {value.kind === 'campus' && (
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
            {t('campus', lang)}
          </span>
          <select
            className={selectClass}
            value={value.campus}
            disabled={disabled}
            onChange={(e) =>
              onChange({ kind: 'campus', campus: e.target.value })
            }
          >
            {UNAM_CAMPUSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      )}
      {value.kind === 'rbac_group' && (
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
            {t('group', lang)}
          </span>
          <select
            className={selectClass}
            value={value.groupId}
            disabled={disabled}
            onChange={(e) =>
              onChange({ kind: 'rbac_group', groupId: e.target.value })
            }
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
