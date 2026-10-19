/**
 * F21 — send a newsletter issue to the confirmed subscribers.
 *
 * `sendNewsletterIssue({ issueId, dryRun?, force? })` takes the HTML body of
 * `newsletter_archive/{issueId}`, sanitizes it (functions/src/markdown.ts)
 * and queues one `mail/` doc per mailable `newsletter/` subscription
 * (confirmed or legacy; see newsletter-subscriptions.ts), each with that
 * subscriber's own unsubscribe link. The issue gets `sentAt`,
 * `recipientCount` and `sentBy`; a second send needs `force: true`.
 *
 * Authorization: `newsletter:publish` (`nl:p.a` — newsletter-editor,
 * content-editor, admin wildcard).
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import type {
  DocumentData,
  DocumentReference,
  Firestore,
} from 'firebase-admin/firestore';
import { admin } from './init';
import { sendBatchEmails, isQaRecipient } from './email-service';
import type { EmailData } from './email-service';
import { generateNewsletterIssueEmail } from './email-templates';
import { sanitizeHtml } from './markdown';
import { ALLOWED_CALLABLE_ORIGINS } from './env';
import {
  decodeClaimsPermissions,
  checkPermission,
} from './rbac/resolution-logic';
import {
  isMailableSubscription,
  newToken,
  unsubscribeUrl,
} from './newsletter-subscriptions';

type Lang = 'es' | 'en';

interface SendIssueInput {
  issueId: string;
  dryRun: boolean;
  force: boolean;
}

interface Subscriber {
  ref: DocumentReference;
  email: string;
  lang: Lang;
  unsubscribeToken: string;
  /** True when the token was minted now (legacy doc) and must be stored. */
  minted: boolean;
}

const MAIL_BATCH_SIZE = 400;

function assertCanSendNewsletter(auth: CallableRequest['auth']): asserts auth {
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Sign in to send the newsletter');
  }
  const rbac = (auth.token as { rbac?: { p?: string } }).rbac;
  const tokens = decodeClaimsPermissions(rbac?.p || '');
  if (!checkPermission(tokens, 'newsletter', 'publish').allowed) {
    throw new HttpsError(
      'permission-denied',
      'newsletter:publish is required to send the newsletter'
    );
  }
}

function parseInput(data: unknown): SendIssueInput {
  const d = (data || {}) as Record<string, unknown>;
  const issueId = typeof d.issueId === 'string' ? d.issueId.trim() : '';
  if (!issueId) {
    throw new HttpsError('invalid-argument', 'issueId is required');
  }
  return { issueId, dryRun: d.dryRun === true, force: d.force === true };
}

function toSubscriber(
  ref: DocumentReference,
  data: DocumentData,
  email: string
): Subscriber {
  const stored =
    typeof data.unsubscribeToken === 'string' ? data.unsubscribeToken : '';
  return {
    ref,
    email,
    lang: data.lang === 'en' ? 'en' : 'es',
    unsubscribeToken: stored || newToken(),
    minted: !stored,
  };
}

/** Mailable subscriptions, one per email (QA plus-tags excluded). */
export async function loadSubscribers(db: Firestore): Promise<Subscriber[]> {
  const snap = await db.collection('newsletter').get();
  const seen = new Set<string>();
  const out: Subscriber[] = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    if (!isMailableSubscription(data)) continue;
    const email = String(data.email).trim().toLowerCase();
    if (seen.has(email) || isQaRecipient(email)) continue;
    seen.add(email);
    out.push(toSubscriber(doc.ref, data, email));
  }
  return out;
}

/** Legacy docs (pre-F21) have no unsubscribe token: store the minted one. */
async function persistMintedTokens(
  db: Firestore,
  subscribers: Subscriber[]
): Promise<void> {
  const minted = subscribers.filter((s) => s.minted);
  for (let i = 0; i < minted.length; i += MAIL_BATCH_SIZE) {
    const batch = db.batch();
    for (const s of minted.slice(i, i + MAIL_BATCH_SIZE)) {
      batch.update(s.ref, { unsubscribeToken: s.unsubscribeToken });
    }
    await batch.commit();
  }
}

function buildEmails(
  issue: DocumentData,
  subscribers: Subscriber[]
): EmailData[] {
  const bodyHtml = sanitizeHtml(String(issue.content || ''));
  return subscribers.map((s) => {
    const { subject, html } = generateNewsletterIssueEmail({
      title: String(issue.title || ''),
      bodyHtml,
      unsubscribeUrl: unsubscribeUrl(s.unsubscribeToken),
      lang: s.lang,
    });
    return { to: s.email, subject, html };
  });
}

async function queueInBatches(emails: EmailData[]): Promise<void> {
  for (let i = 0; i < emails.length; i += MAIL_BATCH_SIZE) {
    await sendBatchEmails(emails.slice(i, i + MAIL_BATCH_SIZE));
  }
}

async function loadIssue(
  db: Firestore,
  issueId: string
): Promise<{ ref: DocumentReference; data: DocumentData }> {
  const ref = db.collection('newsletter_archive').doc(issueId);
  const snap = await ref.get();
  const data = snap.data();
  if (!snap.exists || !data) {
    throw new HttpsError('not-found', `Issue ${issueId} does not exist`);
  }
  return { ref, data };
}

export const sendNewsletterIssue = onCall(
  { cors: ALLOWED_CALLABLE_ORIGINS },
  async (request) => {
    assertCanSendNewsletter(request.auth);
    const input = parseInput(request.data);
    const db = admin.firestore();
    const issue = await loadIssue(db, input.issueId);
    const subscribers = await loadSubscribers(db);
    if (input.dryRun) return { recipientCount: subscribers.length };
    if (issue.data.sentAt && !input.force) {
      throw new HttpsError(
        'failed-precondition',
        'This issue was already sent; pass force to send it again'
      );
    }
    await persistMintedTokens(db, subscribers);
    await queueInBatches(buildEmails(issue.data, subscribers));
    await issue.ref.update({
      sentAt: FieldValue.serverTimestamp(),
      recipientCount: subscribers.length,
      sentBy: request.auth.uid,
    });
    console.log(
      `Newsletter ${input.issueId} queued for ${subscribers.length} subscribers`
    );
    return { recipientCount: subscribers.length };
  }
);
