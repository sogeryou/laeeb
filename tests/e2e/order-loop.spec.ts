import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { BusinessOrder, OrderQuote } from '../../shared/orders';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fixtureEnabled = process.env.E2E_ORDER_FIXTURE === '1';
const buyerId = 'preview-new-00';
const providerId = 'preview-player';
const couponId = 'preview-order-fixed5-grant';
const serviceId = 'preview-ranked-match';
const feedback = 'Excellent communication throughout both matches. Clear callouts, patient coaching, and a friendly teammate. I would happily book again.';
type Diagnostic = { role: string; kind: string; detail: string };
const diagnostics = new WeakMap<TestInfo, Diagnostic[]>();
test.use({
  ...(process.env.E2E_BROWSER_CHANNEL ? { channel: process.env.E2E_BROWSER_CHANNEL } : {}),
  actionTimeout: 20_000, navigationTimeout: 30_000,
  screenshot: 'only-on-failure', trace: 'retain-on-failure',
});

function trackDiagnostics(page: Page, info: TestInfo, role: string) {
  const records = diagnostics.get(info) ?? [];
  diagnostics.set(info, records);
  const record = (kind: string, detail: string) => {
    if (records.length < 100) records.push({ role, kind, detail: detail.slice(0, 1500) });
  };
  const resource = (url: string) => { const parsed = new URL(url); return parsed.origin + parsed.pathname; };
  page.on('pageerror', error => record('pageerror', error.stack || error.message));
  page.on('console', message => { if (message.type() === 'error') record('console-error', message.text()); });
  page.on('requestfailed', request => record('request-failed', `${request.method()} ${resource(request.url())}: ${request.failure()?.errorText}`));
  page.on('response', response => { if (response.status() >= 400) record('http-error', `${response.status()} ${response.request().method()} ${resource(response.url())}`); });
}

test.afterEach(async ({}, info) => {
  const records = diagnostics.get(info);
  if (records) await info.attach('browser-diagnostics', { body: Buffer.from(JSON.stringify(records, null, 2)), contentType: 'application/json' });
});

function assertIsolatedOrigin(baseURL: string | undefined) {
  expect(baseURL, 'Set E2E_BASE_URL to the disposable preview on port 3012').toBeTruthy();
  const url = new URL(baseURL!);
  expect(['127.0.0.1', 'localhost', '[::1]']).toContain(url.hostname);
  expect(url.protocol).toBe('http:');
  expect(url.port).toBe('3012');
  expect(url.username + url.password).toBe('');
}

// Run the real fixture and persistence code in a child, omitting only server launch.
// All writes use the fixture's newly-created temporary directory, removed in finally.
function inspectDisposableFixture() {
  const script = `
    import fs from 'node:fs';
    import path from 'node:path';
    import os from 'node:os';
    import assert from 'node:assert/strict';
    import { pathToFileURL } from 'node:url';
    const root = ${JSON.stringify(root)};
    let source = fs.readFileSync(path.join(root, 'scripts/player-center-preview.ts'), 'utf8');
    const launch = "await import('../backend/server.js');";
    assert.equal(source.trimEnd().endsWith(launch), true, 'Fixture launch contract changed');
    source = source.slice(0, source.lastIndexOf(launch));
    for (const relative of ['../backend/state/jsonState.js', '../backend/domain/types.js']) {
      const target = path.resolve(root, 'scripts', relative).replace(/\\.js$/, '.ts');
      source = source.replace(JSON.stringify(relative).replaceAll('"', "'"), JSON.stringify(pathToFileURL(target).href));
    }
    try {
      await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
      const dir = process.env.LOCAL_DATA_DIR;
      assert.equal(path.dirname(dir), os.tmpdir());
      assert.equal(path.basename(dir).startsWith('le3eb-player-center-'), true);
      const state = JSON.parse(fs.readFileSync(path.join(dir, 'storage.json'), 'utf8'));
      console.log('FIXTURE_STATE=' + JSON.stringify({ state, environment: {
        payment: process.env.PAYMENT_PROVIDER, cron: process.env.SETTLEMENT_CRON_DISABLED,
        storage: process.env.STORAGE_BACKEND, host: process.env.LOCAL_BIND_HOST,
        database: process.env.DATABASE_URL, redis: process.env.REDIS_URL,
      } }));
    } finally {
      const dir = process.env.LOCAL_DATA_DIR;
      if (dir && path.dirname(dir) === os.tmpdir() && path.basename(dir).startsWith('le3eb-player-center-')) fs.rmSync(dir, { recursive: true, force: true });
    }
  `;
  const output = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    cwd: root, encoding: 'utf8', timeout: 30_000,
    env: { ...process.env, NODE_ENV: 'development' },
  });
  return JSON.parse(output.split('\n').find(line => line.startsWith('FIXTURE_STATE='))!.slice('FIXTURE_STATE='.length));
}

