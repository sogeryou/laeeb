import type express from 'express';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { ACCOUNT_BIO_RAW_MAX_LENGTH, isAccountBioValid, type AccountProfile } from '../../shared/accountProfile.js';
import { isAuthNicknameValid } from '../../shared/auth.js';
import type { AppContext } from '../app/context.js';
import type { UserEntity } from '../domain/types.js';
import { systemAvatarUrl, toAuthUser } from '../auth/profile.js';
import { authState } from '../auth/state.js';

const updateSchema = z.object({
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  username: z.string().max(4096).trim().refine(isAuthNicknameValid, 'Invalid nickname'),
  bio: z.string().max(ACCOUNT_BIO_RAW_MAX_LENGTH).refine(isAccountBioValid, 'Invalid bio').transform(value => value.trim()),
  avatar: z.object({ type: z.enum(['system', 'upload']), value: z.string().min(1).max(128) }).strict().optional(),
}).strict();

function profileView(user: UserEntity): AccountProfile {
  const bio = user.bio ?? '';
  const revision = createHash('sha256').update(JSON.stringify([user.id, user.username, bio, user.avatar ?? null])).digest('hex');
  return { user: toAuthUser(user)!, bio, revision };
}

export function registerAccountProfileRoutes(app: express.Application, ctx: AppContext) {
  app.use('/api/account/profile', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  const owner = (req: express.Request) => ctx.getUserById((req as express.Request & { authUserId: string }).authUserId);
  app.get('/api/account/profile', ctx.authMiddleware, (req, res) => {
    const user = owner(req);
    if (!user) return ctx.sendError(res, 401, 'AUTH_UNAUTHORIZED', 'Unauthorized');
    return res.json(profileView(user));
  });
  app.patch('/api/account/profile', ctx.authMiddleware, (req, res) => {
    const user = owner(req);
    if (!user) return ctx.sendError(res, 401, 'AUTH_UNAUTHORIZED', 'Unauthorized');
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return ctx.sendError(res, 400, 'INPUT_INVALID', 'Validation failed', {
      issues: parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
    });
    const body = parsed.data;
    let avatar = user.avatar;
    if (body.avatar) {
      const { type, value } = body.avatar;
      const url = type === 'system' ? systemAvatarUrl(value)
        : /^[a-f0-9]{48}$/.test(value) && authState(ctx).uploads[value]?.owner === `user:${user.id}`
          ? `/api/auth/avatars/uploads/${value}.png` : null;
      if (!url) return ctx.sendError(res, 400, 'PROFILE_AVATAR_INVALID', 'Select a system avatar or upload your own image');
      avatar = url;
    }
    const current = profileView(user);
    // A lost successful response can be replayed even with its original revision.
    if (user.username === body.username && current.bio === body.bio && user.avatar === avatar) return res.json(current);
    if (current.revision !== body.revision) return ctx.sendError(res, 409, 'PROFILE_STALE', 'Profile changed. Reload before saving');
    if (ctx.users.some(other => other.id !== user.id && other.username.trim().toLowerCase() === body.username.toLowerCase())) {
      return ctx.sendError(res, 409, 'PROFILE_NICKNAME_TAKEN', 'Nickname is already in use');
    }
    const previous = { ...user };
    Object.assign(user, { username: body.username, bio: body.bio });
    if (body.avatar) user.avatar = avatar;
    try { ctx.persistState(); } catch {
      for (const key of Object.keys(user)) delete (user as unknown as Record<string, unknown>)[key];
      Object.assign(user, previous);
      return ctx.sendError(res, 503, 'PROFILE_SAVE_FAILED', 'Profile could not be saved. Please retry');
    }
    return res.json(profileView(user));
  });
}
