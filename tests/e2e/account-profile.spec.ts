import { expect, test, type Page, type TestInfo } from '@playwright/test';
import sharp from 'sharp';
import type { AccountProfile } from '../../shared/accountProfile';
import type { AuthUser } from '../../shared/auth';
import type { ManagedCompanionProfile } from '../../shared/companionManagement';

const enabled = process.env.E2E_ACCOUNT_PROFILE_FIXTURE === '1';
test.use({ channel: 'chrome', actionTimeout: 20_000, navigationTimeout: 45_000, screenshot: 'only-on-failure', trace: 'retain-on-failure' });
function guard(baseURL?: string) {
  expect(enabled).toBe(true); expect(baseURL).toBeTruthy(); const url = new URL(baseURL!);
  expect(url.protocol).toBe('http:'); expect(['localhost', '127.0.0.1', '[::1]']).toContain(url.hostname); expect(url.port).toBe('3018');
  expect(url.username + url.password + url.search + url.hash).toBe(''); expect(url.pathname).toBe('/');
}
async function inspect<T>(page: Page, path: string): Promise<T> {
  const token = await page.evaluate(() => localStorage.getItem('business_workbench_token')); expect(token).toBeTruthy();
  const response = await page.request.get(path, { headers: { Authorization: `Bearer ${token}` }, maxRedirects: 0 });
  expect(response.ok(), `${path}: ${response.status()}`).toBe(true); return response.json();
}
async function login(page: Page, email: string, id: string, admin = false) {
  await page.addInitScript(() => { if (!localStorage.getItem('le3eb_locale')) localStorage.setItem('le3eb_locale', 'en'); });
  await page.goto(admin ? '/admin' : '/auth/login');
  if (admin) {
    await page.getByPlaceholder('email', { exact: true }).fill(email); await page.getByPlaceholder('password', { exact: true }).fill('PreviewOnly123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
  } else {
    await page.getByRole('button', { name: 'Use a password', exact: true }).click();
    await page.getByLabel('Email address', { exact: true }).fill(email); await page.getByLabel('Password', { exact: true }).fill('PreviewOnly123!');
    await page.getByRole('button', { name: 'Log in', exact: true }).first().click();
  }
  await expect.poll(() => page.evaluate(() => localStorage.getItem('business_workbench_token'))).toBeTruthy();
  expect((await inspect<AuthUser>(page, '/api/auth/session')).id).toBe(id);
  if (admin) return;
  await expect(page).toHaveURL(url => url.pathname === '/auth/profile' || !url.pathname.startsWith('/auth/'));
  if (new URL(page.url()).pathname === '/auth/profile') {
    await page.getByRole('button', { name: 'Choose avatar', exact: true }).first().click(); await page.getByRole('button', { name: 'Choose avatar 1', exact: true }).click();
    await page.getByLabel('Rather not say', { exact: true }).check(); await page.getByLabel('Birthday', { exact: true }).fill('1995-01-01');
    await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Continue', exact: true }).click(); await page.getByRole('button', { name: 'Skip for now', exact: true }).click();
  }
  await expect(page).not.toHaveURL(/\/auth\//);
}
async function edit(page: Page, ar = false) {
  await page.goto('/'); await page.getByRole('button', { name: ar ? 'أنا' : 'Me', exact: true }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: ar ? 'تعديل الملف' : 'Edit Profile', exact: true }).click();
  await expect(page.getByRole('heading', { name: ar ? 'تعديل الملف الشخصي' : 'Edit Profile', exact: true })).toBeVisible();
  await expect(page.getByLabel(ar ? 'الاسم المستعار' : 'Nickname', { exact: true })).toBeEnabled();
}
async function save(page: Page, ar = false) {
  const saved = page.waitForResponse(response => new URL(response.url()).pathname === '/api/account/profile' && response.request().method() === 'PATCH');
  await page.getByRole('button', { name: ar ? 'حفظ التغييرات' : 'Save Changes', exact: true }).click();
  const response = await saved; expect(response.ok()).toBe(true); const result: AccountProfile = await response.json();
  await expect(page.getByText(ar ? 'تم حفظ الملف الشخصي' : 'Profile saved', { exact: true })).toBeVisible(); return result;
}
async function capture(page: Page, info: TestInfo, name: string) {
  await expect(page.getByRole('heading')).toHaveCount(1);
  await expect(page.locator('form').locator('..')).toHaveCSS('transform', 'none');
  await page.evaluate(() => scrollTo(0, 0));
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect.poll(() => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth)).toBeLessThanOrEqual(1);
  const heading = page.getByRole('heading').first(); expect(await heading.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  const path = info.outputPath(`${name}.png`); await page.screenshot({ path, animations: 'disabled' }); await info.attach(name, { path, contentType: 'image/png' });
}
async function identityShots(page: Page, info: TestInfo, ar: boolean) {
  await page.evaluate(locale => localStorage.setItem('le3eb_locale', locale), ar ? 'ar' : 'en'); await edit(page, ar);
  await expect(page.locator('html')).toHaveAttribute('dir', ar ? 'rtl' : 'ltr');
  for (const width of [320, 375, 1440]) { await page.setViewportSize({ width, height: width === 1440 ? 1000 : 812 }); await capture(page, info, `profile-${ar ? 'ar' : 'en'}-${width}`); }
}
const orderFields = (rows: any[]) => rows.map(({ buyerUsername: _buyer, companionUsername: _provider, ...row }) => row);

test('account-profile safety gate refuses remote and non-fixture targets', () => {
  for (const url of ['https://example.test:3018', 'http://127.0.0.1:3000', 'http://user:pass@localhost:3018', 'http://localhost:3018/other']) expect(() => guard(url)).toThrow();
  if (enabled) expect(() => guard('http://127.0.0.1:3018/')).not.toThrow();
});
test.describe('disposable account profile', () => {
  test.skip(!enabled, 'E2E_ACCOUNT_PROFILE_FIXTURE=1 required'); test.beforeEach(({ baseURL }) => guard(baseURL));
  test('load failure retries real data and invalid local input cannot save', async ({ page }, info) => {
    test.setTimeout(120_000); await login(page, 'customer0@local.test', 'preview-customer-0'); const initial = await inspect<AccountProfile>(page, '/api/account/profile');
    let fail = true;
    await page.route('**/api/account/profile', async route => { if (fail && route.request().method() === 'GET') await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'PROFILE_LOAD_FAILED' } }) }); else await route.continue(); });
    await page.goto('/'); await page.getByRole('button', { name: 'Me', exact: true }).click(); await page.getByRole('button', { name: 'Settings', exact: true }).click(); await page.getByRole('button', { name: 'Edit Profile', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible(); await expect(page.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    fail = false; await page.getByRole('button', { name: 'Reload saved profile' }).click(); await expect(page.getByLabel('Nickname', { exact: true })).toHaveValue(initial.user.username);
    await expect(page.getByLabel('Bio', { exact: true })).toHaveValue(''); await expect(page.getByRole('alert')).toHaveCount(0);
    await page.getByLabel('Nickname', { exact: true }).fill('x'); await expect(page.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    await page.getByLabel('Nickname', { exact: true }).fill(initial.user.username); await page.getByLabel('Bio', { exact: true }).fill('😀'.repeat(281)); await expect(page.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    await page.getByRole('button', { name: 'Reload saved profile' }).click(); await expect(page.getByLabel('Bio', { exact: true })).toHaveValue('');
    await capture(page, info, 'loaded-real-account-profile');
  });
  test('system/photo avatars persist with real retries, live peer identity, public bio and account isolation', async ({ page, browser, baseURL }, info) => {
    test.setTimeout(360_000); await login(page, 'new0@local.test', 'preview-new-00'); const before = await inspect<AccountProfile>(page, '/api/account/profile');
    const providerContext = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
    const adminContext = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
    try {
      const provider = await providerContext.newPage(), admin = await adminContext.newPage();
      await login(provider, 'player@local.test', 'preview-player'); await login(admin, 'admin@local.test', 'preview-admin', true);
      const services = await inspect<ManagedCompanionProfile>(provider, '/api/companions/me/profile');
      const legacy = orderFields((await inspect<{ items: any[] }>(admin, '/api/admin/orders?page=1&pageSize=100')).items); expect(legacy).toHaveLength(39);
      await page.getByRole('heading', { name: 'Preview Player', exact: true }).first().click();
      const messagesLoaded = page.waitForResponse(response => new URL(response.url()).pathname === '/api/social/messages/preview-player');
      await page.getByRole('button', { name: 'Chat', exact: true }).click(); await messagesLoaded;
      await page.locator('input').fill('Profile acceptance hello');
      const sent = page.waitForResponse(response => new URL(response.url()).pathname === '/api/social/messages' && response.request().method() === 'POST');
      await page.getByRole('button', { name: 'Send message', exact: true }).click(); expect((await sent).status()).toBe(201);
      await provider.reload(); await provider.getByRole('button', { name: 'Messages', exact: true }).click(); await provider.getByText(before.user.username, { exact: true }).first().click();
      await expect(provider.getByRole('heading', { name: before.user.username, exact: true })).toBeVisible();
      await edit(page); await page.getByLabel('Nickname', { exact: true }).fill('Profile Duo'); await page.getByLabel('Bio', { exact: true }).fill('Patient teammate. العربية');
      await page.getByRole('button', { name: 'Choose avatar', exact: true }).click(); await page.getByRole('button', { name: 'Choose avatar 3', exact: true }).click();
      let failSave = true;
      await page.route('**/api/account/profile', async route => { if (failSave && route.request().method() === 'PATCH') await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'PROFILE_SAVE_FAILED' } }) }); else await route.continue(); });
      await page.getByRole('button', { name: 'Save Changes' }).click(); await expect(page.getByRole('alert')).toBeVisible(); await expect(page.getByLabel('Nickname', { exact: true })).toHaveValue('Profile Duo');
      expect((await inspect<AccountProfile>(page, '/api/account/profile')).user.username).toBe(before.user.username);
      failSave = false; const systemSaved = await save(page); expect(systemSaved.user.avatar).toBe('/api/auth/avatars/system/sage.svg');
      await expect(provider.getByRole('heading', { name: 'Profile Duo', exact: true })).toBeVisible({ timeout: 15_000 });
      await provider.getByRole('heading', { name: 'Profile Duo', exact: true }).click(); await expect(provider.getByText('Patient teammate. العربية', { exact: true })).toBeVisible();
      await page.goto('/'); await page.getByRole('button', { name: 'Me', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Profile Duo', exact: true })).toBeVisible(); await expect(page.getByText('Patient teammate. العربية', { exact: true })).toBeVisible();
      await edit(page); await expect(page.getByLabel('Nickname', { exact: true })).toHaveValue('Profile Duo');
      const png = await sharp({ create: { width: 128, height: 128, channels: 4, background: '#26a269' } }).png().toBuffer();
      await page.getByRole('button', { name: 'Choose avatar', exact: true }).click(); const chooser = page.waitForEvent('filechooser'); await page.getByRole('button', { name: 'Upload a photo', exact: true }).click(); await (await chooser).setFiles({ name: 'profile.png', mimeType: 'image/png', buffer: png });
      await expect(page.getByRole('button', { name: 'Use this photo', exact: true })).toBeEnabled();
      const uploaded = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/avatar' && response.request().method() === 'POST'); await page.getByRole('button', { name: 'Use this photo', exact: true }).click(); expect((await uploaded).status()).toBe(200);
      await expect(page.getByRole('dialog')).toHaveCount(0); expect((await inspect<AccountProfile>(page, '/api/account/profile')).user.avatar).toBe('/api/auth/avatars/system/sage.svg');
      const photo = await save(page); expect(photo.user.avatar).toMatch(/^\/api\/auth\/avatars\/uploads\/[a-f0-9]{48}\.png$/);
      const image = page.getByRole('img', { name: 'Choose avatar', exact: true }); await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth === 256)).toBe(true);
      expect(await image.evaluate((element: HTMLImageElement) => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 8; const context = canvas.getContext('2d')!; context.drawImage(element, 0, 0, 8, 8); return [...context.getImageData(4, 4, 1, 1).data]; })).toEqual([38, 162, 105, 255]);
      await identityShots(page, info, false); await identityShots(page, info, true);
      await page.getByLabel('الاسم المستعار', { exact: true }).fill('لاعب تجريبي'); await page.getByLabel('نبذة شخصية', { exact: true }).fill('نبذة شخصية محفوظة'); const arabic = await save(page, true); expect(arabic.user.avatar).toBe(photo.user.avatar);
      await page.reload(); await edit(page, true); await expect(page.getByLabel('الاسم المستعار', { exact: true })).toHaveValue('لاعب تجريبي');
      await edit(provider); await provider.getByLabel('Nickname', { exact: true }).fill('Updated Provider'); await provider.getByLabel('Bio', { exact: true }).fill('Personal provider bio'); const providerSaved = await save(provider); expect(providerSaved.user.role).toBe('PLAYER');
      await page.evaluate(() => localStorage.setItem('le3eb_locale', 'en')); await page.goto('/'); await page.getByRole('button', { name: 'Messages', exact: true }).click(); await page.getByText('Updated Provider', { exact: true }).first().click();
      await page.getByRole('heading', { name: 'Updated Provider', exact: true }).click(); await expect(page.getByText('Personal provider bio', { exact: true })).toBeVisible();
      const publicProfile = await inspect<any>(page, '/api/companions/preview-cp/profile'); expect(publicProfile.name).toBe('Updated Provider'); expect(publicProfile.bio).toBe('Personal provider bio'); expect(publicProfile.services[0].description).toBe(services.intro);
      expect(await inspect<ManagedCompanionProfile>(provider, '/api/companions/me/profile')).toEqual(services);
      expect(orderFields((await inspect<{ items: any[] }>(admin, '/api/admin/orders?page=1&pageSize=100')).items)).toEqual(legacy);
      expect((await inspect<{ balance: number }>(page, '/api/wallet/balance')).balance).toBe(500); expect((await inspect<any>(provider, '/api/dashboard/business')).diamondWallet.balance).toBe(1900);
      expect((await inspect<AuthUser>(page, '/api/auth/session')).role).toBe('USER'); expect((await inspect<any>(page, '/api/notifications')).items).toEqual([]);
      expect((await inspect<AccountProfile>(admin, '/api/account/profile')).user.username).toBe('Local Test Admin');
    } finally { await providerContext.close(); await adminContext.close(); }
  });
  // Extra home visits consume the shared fixture's newcomer exposure cap; check layout after discovery.
  test('EN and AR field labels stay separated from counters across viewports', async ({ page }) => {
    await login(page, 'customer0@local.test', 'preview-customer-0');
    for (const ar of [false, true]) {
      await page.evaluate(locale => localStorage.setItem('le3eb_locale', locale), ar ? 'ar' : 'en'); await edit(page, ar);
      for (const width of [320, 375, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const field of ['nickname', 'bio']) {
          const label = await page.locator(`label[for="account-${field}"]`).boundingBox();
          const counter = await page.locator(`#account-${field}-count`).boundingBox();
          expect(label).toBeTruthy(); expect(counter).toBeTruthy();
          expect(ar ? label!.x - counter!.x - counter!.width : counter!.x - label!.x - label!.width).toBeGreaterThanOrEqual(8);
        }
      }
    }
  });
});