async function inspect<T>(page: Page, route: string): Promise<T> {
  const token = await page.evaluate(() => localStorage.getItem('business_workbench_token'));
  expect(token, 'Inspection must use the real UI login session').toBeTruthy();
  const response = await page.request.get(route, { headers: { Authorization: `Bearer ${token}` }, maxRedirects: 0 });
  expect(response.ok(), `GET ${route}: ${response.status()}`).toBeTruthy();
  return response.json();
}

async function login(page: Page, email: string, id: string, warmupTimeout = 30_000) {
  await page.goto('/auth/login', { timeout: warmupTimeout });
  await page.getByRole('button', { name: 'Use a password', exact: true }).click();
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('PreviewOnly123!');
  await page.getByRole('button', { name: 'Log in', exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('business_workbench_token')), { timeout: 20_000 }).toBeTruthy();
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

async function myOrders(page: Page, locale = 'en') {
  await page.getByRole('button', { name: locale === 'en' ? 'Me' : '\u0623\u0646\u0627', exact: true }).click();
  await page.getByRole('button', { name: /Purchase History/ }).click();
}

async function openOrder(page: Page, id: string) {
  await page.getByRole('button', { name: new RegExp(`Order ${id}`, 'i') }).click();
  await expect(page.getByRole('dialog', { name: /Order Details|\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0637\u0644\u0628/ })).toBeVisible();
  await expect(page.getByRole('dialog').getByText(new RegExp(id, 'i'))).toBeVisible();
}

async function expectOrder(page: Page, id: string, status: BusinessOrder['status']) {
  await expect.poll(async () => (await inspect<BusinessOrder[]>(page, '/api/orders')).find(order => order.id === id)?.status).toBe(status);
  return (await inspect<BusinessOrder[]>(page, '/api/orders')).find(order => order.id === id)!;
}

async function screenshot(page: Page, info: TestInfo, name: string) {
  const dialog = page.getByRole('dialog');
  if (await dialog.count()) {
    await expect(dialog).toBeVisible();
    await expect.poll(async () => Math.abs((await dialog.boundingBox())?.y ?? 9999)).toBeLessThanOrEqual(1);
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  }
  await expect.poll(() => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth)).toBeLessThanOrEqual(1);
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: false, animations: 'disabled' });
  await info.attach(name, { path, contentType: 'image/png' });
}

