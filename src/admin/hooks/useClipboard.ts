import { useCallback } from 'react';
import { useToast } from '../components/Toast';

/** 复制文本到剪贴板并提示。 */
export function useClipboard() {
  const { toast } = useToast();
  return useCallback(
    async (value: string, label = '内容') => {
      try {
        await navigator.clipboard.writeText(value);
        toast(`已复制${label}`, 'success');
      } catch {
        toast('复制失败，请手动复制', 'error');
      }
    },
    [toast],
  );
}
