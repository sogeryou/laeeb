export type CompanionApplicationDetails = {
  gameId?: string;
  rank?: string;
  mainPosition?: string;
  server?: string;
  platform?: string;
  style?: string;
  coverIntro?: string;
  serviceName?: string;
  unit?: 'hr' | 'match';
};

export type SubmitCompanionApplication = {
  gameName: string;
  intro: string;
  hourlyRate: number;
  requestId?: string;
  details?: CompanionApplicationDetails;
};

export type CompanionApplication = {
  id: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  gameName: string;
  intro: string;
  hourlyRate: number;
  details: CompanionApplicationDetails;
  submittedAt: number;
  updatedAt: number;
  rejectionReason?: string;
  reviewedAt?: number;
};

export type CompanionApplicationResponse = { application: CompanionApplication | null };
