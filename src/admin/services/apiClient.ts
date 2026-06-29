import { API_BASE_URL, USE_MOCK } from '../config';

/**
 * 真实后端访问封装（USE_MOCK=false 时启用）。
 *
 * 当前演示阶段：所有数据来自内存 store（由 src/admin/mock 注入），写操作经 store/reducer 完成，
 * 因此本客户端尚未被调用。真实接入步骤见 src/admin/mock/README.md。
 */
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (USE_MOCK) {
    // [MOCK] 演示阶段不应走真实网络；命中此处说明遗漏了 store 分支。
    throw new Error(`[apiClient] USE_MOCK 模式下不应调用真实接口：${method} ${path}`);
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`[apiClient] ${method} ${path} 失败：${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
};
