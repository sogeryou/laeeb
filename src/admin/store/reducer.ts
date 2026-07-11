import type {
  AdminUser,
  AssetOperation,
  CompanionService,
  CompanionStat,
  DisputeOrder,
  LedgerRow,
  OrderRow,
  RechargeRecord,
  RiskHit,
  WithdrawalRow,
} from '../types';
import type { OrderTrendPoint, RechargeTrendPoint } from '../types';
import { diamondsToUsd } from '../utils/format';
import { withdrawDecisionStatus, type AdminAction } from './actions';

/** 后台内存业务状态快照。 */
export interface AdminState {
  users: AdminUser[];
  ledgers: LedgerRow[];
  orders: OrderRow[];
  withdrawals: WithdrawalRow[];
  assetOps: AssetOperation[];
  companionServices: CompanionService[];
  companionStats: CompanionStat[];
  disputes: DisputeOrder[];
  riskHits: RiskHit[];
  rechargeRecords: RechargeRecord[];
  rechargeTrend: RechargeTrendPoint[];
  orderTrend: OrderTrendPoint[];
  linkedAccountIds: Record<string, string[]>;
  operator: string;
  /** 自增序列，用于生成新记录 ID。 */
  seq: number;
}

const nowTime = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/** 在不可变更新中按 id 替换一条记录。 */
function replaceById<T extends { id: string }>(list: T[], id: string, patch: (item: T) => T): T[] {
  return list.map((item) => (item.id === id ? patch(item) : item));
}

const serviceCategories = (item: CompanionService) =>
  Array.from(new Set(item.serviceItems.map((serviceItem) => serviceItem.category)));

const serviceAudit = (item: CompanionService, category: string) =>
  item.serviceAudits?.[category] ?? item.audit;

const serviceAuditMap = (
  item: CompanionService,
  fallback: CompanionService['audit'],
): Record<string, CompanionService['audit']> =>
  Object.fromEntries(serviceCategories(item).map((category) => [category, fallback]));

const currentServiceAuditMap = (item: CompanionService): Record<string, CompanionService['audit']> =>
  Object.fromEntries(serviceCategories(item).map((category) => [category, serviceAudit(item, category)]));

const summarizeCompanionAudit = (item: CompanionService): CompanionService['audit'] => {
  const statuses = serviceCategories(item).map((category) => serviceAudit(item, category));
  if (statuses.length === 0) return item.audit;
  if (statuses.every((status) => status === '已移除')) return '已移除';
  if (statuses.some((status) => status === '已认证')) return '已认证';
  if (statuses.some((status) => status === '待审核')) return '待审核';
  return '已拒绝';
};

const defaultUserName = (userId: string): string => `默认用户${userId.slice(-4)}`;
const defaultAvatar = '';

function deviceLoginUserIds(state: AdminState, userId: string): string[] {
  return Array.from(new Set([userId, ...(state.linkedAccountIds[userId] ?? [])]));
}

function removeBanDimensions(user: AdminUser, dimensions: string[]): AdminUser {
  const bans = (user.bans ?? [])
    .map((ban) => ({
      ...ban,
      dimensions: ban.dimensions.filter((dimension) => !dimensions.includes(dimension)),
    }))
    .filter((ban) => ban.dimensions.length > 0);
  return { ...user, status: bans.length > 0 ? '冻结' as const : '正常' as const, bans };
}

