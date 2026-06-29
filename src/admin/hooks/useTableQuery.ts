import { useMemo, useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '../config';
import type { DateRange } from '../types';
import { matchDateRange, matchField, matchKeyword } from '../utils/filter';

interface TableQueryConfig<T> {
  /** 关键字搜索字段。 */
  searchKeys?: (keyof T)[];
  /** "类型" 下拉对应字段。 */
  typeKey?: keyof T;
  /** "状态" 下拉对应字段。 */
  statusKey?: keyof T;
  /** 时间区间对应字段。 */
  dateKey?: keyof T;
  /** 额外自定义谓词（如按选中用户过滤）。 */
  extra?: (row: T) => boolean;
  pageSize?: number;
}

/**
 * 通用列表查询：关键字搜索 + 类型/状态筛选 + 时间区间 + 分页。
 * 所有后台列表复用，避免重复样板逻辑。
 */
export function useTableQuery<T>(source: T[], config: TableQueryConfig<T> = {}) {
  const { searchKeys = [], typeKey, statusKey, dateKey, extra, pageSize = DEFAULT_PAGE_SIZE } = config;

  const [keyword, setKeywordRaw] = useState('');
  const [type, setTypeRaw] = useState('全部');
  const [status, setStatusRaw] = useState('全部');
  const [dateRange, setDateRangeRaw] = useState<DateRange>({});
  const [page, setPage] = useState(1);
  const [pageSizeState, setPageSizeState] = useState(pageSize);

  // 任一筛选条件变化时回到第一页。
  const setKeyword = (v: string) => { setKeywordRaw(v); setPage(1); };
  const setType = (v: string) => { setTypeRaw(v); setPage(1); };
  const setStatus = (v: string) => { setStatusRaw(v); setPage(1); };
  const setDateRange = (v: DateRange) => { setDateRangeRaw(v); setPage(1); };
  const setPageSize = (v: number) => { setPageSizeState(v); setPage(1); };
  const reset = () => {
    setKeywordRaw('');
    setTypeRaw('全部');
    setStatusRaw('全部');
    setDateRangeRaw({});
    setPage(1);
  };

  const filtered = useMemo(() => {
    return source.filter((row) => {
      if (!matchKeyword(row, searchKeys, keyword)) return false;
      if (typeKey && !matchField(row, typeKey, type)) return false;
      if (statusKey && !matchField(row, statusKey, status)) return false;
      if (dateKey && !matchDateRange(String(row[dateKey] ?? ''), dateRange)) return false;
      if (extra && !extra(row)) return false;
      return true;
    });
  }, [source, searchKeys, keyword, typeKey, type, statusKey, status, dateKey, dateRange, extra]);

  const total = filtered.length;
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * pageSizeState, page * pageSizeState),
    [filtered, page, pageSizeState],
  );

  return {
    keyword, setKeyword,
    type, setType,
    status, setStatus,
    dateRange, setDateRange,
    page, setPage,
    pageSize: pageSizeState, setPageSize,
    reset,
    filtered,
    pageItems,
    total,
  };
}
