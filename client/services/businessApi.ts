import type { Coupon, EPal, RechargeOrder, RechargePackage, Wallet as WalletType, WalletTransaction } from '@shared/types';
import type { ManagedCompanionProfile, UpdateCompanionProfile } from '@shared/companionManagement';
import type { BusinessOrder, BusinessReview, CreateOrderInput, OrderAction, OrderQuote } from '@shared/orders';
import type { CompanionApplication, CompanionApplicationResponse, SubmitCompanionApplication } from '@shared/companionApplications';
import type { NotificationsPage, NotificationReadResult, NotificationsReadAllResult } from '@shared/notifications';
export type { BusinessOrder, BusinessReview } from '@shared/orders';

export type { AuthUser } from '@shared/auth';
import type { AuthUser } from '@shared/auth';

export interface AuthSession {
  token: string;
  refreshToken?: string;
  legacyToken?: string;
  user: AuthUser;
}

export interface CompanionProfile {
  id: string;
  userId: string;
  gameName: string;
  intro: string;
  hourlyRate: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  availability: 'ONLINE' | 'OFFLINE' | 'BUSY';
}

export interface CompanionRanking {
  rank: number;
  companionId: string;
  gameName: string;
  hourlyRate: number;
  availability: 'ONLINE' | 'OFFLINE' | 'BUSY';
  avgRating: number;
  completedOrderCount: number;
  reviewCount: number;
  completionRate: number;
  totalRevenue: number;
  rankingScore: number;
  poolTag: 'NEW' | 'STABLE' | 'HIGH_PERFORMING';
  scoreBreakdown: {
    quality: number;
    volume: number;
    fulfillment: number;
    revenue: number;
    riskPenalty: number;
  };
}

import { apiUrl, readJsonResponse } from '@shared/apiClient';
import type { AccountProfile, UpdateAccountProfile } from '@shared/accountProfile';
import type { GameDiscoveryPage, GameDiscoveryQuery } from '@shared/gameDiscovery';

type HttpMethod = 'GET' | 'POST' | 'PATCH';

async function request<T>(path: string, method: HttpMethod, body?: unknown, token?: string): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return readJsonResponse<T>(response);
}

