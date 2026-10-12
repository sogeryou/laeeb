import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { CompanionApplicationResponse } from '../../shared/companionApplications';
import type { BusinessOrder } from '../../shared/orders';

const enabled = process.env.E2E_APPLICATION_FIXTURE === '1';
const applicantId = 'preview-new-00';
const providerId = 'preview-cp';
const serviceName = 'Patient ranked duo';
const intro = 'Calm duo coaching with clear callouts.';
const rejectionReason = 'Please add more detail about your service.';

test.use({ channel: 'chrome', actionTimeout: 20_000, navigationTimeout: 30_000, screenshot: 'only-on-failure', trace: 'retain-on-failure' });

function assertFixture(baseURL: string | undefined) {
  expect(enabled, 'Set E2E_APPLICATION_FIXTURE=1 for the disposable application fixture').toBe(true);
  expect(baseURL, 'Set E2E_BASE_URL to the disposable fixture on port 3014').toBeTruthy();
  const url = new URL(baseURL!);
  expect(url.protocol).toBe('http:');
  expect(['127.0.0.1', 'localhost', '[::1]']).toContain(url.hostname);
  expect(url.port).toBe('3014');
  expect(url.username + url.password).toBe('');
  expect(url.pathname).toBe('/');
  expect(url.search + url.hash).toBe('');
}

async function inspect<T>(page: Page, route: string): Promise<T> {
  const token = await page.evaluate(() => localStorage.getItem('business_workbench_token'));
  expect(token, 'Inspection requires a real UI login').toBeTruthy();
  const response = await page.request.get(route, { headers: { Authorization: `Bearer ${token}` }, maxRedirects: 0 });
  expect(response.ok(), `GET ${route}: ${response.status()}`).toBe(true);
  return response.json();
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
  if (admin) {
    await expect(page).toHaveURL(/\/admin/);
    return;
  }
  await expect(page).toHaveURL(url => url.pathname === '/auth/profile' || !url.pathname.startsWith('/auth/'));
  if (new URL(page.url()).pathname === '/auth/profile') {
    await page.getByRole('button', { name: 'Choose avatar', exact: true }).first().click();
    await page.getByRole('button', { name: 'Choose avatar 1', exact: true }).click();
    await page.getByLabel('Rather not say', { exact: true }).check();
    await page.getByLabel('Birthday', { exact: true }).fill('1995-01-01');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Skip for now', exact: true }).click();
  }
  await expect(page).not.toHaveURL(/\/auth\//);
}

async function application(page: Page) {
  const ar = await page.locator('html').getAttribute('dir') === 'rtl';
  await page.getByRole('button', { name: ar ? 'أنا' : 'Me', exact: true }).click();
  await page.getByRole('button', { name: /Become a Player|Application pending|Application rejected|Application approved|الطلب قيد المراجعة|تم رفض الطلب|تمت الموافقة على الطلب/ }).click();
  await expect(page.getByRole('heading', { name: ar ? /لاعب|مرافق/ : /Become a Player/ })).toBeVisible();
}

async function localizedState(page: Page, info: TestInfo, state: string, locale: 'en' | 'ar') {
  await page.evaluate(value => localStorage.setItem('le3eb_locale', value), locale);
  await page.reload();
  await application(page);
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  if (state.includes('pending')) await expect(page.getByRole('heading', { name: locale === 'ar' ? 'الطلب قيد المراجعة' : 'Application Pending', exact: true })).toBeVisible();
  for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(viewport);
    await capture(page, info, `${state}-${viewport.width < 500 ? 'mobile' : 'desktop'}-${locale}`);
  }
}

async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth)).toBeLessThanOrEqual(1);
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  await info.attach(name, { path, contentType: 'image/png' });
}

async function selectDetail(page: Page, field: string, option: string) {
  await page.getByRole('button', { name: new RegExp(field, 'i') }).click();
  await page.getByRole('button', { name: option, exact: true }).click();
}

async function captureMedia(page: Page, info: TestInfo | undefined, step: number) {
  const original = page.viewportSize()!;
  for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(viewport);
    for (const placeholder of await page.locator('[aria-disabled="true"]').all()) {
      expect((await placeholder.boundingBox())!.height).toBeLessThanOrEqual(256);
    }
    if (info) await capture(page, info, `wizard-step${step}-${viewport.width < 500 ? 'mobile' : 'desktop'}-en`);
  }
  await page.setViewportSize(original);
}

