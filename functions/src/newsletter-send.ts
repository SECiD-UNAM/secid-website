/**
 * F21 — send a newsletter issue to the confirmed subscribers.
 *
 * `sendNewsletterIssue({ issueId, dryRun?, force? })` takes the HTML body of
 * `newsletter_archive/{issueId}`, sanitizes it (functions/src/markdown.ts)
 * and queues one `mail/` doc per mailable `newsletter/` subscription
 * (confirmed or legacy; see newsletter-subscriptions.ts), each with that
 * subscriber's own unsubscribe link. An email with any unsubscribed doc
 * (legacy duplicates) is never mailed.
 *
 * Delivery is claimed first, in a transaction, so two editors (or a
 * double click) cannot both send: the issue carries `sendingAt` /
 * `sendingBy` while a run is in progress and `sentAt` / `recipientCount`
 * / `sentBy` once it finished; a second send needs `force: true`. Each run
 * has a number (`sendRun`, `sentRun` once complete) that keys the mail
 * doc ids, `${issueId}_${run}_${sha256(email)[0..16]}`: a retry after a
 * partial failure (a batch threw, the function timed out) writes only the
 * docs still missing, a forced resend starts the next run.
 *
 * Authorization: `newsletter:publish` (`nl:p.a` — newsletter-editor,
 * content-editor, admin wildcard).
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type {
  DocumentData,
  DocumentReference,
  Firestore,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import * as crypto from 'crypto';
import './init';
import { queueEmailsOnce, isQaRecipient } from './email-service';
import type { IdentifiedEmail } from './email-service';
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
  normalizeEmail,
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
/** Callable timeout; a `sendingAt` claim older than this is abandoned. */
const SEND_TIMEOUT_SECONDS = 300;

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

/** Emails with at least one unsubscribed doc: never mailed, whatever else they own. */
function unsubscribedEmails(docs: QueryDocumentSnapshot[]): Set<string> {
  const blocked = new Set<string>();
  for (const doc of docs) {
    const { status, email } = doc.data();
    if (status === 'unsubscribed' && typeof email === 'string') {
      blocked.add(normalizeEmail(email));
    }
  }
  return blocked;
}

/** Mailable subscriptions, one per email (QA plus-tags excluded). */
export async function loadSubscribers(db: Firestore): Promise<Subscriber[]> {
  const snap = await db.collection('newsletter').get();
  const blocked = unsubscribedEmails(snap.docs);
  const seen = new Set<string>();
  const out: Subscriber[] = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    if (!isMailableSubscription(data)) continue;
    const email = normalizeEmail(String(data.email));
    if (blocked.has(email) || seen.has(email) || isQaRecipient(email)) continue;
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

/** Deterministic mail doc id: one per issue, run and recipient. */
function mailDocId(issueId: string, run: number, email: string): string {
  const digest = crypto.createHash('sha256').update(email).digest('hex');
  return `${issueId}_${run}_${digest.slice(0, 16)}`;
}

function buildEmails(
  issueId: string,
  run: number,
  issue: DocumentData,
  subscribers: Subscriber[]
): IdentifiedEmail[] {
  const bodyHtml = sanitizeHtml(String(issue.content || ''));
  return subscribers.map((s) => {
    const { subject, html } = generateNewsletterIssueEmail({
      title: String(issue.title || ''),
      bodyHtml,
      unsubscribeUrl: unsubscribeUrl(s.unsubscribeToken),
      lang: s.lang,
    });
    return { id: mailDocId(issueId, run, s.email), to: s.email, subject, html };
  });
}

async function queueInBatches(emails: IdentifiedEmail[]): Promise<void> {
  for (let i = 0; i < emails.length; i += MAIL_BATCH_SIZE) {
    await queueEmailsOnce(emails.slice(i, i + MAIL_BATCH_SIZE));
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

function toMillis(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  const ts = value as { toMillis?: () => number } | null;
  return typeof ts?.toMillis === 'function' ? ts.toMillis() : Date.now();
}

/** A run is in progress unless its claim outlived the function timeout. */
function isBeingSent(issue: DocumentData): boolean {
  if (!issue.sendingAt) return false;
  return Date.now() - toMillis(issue.sendingAt) < SEND_TIMEOUT_SECONDS * 1000;
}

/** The run to execute: the unfinished one again, else the next one. */
function nextRun(issue: DocumentData): number {
  const claimed = typeof issue.sendRun === 'number' ? issue.sendRun : 0;
  const done = typeof issue.sentRun === 'number' ? issue.sentRun : 0;
  return claimed > done ? claimed : claimed + 1;
}

/**
 * Atomically mark the issue as being sent and return the run number.
 * Refused while another run is in progress, and once the issue is sent
 * unless `force`.
 */
async function claimIssue(
  db: Firestore,
  ref: DocumentReference,
  uid: string,
  force: boolean
): Promise<number> {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const issue = snap.data();
    if (!snap.exists || !issue) {
      throw new HttpsError('not-found', `Issue ${ref.id} does not exist`);
    }
    if (isBeingSent(issue)) {
      throw new HttpsError(
        'failed-precondition',
        'This issue is being sent right now; wait for that run to finish'
      );
    }
    if (issue.sentAt && !force) {
      throw new HttpsError(
        'failed-precondition',
        'This issue was already sent; pass force to send it again'
      );
    }
    const run = nextRun(issue);
    tx.update(ref, {
      sendingAt: FieldValue.serverTimestamp(),
      sendingBy: uid,
      sendRun: run,
    });
    return run;
  });
}

async function releaseClaim(ref: DocumentReference): Promise<void> {
  try {
    await ref.update({
      sendingAt: FieldValue.delete(),
      sendingBy: FieldValue.delete(),
    });
  } catch (err) {
    console.error(`Could not release the send claim on ${ref.path}`, err);
  }
}

export const sendNewsletterIssue = onCall(
  { cors: ALLOWED_CALLABLE_ORIGINS, timeoutSeconds: SEND_TIMEOUT_SECONDS },
  async (request) => {
    assertCanSendNewsletter(request.auth);
    const input = parseInput(request.data);
    const db = getFirestore();
    const issue = await loadIssue(db, input.issueId);
    const subscribers = await loadSubscribers(db);
    if (input.dryRun) return { recipientCount: subscribers.length };

    const run = await claimIssue(db, issue.ref, request.auth.uid, input.force);
    try {
      await persistMintedTokens(db, subscribers);
      await queueInBatches(
        buildEmails(input.issueId, run, issue.data, subscribers)
      );
    } catch (err) {
      await releaseClaim(issue.ref);
      throw err;
    }
    await issue.ref.update({
      sentAt: FieldValue.serverTimestamp(),
      recipientCount: subscribers.length,
      sentBy: request.auth.uid,
      sentRun: run,
      sendingAt: FieldValue.delete(),
      sendingBy: FieldValue.delete(),
    });
    console.log(
      `Newsletter ${input.issueId} run ${run} queued for ${subscribers.length} subscribers`
    );
    return { recipientCount: subscribers.length };
  }
);
