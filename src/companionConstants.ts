export const COMPANION_LEVELS = [
  { level: 1, name: 'Bronze', minPoints: 0, maxPoints: 199, decayRate: 0.02, minPrice: 20, maxPrice: 30, exposureBoost: '0%' },
  { level: 2, name: 'Silver', minPoints: 200, maxPoints: 399, decayRate: 0.04, minPrice: 30, maxPrice: 40, exposureBoost: '+5%' },
  { level: 3, name: 'Gold', minPoints: 400, maxPoints: 799, decayRate: 0.05, minPrice: 40, maxPrice: 60, exposureBoost: '+15%' },
  { level: 4, name: 'Platinum', minPoints: 800, maxPoints: 1499, decayRate: 0.06, minPrice: 50, maxPrice: 80, exposureBoost: '+30%' },
  { level: 5, name: 'Diamond', minPoints: 1500, maxPoints: 2499, decayRate: 0.07, minPrice: 60, maxPrice: 100, exposureBoost: '+50%' },
  { level: 6, name: 'Legend', minPoints: 2500, maxPoints: Infinity, decayRate: 0.08, minPrice: 80, maxPrice: 150, exposureBoost: '+100%' },
];

export interface TaskProgress {
  id: string;
  name: string;
  description: string;
  earnedPts: number;
  capPts: number;
  currentValue: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';
  type: 'ACTIVITY' | 'SERVICE';
  unit?: string;
  rate?: number;
}

export const INITIAL_PLAYER_RANKING = {
  level: 3,
  score: 540,
  justLeveledUpThisWeek: false,
  weeksWithoutOrder: 0,
  weeklyPointsBreakdown: {
    activity: 85,
    service: 120,
    decay: 27,
    penalty: 0
  },
  weeklyStats: {
    logins: 4,
    posts: 2,
    greetings: 15,
    responseRate: 0.92,
    acceptanceRate: 0.88,
    newUsersServed: 3,
    repeatUsersServed: 5,
    rating: 4.95,
    totalStars: 165,
    giftIncome: 150,
    totalIncome: 1200,
    noOrderWeeks: 0,
    consecutiveL1Weeks: 0,
  },
  status: 'ACTIVE' as const,
  nextLevelThreshold: 800,
  retainThreshold: 320,
};
