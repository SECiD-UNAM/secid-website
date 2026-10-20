import { test, expect, type Page } from '@playwright/test';
import { SEEDED, login, expectMemberDashboard } from '../../utils/session';
import {
  listCollection,
  queryByField,
  setDocument,
} from '../../utils/emulator';

/**
 * Newsletter double opt-in and issue delivery (ROADMAP F21) against the
 * emulators:
 *
 *   1. The public form (src/pages/es/newsletter.astro → POST
 *      /api/forms/newsletter → subscribeNewsletter) leaves a `pending` doc
 *      and queues a confirmation mail whose one-time link
 *      (/api/newsletter/confirm, hosting rewrite → confirmNewsletter)
 *      flips it to `confirmed`.
 *   2. An admin opens the issue editor, the "Enviar a suscriptores" panel
 *      (src/components/newsletter/NewsletterSendPanel.tsx) shows the
 *      dry-run count from sendNewsletterIssue, and the real send queues one
 *      mail per subscriber with that subscriber's unsubscribe link, which
 *      flips the doc to `unsubscribed`.
 *
 * Serial: step 2 needs the subscriber step 1 confirmed.
 */
test.describe.configure({ mode: 'serial' });

const RUN = Date.now();
const SUBSCRIBER = `suscriptor-${RUN}@example.com`;
const ISSUE_ID = `e2e-issue-${RUN}`;
const ISSUE_TITLE = `Boletín e2e ${RUN}`;

function tokenFrom(html: string, path: string): string {
  const match = new RegExp(`${path}\\?token=([a-f0-9]{64})`).exec(html);
  if (!match) throw new Error(`no ${path} link in mail`);
  return match[1]!;
}

async function mailTo(to: string, subject: RegExp) {
  return (await queryByField('mail', 'to', to)).find((m) =>
    subject.test(String(m.message?.subject ?? ''))
  );
}

/**
 * Mirrors loadSubscribers in functions/src/newsletter-send.ts: confirmed or
 * legacy docs, one per email, minus QA plus-tags and minus any email that
 * has an unsubscribed doc (legacy duplicates).
 */
async function expectedSubscriberCount(): Promise<number> {
  const docs = await listCollection('newsletter');
  const emailOf = (doc: { email?: unknown }) =>
    String(doc.email ?? '')
      .trim()
      .toLowerCase();
  const blocked = new Set(
    docs.filter((d) => d.status === 'unsubscribed').map(emailOf)
  );
  const seen = new Set<string>();
  for (const doc of docs) {
    const email = emailOf(doc);
    if (!email || /^[^@]+\+(qa|secidtest|test)[^@]*@/i.test(email)) continue;
    if (doc.status !== undefined && doc.status !== 'confirmed') continue;
    if (blocked.has(email)) continue;
    seen.add(email);
  }
  return seen.size;
}

async function subscribe(page: Page, email: string) {
  await page.goto('/es/newsletter/');
  await page.fill('#newsletter-email', email);
  await page.fill('#newsletter-name', 'Suscriptora E2E');
  await page.check('#newsletter-consent');
  await page.click('#newsletter-submit');
  await expect(page.locator('#newsletter-success')).toBeVisible({
    timeout: 20000,
  });
}

test('public subscribe is pending until the confirmation link is used', async ({
  page,
}) => {
  await subscribe(page, SUBSCRIBER);

  await expect
    .poll(
      async () =>
        (await queryByField('newsletter', 'email', SUBSCRIBER))[0]?.status,
      { timeout: 15000 }
    )
    .toBe('pending');
  const [pending] = await queryByField('newsletter', 'email', SUBSCRIBER);
  expect(pending!.confirmTokenHash).toMatch(/^[a-f0-9]{64}$/);
  expect(pending!.unsubscribeToken).toMatch(/^[a-f0-9]{64}$/);

  await expect
    .poll(async () => (await mailTo(SUBSCRIBER, /confirma/i))?.id, {
      timeout: 15000,
    })
    .toBeTruthy();
  const confirmation = (await mailTo(SUBSCRIBER, /confirma/i))!;
  const token = tokenFrom(confirmation.message.html, '/api/newsletter/confirm');

  // The hosting emulator rewrites /api/newsletter/confirm to the function.
  await page.goto(`/api/newsletter/confirm?token=${token}`);
  await expect(page.locator('body')).toContainText('Suscripción confirmada');

  const [confirmed] = await queryByField('newsletter', 'email', SUBSCRIBER);
  expect(confirmed!.status).toBe('confirmed');
  expect(confirmed!.confirmTokenHash).toBeUndefined();
  expect(confirmed!.confirmedAt).toBeInstanceOf(Date);

  // One-time link.
  await page.goto(`/api/newsletter/confirm?token=${token}`);
  await expect(page.locator('body')).toContainText('Enlace no válido');
});

test('admin sends an issue: dry-run count, delivery with unsubscribe link', async ({
  page,
}) => {
  await setDocument('newsletter_archive', ISSUE_ID, {
    title: ISSUE_TITLE,
    issueNumber: 99,
    content: '<h2>Hola</h2><p>Edición de <b>prueba</b></p><script>x()</script>',
    excerpt: 'Edición de prueba del e2e',
    status: 'published',
    createdBy: 'seed',
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: new Date(),
  });
  const expected = await expectedSubscriberCount();
  expect(expected).toBeGreaterThanOrEqual(1);

  await login(page, SEEDED.admin);
  await expectMemberDashboard(page);
  await page.goto(`/es/dashboard/newsletter/edit/${ISSUE_ID}`);
  const panel = page.getByTestId('newsletter-send-panel');
  await expect(panel).toBeVisible({ timeout: 20000 });
  await expect(panel.getByTestId('newsletter-last-sent')).toHaveCount(0);

  await panel.getByRole('button', { name: 'Enviar a suscriptores' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible({ timeout: 20000 });
  await expect(dialog).toContainText(
    `Se enviará «${ISSUE_TITLE}» a ${expected} suscriptores confirmados.`
  );

  await dialog.getByRole('button', { name: 'Sí, enviar' }).click();
  await expect(panel.getByTestId('newsletter-send-toast')).toHaveText(
    `Newsletter enviado a ${expected} suscriptores.`,
    { timeout: 20000 }
  );
  await expect(panel.getByTestId('newsletter-last-sent')).toContainText(
    `a ${expected} suscriptores`
  );

  // The receipt is on the issue, the mail is queued and sanitized.
  await expect
    .poll(async () => (await mailTo(SUBSCRIBER, new RegExp(ISSUE_TITLE)))?.id, {
      timeout: 15000,
    })
    .toBeTruthy();
  const [issue] = (await listCollection('newsletter_archive')).filter(
    (d) => d.id === ISSUE_ID
  );
  expect(issue!.recipientCount).toBe(expected);
  expect(issue!.sentAt).toBeInstanceOf(Date);
  const mail = (await mailTo(SUBSCRIBER, new RegExp(ISSUE_TITLE)))!;
  expect(mail.message.html).toContain('<b>prueba</b>');
  expect(mail.message.html).not.toContain('<script');

  // Unsubscribe through the link that email carries.
  const token = tokenFrom(mail.message.html, '/api/newsletter/unsubscribe');
  await page.goto(`/api/newsletter/unsubscribe?token=${token}`);
  await expect(page.locator('body')).toContainText('Suscripción cancelada');
  const [gone] = await queryByField('newsletter', 'email', SUBSCRIBER);
  expect(gone!.status).toBe('unsubscribed');
});
