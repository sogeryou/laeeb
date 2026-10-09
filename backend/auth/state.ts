import type { VerificationCodeRecord } from './contracts.js';
import type { AppContext } from '../app/context.js';

export type AuthGrant = { email: string; kind: 'registration' | 'reset'; expiresAt: number; deviceId?: string; userId?: string; consumedAt?: number; session?: import('../../shared/auth.js').AuthSession };
export type AuthSecurityState = {
  codes: Record<string, VerificationCodeRecord>;
  grants: Record<string, AuthGrant>;
  sends: Record<string, number[]>;
  failures: Record<string, number[]>;
  uploads: Record<string, { owner: string; url: string; createdAt: number }>;
};
export const newAuthState = (): AuthSecurityState => ({ codes: {}, grants: {}, sends: {}, failures: {}, uploads: {} });
export function authState(ctx: AppContext) {
  return ctx.authState ||= newAuthState();
}
