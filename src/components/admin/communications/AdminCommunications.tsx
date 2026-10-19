import React, { useCallback, useEffect, useState } from 'react';
import RequirePermission from '@/components/rbac/RequirePermission';
import {
  listAnnouncements,
  type AnnouncementRecord,
} from '@/lib/announcements';
import AnnouncementComposer from './AnnouncementComposer';
import AnnouncementHistory from './AnnouncementHistory';
import type { Lang } from './i18n';

interface Props {
  lang: Lang;
}

function CommunicationsInner({ lang }: Props) {
  const [items, setItems] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setItems(await listAnnouncements());
    } catch (err) {
      console.error('Error loading announcements:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-8" data-testid="admin-communications">
      <AnnouncementComposer lang={lang} onSent={refresh} />
      <AnnouncementHistory lang={lang} items={items} loading={loading} />
    </div>
  );
}

/**
 * Announcement composer + history, gated by `announcements:publish`
 * (content-editor, newsletter-editor, admins). Members get AccessDenied.
 */
export default function AdminCommunications({ lang }: Props) {
  return (
    <RequirePermission resource="announcements" operation="publish">
      <CommunicationsInner lang={lang} />
    </RequirePermission>
  );
}
