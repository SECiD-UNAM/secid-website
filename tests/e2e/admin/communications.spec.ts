import { test, expect, type Page } from '@playwright/test';
import { SEEDED, login, expectMemberDashboard } from '../../utils/session';
import { listCollection, queryByField } from '../../utils/emulator';

/**
 * Announcement composer (ROADMAP F20) against the emulators:
 * src/components/admin/communications/* behind the RBAC gate
 * `announcements:publish` (RequirePermission → AccessDenied for a member),
 * the `sendAnnouncement` callable (functions/src/announcements.ts) writing
 * the `mail/` queue and the `announcements/` history, and the dry-run count
 * the confirm dialog shows before a real send.
 */

const PAGE = '/es/dashboard/admin/communications';

/** Mirrors isEligibleUser in functions/src/announcements.ts. */
function isEligible(user: Record<string, any>): boolean {
  const email = typeof user.email === 'string' ? user.email.trim() : '';
  if (!email || /^[^@]+\+(qa|secidtest|test)[^@]*@/i.test(email)) return false;
  if (user.lifecycle?.status !== 'active') return false;
  if (user.notificationSettings?.email === false) return false;
  return user.role !== 'company';
}

async function openComposer(page: Page) {
  await page.goto(PAGE);
  await expect(page.getByTestId('admin-communications')).toBeVisible({
    timeout: 20000,
  });
}

async function compose(page: Page, subject: string) {
  await page.getByLabel('Asunto').fill(subject);
  await page
    .getByLabel('Cuerpo (markdown)')
    .fill('Hola **a todos**\n\n- punto uno\n- <b>sin html</b>');
}

test.describe('Admin — comunicados', () => {
  test('a member is denied the composer', async ({ page }) => {
    await login(page, SEEDED.member);
    await expectMemberDashboard(page);

    await page.goto(PAGE);
    await expect(
      page.getByRole('heading', { name: /acceso denegado/i })
    ).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('admin-communications')).toHaveCount(0);
  });

  test('admin previews markdown and a test send queues mail to themselves', async ({
    page,
  }) => {
    const subject = `Prueba e2e ${Date.now()}`;
    await login(page, SEEDED.admin);
    await expectMemberDashboard(page);
    await openComposer(page);
    await compose(page, subject);

    const preview = page.getByTestId('announcement-preview');
    await expect(preview.locator('strong')).toHaveText('a todos');
    await expect(preview.locator('li')).toHaveCount(2);
    // Raw HTML is escaped, never rendered.
    await expect(preview.locator('b')).toHaveCount(0);
    await expect(preview).toContainText('<b>sin html</b>');

    await page.getByRole('button', { name: 'Enviarme prueba' }).click();
    await expect(page.getByTestId('announcement-toast')).toHaveText(
      'Prueba enviada a tu correo.',
      { timeout: 20000 }
    );

    // The callable queued exactly one mail/ doc, addressed to the admin.
    await expect
      .poll(
        async () =>
          (await queryByField('mail', 'to', SEEDED.admin.email)).filter(
            (m) => m.message?.subject === subject
          ).length,
        { timeout: 15000 }
      )
      .toBe(1);
    const [mail] = (await queryByField('mail', 'to', SEEDED.admin.email)).filter(
      (m) => m.message?.subject === subject
    );
    expect(mail!.message.html).toContain('<strong>a todos</strong>');
    expect(mail!.message.html).toContain('&lt;b&gt;sin html&lt;/b&gt;');

    // …and the history shows the run as a 1-recipient test send.
    const row = page
      .getByTestId('announcement-history')
      .locator('tbody tr', { hasText: subject });
    await expect(row).toBeVisible({ timeout: 20000 });
    await expect(row.getByTestId('announcement-count')).toHaveText('1');
    await expect(row).toContainText('Prueba');
    await expect(row).toContainText('Enviado');
  });

  test('the confirm step shows the dry-run count of active members', async ({
    page,
  }) => {
    const users = await listCollection('users');
    const expected = users.filter(isEligible).length;
    expect(expected).toBeGreaterThan(0);

    await login(page, SEEDED.admin);
    await expectMemberDashboard(page);
    await openComposer(page);
    await compose(page, 'Conteo e2e');

    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 20000 });
    await expect(dialog).toContainText(
      `Se enviará «Conteo e2e» a ${expected} destinatarios.`
    );

    // Cancel: nothing is queued for the whole audience.
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).toHaveCount(0);
    expect(
      (await listCollection('mail')).filter(
        (m) => m.message?.subject === 'Conteo e2e'
      )
    ).toHaveLength(0);
  });
});
