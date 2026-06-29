/**
 * 运营后台运行时配置。
 *
 * USE_MOCK 是 Mock 后门的总开关：
 *   - true  → 数据全部来自 src/admin/mock 注入的内存 store（演示 / 当前阶段）
 *   - false → 走 services/apiClient 调用真实后端（未来接入）
 *
 * 切换真实数据 SOP 见 src/admin/mock/README.md。
 */
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const USE_MOCK = (env.VITE_USE_MOCK ?? 'true') !== 'false'; // [MOCK] 默认开启

/** 真实后端基址（USE_MOCK=false 时生效）。 */
export const API_BASE_URL = env.VITE_API_BASE_URL ?? '/api/admin';

/** 平台运营所在时区标注（中东/土耳其 UTC+3）。 */
export const OPS_TIMEZONE_LABEL = 'UTC+3';

/** 钻石 → 美金 换算比例（100 钻 = 1 美金）。 */
export const DIAMOND_TO_USD = 0.01;

/** 列表默认分页大小。 */
export const DEFAULT_PAGE_SIZE = 10;