async function completeWizard(page: Page, info?: TestInfo) {
  await page.getByRole('button', { name: /Tactical Duo/ }).first().click();
  await page.getByRole('button', { name: 'Next Step' }).click();
  await selectDetail(page, 'Rank', 'Gold');
  await selectDetail(page, 'Main Position', 'Mid');
  await selectDetail(page, 'Server', 'NA');
  await selectDetail(page, 'Platform', 'PC');
  await page.getByPlaceholder('e.g. Aggressive, Strategic, Chill').fill('Patient and strategic');
  await page.getByPlaceholder('Tell users about your skills and playstyle...').fill(intro);
  await expect(page.locator('[aria-disabled="true"]')).toHaveCount(1);
  await captureMedia(page, info, 2);
  await page.getByRole('button', { name: 'Next Step' }).click();
  await expect(page.locator('[aria-disabled="true"]')).toHaveCount(2);
  await captureMedia(page, info, 3);
  await page.getByPlaceholder('A short catchy intro for your cover...').fill('Friendly ranked sessions');
  await page.getByRole('button', { name: 'Next Step' }).click();
  await page.getByPlaceholder('e.g. Pro Carry Service').fill(serviceName);
  await page.locator('input[type="number"]').fill('8');
  await page.locator('select').selectOption('Hour');
  await expect(page.getByText('Promotions: Currently unavailable')).toBeVisible();
}

async function inspectStatus(page: Page, route: string) {
  const token = await page.evaluate(() => localStorage.getItem('business_workbench_token'));
  expect(token).toBeTruthy();
  const response = await page.request.get(route, { headers: { Authorization: `Bearer ${token}` }, maxRedirects: 0 });
  return response.status();
}

test('safety gate refuses ordinary, remote, and wrong-port targets', () => {
  expect(() => assertFixture('https://example.com:3014')).toThrow();
  expect(() => assertFixture('http://127.0.0.1:3000')).toThrow();
  expect(() => assertFixture('http://user:pass@localhost:3014')).toThrow();
  expect(() => assertFixture('http://127.0.0.1:3014/other')).toThrow();
  if (enabled) expect(() => assertFixture('http://127.0.0.1:3014/')).not.toThrow();
});

