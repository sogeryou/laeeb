import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { NotificationsPage } from '../../shared/notifications';
import type { CompanionApplicationResponse } from '../../shared/companionApplications';
import type { BusinessOrder } from '../../shared/orders';

const enabled = process.env.E2E_NOTIFICATION_FIXTURE === '1';
test.use({ channel: 'chrome', actionTimeout: 20_000, navigationTimeout: 45_000, screenshot: 'only-on-failure', trace: 'retain-on-failure' });
function assertFixture(baseURL: string | undefined) {
  expect(enabled).toBe(true); expect(baseURL).toBeTruthy();
  const url = new URL(baseURL!);
  expect(url.protocol).toBe('http:'); expect(['127.0.0.1', 'localhost', '[::1]']).toContain(url.hostname);
  expect(url.port).toBe('3016'); expect(url.username + url.password + url.search + url.hash).toBe(''); expect(url.pathname).toBe('/');
}
async function inspect<T>(page: Page, path: string): Promise<T> {
  const token = await page.evaluate(() => localStorage.getItem('business_workbench_token'));
  expect(token).toBeTruthy();
  const response = await page.request.get(path, { headers: { Authorization: `Bearer ${token}` }, maxRedirects: 0 });
  expect(response.ok(), `GET ${path}: ${response.status()}`).toBe(true); return response.json();
}
async function login(page: Page, email: string, id: string, admin = false) {
  await page.addInitScript(() => { if (!localStorage.getItem('le3eb_locale')) localStorage.setItem('le3eb_locale', 'en'); });
  await page.goto(admin ? '/admin' : '/auth/login');
  if (admin) {
    await page.getByPlaceholder('email', { exact: true }).fill(email);
    await page.getByPlaceholder('password', { exact: true }).fill('PreviewOnly123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
  } else {
    await page.getByRole('button', { name: 'Use a password', exact: true }).click();
    await page.getByLabel('Email address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill('PreviewOnly123!');
    await page.getByRole('button', { name: 'Log in', exact: true }).first().click();
  }
  await expect.poll(() => page.evaluate(() => localStorage.getItem('business_workbench_token'))).toBeTruthy();
  expect((await inspect<{ id: string }>(page, '/api/auth/session')).id).toBe(id);
  if (admin) { await expect(page).toHaveURL(/\/admin/); return; }
  await expect(page).toHaveURL(url => url.pathname === '/auth/profile' || !url.pathname.startsWith('/auth/'));
  if (new URL(page.url()).pathname === '/auth/profile') {
    await page.getByRole('button', { name: 'Choose avatar', exact: true }).first().click();
    await page.getByRole('button', { name: 'Choose avatar 1', exact: true }).click();
    await page.getByLabel('Rather not say', { exact: true }).check();
    await page.getByLabel('Birthday', { exact: true }).fill('1995-01-01');
    await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Skip for now', exact: true }).click();
  }
  await expect(page).not.toHaveURL(/\/auth\//);
}
async function inbox(page: Page, ar = false) {
  const messages = page.getByRole('button', { name: ar ? 'الرسائل' : 'Messages', exact: true });
  for (let depth = 0; depth < 5 && await messages.count() === 0; depth++) {
    await page.getByRole('button', { name: ar ? 'رجوع' : 'Back', exact: true }).click();
  }
  await messages.click();
  await page.getByRole('button', { name: /^(Notifications|الإشعارات)/ }).click();
  await expect(page.getByRole('heading', { name: ar ? 'الإشعارات' : 'Notifications', exact: true })).toBeVisible();
  await page.getByRole('button', { name: ar ? 'تحديث الإشعارات' : 'Refresh notifications', exact: true }).click();
}
async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth)).toBeLessThanOrEqual(1);
  const heading = page.getByRole('heading').first();
  expect(await heading.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  const bounds = await heading.boundingBox(); expect(bounds).toBeTruthy();
  const path = info.outputPath(`${name}.png`); await page.screenshot({ path, fullPage: false, animations: 'disabled' });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function localizedShots(page: Page, info: TestInfo, locale: 'en' | 'ar') {
  await page.evaluate(value => localStorage.setItem('le3eb_locale', value), locale); await page.reload(); await inbox(page, locale === 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  for (const viewport of [{ width: 320, height: 812 }, { width: 375, height: 812 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(viewport); await capture(page, info, `notifications-${locale}-${viewport.width}`);
  }
}
async function myOrders(page: Page) {
  await page.getByRole('button', { name: 'Me', exact: true }).click();
  await page.getByRole('button', { name: /Purchase History/ }).click();
}
async function openOrder(page: Page, id: string) {
  await page.getByRole('button', { name: new RegExp(`Order ${id}`, 'i') }).click();
  await expect(page.getByRole('dialog', { name: 'Order Details', exact: true })).toBeVisible();
}
async function completeApplication(page: Page) {
  await page.getByRole('button', { name: /Tactical Duo/ }).first().click(); await page.getByRole('button', { name: 'Next Step' }).click();
  for (const [field, value] of [['Rank', 'Gold'], ['Main Position', 'Mid'], ['Server', 'NA'], ['Platform', 'PC']]) {
    await page.getByRole('button', { name: new RegExp(field, 'i') }).click(); await page.getByRole('button', { name: value, exact: true }).click();
  }
  await page.getByPlaceholder('e.g. Aggressive, Strategic, Chill').fill('Patient');
  await page.getByPlaceholder('Tell users about your skills and playstyle...').fill('Patient ranked duo sessions with clear callouts.');
  await page.getByRole('button', { name: 'Next Step' }).click(); await page.getByRole('button', { name: 'Next Step' }).click();
  await page.getByPlaceholder('e.g. Pro Carry Service').fill('Notification acceptance service');
  await page.locator('input[type="number"]').fill('8'); await page.locator('select').selectOption('Hour');
  await page.getByRole('button', { name: 'Submit Application' }).click();
  await expect(page.getByRole('heading', { name: 'Application Pending', exact: true })).toBeVisible();
}
async function review(admin: Page, id: string, approve: boolean) {
  await admin.reload(); await admin.getByRole('button', { name: 'Companion Review', exact: true }).click();
  const row = admin.locator('tr').filter({ hasText: id });
  await row.getByRole('button', { name: approve ? 'Approve application' : 'Reject application', exact: true }).click();
  const dialog = admin.getByRole('dialog', { name: 'Companion application review' });
  if (!approve) await dialog.getByRole('textbox', { name: 'Rejection reason' }).fill('Please clarify your ranked service experience.');
  const saved = admin.waitForResponse(response => new URL(response.url()).pathname === `/api/admin/companions/${id}/review` && response.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'Confirm review' }).click(); expect((await saved).ok()).toBe(true); await expect(dialog).toHaveCount(0);
}

test('notification safety gate rejects remote, wrong-port, credentialed and non-root URLs', () => {
  for (const url of ['https://example.test:3016', 'http://127.0.0.1:3000', 'http://user:pass@localhost:3016', 'http://127.0.0.1:3016/other']) expect(() => assertFixture(url)).toThrow();
  if (enabled) expect(() => assertFixture('http://127.0.0.1:3016/')).not.toThrow();
});
test.describe('disposable notification fixture', () => {
  test.skip(!enabled, 'E2E_NOTIFICATION_FIXTURE=1 required');
  test.beforeEach(({ baseURL }) => assertFixture(baseURL));

  test('old orders do not fabricate notifications and load failure exposes retry', async ({ page }, info) => {
    test.setTimeout(120_000); await login(page, 'customer0@local.test', 'preview-customer-0');
    expect((await inspect<NotificationsPage>(page, '/api/notifications')).items).toEqual([]);
    await inbox(page); await expect(page.getByText('No notifications yet')).toBeVisible();
    for (const fake of ['Recharge Successful', 'Player123', 'Player456', 'System Update']) await expect(page.getByText(fake, { exact: false })).toHaveCount(0);
    let fail = true;
    await page.route('**/api/notifications?*', async route => { if (fail && route.request().method() === 'GET') await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'NOTIFICATION_LOAD_FAILED' }) }); else await route.continue(); });
    await page.getByRole('button', { name: 'Refresh notifications' }).click(); await expect(page.getByRole('alert')).toBeVisible();
    fail = false; await page.getByRole('button', { name: 'Refresh notifications' }).click(); await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByText('No notifications yet')).toBeVisible(); await capture(page, info, 'empty-notifications-en');
  });

  test('notification toolbar title fits a narrow mobile screen', async ({ page }, info) => {
    await login(page, 'customer0@local.test', 'preview-customer-0'); await inbox(page);
    await page.setViewportSize({ width: 320, height: 812 }); await capture(page, info, 'narrow-notification-toolbar');
  });

  test('real order and review events persist, open current targets, stay owner-only and support read failures', async ({ page, browser, baseURL }, info) => {
    test.setTimeout(360_000); await login(page, 'new0@local.test', 'preview-new-00');
    const providerContext = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
    const adminContext = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
    try {
      const provider = await providerContext.newPage(); const admin = await adminContext.newPage();
      await login(provider, 'player@local.test', 'preview-player'); await login(admin, 'admin@local.test', 'preview-admin', true);
      const oldOrders = (await inspect<{ items: BusinessOrder[] }>(admin, '/api/admin/orders?page=1&pageSize=100')).items;
      expect(oldOrders).toHaveLength(39);
      expect((await inspect<NotificationsPage>(provider, '/api/notifications')).items).toEqual([]);
      await page.getByRole('heading', { name: 'Preview Player', exact: true }).first().click();
      await page.getByRole('button', { name: 'Play', exact: true }).click(); await expect(page.getByLabel('Quoted total')).toHaveText('25');
      const payment = page.waitForResponse(response => new URL(response.url()).pathname === '/api/orders' && response.request().method() === 'POST');
      await page.getByRole('button', { name: 'Pay and Start', exact: true }).click();
      const paid = await payment; expect(paid.status()).toBe(201); const order: BusinessOrder = await paid.json();
      await provider.reload(); await myOrders(provider); await openOrder(provider, order.id);
      await provider.getByRole('button', { name: 'Accept and start', exact: true }).click();
      await provider.getByLabel('Completion evidence', { exact: true }).fill('Ranked session delivered with clear callouts.');
      await provider.getByRole('button', { name: 'Submit completion', exact: true }).click();
      await expect(provider.getByRole('dialog').getByText('Awaiting confirmation', { exact: true })).toBeVisible();
      await page.reload(); await myOrders(page); await openOrder(page, order.id);
      await page.getByRole('button', { name: 'Confirm completion', exact: true }).click();
      await expect(page.getByRole('dialog').getByText('Completed', { exact: true })).toBeVisible();
      await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
      const orderNotices = await inspect<NotificationsPage>(page, '/api/notifications?limit=50');
      expect(orderNotices.items.map(row => row.kind).sort()).toEqual(['ORDER_CREATED', 'ORDER_ACCEPTED', 'ORDER_AWAITING_CONFIRMATION', 'ORDER_COMPLETED'].sort());
      expect(orderNotices.items.every(row => row.userId === 'preview-new-00' && row.target.id === order.id)).toBe(true);
      orderNotices.items.forEach(row => expect(row).not.toHaveProperty('eventKey'));
      await inbox(page); await page.getByRole('button', { name: 'Open notification: Order placed', exact: true }).click();
      await expect(page.getByRole('dialog', { name: 'Order Details' }).getByText(order.id, { exact: true })).toBeVisible();
      await expect(page.getByRole('dialog').getByText('Completed', { exact: true })).toBeVisible();
      await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click(); await inbox(page);
      let failAll = true;
      await page.route('**/api/notifications/read-all', async route => { if (failAll) await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'NOTIFICATION_SAVE_FAILED' }) }); else await route.continue(); });
      await page.getByRole('button', { name: 'Mark all as read' }).click(); await expect(page.getByRole('alert')).toBeVisible();
      expect((await inspect<NotificationsPage>(page, '/api/notifications')).unreadCount).toBe(3);
      failAll = false; await page.getByRole('button', { name: 'Mark all as read' }).click();
      await expect(page.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
      expect((await inspect<NotificationsPage>(page, '/api/notifications')).unreadCount).toBe(0);
      expect((await inspect<NotificationsPage>(provider, '/api/notifications')).unreadCount).toBe(4);
      await page.reload(); await page.getByRole('button', { name: 'Me', exact: true }).click();
      await page.getByRole('button', { name: 'Become a Player' }).click(); await completeApplication(page);
      const application = (await inspect<CompanionApplicationResponse>(page, '/api/companions/me/application')).application!;
      await review(admin, application.id, false);
      await page.reload(); await inbox(page); await expect(page.getByRole('heading', { name: 'Application rejected', exact: true })).toBeVisible();
      const rejected = (await inspect<NotificationsPage>(page, '/api/notifications?limit=50')).items.find(row => row.kind === 'COMPANION_REJECTED')!;
      let failRead = true;
      await page.route(`**/api/notifications/${rejected.id}/read`, async route => { if (failRead) await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'NOTIFICATION_SAVE_FAILED' }) }); else await route.continue(); });
      await page.getByRole('button', { name: 'Mark as read', exact: true }).click(); await expect(page.getByRole('alert')).toBeVisible();
      expect((await inspect<NotificationsPage>(page, '/api/notifications?limit=50')).items.find(row => row.id === rejected.id)?.readAt).toBeUndefined();
      failRead = false; await page.getByRole('button', { name: 'Open notification: Application rejected', exact: true }).click();
      await expect(page.getByText('Please clarify your ranked service experience.', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Edit and resubmit' }).click();
      for (let step = 0; step < 3; step++) await page.getByRole('button', { name: 'Next Step' }).click();
      await page.getByRole('button', { name: 'Submit Application' }).click(); await expect(page.getByRole('heading', { name: 'Application Pending' })).toBeVisible();
      await review(admin, application.id, true);
      await localizedShots(page, info, 'en'); await localizedShots(page, info, 'ar');
      await page.getByRole('button', { name: 'تحديد الكل كمقروء' }).click();
      await expect(page.getByRole('button', { name: 'تحديد الكل كمقروء' })).toBeDisabled();
      await page.evaluate(() => localStorage.setItem('le3eb_locale', 'en')); await page.reload(); await inbox(page);
      await page.getByRole('button', { name: 'Open notification: Application rejected', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Application approved', exact: true })).toBeVisible();
      expect((await inspect<{ role: string }>(page, '/api/auth/session')).role).toBe('PLAYER');
      const final = await inspect<NotificationsPage>(page, '/api/notifications?limit=50');
      expect(final.items).toHaveLength(6); expect(final.unreadCount).toBe(0); expect(final.items.every(row => row.readAt !== undefined)).toBe(true);
      const other = await inspect<NotificationsPage>(provider, '/api/notifications?limit=50');
      expect(other.items).toHaveLength(4); expect(other.items.every(row => row.userId === 'preview-player' && row.target.type === 'ORDER')).toBe(true); expect(other.unreadCount).toBe(4);
      expect((await inspect<NotificationsPage>(admin, '/api/notifications')).items).toEqual([]);
      const after = (await inspect<{ items: BusinessOrder[] }>(admin, '/api/admin/orders?page=1&pageSize=100')).items.filter(row => row.workflowVersion !== 2);
      expect(after).toEqual(oldOrders);
      expect((await inspect<{ balance: number }>(page, '/api/wallet/balance')).balance).toBe(475);
      expect((await inspect<{ diamondWallet: { balance: number } }>(provider, '/api/dashboard/business')).diamondWallet.balance).toBe(1925);
    } finally { await providerContext.close(); await adminContext.close(); }
  });
});
