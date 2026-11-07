import express from 'express';
import request from 'supertest';
import { expect, it, vi } from 'vitest';
import { registerAdminRoleRoutes } from '../../backend/admin/roles';
import { ROLE_TEMPLATES } from '../../backend/domain/types';

function setup(template = 'CONTENT_ADMIN') {
  const actor = { id: 'actor', role: 'ADMIN', adminRoleTemplate: template, permissions: [...ROLE_TEMPLATES[template as keyof typeof ROLE_TEMPLATES]] };
  const target = { id: 'target', role: 'ADMIN', adminRoleTemplate: 'CONTENT_ADMIN', permissions: [...ROLE_TEMPLATES.CONTENT_ADMIN] };
  const users = [actor, target, { id: 'user', role: 'USER', adminRoleTemplate: 'SUPER_ADMIN', permissions: [] }];
  const auditLogs: any[] = [];
  const ctx: any = { users, auditLogs, persistState: vi.fn(),
    authMiddleware: (req: any, res: any, next: any) => {
      req.authUser = users.find(u => u.id === req.headers['x-user']);
      if (!req.authUser) return res.sendStatus(401);
      req.authUserId = req.authUser.id; next();
    },
    requireAdmin: () => (req: any, res: any, next: any) => req.authUser.role === 'ADMIN' ? next() : res.sendStatus(403),
    sendError: (res: any, status: number, code: string, message: string) => res.status(status).json({ error: { code, message } }),
    appendAuditLog: (...args: any[]) => auditLogs.unshift(args), toPublicUser: (u: any) => ({ ...u }),
  };
  const app = express(); app.use(express.json()); registerAdminRoleRoutes(app, ctx);
  const assign = (id = 'target', body: any = { roleTemplate: 'SUPER_ADMIN' }, identity = 'actor') => request(app).post(`/api/admin/users/${id}/role-template`).set('x-user', identity).send(body);
  return { app, ctx, actor, target, users, auditLogs, assign };
}

for (const template of ['CONTENT_ADMIN', 'RISK_ADMIN', 'FINANCE_ADMIN']) {
  for (const id of ['actor', 'target']) it(`denies ${template} granting SUPER_ADMIN to ${id}, despite forged actor fields`, async () => {
    const s = setup(template); const before = structuredClone(s.users);
    const result = await s.assign(id, { roleTemplate: 'SUPER_ADMIN', role: 'ADMIN', adminRoleTemplate: 'SUPER_ADMIN', authUser: { role: 'ADMIN', adminRoleTemplate: 'SUPER_ADMIN' }, permissions: ROLE_TEMPLATES.SUPER_ADMIN });
    expect(result.status).toBe(403); expect(result.body.error.code).toBe('AUTH_SUPER_ADMIN_ONLY');
    expect(s.users).toEqual(before); expect(s.auditLogs).toEqual([]); expect(s.ctx.persistState).not.toHaveBeenCalled();
  });
}

it('allows server-side super admin grants with the existing audit and response contract', async () => {
  const s = setup('SUPER_ADMIN'); const result = await s.assign();
  expect(result.status).toBe(200); expect(result.body.adminRoleTemplate).toBe('SUPER_ADMIN');
  expect(s.target.permissions).toEqual(ROLE_TEMPLATES.SUPER_ADMIN);
  expect(s.auditLogs).toEqual([['actor', 'ADMIN_ROLE_TEMPLATE_UPDATE', 'finance', 'target', { roleTemplate: 'SUPER_ADMIN' }]]);
  expect(s.ctx.persistState).toHaveBeenCalledOnce();
  expect((await request(s.app).get('/api/admin/role-templates').set('x-user', 'actor')).body).toEqual(ROLE_TEMPLATES);
});

it.each(['missing', 'toString', '__proto__', 'constructor', null, {}, ['SUPER_ADMIN']].map(roleTemplate => ({ roleTemplate })))('rejects invalid own template $roleTemplate without mutation', async ({ roleTemplate }) => {
  const s = setup('SUPER_ADMIN'); const before = structuredClone(s.users);
  expect((await s.assign('target', { roleTemplate })).status).toBe(400);
  expect(s.users).toEqual(before); expect(s.auditLogs).toEqual([]); expect(s.ctx.persistState).not.toHaveBeenCalled();
});

it.each(Object.keys(ROLE_TEMPLATES))('preserves legal template %s assignment', async roleTemplate => {
  const s = setup('SUPER_ADMIN');
  expect((await s.assign('target', { roleTemplate })).status).toBe(200);
  expect(s.target.adminRoleTemplate).toBe(roleTemplate);
  expect(s.target.permissions).toEqual(ROLE_TEMPLATES[roleTemplate as keyof typeof ROLE_TEMPLATES]);
});

it('denies an ADMIN without a server-side template even with super-admin permissions', async () => {
  const s = setup(); delete (s.actor as any).adminRoleTemplate;
  s.actor.permissions = [...ROLE_TEMPLATES.SUPER_ADMIN];
  const before = structuredClone(s.users);
  expect((await s.assign()).status).toBe(403);
  expect(s.users).toEqual(before); expect(s.auditLogs).toEqual([]);
});

it('preserves anonymous, ordinary-user, missing-target, and non-admin-target failures', async () => {
  const s = setup('SUPER_ADMIN');
  expect((await s.assign('target', undefined, 'anonymous')).status).toBe(401);
  expect((await s.assign('target', undefined, 'user')).status).toBe(403);
  expect((await s.assign('missing')).status).toBe(404);
  expect((await s.assign('user')).status).toBe(400);
  expect(s.auditLogs).toEqual([]); expect(s.ctx.persistState).not.toHaveBeenCalled();
});

it('restores permissions and audit entries when persistence fails', async () => {
  const s = setup('SUPER_ADMIN'); const before = structuredClone(s.users);
  s.auditLogs.push(['existing']); s.ctx.persistState.mockImplementation(() => { throw new Error('disk failure'); });
  expect((await s.assign()).status).toBe(500);
  expect(s.users).toEqual(before); expect(s.auditLogs).toEqual([['existing']]);
});

it('restores a 200000-record audit history in place and preserves the original save error', async () => {
  const s = setup('SUPER_ADMIN');
  const before = structuredClone(s.users);
  const history = Array.from({ length: 200000 }, (_, index) => ({ id: `audit-${index}` }));
  for (const record of history) s.auditLogs.push(record);
  const originalArray = s.auditLogs;
  const failure = new Error('original persistence failure');
  let capturedError: unknown;
  s.app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    capturedError = error;
    res.sendStatus(500);
  });
  s.ctx.persistState.mockImplementation(() => { throw failure; });

  expect((await s.assign()).status).toBe(500);
  expect(capturedError).toBe(failure);
  expect(s.users).toEqual(before);
  expect(s.ctx.auditLogs).toBe(originalArray);
  expect(s.auditLogs).toHaveLength(history.length);
  expect(s.auditLogs.every((record, index) => record === history[index])).toBe(true);
});
