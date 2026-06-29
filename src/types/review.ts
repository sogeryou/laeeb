export type IncomeType = 'SERVICE' | 'GIFT' | 'TIP';

export interface IncomeRecord {
  id: string;
  type: IncomeType;
  amount: number; // Positive for income, negative for platform fees
  timestamp: number;
  userNickname: string; // Masked (e.g., "Jo***")
  isNewCustomer: boolean;
  rating?: number;
}

export interface Customer {
  id: string;
  nickname: string;
  avatar: string;
  tags: ('NEW' | 'REPEAT' | 'VIP')[]; // VIP: repeat >= 5
  servedThisWeek: boolean;
  totalOrders: number;
  totalSpend: number;
  localNote?: string; // Local persistence only
  lastServedAt: number;
}

export interface IcebreakerUser {
  id: string;
  nickname: string; // Masked (e.g., "Jo***")
  registerDuration: string; // e.g., "3 days"
  gameTags: string[];
  isActive: boolean;
}

export interface ReviewStats {
  totalDiamonds: number;
  serviceIncome: number;
  giftIncome: number;
  weeklyPoints: number;
  totalDiamondsChange: number; // Percentage
  serviceIncomeChange: number;
  giftIncomeChange: number;
  weeklyPointsChange: number;
}
