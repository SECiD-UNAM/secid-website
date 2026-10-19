/**
 * Client for member announcements (F20).
 *
 * Sending goes through the `sendAnnouncement` callable
 * (functions/src/announcements.ts), which resolves the audience, renders the
 * markdown and queues `mail/` docs; `dryRun` returns only the recipient
 * count. The history is the `announcements/` collection the callable
 * writes (client read-only, see firestore.rules).
 */
import { httpsCallable } from 'firebase/functions';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  type Timestamp,
} from 'firebase/firestore';
import { db, functions } from './firebase';

export type AudienceKind = 'all_active' | 'campus' | 'rbac_group' | 'test';

export interface Audience {
  kind: AudienceKind;
  campus?: string;
  groupId?: string;
}

export interface SendAnnouncementInput {
  subject: string;
  bodyMarkdown: string;
  audience: Audience;
  lang: 'es' | 'en';
  dryRun?: boolean;
}

export interface SendAnnouncementResult {
  id?: string;
  recipientCount: number;
}

export interface AnnouncementRecord {
  id: string;
  subject: string;
  audience: Audience;
  recipientCount: number;
  sentBy: string;
  sentAt: Date | null;
  status: 'sent' | 'failed';
  error?: string;
}

export const HISTORY_LIMIT = 25;

export async function sendAnnouncement(
  input: SendAnnouncementInput
): Promise<SendAnnouncementResult> {
  const call = httpsCallable<SendAnnouncementInput, SendAnnouncementResult>(
    functions,
    'sendAnnouncement'
  );
  const { data } = await call(input);
  return data;
}

/** Recipient count for the audience without sending anything. */
export function previewAnnouncementAudience(
  input: Omit<SendAnnouncementInput, 'dryRun'>
): Promise<SendAnnouncementResult> {
  return sendAnnouncement({ ...input, dryRun: true });
}

function toRecord(
  id: string,
  data: Record<string, unknown>
): AnnouncementRecord {
  const sentAt = data.sentAt as Timestamp | undefined;
  return {
    id,
    subject: String(data.subject ?? ''),
    audience: (data.audience as Audience) ?? { kind: 'all_active' },
    recipientCount: Number(data.recipientCount ?? 0),
    sentBy: String(data.sentBy ?? ''),
    sentAt:
      sentAt && typeof sentAt.toDate === 'function' ? sentAt.toDate() : null,
    status: data.status === 'failed' ? 'failed' : 'sent',
    error: typeof data.error === 'string' ? data.error : undefined,
  };
}

/** Most recent runs first. */
export async function listAnnouncements(): Promise<AnnouncementRecord[]> {
  const snap = await getDocs(
    query(
      collection(db, 'announcements'),
      orderBy('sentAt', 'desc'),
      limit(HISTORY_LIMIT)
    )
  );
  return snap.docs.map((d) => toRecord(d.id, d.data()));
}

export interface GroupOption {
  id: string;
  name: string;
}

/**
 * The nine system groups (functions/src/rbac/defaultGroups.ts). Used when
 * the caller cannot list `rbac_groups` (that needs `gr:v.a`, which content
 * editors do not carry) so the group audience still offers the built-ins.
 */
export const DEFAULT_GROUP_OPTIONS: GroupOption[] = [
  { id: 'super-admin', name: 'Super Admin' },
  { id: 'moderator', name: 'Moderator' },
  { id: 'content-editor', name: 'Content Editor' },
  { id: 'event-manager', name: 'Event Manager' },
  { id: 'newsletter-editor', name: 'Newsletter Editor' },
  { id: 'jc-coordinator', name: 'Journal Club Coordinator' },
  { id: 'mentor', name: 'Mentor' },
  { id: 'member', name: 'Member' },
  { id: 'company', name: 'Company' },
];

export async function listGroupOptions(): Promise<GroupOption[]> {
  try {
    const snap = await getDocs(collection(db, 'rbac_groups'));
    if (snap.empty) return DEFAULT_GROUP_OPTIONS;
    return snap.docs.map((d) => ({
      id: d.id,
      name: String(d.data().name ?? d.id),
    }));
  } catch {
    return DEFAULT_GROUP_OPTIONS;
  }
}
