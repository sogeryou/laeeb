import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { ManagedCompanionProfile } from '../../shared/companionManagement';
import type { BusinessOrder, OrderQuote } from '../../shared/orders';
import type { EPal } from '../../shared/types';

const enabled = process.env.E2E_COMPANION_FIXTURE === '1';
const providerId = 'preview-player';
const buyerId = 'preview-new-00';
const existingServiceId = 'preview-ranked-match';
const couponId = 'preview-order-fixed5-grant';

test.use({ channel: 'chrome', actionTimeout: 20_000, navigationTimeout: 30_000, screenshot: 'only-on-failure', trace: 'retain-on-failure' });

function assertFixture(baseURL: string | undefined) {
  expect(enabled, 'Set E2E_COMPANION_FIXTURE=1 for the disposable fixture').toBe(true);
  expect(baseURL, 'Set E2E_BASE_URL to the isolated fixture on port 3013').toBeTruthy();
  const url = new URL(baseURL!);
  expect(url.protocol).toBe('http:');
  expect(['127.0.0.1', 'localhost', '[::1]']).toContain(url.hostname);
  expect(url.port).toBe('3013');
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

async function login(page: Page, email: string, id: string) {
  await page.addInitScript(() => { if (!localStorage.getItem('le3eb_locale')) localStorage.setItem('le3eb_locale', 'en'); });
  await page.goto('/auth/login');
  await page.getByRole('button', { name: 'Use a password', exact: true }).click();
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('PreviewOnly123!');
  await page.getByRole('button', { name: 'Log in', exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('business_workbench_token'))).toBeTruthy();
  expect((await inspect<{ id: string }>(page, '/api/auth/session')).id).toBe(id);
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

async function editor(page: Page, loaded = true) {
  const ar = await page.locator('html').getAttribute('dir') === 'rtl';
  await page.getByRole('button', { name: ar ? 'أنا' : 'Me', exact: true }).click();
  await page.getByRole('button', { name: 'Player Center', exact: true }).click();
  await page.getByRole('button', { name: 'Game Services', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Player Profile|ملف اللاعب/ })).toBeVisible();
  if (loaded) await expect(page.getByLabel(/Introduction|النبذة التعريفية/)).toBeVisible();
}

async function capture(page: Page, info: TestInfo, name: string, fullPage = false) {
  await page.evaluate(() => scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth)).toBeLessThanOrEqual(1);
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage, animations: 'disabled' });
  await info.attach(name, { path, contentType: 'image/png' });
}

test('safety gate refuses ordinary, remote, and wrong-port targets', () => {
  expect(() => assertFixture('https://example.com:3013')).toThrow();
  expect(() => assertFixture('http://127.0.0.1:3000')).toThrow();
  expect(() => assertFixture('http://user:pass@localhost:3013')).toThrow();
  expect(() => assertFixture('http://127.0.0.1:3013/other')).toThrow();
  if (enabled) expect(() => assertFixture('http://127.0.0.1:3013/')).not.toThrow();
});

