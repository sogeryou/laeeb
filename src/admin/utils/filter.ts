import type { DateRange } from '../types';

/** 关键字匹配指定字段（不区分大小写）。 */
export function matchKeyword<T>(row: T, keys: (keyof T)[], keyword?: string): boolean {
  const kw = keyword?.trim().toLowerCase();
  if (!kw) return true;
  return keys.some((key) => String(row[key] ?? '').toLowerCase().includes(kw));
}

/** 精确/包含字段匹配（type、status 等下拉筛选；"全部"或空视为不筛选）。 */
export function matchField<T>(row: T, key: keyof T, value?: string): boolean {
  if (!value || value === '全部') return true;
  return String(row[key] ?? '').toLowerCase().includes(value.trim().toLowerCase());
}

/**
 * 时间区间匹配。row 的时间字符串与 range（datetime-local 或日期）做字典序比较，
 * 统一抹平空格/T 分隔后比较前缀，适配 "YYYY-MM-DD HH:mm" 与 "YYYY-MM-DDTHH:mm:ss"。
 */
export function matchDateRange(time: string, range?: DateRange): boolean {
  if (!range || (!range.start && !range.end)) return true;
  const normalized = time.replace('T', ' ').replace(/\(UTC[^)]*\)/, '').trim();
  const start = range.start?.replace('T', ' ').trim();
  const end = range.end?.replace('T', ' ').trim();
  if (start && normalized < start) return false;
  if (end && normalized > end) return false;
  return true;
}

/** 解析批量 ID 输入（逗号/分号/空白/换行分隔，去重去空）。 */
export function parseIdList(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[\s,，;；]+/)
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  );
}
