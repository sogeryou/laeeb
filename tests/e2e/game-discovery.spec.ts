import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { GameDiscoveryPage } from '../../shared/gameDiscovery';
import type { AuthUser } from '../../shared/auth';

const enabled = process.env.E2E_GAME_DISCOVERY_FIXTURE === '1';
test.use({ channel: 'chrome', actionTimeout: 20000, navigationTimeout: 45000, screenshot: 'only-on-failure', trace: 'retain-on-failure' });
function guard(baseURL?: string) {
  expect(enabled).toBe(true); expect(baseURL).toBeTruthy(); const url = new URL(baseURL!);
  expect(url.protocol).toBe('http:'); expect(['127.0.0.1', 'localhost', '[::1]']).toContain(url.hostname); expect(url.port).toBe('3020');
  expect(url.pathname).toBe('/'); expect(url.username + url.password + url.search + url.hash).toBe('');
}
async function inspect<T>(page: Page, path: string): Promise<T> {
  const token = await page.evaluate(() => localStorage.getItem('business_workbench_token')); expect(token).toBeTruthy();
  const response = await page.request.get(path, { headers: { Authorization: `Bearer ${token}` }, maxRedirects: 0 }); expect(response.ok()).toBe(true); return response.json();
}
async function login(page: Page, email: string, id: string, currentLoginPage = false) {
  await page.addInitScript(() => { if (!localStorage.getItem('le3eb_locale')) localStorage.setItem('le3eb_locale', 'en'); });
  if (!currentLoginPage) await page.goto('/auth/login');
  await page.getByRole('button', { name: 'Use a password', exact: true }).click();
  await page.getByLabel('Email address', { exact: true }).fill(email); await page.getByLabel('Password', { exact: true }).fill('PreviewOnly123!');
  await page.getByRole('button', { name: 'Log in', exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('business_workbench_token'))).toBeTruthy(); expect((await inspect<AuthUser>(page, '/api/auth/session')).id).toBe(id);
  await expect(page).toHaveURL(url => url.pathname === '/auth/profile' || !url.pathname.startsWith('/auth/'));
  if (new URL(page.url()).pathname === '/auth/profile') {
    await page.getByRole('button', { name: 'Choose avatar', exact: true }).first().click(); await page.getByRole('button', { name: 'Choose avatar 1', exact: true }).click();
    await page.getByLabel('Rather not say', { exact: true }).check(); await page.getByLabel('Birthday', { exact: true }).fill('1995-01-01');
    await page.getByRole('checkbox').check(); await page.getByRole('button', { name: 'Continue', exact: true }).click(); await page.getByRole('button', { name: 'Skip for now', exact: true }).click();
  }
  await expect(page).not.toHaveURL(/\/auth\//);
}
function response(page: Page, condition: (url: URL) => boolean = () => true) {
  return page.waitForResponse(r => r.request().method() === 'GET' && /^\/api\/games\/[^/]+\/companions$/.test(new URL(r.url()).pathname) && condition(new URL(r.url())));
}
async function catalog(page: Page, id = 'val') {
  const tile = id === 'val' ? 'Tactical Duo' : id === 'pubg' ? 'Battle Royale' : 'League Pro';
  await page.goto('/'); const loaded = response(page, url => url.pathname === `/api/games/${id}/companions` && url.searchParams.get('page') === '1');
  await page.getByText(tile, { exact: true }).first().click(); const result = await loaded; expect(result.ok()).toBe(true);
  await expect(page.locator('#game-discovery-page')).toBeVisible(); await expect(page.getByRole('heading', { level: 1 })).toHaveText(id === 'val' ? 'Valorant' : id === 'pubg' ? 'PUBG Mobile' : 'League of Legends');
  return result.json() as Promise<GameDiscoveryPage>;
}
async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('#game-discovery-page')).toHaveCSS('transform', 'none');
  await page.evaluate(() => { scrollTo(0, 0); }); await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await expect.poll(() => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth)).toBeLessThanOrEqual(1);
  const heading = page.getByRole('heading', { level: 1 }); expect(await heading.evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
  const path = info.outputPath(name + '.png'); await page.screenshot({ path, animations: 'disabled' }); await info.attach(name, { path, contentType: 'image/png' });
}