export function adminReducer(state: AdminState, action: AdminAction): AdminState {
  switch (action.type) {
    case 'ASSET_ADJUST': {
      const { userIds, asset, delta, operator, reason } = action.payload;
      let seq = state.seq;
      const newLedgers: LedgerRow[] = [];
      const newOps: AssetOperation[] = [];
      const time = nowTime();

      const users = state.users.map((user) => {
        if (!userIds.includes(user.id)) return user;
        const balanceKey = asset === '金币' ? 'coins' : 'diamonds';
        const nextBalance = user[balanceKey] + delta;
        seq += 1;
        newLedgers.push({
          id: `L${seq}`,
          time,
          userId: `${user.id} / ${user.name}`,
          type: delta >= 0 ? 'admin_add' : 'admin_reduce',
          asset,
          amount: delta,
          balanceAfter: nextBalance,
          reference: `SYS-ADJ-${seq}`,
        });
        newOps.push({
          id: `AO${seq}`,
          time,
          userId: user.id,
          asset,
          amount: `${delta >= 0 ? '+' : ''}${delta}`,
          operator,
          reason,
          status: '已完成',
        });
        return { ...user, [balanceKey]: nextBalance };
      });

      return {
        ...state,
        users,
        ledgers: [...newLedgers, ...state.ledgers],
        assetOps: [...newOps, ...state.assetOps],
        seq,
      };
    }

    case 'VOUCHER_GRANT': {
      const { userIds, count, value, operator, reason } = action.payload;
      let seq = state.seq;
      const time = nowTime();
      const newOps = userIds.map((userId) => {
        seq += 1;
        return {
          id: `AO${seq}`,
          time,
          userId,
          asset: '代金券' as const,
          amount: `+${count} 张 (${value} 金币/张)`,
          operator,
          reason,
          status: '已完成' as const,
        };
      });
      return { ...state, assetOps: [...newOps, ...state.assetOps], seq };
    }

    case 'WITHDRAW_REVIEW': {
      const { id, decision } = action.payload;
      const status = withdrawDecisionStatus[decision];
      const target = state.withdrawals.find((w) => w.id === id);
      if (!target || target.status !== '待审核') return state;
      const withdrawals = replaceById(state.withdrawals, id, (w) => ({ ...w, status }));

      // 审核通过时扣减用户钻石并记一条提现流水。
      if (decision === '审核通过') {
        let seq = state.seq + 1;
        const users = state.users.map((user) =>
          user.id === target.userId
            ? { ...user, diamonds: Math.max(0, user.diamonds - target.diamonds) }
            : user,
        );
        const ledger: LedgerRow = {
          id: `L${seq}`,
          time: nowTime(),
          userId: `${target.userId} / ${target.userName}`,
          type: 'withdraw_approved',
          asset: '钻石',
          amount: -target.diamonds,
          balanceAfter: Math.max(0, (users.find((u) => u.id === target.userId)?.diamonds ?? 0)),
          reference: target.orderId,
        };
        return { ...state, withdrawals, users, ledgers: [ledger, ...state.ledgers], seq };
      }
      return { ...state, withdrawals };
    }

    case 'USER_BAN': {
      const { userId, dimensions, modules, reason } = action.payload;
      const deviceUserIds = dimensions.includes('设备') ? deviceLoginUserIds(state, userId) : [userId];
      const users = state.users.map((user) =>
        deviceUserIds.includes(user.id)
          ? (() => {
              const appliedDimensions = user.id === userId ? dimensions : dimensions.filter((dimension) => dimension === '设备');
              if (appliedDimensions.length === 0) return user;
              return {
                ...user,
                status: '冻结' as const,
                bans: [
                  ...(user.bans ?? []),
                  { dimensions: appliedDimensions, modules, reason: reason ?? '', bannedAt: nowTime() },
                ],
              };
            })()
          : user,
      );
      return { ...state, users };
    }

    case 'USER_UNBAN': {
      const deviceUserIds = action.payload.dimensions.includes('设备') ? deviceLoginUserIds(state, action.payload.userId) : [action.payload.userId];
      const users = state.users.map((user) =>
        deviceUserIds.includes(user.id)
          ? (() => {
              const dimensionsToRemove = user.id === action.payload.userId
                ? action.payload.dimensions
                : action.payload.dimensions.filter((dimension) => dimension === '设备');
              return removeBanDimensions(user, dimensionsToRemove);
            })()
          : user,
      );
      return { ...state, users };
    }

    case 'USER_FIELD_UPDATE': {
      const { userId, field, value } = action.payload;
      const users = state.users.map((user) =>
        user.id === userId ? { ...user, [field]: value } : user,
      );
      return { ...state, users };
    }

    case 'USER_FIELD_DELETE': {
      const { userId, field } = action.payload;
      const users = state.users.map((user) => {
        if (user.id !== userId) return user;
        if (field === 'name') return { ...user, name: defaultUserName(user.id) };
        if (field === 'avatar') return { ...user, avatar: defaultAvatar };
        return { ...user, [field]: '' };
      });
      return { ...state, users };
    }

    case 'COMPANION_REVIEW': {
      const { id, action: act, serviceCategory, service, price } = action.payload;
      const nextAudit: CompanionService['audit'] | undefined = act === '审核通过'
        ? '已认证'
        : act === '审核驳回'
          ? '已拒绝'
          : act === '移除陪玩'
          ? '已移除'
          : undefined;
      let nextCompanionAudit: CompanionService['audit'] | undefined;
      const companionServices = replaceById(state.companionServices, id, (item): CompanionService => {
        if (nextAudit && serviceCategory && nextAudit !== '已移除') {
          if (serviceAudit(item, serviceCategory) !== '待审核') return item;
          const updatedItem: CompanionService = {
            ...item,
            serviceAudits: {
              ...currentServiceAuditMap(item),
              [serviceCategory]: nextAudit,
            },
          };
          nextCompanionAudit = summarizeCompanionAudit(updatedItem);
          return { ...updatedItem, audit: nextCompanionAudit };
        }
        if (nextAudit) {
          const serviceAudits = serviceAuditMap(item, nextAudit);
          nextCompanionAudit = nextAudit;
          return { ...item, audit: nextAudit, serviceAudits };
        }
        return { ...item, service: service ?? item.service, price: price ?? item.price };
      });
      const companionStats = nextCompanionAudit
        ? replaceById(state.companionStats, id, (item): CompanionStat => ({ ...item, audit: nextCompanionAudit }))
        : state.companionStats;
      return { ...state, companionServices, companionStats };
    }

    case 'COMPANION_ADD': {
      const { userId } = action.payload;
      if (state.companionServices.some((item) => item.id === userId)) return state;
      const user = state.users.find((item) => item.id === userId);
      if (!user) return state;
      const companion: CompanionService = {
        id: user.id,
        name: user.name,
        audit: '已认证',
        service: '语音聊天',
        price: '60 金币/30分钟',
        level: '待评定',
        rank: '待补充',
        platform: user.device.split(' / ')[0] || '待补充',
        positions: '待补充',
        style: '待补充',
        screenshots: ['运营手动添加'],
        voice: '待上传',
        serviceItems: [
          { category: '语音聊天', name: '基础陪聊', price: '60 金币/30分钟' },
        ],
      };
      const companionStat: CompanionStat = {
        id: user.id,
        name: user.name,
        services: 1,
        completed: 0,
        disputes: 0,
        rating: '待积累',
        orderIncome: 0,
        giftIncome: 0,
        visitors: 0,
        audit: '已认证',
      };
      const users = state.users.map((item) => item.id === user.id ? { ...item, role: '陪玩' as const } : item);
      return {
        ...state,
        users,
        companionServices: [companion, ...state.companionServices],
        companionStats: [companionStat, ...state.companionStats],
      };
    }

    case 'DISPUTE_RESOLVE': {
      const { id, refundCoins, deductDiamonds } = action.payload;
      const dispute = state.disputes.find((d) => d.id === id);
      const disputes = replaceById(state.disputes, id, (d): DisputeOrder => ({ ...d, status: '已处理' }));
      let users = state.users;
      const ledgers = [...state.ledgers];
      let seq = state.seq;

      if (dispute) {
        // 关联订单置为已取消（纠纷判责后结清）。
        const orders = state.orders.map((o) =>
          o.id === dispute.orderId ? { ...o, status: '已取消' as const } : o,
        );
        users = users.map((user) => {
          if (user.id === dispute.userId && refundCoins > 0) {
            return { ...user, coins: user.coins + refundCoins };
          }
          if (user.id === dispute.epalId && deductDiamonds > 0) {
            return { ...user, diamonds: Math.max(0, user.diamonds - deductDiamonds) };
          }
          return user;
        });
        if (refundCoins > 0) {
          seq += 1;
          ledgers.unshift({
            id: `L${seq}`,
            time: nowTime(),
            userId: `${dispute.userId} / ${dispute.userName}`,
            type: 'dispute_refund',
            asset: '金币',
            amount: refundCoins,
            balanceAfter: users.find((u) => u.id === dispute.userId)?.coins ?? refundCoins,
            reference: dispute.orderId,
          });
        }
        return { ...state, disputes, orders, users, ledgers, seq };
      }
      return { ...state, disputes };
    }

    case 'RISK_HANDLE': {
      const { id, ban } = action.payload;
      const hit = state.riskHits.find((r) => r.id === id);
      const riskHits = replaceById(state.riskHits, id, (r) => ({ ...r, handled: true }));
      let users = state.users;
      if (ban && hit) {
        users = users.map((user) =>
          user.id === hit.userId ? { ...user, status: '冻结' as const } : user,
        );
      }
      return { ...state, riskHits, users };
    }

    default:
      return state;
  }
}

