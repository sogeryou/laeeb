import { useContext } from 'react';
import { AdminStoreContext } from './AdminStoreContext';

/** 读写后台业务 store。必须置于 AdminStoreProvider 内。 */
export function useAdminStore() {
  const ctx = useContext(AdminStoreContext);
  if (!ctx) {
    throw new Error('useAdminStore 必须在 AdminStoreProvider 内使用');
  }
  return ctx;
}
