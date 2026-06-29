/** 将单元格值转义为 CSV 安全字符串。 */
function escapeCell(value: unknown): string {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * 通用 CSV 导出。columns 为表头，rows 为与表头同序的字符串/数字二维数组。
 * 浏览器端触发下载，带 UTF-8 BOM 以兼容 Excel 中文。
 */
export function exportCsv(filename: string, columns: string[], rows: (string | number)[][]): void {
  const header = columns.map(escapeCell).join(',');
  const body = rows.map((row) => row.map(escapeCell).join(',')).join('\n');
  const csv = `\uFEFF${header}\n${body}`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