/** 由 store 实时计算财务大盘（docx §3 大盘数据）。 */
export function selectFinanceMetric(state: AdminState) {
  const completed = state.orders.filter((o) => o.status === '已完成');
  return {
    totalRechargeCoins: state.rechargeRecords.reduce((sum, r) => sum + r.coinsTotal, 0),
    rechargeUsers: new Set(state.rechargeRecords.map((r) => r.userId)).size,
    orderUsers: new Set(state.orders.map((o) => o.userId)).size,
    completedOrders: completed.length,
    completedOrderCoins: completed.reduce((sum, o) => sum + o.total, 0),
    giftCoins: state.ledgers
      .filter((l) => l.asset === '礼物')
      .reduce((sum, l) => sum + Math.abs(l.amount), 0),
    diamondIncome: state.ledgers
      .filter((l) => l.asset === '钻石' && l.amount > 0)
      .reduce((sum, l) => sum + l.amount, 0),
    platformCoinBalance: state.users.reduce((sum, u) => sum + u.coins, 0),
    platformDiamondBalance: state.users.reduce((sum, u) => sum + u.diamonds, 0),
  };
}

/** 提现总美金（派生）。 */
export const selectWithdrawUsd = (state: AdminState): number =>
  state.withdrawals.reduce((sum, w) => sum + diamondsToUsd(w.diamonds), 0);
