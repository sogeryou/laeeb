import { loadEnv } from '../config/env.js';
import { emailDelivery } from './profile.js';
import type { AuthEmailPurpose } from '../../shared/auth.js';

/** Provider endpoint uses Resend's JSON request protocol; never logs recipient/code/API keys. */
export async function deliverAuthCode(input: { email: string; code: string; purpose: AuthEmailPurpose; locale?: 'en' | 'ar' }) {
  const delivery = emailDelivery();
  if (delivery === 'development') return { developmentCode: input.code };
  if (delivery === 'unavailable') throw new Error('AUTH_MAIL_UNAVAILABLE');
  const env = loadEnv();
  const arabic = input.locale === 'ar';
  const response = await fetch(env.AUTH_MAIL_ENDPOINT, {
    method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { authorization: `Bearer ${env.AUTH_MAIL_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.AUTH_MAIL_FROM, to: [input.email], subject: arabic ? 'رمز التحقق من لاعب' : 'Your Le3eb verification code', text: arabic ? `رمز التحقق: ${input.code}\nصالح لمدة 5 دقائق. لا تشاركه مع أي شخص.` : `Your ${input.purpose} verification code is ${input.code}. It expires in 5 minutes. Never share this code.` }),
  });
  if (!response.ok) throw new Error('AUTH_MAIL_DELIVERY_FAILED');
  return {};
}