test('game discovery safety gate rejects all non-fixture targets', () => {
  for (const url of ['https://example.test:3020/', 'http://127.0.0.1:3018/', 'http://user:pass@localhost:3020/', 'http://localhost:3020/other', 'http://localhost:3020/?x=1']) expect(() => guard(url)).toThrow();
  if (enabled) expect(() => guard('http://127.0.0.1:3020/')).not.toThrow();
});
test.describe('disposable game discovery', () => {
  test.skip(!enabled, 'E2E_GAME_DISCOVERY_FIXTURE=1 required'); test.beforeEach(({ baseURL }) => guard(baseURL));
  test('real pages, retry, primary-price filters, numeric sorts and exact game switching', async ({ page }) => {
    test.setTimeout(150000); await page.addInitScript(() => localStorage.setItem('le3eb_locale', 'en'));
    let failLoad = true, failMore = false;
    await page.route('**/api/games/val/companions?**', async route => {
      const query = new URL(route.request().url()).searchParams;
      if (failLoad || failMore && query.get('page') === '2') await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'DISCOVERY_LOAD_FAILED' } }) }); else await route.continue();
    });
    await page.goto('/'); await page.getByText('Tactical Duo', { exact: true }).first().click(); await expect(page.getByRole('alert')).toBeVisible();
    failLoad = false; const retry = response(page); await page.getByRole('button', { name: 'Retry', exact: true }).click(); const first: GameDiscoveryPage = await (await retry).json();
    expect(first.total).toBe(25); expect(first.onlineCount).toBe(23); await expect(page.getByRole('heading', { level: 4 })).toHaveCount(20);
    await expect(page.getByText('Hidden Pending', { exact: true })).toHaveCount(0); await expect(page.getByText('Hidden Frozen', { exact: true })).toHaveCount(0);
    failMore = true; await page.getByRole('button', { name: 'Load More', exact: true }).click(); await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('heading', { level: 4 })).toHaveCount(20); await expect(page.getByRole('button', { name: 'Book Local Duo 00', exact: true })).toBeDisabled();
    failMore = false; const more = response(page, url => url.searchParams.get('page') === '2'); await page.getByRole('button', { name: 'Retry', exact: true }).click(); expect((await more).ok()).toBe(true);
    await expect(page.getByRole('heading', { level: 4 })).toHaveCount(25); await expect(page.getByRole('heading', { name: 'High Rate Duo', exact: true })).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Book Local Duo 20', exact: true })).toBeDisabled(); await expect(page.getByRole('button', { name: 'Book Local Duo 21', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Filter', exact: true }).click(); await expect(page.getByLabel('Maximum Price', { exact: true })).toHaveValue('10000');
    await expect(page.getByLabel('Server', { exact: true })).toBeDisabled(); await expect(page.getByLabel('Platform', { exact: true })).toBeDisabled(); await expect(page.getByLabel('Rank', { exact: true })).toBeDisabled();
    await page.getByLabel('Minimum Price', { exact: true }).fill('100'); await page.getByLabel('Maximum Price', { exact: true }).fill('160');
    const filtered = response(page, url => url.searchParams.get('minPrice') === '100'); await page.getByRole('button', { name: 'Apply Filters', exact: true }).click();
    const priced: GameDiscoveryPage = await (await filtered).json(); expect(priced.items.map(p => p.name)).toEqual(['High Rate Duo']); await expect(page.getByRole('heading', { level: 4 })).toHaveCount(1);
    await page.getByRole('button', { name: 'Filter', exact: true }).click(); await page.getByLabel('Gender', { exact: true }).selectOption('F');
    const empty = response(page, url => url.searchParams.get('gender') === 'F'); await page.getByRole('button', { name: 'Apply Filters', exact: true }).click(); await empty;
    await expect(page.getByText('No companions match these filters', { exact: true })).toBeVisible();
    const reset = response(page, url => url.searchParams.get('minPrice') === '0'); await page.getByRole('button', { name: 'Reset All', exact: true }).click(); await reset;
    for (const sort of ['Orders', 'Score']) {
      const sorted = response(page, url => url.searchParams.get('sort') === (sort === 'Orders' ? 'ORDERS' : 'SCORE'));
      await page.getByRole('button', { name: sort, exact: true }).click(); const body: GameDiscoveryPage = await (await sorted).json(); expect(body.items[0]).toMatchObject({ id: 'preview-cp', completedOrders30d: 26, reviewCount: 39 });
      await expect(page.getByRole('heading', { level: 4 }).first()).toHaveText('Preview Player');
    }
    const mobile = await catalog(page, 'pubg'); expect(mobile.items.map(p => p.name)).toEqual(['Local Mobile Duo']);
    await expect(page.getByText('Nonmatching PC Duo', { exact: true })).toHaveCount(0); expect(mobile.query).toMatchObject({ minPrice: 0, maxPrice: 10000, sort: 'DEFAULT' });
    const noPlayers = await catalog(page, 'lol'); expect(noPlayers.total).toBe(0); await expect(page.getByText('No companions match these filters', { exact: true })).toBeVisible();
  });
  test('real profile, chat and primary checkout quote preserve business data and prevent self booking', async ({ page, browser, baseURL }) => {
    test.setTimeout(180000); await login(page, 'new0@local.test', 'preview-new-00');
    const providerContext = await browser.newContext({ baseURL });
    const orderWrites: string[] = []; page.on('request', r => { if (new URL(r.url()).pathname === '/api/orders' && r.method() === 'POST') orderWrites.push(r.url()); });
    try {
      const provider = await providerContext.newPage(); await login(provider, 'player@local.test', 'preview-player');
      const before = await inspect(provider, '/api/companions/me/profile'), historical = await inspect<any[]>(provider, '/api/orders'); expect(historical).toHaveLength(39);
      await catalog(page); const sorted = response(page, url => url.searchParams.get('sort') === 'ORDERS'); await page.getByRole('button', { name: 'Orders', exact: true }).click(); await sorted;
      await page.getByRole('heading', { name: 'Preview Player', exact: true }).click(); await expect(page.getByText('Isolated local acceptance fixture', { exact: true }).first()).toBeVisible();
      const messages = page.waitForResponse(r => new URL(r.url()).pathname === '/api/social/messages/preview-player'); await page.getByRole('button', { name: 'Chat', exact: true }).click(); await messages;
      await page.locator('input').fill('Discovery acceptance hello'); const sent = page.waitForResponse(r => new URL(r.url()).pathname === '/api/social/messages' && r.request().method() === 'POST');
      await page.getByRole('button', { name: 'Send message', exact: true }).click(); expect((await sent).status()).toBe(201);
      await catalog(page); const orders = response(page, url => url.searchParams.get('sort') === 'ORDERS'); await page.getByRole('button', { name: 'Orders', exact: true }).click(); await orders;
      const quote = page.waitForResponse(r => new URL(r.url()).pathname === '/api/orders/quote' && r.request().method() === 'POST'); await page.getByRole('button', { name: 'Book Preview Player', exact: true }).click();
      expect((await quote).ok()).toBe(true); expect(await (await quote).json()).toMatchObject({ companionId: 'preview-cp', serviceId: 'preview-cp', unit: 'hr', unitPrice: 25, quantity: 1, totalPrice: 25 });
      await expect(page.getByLabel('Quoted total', { exact: true })).toHaveText('25'); await expect(page.getByRole('button', { name: 'Pay and Start', exact: true })).toBeEnabled();
      await catalog(provider); const self = response(provider, url => url.searchParams.get('sort') === 'ORDERS'); await provider.getByRole('button', { name: 'Orders', exact: true }).click(); await self;
      await expect(provider.getByRole('button', { name: 'Book Preview Player', exact: true })).toBeDisabled();
      expect(await inspect(provider, '/api/companions/me/profile')).toEqual(before); expect(await inspect(provider, '/api/orders')).toEqual(historical);
      expect((await inspect<any>(page, '/api/wallet/balance')).balance).toBe(500); expect((await inspect<any>(provider, '/api/dashboard/business')).diamondWallet.balance).toBe(1900);
      expect((await inspect<AuthUser>(page, '/api/auth/session')).role).toBe('USER'); expect((await inspect<AuthUser>(provider, '/api/auth/session')).role).toBe('PLAYER');
      expect((await inspect<any>(page, '/api/notifications')).items).toEqual([]); expect(orderWrites).toEqual([]);
    } finally { await providerContext.close(); }
  });
  test('guest booking and chat resume real companions after reloading login', async ({ page, browser, baseURL }) => {
    test.setTimeout(150000);
    // Complete the disposable buyer through the UI before exercising returning-account login.
    await login(page, 'new0@local.test', 'preview-new-00');
    const historical = await inspect<any[]>(page, '/api/orders');
    for (const target of ['book', 'chat', 'chat-back'] as const) {
      const context = await browser.newContext({ baseURL });
      try {
        const guest = await context.newPage();
        await guest.addInitScript(() => localStorage.setItem('le3eb_locale', 'en'));
        const writes: string[] = [];
        guest.on('request', r => { if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/orders') writes.push(r.url()); });
        await catalog(guest);
        if (target === 'book') await guest.getByRole('button', { name: 'Book Local Duo 00', exact: true }).click();
        else {
          await guest.getByRole('heading', { name: 'Local Duo 00', exact: true }).click();
          await expect(guest.getByText('Disposable discovery fixture', { exact: true }).first()).toBeVisible();
          await guest.getByRole('button', { name: 'Chat', exact: true }).click();
        }
        await expect(guest).toHaveURL(/\/auth\/login$/);
        if (target !== 'chat-back') await guest.reload();
        const resumed = guest.waitForResponse(r => new URL(r.url()).pathname === (target === 'book' ? '/api/orders/quote' : '/api/social/messages/discovery-provider-00'));
        await login(guest, 'new0@local.test', 'preview-new-00', true);
        expect((await resumed).ok()).toBe(true);
        if (target === 'book') {
          expect(await (await resumed).json()).toMatchObject({ companionId: 'discovery-val-00', serviceId: 'discovery-val-00', unit: 'hr', quantity: 1, totalPrice: 8 });
          await expect(guest.getByLabel('Quoted total', { exact: true })).toHaveText('8');
        } else {
          await expect(guest.getByRole('button', { name: 'Send message', exact: true })).toBeVisible();
          if (target === 'chat-back') {
            await guest.locator('button:has(svg.lucide-arrow-left)').first().click();
            await expect(guest.getByRole('button', { name: 'Chat', exact: true })).toBeVisible();
            const restoredGame = response(guest, url => url.pathname === '/api/games/val/companions');
            await guest.locator('button:has(svg.lucide-arrow-left)').first().click();
            expect((await restoredGame).ok()).toBe(true);
            await expect(guest.getByRole('heading', { level: 1 })).toHaveText('Valorant');
            await expect(guest.getByRole('heading', { level: 4 })).toHaveCount(20);
          }
        }
        expect(await inspect(guest, '/api/orders')).toEqual(historical);
        expect((await inspect<any>(guest, '/api/wallet/balance')).balance).toBe(500);
        expect(writes).toEqual([]);
      } finally { await context.close(); }
    }
  });
  test('EN and AR game cards and filters fit mobile and desktop with real loaded assets', async ({ page }, info) => {
    test.setTimeout(150000); await page.addInitScript(() => { if (!localStorage.getItem('le3eb_locale')) localStorage.setItem('le3eb_locale', 'en'); });
    for (const ar of [false, true]) {
      await page.evaluate(locale => localStorage.setItem('le3eb_locale', locale), ar ? 'ar' : 'en').catch(() => {});
      await catalog(page); await expect(page.locator('#game-discovery-page')).toHaveAttribute('dir', ar ? 'rtl' : 'ltr');
      const avatar = page.getByRole('img', { name: 'Local Duo 00', exact: true }); await expect.poll(() => avatar.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      expect(await avatar.evaluate((img: HTMLImageElement) => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 8; const ctx = canvas.getContext('2d')!; ctx.drawImage(img, 0, 0, 8, 8); return ctx.getImageData(4, 4, 1, 1).data[3]; })).toBeGreaterThan(0);
      await expect.poll(() => page.locator('#game-discovery-page > div > img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      for (const width of [320, 375, 1440]) { await page.setViewportSize({ width, height: width === 1440 ? 1000 : 812 }); await capture(page, info, `game-${ar ? 'ar' : 'en'}-${width}`); }
      await page.getByRole('button', { name: ar ? 'تصفية' : 'Filter', exact: true }).click();
      for (const width of [320, 375, 1440]) { await page.setViewportSize({ width, height: width === 1440 ? 1000 : 812 }); await capture(page, info, `filters-${ar ? 'ar' : 'en'}-${width}`); }
      await page.getByRole('button', { name: ar ? 'إلغاء' : 'Cancel', exact: true }).click();
    }
  });
});