test.describe('disposable companion application', () => {
  test.skip(!enabled, 'E2E_APPLICATION_FIXTURE=1 is required');
  test.beforeEach(async ({ baseURL }) => { assertFixture(baseURL); });

  test('load failure exposes retry without a write', async ({ page }) => {
    test.setTimeout(90_000);
    await login(page, 'new0@local.test', applicantId);
    let failLoad = true;
    await page.route('**/api/companions/me/application', async route => {
      if (route.request().method() === 'GET' && failLoad) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'COMPANION_LOAD_FAILED' }) });
      } else await route.continue();
    });
    await application(page);
    await expect(page.getByRole('alert')).toBeVisible();
    failLoad = false;
    await page.getByRole('button', { name: 'Refresh' }).click();
    await expect(page.getByRole('heading', { name: 'Choose Your Game' })).toBeVisible();
    expect((await inspect<CompanionApplicationResponse>(page, '/api/companions/me/application')).application).toBeNull();
  });

  test('wizard dry run retains draft after mocked submission failure', async ({ page }, info) => {
    test.setTimeout(120_000);
    await login(page, 'new0@local.test', applicantId);
    expect((await inspect<CompanionApplicationResponse>(page, '/api/companions/me/application')).application).toBeNull();
    await application(page);
    await completeWizard(page, info);
    await capture(page, info, 'wizard-dry-run-mobile-en');
    await page.route('**/api/companions/apply', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'COMPANION_SAVE_FAILED' }) });
      } else await route.continue();
    });
    await page.getByRole('button', { name: 'Submit Application' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByPlaceholder('e.g. Pro Carry Service')).toHaveValue(serviceName);
    expect((await inspect<CompanionApplicationResponse>(page, '/api/companions/me/application')).application).toBeNull();
  });

  test('real UI submit, reject, resubmit and approve keeps identity and old data', async ({ page, browser, baseURL }, info) => {
    test.setTimeout(300_000);
    await login(page, 'new0@local.test', applicantId);
    const before = await inspect<CompanionApplicationResponse>(page, '/api/companions/me/application');
    expect(before.application).toBeNull();
    const oldProviderBefore = await inspect<{ id: string; game: string; bio: string; price: number; services: unknown[] }>(page, `/api/companions/${providerId}/profile`);
    await application(page);
    await completeWizard(page, info);
    await capture(page, info, 'application-step4-mobile-en');
    let mockSubmit = true;
    let firstRequestId = '';
    await page.route('**/api/companions/apply', async route => {
      if (route.request().method() === 'POST' && mockSubmit) {
        firstRequestId = route.request().postDataJSON().requestId;
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'COMPANION_SAVE_FAILED' }) });
      } else await route.continue();
    });
    await page.getByRole('button', { name: 'Submit Application' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    expect(firstRequestId).toBeTruthy();
    expect((await inspect<CompanionApplicationResponse>(page, '/api/companions/me/application')).application).toBeNull();
    await expect(page.getByPlaceholder('e.g. Pro Carry Service')).toHaveValue(serviceName);
    mockSubmit = false;
    const submission = page.waitForResponse(response => new URL(response.url()).pathname === '/api/companions/apply' && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Submit Application' }).click();
    const submitted = await submission;
    expect(submitted.ok()).toBe(true);
    expect(submitted.request().postDataJSON().requestId).toBe(firstRequestId);
    const pending = (await inspect<CompanionApplicationResponse>(page, '/api/companions/me/application')).application!;
    expect(pending).toMatchObject({ userId: applicantId, status: 'PENDING', gameName: 'Tactical Duo', intro, hourlyRate: 8, details: { rank: 'Gold', mainPosition: 'Mid', server: 'NA', platform: 'PC', style: 'Patient and strategic', coverIntro: 'Friendly ranked sessions', serviceName, unit: 'hr' } });
    expect((await inspect<{ role: string }>(page, '/api/auth/session')).role).toBe('USER');
    expect(await inspectStatus(page, `/api/companions/${pending.id}/profile`)).toBe(404);
    expect((await inspect<Array<{ id: string }>>(page, '/api/companions')).some(item => item.id === pending.id)).toBe(false);
    await expect(page.getByRole('heading', { name: /Application pending/i })).toBeVisible();
    let failPendingRead = true;
    await page.route('**/api/companions/me/application', async route => {
      if (route.request().method() === 'GET' && failPendingRead) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'COMPANION_LOAD_FAILED' }) });
      } else await route.continue();
    });
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Application pending/i })).toBeVisible();
    await expect(page.locator('fieldset')).toHaveCount(0);
    failPendingRead = false;
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.reload();
    await application(page);
    await expect(page.getByRole('heading', { name: /Application pending/i })).toBeVisible();
    await localizedState(page, info, 'pending', 'en');
    await localizedState(page, info, 'pending', 'ar');
    await page.evaluate(() => localStorage.setItem('le3eb_locale', 'en'));
    await page.reload();
    await application(page);

    const adminContext = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
    try {
      const admin = await adminContext.newPage();
      await login(admin, 'admin@local.test', 'preview-admin', true);
      const historical = (await inspect<{ items: BusinessOrder[] }>(admin, '/api/admin/orders?page=1&pageSize=100')).items.filter(order => order.workflowVersion !== 2);
      expect(historical).toHaveLength(39);
      const oldOrders = historical.map(({ id, companionId, serviceName, unitPrice, totalPrice, status }) => ({ id, companionId, serviceName, unitPrice, totalPrice, status }));
      await admin.getByRole('button', { name: 'Companion Review' }).click();
      const row = admin.locator('tr').filter({ hasText: pending.id });
      await expect(row).toBeVisible();
      await admin.setViewportSize({ width: 375, height: 812 });
      await admin.getByRole('button', { name: 'Reject application' }).click();
      const mobileDialog = admin.getByRole('dialog', { name: 'Companion application review' });
      expect(await mobileDialog.evaluate(node => node.parentElement?.parentElement === document.body)).toBe(true);
      await mobileDialog.getByRole('textbox', { name: 'Rejection reason' }).fill(rejectionReason);
      await mobileDialog.getByRole('button', { name: 'Close review' }).focus();
      await admin.keyboard.press('Shift+Tab');
      await expect(mobileDialog.getByRole('button', { name: 'Confirm review' })).toBeFocused();
      await admin.keyboard.press('Tab');
      await expect(mobileDialog.getByRole('button', { name: 'Close review' })).toBeFocused();
      await capture(admin, info, 'review-dialog-mobile-en');
      await admin.keyboard.press('Escape');
      await expect(mobileDialog).toHaveCount(0);
      await admin.getByRole('button', { name: 'Reject application' }).click();
      await mobileDialog.getByRole('button', { name: 'Cancel review' }).click();
      await expect(mobileDialog).toHaveCount(0);
      await admin.setViewportSize({ width: 1440, height: 1000 });
      await row.getByRole('button', { name: 'Reject application' }).click();
      const dialog = admin.getByRole('dialog', { name: 'Companion application review' });
      await expect(dialog).toContainText(serviceName);
      await expect(dialog.getByRole('button', { name: 'Confirm review' })).toBeDisabled();
      await dialog.getByRole('textbox', { name: 'Rejection reason' }).fill(rejectionReason);
      await capture(admin, info, 'review-dialog-desktop-en');
      let mockReview = true;
      await admin.route(`**/api/admin/companions/${pending.id}/review`, async route => {
        if (route.request().method() === 'POST' && mockReview) {
          await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'COMPANION_REVIEW_FAILED' }) });
        } else await route.continue();
      });
      await dialog.getByRole('button', { name: 'Confirm review' }).click();
      await expect(dialog.getByRole('alert')).toBeVisible();
      await expect(dialog.getByRole('textbox', { name: 'Rejection reason' })).toHaveValue(rejectionReason);
      mockReview = false;
      const rejection = admin.waitForResponse(response => new URL(response.url()).pathname === `/api/admin/companions/${pending.id}/review` && response.request().method() === 'POST');
      await dialog.getByRole('button', { name: 'Confirm review' }).click();
      expect((await rejection).ok()).toBe(true);
      await expect(dialog).toHaveCount(0);
      await expect(row.getByRole('button', { name: 'Reject application' })).toHaveCount(0);
      await capture(admin, info, 'rejected-admin-desktop-en');

      await page.reload();
      await application(page);
      await expect(page.getByText(rejectionReason)).toBeVisible();
      await localizedState(page, info, 'rejected', 'en');
      await localizedState(page, info, 'rejected', 'ar');
      await page.evaluate(() => localStorage.setItem('le3eb_locale', 'en'));
      await page.reload();
      await application(page);
      await page.getByRole('button', { name: 'Edit and resubmit' }).click();
      await expect(page.getByRole('button', { name: /Tactical Duo/ }).first()).toBeVisible();
      await page.getByRole('button', { name: 'Next Step' }).click();
      await expect(page.getByPlaceholder('Tell users about your skills and playstyle...')).toHaveValue(intro);
      const improvedIntro = `${intro} Patient sessions for new ranked players.`;
      await page.getByPlaceholder('Tell users about your skills and playstyle...').fill(improvedIntro);
      await page.getByRole('button', { name: 'Next Step' }).click();
      await page.getByRole('button', { name: 'Next Step' }).click();
      await expect(page.getByPlaceholder('e.g. Pro Carry Service')).toHaveValue(serviceName);
      let failResubmit = true;
      let resubmitRequestId = '';
      await page.route('**/api/companions/apply', async route => {
        if (route.request().method() === 'POST' && failResubmit) {
          resubmitRequestId = route.request().postDataJSON().requestId;
          await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'COMPANION_SAVE_FAILED' }) });
        } else await route.continue();
      });
      await page.getByRole('button', { name: 'Submit Application' }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      expect(resubmitRequestId).toBeTruthy();
      expect(resubmitRequestId).not.toBe(firstRequestId);
      await page.reload();
      await application(page);
      await page.getByRole('button', { name: 'Edit and resubmit' }).click();
      await page.getByRole('button', { name: 'Next Step' }).click();
      await expect(page.getByPlaceholder('Tell users about your skills and playstyle...')).toHaveValue(improvedIntro);
      await page.getByRole('button', { name: 'Next Step' }).click();
      await page.getByRole('button', { name: 'Next Step' }).click();
      failResubmit = false;
      const resubmission = page.waitForResponse(response => new URL(response.url()).pathname === '/api/companions/apply' && response.request().method() === 'POST');
      await page.getByRole('button', { name: 'Submit Application' }).click();
      const resubmitted = await resubmission;
      expect(resubmitted.ok()).toBe(true);
      expect(resubmitted.request().postDataJSON().requestId).toBe(resubmitRequestId);
      const again = (await inspect<CompanionApplicationResponse>(page, '/api/companions/me/application')).application!;
      expect(again.id).toBe(pending.id);
      expect(again.status).toBe('PENDING');
      expect(again.intro).toBe(improvedIntro);
      expect(again.rejectionReason).toBeUndefined();
      expect((await inspect<{ role: string }>(page, '/api/auth/session')).role).toBe('USER');
      await localizedState(page, info, 'resubmitted-pending', 'ar');

      await admin.reload();
      await admin.getByRole('button', { name: 'Companion Review' }).click();
      const pendingRow = admin.locator('tr').filter({ hasText: again.id });
      await pendingRow.getByRole('button', { name: 'Approve application' }).click();
      const approval = admin.waitForResponse(response => new URL(response.url()).pathname === `/api/admin/companions/${again.id}/review` && response.request().method() === 'POST');
      await admin.getByRole('dialog', { name: 'Companion application review' }).getByRole('button', { name: 'Confirm review' }).click();
      expect((await approval).ok()).toBe(true);
      await expect(admin.getByRole('dialog', { name: 'Companion application review' })).toHaveCount(0);
      await expect(pendingRow.getByRole('button', { name: 'Approve application' })).toHaveCount(0);
      await page.bringToFront();
      await expect(page.getByRole('heading', { name: 'تمت الموافقة على طلبك' })).toBeVisible({ timeout: 40_000 });
      for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 1000 }]) {
        await page.setViewportSize(viewport);
        await capture(page, info, `approved-${viewport.width < 500 ? 'mobile' : 'desktop'}-ar`);
      }
      await page.getByRole('button', { name: 'مركز اللاعب' }).click();
      await expect(page.getByRole('button', { name: 'Game Services' })).toBeVisible();
      expect((await inspect<{ role: string }>(page, '/api/auth/session')).role).toBe('PLAYER');
      const approved = (await inspect<CompanionApplicationResponse>(page, '/api/companions/me/application')).application!;
      expect(approved).toMatchObject({ id: pending.id, status: 'APPROVED' });
      const provider = await inspect<{ id: string; onlineStatus: string }>(page, `/api/companions/${pending.id}/profile`);
      expect(provider).toMatchObject({ id: pending.id, onlineStatus: 'Offline' });
      const managed = await inspect<{ id: string; status: string; availability: string; services: Array<{ name: string; unit: string; unitPrice: number }> }>(page, '/api/companions/me/profile');
      expect(managed).toMatchObject({ id: pending.id, status: 'APPROVED', availability: 'OFFLINE' });
      expect(managed.services).toContainEqual(expect.objectContaining({ name: serviceName, unit: 'hr', unitPrice: 8 }));
      const oldProvider = await inspect<typeof oldProviderBefore>(page, `/api/companions/${providerId}/profile`);
      expect({ id: oldProvider.id, game: oldProvider.game, bio: oldProvider.bio, price: oldProvider.price, services: oldProvider.services }).toEqual({ id: oldProviderBefore.id, game: oldProviderBefore.game, bio: oldProviderBefore.bio, price: oldProviderBefore.price, services: oldProviderBefore.services });
      const after = (await inspect<{ items: BusinessOrder[] }>(admin, '/api/admin/orders?page=1&pageSize=100')).items.filter(order => order.workflowVersion !== 2);
      expect(after.map(({ id, companionId, serviceName, unitPrice, totalPrice, status }) => ({ id, companionId, serviceName, unitPrice, totalPrice, status }))).toEqual(oldOrders);
      await capture(page, info, 'approved-player-center-desktop-ar');
    } finally {
      await adminContext.close();
    }
  });
});