async function booking(page: Page, useCoupon: boolean, existingOrderId?: string) {
  if (existingOrderId) {
    // Rebook the persisted peer without depending on capped Home exposure slots.
    await openOrder(page, existingOrderId);
    await page.getByRole('dialog').getByRole('button', { name: 'Chat', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('heading', { name: 'Preview Player', exact: true }).click();
  } else {
    await page.goto('/');
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await page.getByRole('heading', { name: 'Preview Player', exact: true }).first().click();
  }
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  const initialQuote = page.waitForResponse(response => new URL(response.url()).pathname === '/api/orders/quote' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  expect((await initialQuote).ok()).toBeTruthy();
  await page.getByRole('button', { name: 'Select service', exact: true }).click();
  const serviceQuote = page.waitForResponse(response => new URL(response.url()).pathname === '/api/orders/quote' && response.request().postDataJSON()?.serviceId === serviceId);
  await page.getByRole('button', { name: /Preview ranked match/ }).click();
  expect((await serviceQuote).ok()).toBeTruthy();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  let quote: OrderQuote;
  const quantityQuote = page.waitForResponse(response => new URL(response.url()).pathname === '/api/orders/quote' && response.request().postDataJSON()?.quantity === 2);
  await page.getByRole('button', { name: 'Increase quantity', exact: true }).click();
  const quantityResponse = await quantityQuote;
  expect(quantityResponse.ok()).toBeTruthy();
  quote = await quantityResponse.json();
  if (useCoupon) {
    await page.getByRole('button', { name: /Select coupon/ }).click();
    const discountedQuote = page.waitForResponse(response => new URL(response.url()).pathname === '/api/orders/quote' && response.request().postDataJSON()?.couponGrantId === couponId);
    await page.getByRole('button', { name: /Preview fixed5/ }).click();
    const response = await discountedQuote;
    expect(response.ok()).toBeTruthy();
    quote = await response.json();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  expect(quote).toMatchObject({ companionId: 'preview-cp', serviceId, quantity: 2, unit: 'match', unitPrice: 25, subtotal: 50, discount: useCoupon ? 5 : 0, totalPrice: useCoupon ? 45 : 50 });
  await expect(page.getByLabel('Quoted total', { exact: true })).toHaveText(String(quote.totalPrice));
  await expect(page.getByRole('button', { name: 'Pay and Start', exact: true })).toBeEnabled();
  return quote;
}

async function pay(page: Page, quote: OrderQuote) {
  const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname === '/api/orders' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Pay and Start', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const order: BusinessOrder = await response.json();
  expect(response.request().postDataJSON()).toMatchObject({ requestId: expect.any(String), expectedTotal: quote.totalPrice });
  expect(order).toMatchObject({ ...quote, status: 'CREATED', workflowVersion: 2, escrowState: 'FROZEN', role: 'BUYER', userId: buyerId, participant: { userId: providerId, name: 'Preview Player' } });
  await expect(page.getByText('Preview Player', { exact: true }).first()).toBeVisible();
  return order;
}

test('order fixture safety gate rejects non-isolated URLs without making requests', () => {
  expect(() => assertIsolatedOrigin('https://example.com:3012')).toThrow();
  expect(() => assertIsolatedOrigin('http://127.0.0.1:3000')).toThrow();
  expect(() => assertIsolatedOrigin(undefined)).toThrow();
  expect(() => assertIsolatedOrigin('http://user:password@localhost:3012')).toThrow();
  expect(() => assertIsolatedOrigin('http://127.0.0.1:3012')).not.toThrow();
});

test.describe('isolated persistent order loop', () => {
  test.skip(!fixtureEnabled, 'Set E2E_ORDER_FIXTURE=1; never run order mutations against ordinary URLs');

  test('disposable fixture preserves legacy data and provides real buyer funds and coupon', () => {
    const { state, environment } = inspectDisposableFixture();
    expect(environment).toEqual({ payment: 'sandbox', cron: 'true', storage: 'json', host: '127.0.0.1' });
    expect(state.users).toHaveLength(53);
    expect(state.orders).toHaveLength(39);
    expect(state.reviews).toHaveLength(39);
    expect(state.walletTransactions).toHaveLength(39);
    expect(state.orders.every((order: BusinessOrder) => order.workflowVersion === undefined)).toBe(true);
    expect(state.orders.every((order: BusinessOrder) => order.status === 'COMPLETED')).toBe(true);
    expect(state.diamondWallets[providerId].balance).toBe(state.orders.reduce((sum: number, order: BusinessOrder) => sum + order.totalPrice, 0));
    expect(state.users.filter((user: { id: string }) => user.id.startsWith('preview-new-'))).toHaveLength(25);
    expect(state.wallets[buyerId]).toMatchObject({ userId: buyerId, balance: 500 });
    expect(state.couponTemplates).toContainEqual(expect.objectContaining({ id: 'preview-order-fixed5', type: 'FIXED', value: 5 }));
    expect(state.couponGrants).toContainEqual(expect.objectContaining({ id: couponId, userId: buyerId, status: 'ACTIVE', expiresAt: expect.any(Number) }));
    expect(state.couponGrants.find((grant: { id: string }) => grant.id === couponId).expiresAt).toBeGreaterThan(Date.now());
    expect(state.companions[0].services).toContainEqual({ id: serviceId, name: 'Preview ranked match', unitPrice: 25, unit: 'match' });
  });

  test('UI buyer funding, provider evidence, buyer confirmation and full review, then cancellation refund', async ({ page, browser, baseURL }, info) => {
    const startedAt = Date.now();
    const warmupTimeout = Math.max(30_000, Math.min(300_000, Number(process.env.E2E_FRONTEND_WARMUP_MS) || 30_000));
    test.setTimeout(180_000 + warmupTimeout);
    assertIsolatedOrigin(baseURL);
    trackDiagnostics(page, info, 'buyer');
    await page.addInitScript(() => {
      if (!localStorage.getItem('le3eb_locale')) localStorage.setItem('le3eb_locale', 'en');
    });
    await login(page, 'new0@local.test', buyerId, warmupTimeout);
    test.setTimeout(180_000 + Date.now() - startedAt);
    expect((await inspect<{ balance: number }>(page, '/api/wallet/balance')).balance).toBe(500);
    expect(await inspect<BusinessOrder[]>(page, '/api/orders')).toEqual([]);
    expect(await inspect(page, '/api/coupons/me')).toContainEqual(expect.objectContaining({ id: couponId, discount: 5, type: 'FIXED' }));

    const providerContext = await browser.newContext({ baseURL, viewport: { width: 1440, height: 1000 } });
    try {
      const provider = await providerContext.newPage();
      trackDiagnostics(provider, info, 'provider');
      await provider.addInitScript(() => {
        if (!localStorage.getItem('le3eb_locale')) localStorage.setItem('le3eb_locale', 'en');
      });
      await login(provider, 'player@local.test', providerId);
      const beforeProvider = await inspect<{ diamondWallet: { balance: number } }>(provider, '/api/dashboard/business');
      const historical = await inspect<BusinessOrder[]>(provider, '/api/orders');
      expect(historical).toHaveLength(39);
      expect(historical.every(order => order.workflowVersion !== 2)).toBe(true);

      const quote = await booking(page, true);
      await screenshot(page, info, 'checkout-mobile-en');
      const first = await pay(page, quote);
      expect((await inspect<{ balance: number }>(page, '/api/wallet/balance')).balance).toBe(455);
      const transactions = await inspect<Array<{ type: string; referenceId: string; amount: number }>>(page, '/api/wallet/transactions');
      expect(transactions.filter(transaction => transaction.type === 'ORDER_PAY' && transaction.referenceId === first.id)).toHaveLength(1);
      await page.reload();
      await myOrders(page);
      await openOrder(page, first.id);
      expect((await expectOrder(page, first.id, 'CREATED')).totalPrice).toBe(45);
      await screenshot(page, info, 'created-mobile-en');
      await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();

      await myOrders(provider);
      await openOrder(provider, first.id);
      await expect(provider.getByRole('dialog').getByText('New test customer 01', { exact: true })).toBeVisible();
      await expect(provider.getByRole('button', { name: 'Cancel order', exact: true })).toHaveCount(0);
      await provider.getByRole('button', { name: 'Accept and start', exact: true }).click();
      await expectOrder(provider, first.id, 'IN_SERVICE');
      const submit = provider.getByRole('button', { name: 'Submit completion', exact: true });
      await expect(submit).toBeDisabled();
      await provider.getByLabel('Completion evidence', { exact: true }).fill('Both ranked matches completed\nhttps://example.test/order-proof');
      await submit.click();
      expect((await expectOrder(provider, first.id, 'AWAITING_CONFIRMATION')).completionEvidence).toEqual(['Both ranked matches completed', 'https://example.test/order-proof']);
      expect((await inspect<{ diamondWallet: { balance: number } }>(provider, '/api/dashboard/business')).diamondWallet.balance).toBe(beforeProvider.diamondWallet.balance);
      await screenshot(provider, info, 'awaiting-provider-desktop-en');

      await page.reload();
      await myOrders(page);
      await openOrder(page, first.id);
      await expect(page.getByRole('dialog').getByText('Both ranked matches completed', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Accept and start', exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: 'Confirm completion', exact: true }).click();
      await expectOrder(page, first.id, 'COMPLETED');
      expect((await inspect<{ diamondWallet: { balance: number } }>(provider, '/api/dashboard/business')).diamondWallet.balance).toBe(beforeProvider.diamondWallet.balance + 45);
      await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
      await page.getByRole('button', { name: 'Rate', exact: true }).click();
      await page.getByRole('button', { name: '4 stars', exact: true }).click();
      await page.getByRole('dialog').getByText('Professional', { exact: true }).click();
      await expect(page.getByRole('checkbox', { name: 'Professional', exact: true })).toBeChecked();
      await page.getByLabel('Review feedback', { exact: true }).fill(feedback);
      await screenshot(page, info, 'review-mobile-en');
      await page.getByRole('button', { name: 'Submit review', exact: true }).click();
      await expect.poll(async () => (await expectOrder(page, first.id, 'COMPLETED')).reviewed).toBe(true);
      const reviewed = await expectOrder(page, first.id, 'COMPLETED');
      expect(reviewed).toMatchObject({ reviewed: true, review: { rating: 4, content: feedback, tags: ['Professional'], status: 'APPROVED' } });
      await page.reload();
      await myOrders(page);
      await openOrder(page, first.id);
      await expect(page.getByRole('button', { name: 'Rate', exact: true })).toHaveCount(0);
      await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();

      const secondQuote = await booking(page, false, first.id);
      const second = await pay(page, secondQuote);
      expect((await inspect<{ balance: number }>(page, '/api/wallet/balance')).balance).toBe(405);
      await openOrder(page, second.id);
      await page.getByRole('button', { name: 'Cancel order', exact: true }).click();
      expect(await expectOrder(page, second.id, 'CANCELLED')).toMatchObject({ escrowState: 'RETURNED' });
      expect((await inspect<{ balance: number }>(page, '/api/wallet/balance')).balance).toBe(455);
      const refunded = await inspect<Array<{ type: string; referenceId: string }>>(page, '/api/wallet/transactions');
      expect(refunded.filter(transaction => transaction.type === 'REFUND' && transaction.referenceId === second.id)).toHaveLength(1);
      await page.reload();
      await myOrders(page);
      expect((await inspect<BusinessOrder[]>(page, '/api/orders')).map(order => order.id)).toHaveLength(2);

      // Read-only visual matrix after the two UI-created orders; no hidden API actions.
      for (const locale of ['en', 'ar']) {
        await page.evaluate(value => localStorage.setItem('le3eb_locale', value), locale);
        await page.reload();
        await myOrders(page, locale);
        await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
        await expect(page.getByText('Preview Player', { exact: true }).first()).toBeVisible();
        for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 1000 }]) {
          await page.setViewportSize(viewport);
          await screenshot(page, info, `orders-${viewport.width < 500 ? 'mobile' : 'desktop'}-${locale}`);
          await openOrder(page, first.id);
          await screenshot(page, info, `completed-${viewport.width < 500 ? 'mobile' : 'desktop'}-${locale}`);
          await page.getByRole('dialog').getByRole('button', { name: locale === 'en' ? 'Close' : '\u0625\u063a\u0644\u0627\u0642', exact: true }).click();
          await expect(page.getByRole('dialog')).toHaveCount(0);
        }
      }
      const afterHistorical = (await inspect<BusinessOrder[]>(provider, '/api/orders')).filter(order => order.workflowVersion !== 2);
      expect(afterHistorical).toHaveLength(39);
      expect(afterHistorical.map(order => [order.id, order.status])).toEqual(historical.map(order => [order.id, order.status]));
    } finally {
      await providerContext.close();
    }
  });

  test('read-only mobile order tabs keep each label on one line in EN and AR', async ({ page, baseURL }, info) => {
    test.setTimeout(90_000);
    assertIsolatedOrigin(baseURL);
    trackDiagnostics(page, info, 'read-only-buyer');
    const mutations: string[] = [];
    page.on('request', request => {
      const path = new URL(request.url()).pathname;
      if (path.startsWith('/api/orders') && request.method() !== 'GET') mutations.push(`${request.method()} ${path}`);
    });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.addInitScript(() => {
      if (!localStorage.getItem('le3eb_locale')) localStorage.setItem('le3eb_locale', 'en');
    });
    await login(page, 'new0@local.test', buyerId);
    const measurements: Array<{ locale: string; width: number; label: string; height: number; lineHeight: number }> = [];
    for (const locale of ['en', 'ar']) {
      await page.evaluate(value => localStorage.setItem('le3eb_locale', value), locale);
      await page.reload();
      await myOrders(page, locale);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      const tabs = page.getByRole('tablist').getByRole('tab');
      await expect(tabs).toHaveCount(4);
      for (const viewport of [{ width: 375, height: 812 }, { width: 1440, height: 1000 }]) {
        await page.setViewportSize(viewport);
        await screenshot(page, info, `tabs-${viewport.width < 500 ? 'mobile' : 'desktop'}-${locale}`);
        const rows = await tabs.evaluateAll(elements => elements.map(element => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return { label: element.textContent?.trim() ?? '', height: range.getBoundingClientRect().height, lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight) };
        }));
        measurements.push(...rows.map(row => ({ locale, width: viewport.width, ...row })));
      }
    }
    await info.attach('mobile-tab-measurements', { body: Buffer.from(JSON.stringify(measurements, null, 2)), contentType: 'application/json' });
    expect(mutations, 'Read-only tab checks must not send order mutations').toEqual([]);
    for (const row of measurements) {
      expect(Number.isFinite(row.lineHeight), `${row.locale} ${row.width}px: ${row.label} has a measurable line height`).toBe(true);
      expect(row.height, `${row.locale} ${row.width}px: ${row.label} must fit one text line`).toBeLessThanOrEqual(row.lineHeight + 1);
    }
  });
});
