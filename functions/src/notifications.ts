/**
 * F19 — email notifications on top of the pipeline that already works.
 *
 * Every trigger here is best-effort: the email is wrapped in try/catch
 * (same contract as queueEmail in onMemberStatusChange) so a mail outage
 * can never fail the write that fired it. Delivery itself is the
 * firestore-send-email extension reading `mail/` (see email-service.ts).
 */
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { sendEmail } from './email-service';
import { generateContactMessageAdminEmail } from './email-templates';
import { getAppUrl } from './env';

type Lang = 'es' | 'en';

function adminEmail(): string {
  return process.env.ADMIN_EMAIL || 'contacto@secid.mx';
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
