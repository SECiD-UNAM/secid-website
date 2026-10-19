/**
 * F20 — member announcements.
 *
 * `sendAnnouncement` renders a markdown body into the SECiD email shell and
 * queues one `mail/` doc per recipient (delivered by the firestore-send-email
 * extension, see email-service.ts), then records the run in
 * `announcements/{id}`. The audience is resolved from `users/` at send time;
 * `dryRun: true` only returns the count so the composer can confirm it.
 *
 * Authorization is the RBAC claim `announcements:publish` (`ac:p.a`), held
 * by content-editor, newsletter-editor and the admin wildcard. Volume note:
 * the SMTP account behind the extension handles ~500 recipients/day; see
 * docs/runbooks/communications.md before sending to a larger audience.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import { admin } from './init';
import { sendBatchEmails, isQaRecipient } from './email-service';
import type { EmailData } from './email-service';
import { generateAnnouncementEmail } from './email-templates';
import { renderMarkdown } from './markdown';
import { getAppUrl, ALLOWED_CALLABLE_ORIGINS } from './env';
import {
  decodeClaimsPermissions,
  checkPermission,
} from './rbac/resolution-logic';

type Lang = 'es' | 'en';

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
  lang: Lang;
  dryRun: boolean;
}

export interface Recipient {
  email: string;
  name: string;
}

/** A Firestore batch holds 500 writes; keep headroom (same as notifications). */
export const ANNOUNCEMENT_BATCH_SIZE = 400;
const SUBJECT_MAX = 200;
const BODY_MAX = 20000;
const AUDIENCE_KINDS: AudienceKind[] = [
  'all_active',
  'campus',
  'rbac_group',
  'test',
];

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

type Auth = CallableRequest['auth'];

/** Throws unless the caller's claims allow announcements:publish. */
export function assertCanSendAnnouncements(auth: Auth): asserts auth {
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Sign in to send announcements');
  }
  const rbac = (auth.token as { rbac?: { p?: string } }).rbac;
  const tokens = decodeClaimsPermissions(rbac?.p || '');
  const result = checkPermission(tokens, 'announcements', 'publish');
  if (!result.allowed) {
    throw new HttpsError(
      'permission-denied',
      'announcements:publish is required to send announcements'
    );
  }
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

function parseAudience(raw: unknown): Audience {
  const a = (raw || {}) as Record<string, unknown>;
  const kind = a.kind as AudienceKind;
  if (!AUDIENCE_KINDS.includes(kind)) {
    throw new HttpsError('invalid-argument', 'Unknown audience kind');
  }
  const campus = typeof a.campus === 'string' ? a.campus.trim() : '';
  const groupId = typeof a.groupId === 'string' ? a.groupId.trim() : '';
  if (kind === 'campus' && !campus) {
    throw new HttpsError('invalid-argument', 'audience.campus is required');
  }
  if (kind === 'rbac_group' && !groupId) {
    throw new HttpsError('invalid-argument', 'audience.groupId is required');
  }
  if (kind === 'campus') return { kind, campus };
  if (kind === 'rbac_group') return { kind, groupId };
  return { kind };
}

export function parseInput(data: unknown): SendAnnouncementInput {
  const d = (data || {}) as Record<string, unknown>;
  const subject = typeof d.subject === 'string' ? d.subject.trim() : '';
  const bodyMarkdown = typeof d.bodyMarkdown === 'string' ? d.bodyMarkdown : '';
  if (!subject || subject.length > SUBJECT_MAX) {
    throw new HttpsError(
      'invalid-argument',
      'subject is required (≤200 chars)'
    );
  }
  if (!bodyMarkdown.trim() || bodyMarkdown.length > BODY_MAX) {
    throw new HttpsError('invalid-argument', 'bodyMarkdown is required');
  }
  return {
    subject,
    bodyMarkdown,
    audience: parseAudience(d.audience),
    lang: d.lang === 'en' ? 'en' : 'es',
    dryRun: d.dryRun === true,
  };
}

// ---------------------------------------------------------------------------
// Recipients
// ---------------------------------------------------------------------------

/**
 * Members who should receive broadcast mail: active lifecycle, an email on
 * file, not opted out (absent notificationSettings = opted in, same reading
 * as notifications.ts), not a company account, not a QA plus-tag address.
 */