export const businessApi = {
  getGameCompanions(gameId: string, filters: GameDiscoveryQuery, page = 1, limit = 20) {
    const query = new URLSearchParams(Object.entries({ ...filters, page, limit }).map(([key, value]) => [key, String(value)]));
    return request<GameDiscoveryPage>(`/api/games/${encodeURIComponent(gameId)}/companions?${query}`, 'GET');
  },
  getAccountProfile(token: string) {
    return request<AccountProfile>('/api/account/profile', 'GET', undefined, token);
  },
  updateAccountProfile(token: string, input: UpdateAccountProfile) {
    return request<AccountProfile>('/api/account/profile', 'PATCH', input, token);
  },
  getSocialPeer(token: string, id: string) {
    return request<import('@shared/types').EPal>(`/api/social/peer/${encodeURIComponent(id)}`, 'GET', undefined, token);
  },
  listNotifications(token: string, options: { cursor?: string; limit?: number } = {}) {
    const query = new URLSearchParams();
    if (options.cursor) query.set('cursor', options.cursor);
    if (options.limit !== undefined) query.set('limit', String(options.limit));
    return request<NotificationsPage>(`/api/notifications${query.size ? `?${query}` : ''}`, 'GET', undefined, token);
  },
  readNotification(token: string, id: string) {
    return request<NotificationReadResult>(`/api/notifications/${encodeURIComponent(id)}/read`, 'POST', {}, token);
  },
  readAllNotifications(token: string) {
    return request<NotificationsReadAllResult>('/api/notifications/read-all', 'POST', {}, token);
  },
  register(username: string, email: string, password: string, deviceId?: string) {
    return request<unknown>('/api/auth/register', 'POST', { username, email, password, deviceId });
  },
  login(email: string, password: string, deviceId?: string) {
    return request<AuthSession>('/api/auth/login', 'POST', { email, password, deviceId });
  },
  sendEmailCode(email: string, purpose: 'login' | 'register' = 'login', deviceId?: string) {
    return request<{ ok: boolean; purpose: 'login' | 'register'; expiresInSec: number; cooldownSec: number }>(
      '/api/auth/email-code/send',
      'POST',
      { email, purpose, deviceId }
    );
  },
  loginWithEmailCode(email: string, code: string, username?: string, deviceId?: string) {
    return request<AuthSession>('/api/auth/email-code/login', 'POST', { email, code, username, deviceId });
  },
  createTicket(token: string, subject: string, body: string) {
    return request<{ id: string; status: string }>('/api/tickets', 'POST', { subject, body }, token);
  },
  listMyTickets(token: string) {
    return request<Array<{ id: string; subject: string; status: string; createdAt: number }>>('/api/tickets', 'GET', undefined, token);
  },
  getSession(token: string) {
    return request<AuthSession['user']>('/api/auth/session', 'GET', undefined, token);
  },
  logout(token: string) {
    return request<{ ok: boolean }>('/api/auth/logout', 'POST', undefined, token);
  },
  applyCompanion(token: string, gameName: string, intro: string, hourlyRate: number) {
    return request<CompanionProfile>('/api/companions/apply', 'POST', { gameName, intro, hourlyRate }, token);
  },
  getCompanionApplication(token: string) {
    return request<CompanionApplicationResponse>('/api/companions/me/application', 'GET', undefined, token);
  },
  submitCompanionApplication(token: string, input: SubmitCompanionApplication) {
    return request<CompanionApplication>('/api/companions/apply', 'POST', input, token);
  },
  getManagedCompanionProfile(token: string) {
    return request<ManagedCompanionProfile>('/api/companions/me/profile', 'GET', undefined, token);
  },
  updateManagedCompanionProfile(token: string, input: UpdateCompanionProfile) {
    return request<ManagedCompanionProfile>('/api/companions/me/profile', 'PATCH', input, token);
  },
  getPublicCompanionProfile(id: string) {
    return request<EPal>(`/api/companions/${encodeURIComponent(id)}/profile`, 'GET');
  },
  listCompanions(token: string) {
    return request<CompanionProfile[]>('/api/companions?available=true', 'GET', undefined, token);
  },
  listCompanionRankings(token: string, limit = 20) {
    const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
    return request<CompanionRanking[]>(`/api/companions/rankings?limit=${safeLimit}`, 'GET', undefined, token);
  },
  quoteOrder(token: string, input: Omit<CreateOrderInput, 'requestId' | 'expectedTotal'>) {
    return request<OrderQuote>('/api/orders/quote', 'POST', input, token);
  },
  createOrder(token: string, input: CreateOrderInput) {
    return request<BusinessOrder>('/api/orders', 'POST', input, token);
  },
  updateOrder(token: string, orderId: string, action: OrderAction, body: { evidence?: string[]; reason?: string } = {}) {
    return request<BusinessOrder>(`/api/orders/${encodeURIComponent(orderId)}/${action}`, 'POST', body, token);
  },
  listOrders(token: string) {
    return request<BusinessOrder[]>('/api/orders', 'GET', undefined, token);
  },
  createReview(token: string, orderId: string, rating: number, content: string, tags: string[] = []) {
    return request<BusinessReview>('/api/reviews', 'POST', { orderId, rating, content, tags }, token);
  },
  listCoupons(token: string) {
    return request<Coupon[]>('/api/coupons/me', 'GET', undefined, token);
  },
  listReviews(token: string) {
    return request<BusinessReview[]>('/api/reviews', 'GET', undefined, token);
  },
  listRechargePackages() {
    return request<RechargePackage[]>('/api/recharge/packages', 'GET');
  },
  createRechargeOrder(token: string, packageId: string, paymentMethod: 'GOOGLE_PAY' | 'APPLE_PAY') {
    return request<RechargeOrder>('/api/recharge/create', 'POST', { packageId, paymentMethod }, token);
  },
  verifyRecharge(token: string, orderId: string, transactionId: string, status: 'SUCCESS' | 'FAILED') {
    return request<{ status: 'SUCCESS' | 'PENDING' | 'FAILED'; alreadyProcessed?: boolean; coins?: number; message?: string }>(
      '/api/recharge/verify',
      'POST',
      { orderId, transactionId, status },
      token
    );
  },
  getWalletBalance(token: string) {
    return request<WalletType>('/api/wallet/balance', 'GET', undefined, token);
  },
  listWalletTransactions(token: string) {
    return request<WalletTransaction[]>('/api/wallet/transactions', 'GET', undefined, token);
  },
  createWithdrawRequest(token: string, diamondAmount: number, channel: string) {
    return request<unknown>('/api/wallet/withdraw-requests', 'POST', { diamondAmount, channel }, token);
  }
};
