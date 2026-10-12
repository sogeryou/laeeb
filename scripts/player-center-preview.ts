/** Isolated, disposable local fixture. Never imports or overwrites existing storage. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

if (process.env.NODE_ENV === 'production') throw new Error('Preview is local development only');
process.env.NODE_ENV = 'development';
process.env.PORT = process.env.PORT || '3001';
process.env.SETTLEMENT_CRON_DISABLED = 'true';
process.env.LOCAL_BIND_HOST = '127.0.0.1';
process.env.PAYMENT_PROVIDER = 'sandbox';
for (const key of ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_ENDPOINT', 'S3_PUBLIC_BASE_URL', 'SENTRY_DSN', 'VITE_SENTRY_DSN', 'VITE_API_ORIGIN']) process.env[key] = '';
process.env.ALLOW_DEMO_SEED = 'false';
process.env.LOCAL_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'le3eb-player-center-'));
process.env.AUTH_EMAIL_DELIVERY = 'development';
process.env.AUTH_AVATAR_DIR = path.join(process.env.LOCAL_DATA_DIR, 'auth-avatars');
delete process.env.AUTH_MAIL_API_KEY; delete process.env.AUTH_MAIL_FROM; delete process.env.AUTH_MAIL_ENDPOINT;
// Do not inherit production admin seeding or remote storage for this disposable preview.
delete process.env.ADMIN_EMAIL; delete process.env.ADMIN_PASSWORD;
delete process.env.DATABASE_URL; delete process.env.REDIS_URL;
process.env.STORAGE_BACKEND = 'json';
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
const { defaultState, legacyHashPassword, saveState } = await import('../backend/state/jsonState.js');
const { ROLE_TEMPLATES } = await import('../backend/domain/types.js');
const state = defaultState();
const now = Date.now();
state.users.push({ id: 'preview-admin', username: 'Local Test Admin', email: 'admin@local.test', passwordHash: legacyHashPassword('PreviewOnly123!'), role: 'ADMIN', adminRoleTemplate: 'SUPER_ADMIN', permissions: [...ROLE_TEMPLATES.SUPER_ADMIN], createdAt: now, accountStatus: 'ACTIVE' });
state.users.push({ id: 'preview-player', username: 'Preview Player', email: 'player@local.test', passwordHash: legacyHashPassword('PreviewOnly123!'), role: 'PLAYER', createdAt: now - 60 * 86400000, accountStatus: 'ACTIVE' });
state.companions.push({ id: 'preview-cp', userId: 'preview-player', gameName: 'Valorant', intro: 'Isolated local acceptance fixture', hourlyRate: 25, status: 'APPROVED', availability: 'ONLINE', createdAt: now - 60 * 86400000, updatedAt: now });
state.companions[0].services = [{ id: 'preview-ranked-match', name: 'Preview ranked match', unitPrice: 25, unit: 'match' }];
let balance = 0;
for (let i = 0; i < 26; i++) {
  const userId = `preview-customer-${i}`;
  state.users.push({ id: userId, username: `Test customer ${String(i + 1).padStart(2, '0')}`, email: `customer${i}@local.test`, passwordHash: i === 0 ? legacyHashPassword('PreviewOnly123!') : 'disabled', role: 'USER', createdAt: now - 40 * 86400000 });
  for (let j = 0; j < (i % 2 === 0 ? 2 : 1); j++) {
    const timestamp = j === 0 && i % 2 === 0 ? now - 35 * 86400000 : now - (i + 1) * 60000;
    const id = `preview-order-${i}-${j}`;
    const amount = 25 * (i % 3 + 1);
    state.orders.push({ id, userId, companionId: 'preview-cp', serviceName: i % 2 ? 'Valorant' : 'Voice chat', quantity: i % 3 + 1, unitPrice: 25, totalPrice: amount, status: 'COMPLETED', settlementDone: true, createdAt: timestamp - 3600000, completedAt: timestamp });
    balance += amount;
    state.walletTransactions.push({ id: `preview-tx-${i}-${j}`, userId: 'preview-player', type: 'INCOME', amount, balanceAfter: balance, timestamp, referenceId: id, description: 'TEST FIXTURE — settled service' });
    state.reviews.push({ id: `preview-review-${i}-${j}`, orderId: id, userId, companionId: 'preview-cp', rating: i % 3 + 3, content: 'Local fixture review', status: 'APPROVED', createdAt: timestamp + 1 });
  }
}
state.diamondWallets['preview-player'] = { userId: 'preview-player', balance, lastUpdated: now };
// Greeting acceptance fixtures: these users have never ordered from the test player.
for (let i = 0; i < 25; i++) state.users.push({ id: `preview-new-${String(i).padStart(2, '0')}`, username: `New test customer ${String(i + 1).padStart(2, '0')}`, email: `new${i}@local.test`, passwordHash: i === 0 ? legacyHashPassword('PreviewOnly123!') : 'disabled', role: 'USER', createdAt: now, accountStatus: 'ACTIVE' });
// Order-loop acceptance data is additive; historical orders remain unfunded legacy records.
state.wallets['preview-new-00'] = { userId: 'preview-new-00', balance: 500, lastUpdated: now };
state.couponTemplates.push({ id: 'preview-order-fixed5', name: 'Preview fixed5', type: 'FIXED', value: 5, minSpend: 0, validityDays: 7, maxIssue: 1, scope: 'ALL', createdAt: now });
state.couponGrants.push({ id: 'preview-order-fixed5-grant', templateId: 'preview-order-fixed5', userId: 'preview-new-00', status: 'ACTIVE', issuedAt: now, expiresAt: now + 7 * 86400000 });
saveState(state);
console.log(`Isolated TEST DATA preview: http://localhost:${process.env.PORT}`);
console.log('Login: player@local.test / PreviewOnly123!');
console.log('Chat test customer: customer0@local.test / PreviewOnly123!');
console.log('Greeting test customer: new0@local.test / PreviewOnly123!');
console.log('Isolated moderation admin: admin@local.test / PreviewOnly123!');
console.log(`Disposable data directory: ${process.env.LOCAL_DATA_DIR}`);
await import('../backend/server.js');
