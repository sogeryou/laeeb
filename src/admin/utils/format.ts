import { DIAMOND_TO_USD, OPS_TIMEZONE_LABEL } from '../config';

const numberFormatter = new Intl.NumberFormat('en-US');

/** 千分位格式化。 */
export const formatNumber = (value: number): string => numberFormatter.format(value);

/** 带正负号的数额（流水用）。 */
export const formatSigned = (value: number): string =>
  `${value > 0 ? '+' : ''}${formatNumber(value)}`;

/** 美金格式化。 */
export const formatUsd = (value: number): string => `$${value.toFixed(2)}`;

/** 钻石 → 美金。 */
export const diamondsToUsd = (diamonds: number): number => diamonds * DIAMOND_TO_USD;

/** 钻石(美金) 组合展示。 */
export const formatDiamondsWithUsd = (diamonds: number): string =>
  `${formatNumber(diamonds)} / ${formatUsd(diamondsToUsd(diamonds))}`;

/** 追加运营时区标注。 */
export const withOpsTz = (time: string): string =>
  time.includes('UTC') ? time : `${time}(${OPS_TIMEZONE_LABEL})`;

/** "U10082 / Lumina_Sky" → { id, name } */
export const splitParty = (value: string): { id: string; name: string } => {
  const [id = '', name = ''] = value.split('/').map((part) => part.trim());
  return { id, name };
};

/** 由服务名归类服务大类。 */
export const getServiceCategory = (service: string): string => {
  if (service.includes('Valorant')) return 'Valorant';
  if (service.includes('PUBG')) return 'PUBG Mobile';
  if (service.includes('League')) return 'League';
  if (service.includes('语音')) return '语音聊天';
  return service.split(' ')[0] || service;
};
