export function skipRequestLimit(path: string, production: boolean): boolean {
  return ['/healthz', '/ready', '/metrics'].includes(path) ||
    (!production && path !== '/api' && !path.startsWith('/api/'));
}
