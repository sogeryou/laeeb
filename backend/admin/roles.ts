import type express from 'express';
import type { AppContext } from '../app/context.js';
import { ROLE_TEMPLATES, type AdminRoleTemplate, type UserEntity } from '../domain/types.js';

type AdminRoleContext = Pick<AppContext, 'users' | 'auditLogs' | 'authMiddleware' | 'requireAdmin' | 'sendError' | 'appendAuditLog' | 'persistState' | 'toPublicUser'>;

export function registerAdminRoleRoutes(app: express.Express, ctx: AdminRoleContext) {
  const { users, authMiddleware, requireAdmin, sendError, appendAuditLog, persistState, toPublicUser } = ctx;
  app.get('/api/admin/role-templates', authMiddleware, requireAdmin(), (_req, res) => {
    res.json(ROLE_TEMPLATES);
  });
  app.post('/api/admin/users/:id/role-template', authMiddleware, requireAdmin(), (req, res) => {
    const actor = (req as any).authUser as UserEntity | undefined;
    if (actor?.role !== 'ADMIN' || actor.adminRoleTemplate !== 'SUPER_ADMIN') {
      return sendError(res, 403, 'AUTH_SUPER_ADMIN_ONLY', 'Super admin only');
    }
    const user = users.find(item => item.id === req.params.id);
    if (!user) return sendError(res, 404, 'ADMIN_USER_NOT_FOUND', 'User not found');
    if (user.role !== 'ADMIN') return sendError(res, 400, 'ADMIN_TARGET_NOT_ADMIN', 'Target user is not admin');
    const requestedTemplate: unknown = req.body?.roleTemplate;
    if (typeof requestedTemplate !== 'string' || !Object.prototype.hasOwnProperty.call(ROLE_TEMPLATES, requestedTemplate)) {
      return sendError(res, 400, 'ADMIN_ROLE_TEMPLATE_INVALID', 'Invalid roleTemplate');
    }
    const roleTemplate = requestedTemplate as AdminRoleTemplate;
    const previousTemplate = Object.getOwnPropertyDescriptor(user, 'adminRoleTemplate');
    const previousPermissions = Object.getOwnPropertyDescriptor(user, 'permissions');
    const previousAuditLogs = [...ctx.auditLogs];
    try {
      user.adminRoleTemplate = roleTemplate;
      user.permissions = [...ROLE_TEMPLATES[roleTemplate]];
      appendAuditLog((req as any).authUserId, 'ADMIN_ROLE_TEMPLATE_UPDATE', 'finance', user.id, { roleTemplate });
      persistState();
    } catch (error) {
      // State is shared with authentication: a failed save must not leave a live grant.
      if (previousTemplate) Object.defineProperty(user, 'adminRoleTemplate', previousTemplate);
      else delete user.adminRoleTemplate;
      if (previousPermissions) Object.defineProperty(user, 'permissions', previousPermissions);
      else delete user.permissions;
      ctx.auditLogs.length = 0;
      for (const record of previousAuditLogs) ctx.auditLogs.push(record);
      throw error;
    }
    res.json(toPublicUser(user));
  });
}
