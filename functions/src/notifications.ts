/**
 * F19 — email notifications on top of the pipeline that already works.
 *
 * Every trigger here is best-effort: the email is wrapped in try/catch
 * (same contract as queueEmail in onMemberStatusChange) so a mail outage
 * can never fail the write that fired it. Delivery itself is the
 * firestore-send-email extension reading `mail/` (see email-service.ts).
 */
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import { admin } from './init';
import { sendEmail } from './email-service';
import {
  generateContactMessageAdminEmail,
  generateEventRegistrationEmail,
  EventEmailParams,
} from './email-templates';
import { getAppUrl } from './env';

type Lang = 'es' | 'en';

const DEFAULT_TIMEZONE = 'America/Mexico_City';

function adminEmail(): string {
  return process.env.ADMIN_EMAIL || 'contacto@secid.mx';
}

function pickLang(user: DocumentData): Lang {
  return user.lang === 'en' || user.locale === 'en' ? 'en' : 'es';
}

/**
 * contactMessages/{id} is written by sendContactMessage (public-forms.ts)
 * with name, email, subject, message, lang, sentAt, status, ipHash. The
 * sender goes in Reply-To so the admin can answer from the inbox.
 */
export const onContactMessageCreated = onDocumentCreated(
  'contactMessages/{id}',
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const lang: Lang = data.lang === 'en' ? 'en' : 'es';
    try {
      const { subject, html } = generateContactMessageAdminEmail({
        name: String(data.name || ''),
        email: String(data.email || ''),
        subject: data.subject ? String(data.subject) : undefined,
        message: String(data.message || ''),
        adminPanelUrl: `${getAppUrl()}/${lang}/dashboard/admin`,
      });
      await sendEmail({
        to: adminEmail(),
        subject,
        html,
        replyTo: data.email ? String(data.email) : undefined,
      });
      console.log(`Contact message ${event.params.id} forwarded to admin`);
    } catch (err) {
      console.error(
        `Failed to queue contact notification for ${event.params.id}:`,
        err
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Event emails
// ---------------------------------------------------------------------------

export interface Recipient {
  email: string;
  name: string;
  lang: Lang;
}

/**
 * Member to notify, or null when there is nobody to email: no user doc, no
 * email, or notificationSettings.email === false (absent means opted in,
 * same reading as src/lib/members/mapper.ts).
 */
export async function readRecipient(
  db: Firestore,
  uid: string
): Promise<Recipient | null> {
  const user = (await db.collection('users').doc(uid).get()).data();
  const email = typeof user?.email === 'string' ? user.email.trim() : '';
  if (!user || !email) return null;
  if (user.notificationSettings?.email === false) return null;
  return {
    email,
    name: user.firstName || user.displayName || email.split('@')[0],
    lang: pickLang(user),
  };
}

/** Firestore Timestamp (or Date) → Date; anything else → null. */
export function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  const ts = value as { toDate?: () => Date } | null | undefined;
  return ts && typeof ts.toDate === 'function' ? ts.toDate() : null;
}

function formatEventDate(date: Date, lang: Lang, timeZone?: string): string {
  const locale = lang === 'en' ? 'en-US' : 'es-MX';
  const style = { dateStyle: 'full', timeStyle: 'short' } as const;
  try {
    return new Intl.DateTimeFormat(locale, {
      ...style,
      timeZone: timeZone || DEFAULT_TIMEZONE,
    }).format(date);
  } catch {
    // Unknown IANA name on the event doc: fall back to the site's timezone.
    return new Intl.DateTimeFormat(locale, {
      ...style,
      timeZone: DEFAULT_TIMEZONE,
    }).format(date);
  }
}

/**
 * Events store `location` as { type, venue?, address?, virtualLink? }
 * (scripts/seed-emulator.js, EventDetail.tsx); older docs may hold a
 * plain string.
 */
function describeLocation(
  location: unknown,
  lang: Lang
): { text: string; href?: string } {
  if (typeof location === 'string' && location.trim()) {
    return { text: location };
  }
  const loc = (location || {}) as Record<string, unknown>;
  const physical = [loc.venue, loc.address]
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    .join(', ');
  const href = typeof loc.virtualLink === 'string' ? loc.virtualLink : '';
  if (physical && href) return { text: `${physical} · ${href}`, href };
  if (href) return { text: href, href };
  if (physical) return { text: physical };
  return {
    text: lang === 'en' ? 'To be confirmed' : 'Por confirmar',
  };
}

/** Everything the event templates need, in the recipient's language. */
export function summarizeEvent(
  eventId: string,
  data: DocumentData,
  recipient: Recipient
): EventEmailParams {
  const start = toDate(data.startDate);
  const place = describeLocation(data.location, recipient.lang);
  return {
    recipientName: recipient.name,
    eventTitle: String(data.title || ''),
    dateText: start
      ? formatEventDate(start, recipient.lang, data.timezone)
      : recipient.lang === 'en'
        ? 'Date to be confirmed'
        : 'Fecha por confirmar',
    locationText: place.text,
    locationHref: place.href,
    eventUrl: `${getAppUrl()}/${recipient.lang}/dashboard/events/${eventId}`,
    lang: recipient.lang,
  };
}

/**
 * Confirmation to the member. Sibling of onEventRegistrationCreated
 * (event-attendees.ts) so the attendee counter stays single-purpose.
 * The registration doc is keyed by uid and carries `userId`.
 */
export const onEventRegistrationEmail = onDocumentCreated(
  'events/{eventId}/registrations/{registrationId}',
  async (event) => {
    const { eventId, registrationId } = event.params;
    const uid = String(event.data?.data()?.userId || registrationId);
    try {
      const db = admin.firestore();
      const [eventSnap, recipient] = await Promise.all([
        db.collection('events').doc(eventId).get(),
        readRecipient(db, uid),
      ]);
      const eventData = eventSnap.data();
      if (!eventData || !recipient) {
        console.log(`Registration email skipped for ${eventId}/${uid}`);
        return;
      }
      const { subject, html } = generateEventRegistrationEmail(
        summarizeEvent(eventId, eventData, recipient)
      );
      await sendEmail({ to: recipient.email, subject, html });
      console.log(`Registration email queued for ${eventId}/${uid}`);
    } catch (err) {
      console.error(
        `Failed to queue registration email for ${eventId}/${uid}:`,
        err
      );
    }
  }
);
