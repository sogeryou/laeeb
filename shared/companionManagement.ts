import { z } from 'zod';

const price = z.number().finite().positive().max(10000).refine(value => Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-7, 'Price must have at most two decimal places');
const service = z.object({
  id: z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(1).max(100),
  unitPrice: price,
  unit: z.enum(['hr', 'match']),
}).strict();

export const UpdateCompanionProfileSchema = z.object({
  gameName: z.string().trim().min(1).max(100),
  intro: z.string().trim().min(1).max(2000),
  hourlyRate: price,
  updatedAt: z.number().int().nonnegative().safe(),
  services: z.array(service).max(20),
}).strict();

export type CompanionService = { id: string; name: string; unitPrice: number; unit: 'hr' | 'match' };
export type UpdateCompanionProfile = { gameName: string; intro: string; hourlyRate: number; updatedAt: number; services: CompanionService[] };
export type ManagedCompanionProfile = {
  id: string;
  userId: string;
  gameName: string;
  intro: string;
  hourlyRate: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  availability: 'ONLINE' | 'OFFLINE' | 'BUSY';
  updatedAt: number;
  services: CompanionService[];
};