test.describe('disposable companion management', () => {
  test.skip(!enabled, 'E2E_COMPANION_FIXTURE=1 is required');
  test.beforeEach(async ({ baseURL }) => { assertFixture(baseURL); });

  test('owner saves stable services; buyer sees current profile, quotes and funds without rewriting history', async ({ page, browser, baseURL }, info) => {
    test.setTimeout(210_000);
    await login(page, 'player@local.test', providerId);
    const before = await inspect<ManagedCompanionProfile>(page, '/api/companions/me/profile');
    expect(before).toMatchObject({ id: 'preview-cp', userId: providerId, gameName: 'Valorant', hourlyRate: 25 });
    expect(before.services).toContainEqual({ id: existingServiceId, name: 'Preview ranked match', unitPrice: 25, unit: 'match' });
    const historical = (await inspect<BusinessOrder[]>(page, '/api/orders')).filter(order => order.workflowVersion !== 2);
    expect(historical).toHaveLength(39);
    const historicalSnapshot = historical.map(({ id, serviceName, serviceId, unit, unitPrice, totalPrice, status }) => ({ id, serviceName, serviceId, unit, unitPrice, totalPrice, status }));

    await editor(page);
    await expect(page.getByRole('button', { name: 'Upload Cover Image' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Voice Intro' })).toBeDisabled();
    await page.getByLabel('Primary service name').fill('Valorant Duo');
    await page.getByLabel('Primary service price').fill('20');
    await page.getByLabel('Introduction').fill('Coordinated duo sessions with patient callouts.');
    await page.getByLabel(`Service name ${existingServiceId}`).fill('Preview ranked duo');
    await page.getByLabel(`Service price ${existingServiceId}`).fill('7.5');
    await page.getByRole('button', { name: 'Add New Service' }).click();
    const newName = page.getByLabel(/^Service name (?!preview-ranked-match)/);
    await expect(newName).toHaveCount(1);
    const newId = (await newName.getAttribute('aria-label'))!.replace('Service name ', '');
    expect(newId).toMatch(/^[A-Za-z0-9_-]{1,100}$/);
    await newName.fill('Coaching session');
    await page.getByLabel(`Service price ${newId}`).fill('9.5');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await capture(page, info, 'editor-desktop-en-before-save', true);
    const saveResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/companions/me/profile' && response.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    expect((await saveResponse).ok()).toBe(true);
    const saved = await inspect<ManagedCompanionProfile>(page, '/api/companions/me/profile');
    expect(saved.updatedAt).toBeGreaterThan(before.updatedAt);
    expect(saved).toMatchObject({ gameName: 'Valorant Duo', hourlyRate: 20, intro: 'Coordinated duo sessions with patient callouts.' });
    expect(saved.services).toEqual(expect.arrayContaining([
      { id: existingServiceId, name: 'Preview ranked duo', unitPrice: 7.5, unit: 'match' },
      { id: newId, name: 'Coaching session', unitPrice: 9.5, unit: 'hr' },
    ]));
    await page.reload();
    await editor(page);
    await expect(page.getByLabel('Primary service name')).toHaveValue('Valorant Duo');
    await expect(page.getByLabel(`Service name ${existingServiceId}`)).toHaveValue('Preview ranked duo');
    await expect(page.getByLabel(`Service name ${newId}`)).toHaveValue('Coaching session');

    const buyerContext = await browser.newContext({ baseURL, viewport: { width: 375, height: 812 } });
    try {
      const buyer = await buyerContext.newPage();
      await login(buyer, 'new0@local.test', buyerId);
      expect((await inspect<{ balance: number }>(buyer, '/api/wallet/balance')).balance).toBe(500);
      const buyerToken = await buyer.evaluate(() => localStorage.getItem('business_workbench_token'));
      const ownerOnly = await buyer.request.get('/api/companions/me/profile', { headers: { Authorization: `Bearer ${buyerToken}` } });
      expect(ownerOnly.status()).toBe(404);
      const publicProfile = await inspect<EPal>(buyer, '/api/companions/preview-cp/profile');
      expect(publicProfile).toMatchObject({ id: 'preview-cp', bio: 'Coordinated duo sessions with patient callouts.' });
      expect(publicProfile.services?.map(service => service.id)).toEqual(expect.arrayContaining(['preview-cp', existingServiceId, newId]));
      expect(publicProfile).not.toHaveProperty('email');
      await buyer.getByRole('heading', { name: 'Preview Player', exact: true }).first().click();
      await buyer.getByRole('button', { name: 'Service', exact: true }).click();
      await expect(buyer.getByText('Preview ranked duo', { exact: true }).first()).toBeVisible();
      await expect(buyer.getByText('Coaching session', { exact: true }).first()).toBeVisible();
      await capture(buyer, info, 'public-service-mobile-en');
      const initialQuote = buyer.waitForResponse(response => new URL(response.url()).pathname === '/api/orders/quote' && response.request().method() === 'POST');
      await buyer.getByRole('button', { name: 'Play', exact: true }).click();
      expect((await initialQuote).ok()).toBe(true);
      await buyer.getByRole('button', { name: 'Select service' }).click();
      const selectedQuote = buyer.waitForResponse(response => new URL(response.url()).pathname === '/api/orders/quote' && response.request().postDataJSON()?.serviceId === existingServiceId);
      await buyer.getByRole('button', { name: /Preview ranked duo/ }).click();
      expect((await selectedQuote).ok()).toBe(true);
      const quantityQuote = buyer.waitForResponse(response => new URL(response.url()).pathname === '/api/orders/quote' && response.request().postDataJSON()?.quantity === 2);
      await buyer.getByRole('button', { name: 'Increase quantity' }).click();
      expect((await quantityQuote).ok()).toBe(true);
      await buyer.getByRole('button', { name: /Select coupon/ }).click();
      const couponQuote = buyer.waitForResponse(response => new URL(response.url()).pathname === '/api/orders/quote' && response.request().postDataJSON()?.couponGrantId === couponId);
      await buyer.getByRole('button', { name: /Preview fixed5/ }).click();
      const quote: OrderQuote = await (await couponQuote).json();
      expect(quote).toMatchObject({ companionId: 'preview-cp', serviceId: existingServiceId, serviceName: 'Preview ranked duo', unit: 'match', unitPrice: 7.5, quantity: 2, subtotal: 15, discount: 5, totalPrice: 10 });
      await expect(buyer.getByLabel('Quoted total')).toHaveText('10');
      await expect(buyer.getByRole('dialog')).toHaveCount(0);
      await capture(buyer, info, 'checkout-mobile-en');
      const fundedResponse = buyer.waitForResponse(response => new URL(response.url()).pathname === '/api/orders' && response.request().method() === 'POST');
      await buyer.getByRole('button', { name: 'Pay and Start' }).click();
      const funded = await fundedResponse;
      expect(funded.status()).toBe(201);
      expect(funded.request().postDataJSON().expectedTotal).toBe(quote.totalPrice);
      const order: BusinessOrder = await funded.json();
      expect(order).toMatchObject({ serviceId: existingServiceId, serviceName: 'Preview ranked duo', unitPrice: 7.5, quantity: 2, totalPrice: 10, escrowState: 'FROZEN' });
      expect((await inspect<{ balance: number }>(buyer, '/api/wallet/balance')).balance).toBe(490);
      const afterHistorical = (await inspect<BusinessOrder[]>(page, '/api/orders')).filter(item => item.workflowVersion !== 2);
      expect(afterHistorical.map(({ id, serviceName, serviceId, unit, unitPrice, totalPrice, status }) => ({ id, serviceName, serviceId, unit, unitPrice, totalPrice, status }))).toEqual(historicalSnapshot);
    } finally {
      await buyerContext.close();
    }
  });

  test('load failure retries; failed save and conflict retain the draft', async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, 'player@local.test', providerId);
    let failLoad = true;
    await page.route('**/api/companions/me/profile', async route => {
      if (route.request().method() === 'GET' && failLoad) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'COMPANION_LOAD_FAILED' }) });
      } else await route.continue();
    });
    await editor(page, false);
    await expect(page.getByRole('alert')).toBeVisible();
    failLoad = false;
    await page.getByRole('button', { name: /Retry/i }).click();
    await expect(page.getByLabel('Introduction')).not.toBeEmpty();
    const persistedIntro = await page.getByLabel('Introduction').inputValue();
    await page.getByLabel('Introduction').fill('My unsaved browser draft');
    await page.getByLabel('Primary service price').fill('0');
    let patchCount = 0;
    page.on('request', request => {
      if (new URL(request.url()).pathname === '/api/companions/me/profile' && request.method() === 'PATCH') patchCount++;
    });
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByRole('alert')).toContainText('valid primary price');
    expect(patchCount, 'Invalid draft must be blocked before PATCH').toBe(0);
    await page.getByLabel('Primary service price').fill('20');
    let patchStatus = 503;
    await page.route('**/api/companions/me/profile', async route => {
      if (route.request().method() === 'PATCH') {
        await new Promise(resolve => setTimeout(resolve, 200));
        await route.fulfill({ status: patchStatus, contentType: 'application/json', body: JSON.stringify({ error: patchStatus === 409 ? 'COMPANION_PROFILE_STALE' : 'COMPANION_SAVE_FAILED' }) });
      }
      else await route.continue();
    });
    await page.getByRole('button', { name: 'Save Changes' }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
    await expect(page.getByRole('alert')).toContainText('Could not save');
    expect(patchCount, 'Rapid double-click must send only one PATCH').toBe(1);
    await expect(page.getByLabel('Introduction')).toHaveValue('My unsaved browser draft');
    await expect(page.getByRole('heading', { name: 'Player Profile' })).toBeVisible();
    patchStatus = 409;
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByRole('button', { name: 'Reload profile' })).toBeVisible();
    await expect(page.getByLabel('Introduction')).toHaveValue('My unsaved browser draft');
    await page.getByRole('button', { name: 'Reload profile' }).click();
    await expect(page.getByLabel('Introduction')).toHaveValue(persistedIntro);
  });

  test('editor fits EN and AR mobile and desktop; unsupported controls stay disabled', async ({ page }, info) => {
    test.setTimeout(120_000);
    await login(page, 'player@local.test', providerId);
    for (const locale of ['en', 'ar']) {
      await page.evaluate(value => localStorage.setItem('le3eb_locale', value), locale);
      await page.reload();
      await editor(page);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.getByRole('button', { name: locale === 'ar' ? 'رفع صورة الغلاف غير متاح' : 'Upload Cover Image' })).toBeDisabled();
      await expect(page.getByRole('button', { name: locale === 'ar' ? 'التعريف الصوتي غير متاح' : 'Voice Intro' })).toBeDisabled();
      for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 1000 }]) {
        await page.setViewportSize(viewport);
        await capture(page, info, `editor-${viewport.width < 500 ? 'mobile' : 'desktop'}-${locale}`, true);
      }
    }
  });
});