export function isEligibleUser(user: DocumentData): boolean {
  const email = typeof user.email === 'string' ? user.email.trim() : '';
  if (!email || isQaRecipient(email)) return false;
  if (user.lifecycle?.status !== 'active') return false;
  if (user.notificationSettings?.email === false) return false;
  return user.role !== 'company';
}

function toRecipient(user: DocumentData): Recipient {
  const email = String(user.email).trim();
  return {
    email,
    name: user.firstName || user.displayName || email.split('@')[0],
  };
}

async function activeUsers(db: Firestore): Promise<DocumentData[]> {
  const snap = await db
    .collection('users')
    .where('lifecycle.status', '==', 'active')
    .get();
  return snap.docs.map((d) => d.data());
}

async function groupMembers(
  db: Firestore,
  groupId: string
): Promise<DocumentData[]> {
  const assignments = await db
    .collection('rbac_user_groups')
    .where('groups', 'array-contains', groupId)
    .get();
  const snaps = await Promise.all(
    assignments.docs.map((a) => db.collection('users').doc(a.id).get())
  );
  return snaps.filter((s) => s.exists).map((s) => s.data() as DocumentData);
}

/** The caller alone, regardless of opt-out: it is their own test send. */
async function callerOnly(db: Firestore, uid: string): Promise<Recipient[]> {
  const user = (await db.collection('users').doc(uid).get()).data();
  const email = typeof user?.email === 'string' ? user.email.trim() : '';
  if (!user || !email) {
    throw new HttpsError('failed-precondition', 'Your profile has no email');
  }
  return [toRecipient(user)];
}

export async function resolveRecipients(
  db: Firestore,
  audience: Audience,
  callerUid: string
): Promise<Recipient[]> {
  if (audience.kind === 'test') return callerOnly(db, callerUid);
  const users =
    audience.kind === 'rbac_group'
      ? await groupMembers(db, audience.groupId as string)
      : await activeUsers(db);
  return users
    .filter(isEligibleUser)
    .filter((u) => audience.kind !== 'campus' || u.campus === audience.campus)
    .map(toRecipient);
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

function buildEmails(
  recipients: Recipient[],
  input: SendAnnouncementInput
): EmailData[] {
  const bodyHtml = renderMarkdown(input.bodyMarkdown);
  const settingsUrl = `${getAppUrl()}/${input.lang}/dashboard/settings`;
  return recipients.map((r) => {
    const { subject, html } = generateAnnouncementEmail({
      subject: input.subject,
      bodyHtml,
      settingsUrl,
      lang: input.lang,
    });
    return { to: r.email, subject, html };
  });
}

async function queueInBatches(emails: EmailData[]): Promise<void> {
  for (let i = 0; i < emails.length; i += ANNOUNCEMENT_BATCH_SIZE) {
    await sendBatchEmails(emails.slice(i, i + ANNOUNCEMENT_BATCH_SIZE));
  }
}

function recordOf(
  input: SendAnnouncementInput,
  recipientCount: number,
  sentBy: string
): DocumentData {
  return {
    subject: input.subject,
    bodyMarkdown: input.bodyMarkdown,
    audience: input.audience,
    lang: input.lang,
    recipientCount,
    sentBy,
    sentAt: FieldValue.serverTimestamp(),
  };
}

/** Queues the mail and records the run; a failure is recorded, then rethrown. */
async function sendAndRecord(
  db: Firestore,
  input: SendAnnouncementInput,
  recipients: Recipient[],
  sentBy: string
): Promise<string> {
  const ref = db.collection('announcements').doc();
  const record = recordOf(input, recipients.length, sentBy);
  try {
    await queueInBatches(buildEmails(recipients, input));
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await ref.set({ ...record, status: 'failed', error });
    console.error(`Announcement ${ref.id} failed:`, err);
    throw new HttpsError('internal', 'Could not queue the announcement');
  }
  await ref.set({ ...record, status: 'sent' });
  return ref.id;
}

export const sendAnnouncement = onCall(
  { cors: ALLOWED_CALLABLE_ORIGINS },
  async (request) => {
    assertCanSendAnnouncements(request.auth);
    const input = parseInput(request.data);
    const db = admin.firestore();
    const recipients = await resolveRecipients(
      db,
      input.audience,
      request.auth.uid
    );
    if (input.dryRun) return { recipientCount: recipients.length };
    const id = await sendAndRecord(db, input, recipients, request.auth.uid);
    console.log(
      `Announcement ${id} queued for ${recipients.length} recipients`
    );
    return { id, recipientCount: recipients.length };
  }
);
