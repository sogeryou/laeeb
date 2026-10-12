import type { CompanionApplication, SubmitCompanionApplication } from '@shared/companionApplications';

export type ApplicationDraft = {
  gameId: string; rank: string; mainPosition: string; server: string; platform: string;
  style: string; intro: string; coverIntro: string; serviceName: string; price: number; unit: string;
};

export function canEnterPlayerCenter(role: string, status: string) {
  return role === 'PLAYER' && status === 'APPROVED';
}

export function newApplicationAttempt() {
  return crypto.randomUUID();
}

export function isValidApplicationPrice(value: number) {
  const cents = value * 100;
  return Number.isFinite(value) && value > 0 && value <= 500
    && Number.isSafeInteger(Math.round(cents)) && Math.abs(cents - Math.round(cents)) < 1e-7;
}

export function legacyDetailsToDraft<T extends ApplicationDraft>(
  draft: T,
  gameId: string | undefined,
  serviceName: string | null,
  details: { rank: string; platform: string; style: string; price: string; discount: string },
): T {
  const price = Number(details.price);
  return {
    ...draft,
    gameId: gameId || draft.gameId,
    serviceName: serviceName || draft.serviceName,
    rank: details.rank.trim() || draft.rank,
    platform: details.platform.trim() || draft.platform,
    style: details.style.trim() || draft.style,
    price: isValidApplicationPrice(price) ? price : draft.price,
  };
}

export function applicationPayload(draft: ApplicationDraft, gameName: string, requestId: string): SubmitCompanionApplication {
  const details = Object.fromEntries((['gameId', 'rank', 'mainPosition', 'server', 'platform', 'style', 'coverIntro', 'serviceName'] as const)
    .filter(key => draft[key].trim())
    .map(key => [key, draft[key].trim()]));
  if (draft.serviceName.trim()) details.unit = draft.unit === 'Hour' ? 'hr' : 'match';
  return { gameName, intro: draft.intro.trim(), hourlyRate: draft.price, requestId, details };
}

export function draftFromApplication(application: CompanionApplication): Partial<ApplicationDraft> {
  const details = application.details;
  return {
    gameId: details.gameId || '', rank: details.rank || '', mainPosition: details.mainPosition || '',
    server: details.server || '', platform: details.platform || '', style: details.style || '',
    intro: application.intro, coverIntro: details.coverIntro || '', serviceName: details.serviceName || '',
    price: application.hourlyRate, unit: details.unit === 'hr' ? 'Hour' : 'Game',
  };
}
