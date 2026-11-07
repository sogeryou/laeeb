import { test, expect, type Page, type TestInfo } from '@playwright/test';

const enabled = process.env.E2E_AUTH_COMPOSER_FIXTURE === '1';
test.use({ channel: 'chrome', actionTimeout: 15000, navigationTimeout: 30000, screenshot: 'only-on-failure', trace: 'retain-on-failure' });
function guard(value?: string) {
  expect(enabled).toBe(true); const url = new URL(value || 'https://invalid.test');
  expect(url.protocol).toBe('http:'); expect(['127.0.0.1', 'localhost', '[::1]']).toContain(url.hostname);
  expect(url.port).toBe('3021'); expect(url.pathname).toBe('/'); expect(url.username + url.password + url.search + url.hash).toBe('');
}
async function inspect(page: Page, path: string) {
  const token = await page.evaluate(() => localStorage.getItem('business_workbench_token'));
  expect(token).toBeTruthy(); const response = await page.request.get(path, { headers: { Authorization: `Bearer ${token}` }, maxRedirects: 0 });
  expect(response.ok()).toBe(true); return response.json();
}
async function login(page: Page, email = 'member@local.test', ar = false) {
  await page.goto('/auth/login'); await page.getByRole('button', { name: ar ? 'استخدام كلمة المرور' : 'Use a password', exact: true }).click();
  await page.locator('#auth-email').fill(email); await page.locator('#auth-password').fill('PreviewOnly123!');
  await page.getByRole('button', { name: ar ? 'تسجيل الدخول' : 'Log in', exact: true }).first().click();
}
async function community(page: Page) { await page.getByRole('button', { name: 'Community', exact: true }).click(); await expect(page.locator('#community-compose-trigger')).toBeVisible(); }
async function logout(page: Page, ar = false) {
  await page.route('**/api/auth/session', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await page.reload(); await page.getByRole('button', { name: ar ? 'تسجيل الخروج' : 'Sign out', exact: true }).click();
  await page.unroute('**/api/auth/session'); await expect(page).toHaveURL(/\/auth\/login$/);
}
async function shot(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => document.fonts.ready);
  const auth = page.locator('.auth-page');
  if (await auth.count()) {
    await expect(auth).toHaveCount(1); await expect(page.locator('.auth-content')).toHaveCount(1);
    await expect(page.locator('.auth-content')).toHaveCSS('opacity', '1'); await expect(page.locator('.auth-content')).toHaveCSS('transform', 'none');
  }
  await page.evaluate(() => scrollTo(0, 0));
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect.poll(() => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth)).toBeLessThanOrEqual(1);
  const path = info.outputPath(`${name}.png`); await page.screenshot({ path, animations: 'disabled' }); await info.attach(name, { path, contentType: 'image/png' });
}
test('auth/composer safety gate rejects non-fixture targets', () => {
  for (const value of ['https://example.test:3021/', 'http://127.0.0.1:3020/', 'http://user:pass@localhost:3021/', 'http://localhost:3021/?x=1', 'http://localhost:3021/other', 'http://localhost:3021/#x']) expect(() => guard(value)).toThrow();
  if (enabled) expect(() => guard('http://127.0.0.1:3021/')).not.toThrow();
});
test.describe('disposable auth gate and composer', () => {
  test.skip(!enabled, 'E2E_AUTH_COMPOSER_FIXTURE=1 required');
  test.beforeEach(async ({ page, baseURL }) => { guard(baseURL); await page.addInitScript(() => { if (!localStorage.getItem('le3eb_locale')) localStorage.setItem('le3eb_locale', 'en'); }); });
  test('entry verifies sessions, retains credentials on 503 and blocks invalid/returned logout views', async ({ page }) => {
    await page.goto('/'); await expect(page).toHaveURL(/\/auth\/login$/); await expect(page.locator('nav.fixed')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveCount(0);
    await login(page); await expect(page.locator('nav.fixed')).toBeVisible();
    const token = await page.evaluate(() => localStorage.getItem('business_workbench_token')); let offline = true;
    await page.route('**/api/auth/session', route => offline ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'TEMPORARY_UNAVAILABLE' } }) }) : route.continue());
    await page.reload(); await expect(page.getByRole('alert')).toContainText('Unable to verify'); await expect(page.locator('nav.fixed')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('business_workbench_token'))).toBe(token);
    offline = false; await page.getByRole('button', { name: 'Retry', exact: true }).click(); await expect(page.locator('nav.fixed')).toBeVisible();
    await page.evaluate(() => localStorage.setItem('business_workbench_token', 'expired-local-access-with-valid-refresh'));
    await page.goto('/'); await expect(page.locator('nav.fixed')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('business_workbench_token'))).not.toBe('expired-local-access-with-valid-refresh');
    offline = true; await page.reload(); await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/login$/); expect(await page.evaluate(() => localStorage.getItem('business_workbench_token'))).toBeNull();
    await page.goBack(); await expect(page.locator('nav.fixed')).toHaveCount(0); await page.goto('/auth/login');
    await page.evaluate(() => { localStorage.setItem('business_workbench_token', 'invalid-local-test-token'); localStorage.removeItem('le3eb_refresh_token'); });
    offline = false; await page.goto('/'); await expect(page).toHaveURL(/\/auth\/login$/); expect(await page.evaluate(() => localStorage.getItem('business_workbench_token'))).toBeNull();
  });
  test('dedicated editor preserves context and retries the same real pending post without financial mutation', async ({ page }) => {
    await login(page); await expect(page.locator('nav.fixed')).toBeVisible(); const before = await inspect(page, '/api/auth/session');
    const requests: string[] = []; let fail = true;
    await page.route('**/api/social/posts', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      requests.push(route.request().postDataJSON().requestId);
      if (fail) await route.abort('failed'); else await route.continue();
    });
    await community(page); await page.getByRole('button', { name: 'Latest', exact: true }).click();
    await page.getByRole('button', { name: 'Tactical Duo', exact: true }).click(); await page.locator('#community-compose-trigger').click();
    await expect(page.locator('nav.fixed')).toHaveCount(0); await expect(page.getByLabel('Post content', { exact: true })).toBeFocused();
    await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeDisabled();
    const text = `Local composer acceptance ${Date.now()}`; await page.getByLabel('Post content', { exact: true }).fill(text);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await expect(page.locator('#community-compose-trigger')).toBeFocused();
    await expect(page.getByRole('button', { name: 'Tactical Duo', exact: true })).toHaveClass(/bg-purple-600/);
    await page.locator('#community-compose-trigger').click(); await expect(page.getByLabel('Post content', { exact: true })).toHaveValue(text);
    await page.getByRole('button', { name: 'Publish', exact: true }).click(); await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByLabel('Post content', { exact: true })).toHaveValue(text); fail = false;
    await page.getByRole('button', { name: 'Publish', exact: true }).click(); await expect(page.locator('#community-compose-trigger')).toBeVisible();
    await expect(page.getByText(text, { exact: true })).toBeVisible(); await expect(page.getByText(text, { exact: true }).locator('..').getByText('Pending review', { exact: true })).toBeVisible();
    expect(requests).toHaveLength(2); expect(requests[0]).toBe(requests[1]);
    const mine = await inspect(page, '/api/social/posts/mine'); expect(mine.items.filter((post: any) => post.content === text)).toHaveLength(1);
    const publicPosts = await page.request.get('/api/social/posts'); expect((await publicPosts.json()).items.some((post: any) => post.content === text)).toBe(false);
    expect((await inspect(page, '/api/auth/session')).tags).toEqual(before.tags); expect((await inspect(page, '/api/auth/session')).role).toBe('USER');
  });
  test('registers directly from profile, preserves old tags and redirects legacy interests', async ({ page }) => {
    const preferences: string[] = []; page.on('request', r => { if (r.url().includes('/api/auth/preferences')) preferences.push(r.url()); });
    await page.goto('/auth/register'); await page.getByLabel('Email address', { exact: true }).fill(`composer-${Date.now()}@local.test`);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    const code = await page.locator('.auth-development code').innerText(); await page.getByLabel('6-digit code', { exact: true }).fill(code);
    await page.getByRole('button', { name: 'Continue', exact: true }).click(); await expect(page).toHaveURL(/\/auth\/profile$/);
    await page.getByRole('button', { name: 'Choose avatar', exact: true }).first().click(); await page.getByRole('button', { name: 'Choose avatar 1', exact: true }).click();
    await page.getByLabel('Nickname', { exact: true }).fill('Local Registration'); await page.getByLabel('Rather not say', { exact: true }).check(); await page.getByLabel('Birthday', { exact: true }).fill('1995-01-01');
    await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.locator('nav.fixed')).toBeVisible(); await expect(page).not.toHaveURL(/\/auth\//); expect(preferences).toEqual([]);
    await page.goto('/auth/interests'); await expect(page.locator('nav.fixed')).toBeVisible(); await expect(page).not.toHaveURL(/\/auth\//);
    await logout(page); await login(page); await expect(page.locator('nav.fixed')).toBeVisible(); expect((await inspect(page, '/api/auth/session')).tags).toEqual(['valorant', 'ranked']);
    await page.goto('/auth/interests'); await expect(page.locator('nav.fixed')).toBeVisible(); expect((await inspect(page, '/api/auth/session')).tags).toEqual(['valorant', 'ranked']);
  });
  test('keeps incomplete and restricted sessions outside shell and admin separate', async ({ page }) => {
    await login(page, 'incomplete@local.test'); await expect(page).toHaveURL(/\/auth\/profile$/); await expect(page.locator('nav.fixed')).toHaveCount(0);
    await page.goto('/auth/interests'); await expect(page).toHaveURL(/\/auth\/profile$/); expect((await inspect(page, '/api/auth/session')).tags).toEqual(['chill']);
    const saved = await inspect(page, '/api/auth/session');
    await page.route('**/api/auth/session', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...saved, accountStatus: 'FROZEN' }) }));
    await page.goto('/'); await expect(page).toHaveURL(/\/auth\/restricted$/); await expect(page.locator('nav.fixed')).toHaveCount(0);
    await page.goto('/auth/interests'); await expect(page).toHaveURL(/\/auth\/restricted$/);
    await page.unroute('**/api/auth/session');
    await page.goto('/admin'); await expect(page.locator('nav.fixed')).toHaveCount(0); await expect(page).not.toHaveURL(/\/auth\/login$/);
  });
  test('retains the separate admin login and rejects a normal user at that boundary', async ({ page }) => {
    await page.goto('/admin'); await expect(page.getByRole('heading', { name: 'Admin Login', exact: true }).first()).toBeVisible();
    await expect(page.locator('.auth-page')).toHaveCount(0); await expect(page.locator('nav.fixed')).toHaveCount(0);
    await page.locator('input[type=email]').fill('member@local.test'); await page.locator('input[type=password]').fill('PreviewOnly123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/admin/); await expect(page.locator('input[type=password]')).toBeVisible();
    await expect(page.getByText('This account does not have admin access.', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('business_workbench_token'))).toBeNull();
    await page.locator('input[type=email]').fill('admin@local.test'); await page.locator('input[type=password]').fill('PreviewOnly123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page).toHaveURL(/\/admin/); await expect(page.locator('input[type=password]')).toHaveCount(0);
    expect((await inspect(page, '/api/auth/session')).role).toBe('ADMIN'); await expect(page.locator('.auth-page')).toHaveCount(0);
  });
  test('EN and AR existing auth, community and editor fit every approved viewport', async ({ page }, info) => {
    test.setTimeout(180000);
    for (const locale of ['en', 'ar']) {
      await page.goto('/auth/login'); await page.getByRole('combobox').selectOption(locale);
      for (const mode of ['login', 'register']) {
        await page.goto(`/auth/${mode}`);
        await expect(page.locator('.auth-visual img')).toHaveJSProperty('complete', true);
        expect(await page.locator('.auth-visual img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
        for (const width of [320, 375, 1440]) { await page.setViewportSize({ width, height: width === 1440 ? 1000 : 812 }); await shot(page, info, `${locale}-${mode}-${width}`); }
      }
      await login(page, 'incomplete@local.test', locale === 'ar'); await expect(page).toHaveURL(/\/auth\/profile$/);
      for (const width of [320, 375, 1440]) { await page.setViewportSize({ width, height: width === 1440 ? 1000 : 812 }); await shot(page, info, `${locale}-profile-${width}`); }
      await logout(page, locale === 'ar');
      // Login uses visible controls in the selected language.
      await page.goto('/auth/login'); await page.getByRole('button', { name: locale === 'ar' ? 'استخدام كلمة المرور' : 'Use a password', exact: true }).click();
      await page.locator('#auth-email').fill('member@local.test'); await page.locator('#auth-password').fill('PreviewOnly123!');
      await page.getByRole('button', { name: locale === 'ar' ? 'تسجيل الدخول' : 'Log in', exact: true }).first().click();
      await expect(page.locator('nav.fixed')).toBeVisible();
      await page.getByRole('button', { name: locale === 'ar' ? 'المجتمع' : 'Community', exact: true }).click();
      for (const width of [320, 375, 1440]) { await page.setViewportSize({ width, height: width === 1440 ? 1000 : 812 }); await shot(page, info, `${locale}-community-${width}`); }
      await page.locator('#community-compose-trigger').click(); await page.getByRole('textbox').fill(locale === 'ar' ? 'لحظة جميلة مع المجتمع' : 'A moment with the community');
      for (const width of [320, 375, 1440]) { await page.setViewportSize({ width, height: width === 1440 ? 1000 : 812 }); await shot(page, info, `${locale}-editor-${width}`); }
      // Start the next language as an unauthenticated user through the actual sign-out command.
      await page.getByRole('button', { name: locale === 'ar' ? 'إلغاء' : 'Cancel', exact: true }).click();
      await page.route('**/api/auth/session', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' })); await page.reload();
      await page.getByRole('button', { name: locale === 'ar' ? 'تسجيل الخروج' : 'Sign out', exact: true }).click(); await page.unroute('**/api/auth/session');
    }
  });
});
