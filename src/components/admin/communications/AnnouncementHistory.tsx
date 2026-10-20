import React from 'react';
import type { AnnouncementRecord, Audience } from '@/lib/announcements';
import { formatDate } from '@/lib/format-date';
import { t, type Lang } from './i18n';

interface Props {
  lang: Lang;
  items: AnnouncementRecord[];
  loading: boolean;
}

function describeAudience(audience: Audience, lang: Lang): string {
  switch (audience.kind) {
    case 'campus':
      return `${t('audienceCampus', lang)}: ${audience.campus ?? ''}`;
    case 'rbac_group':
      return `${t('audienceGroup', lang)}: ${audience.groupId ?? ''}`;
    case 'test':
      return t('audienceTest', lang);
    default:
      return t('audienceAll', lang);
  }
}

function StatusPill({
  status,
  lang,
}: {
  status: AnnouncementRecord['status'];
  lang: Lang;
}) {
  const sent = status === 'sent';
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        sent
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      }`}
    >
      {t(sent ? 'statusSent' : 'statusFailed', lang)}
    </span>
  );
}

/** Past runs of sendAnnouncement, newest first. */
export default function AnnouncementHistory({ lang, items, loading }: Props) {
  return (
    <section
      className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800"
      data-testid="announcement-history"
    >
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        {t('history', lang)}
      </h2>
      {!loading && items.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('historyEmpty', lang)}
        </p>
      )}
      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs text-gray-500 uppercase dark:text-gray-400">
              <tr>
                <th className="py-2 pr-4">{t('colSubject', lang)}</th>
                <th className="py-2 pr-4">{t('colDate', lang)}</th>
                <th className="py-2 pr-4">{t('colAudience', lang)}</th>
                <th className="py-2 pr-4">{t('colCount', lang)}</th>
                <th className="py-2">{t('colStatus', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((item) => (
                <tr key={item.id} className="text-gray-800 dark:text-gray-200">
                  <td className="py-2 pr-4 font-medium">{item.subject}</td>
                  <td className="py-2 pr-4">
                    {item.sentAt ? formatDate(item.sentAt, lang) : '—'}
                  </td>
                  <td className="py-2 pr-4">
                    {describeAudience(item.audience, lang)}
                  </td>
                  <td className="py-2 pr-4" data-testid="announcement-count">
                    {item.recipientCount}
                  </td>
                  <td className="py-2">
                    <StatusPill status={item.status} lang={lang} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
