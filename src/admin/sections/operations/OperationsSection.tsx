import { AssetManagementPanel } from './AssetManagementPanel';
import { CompanionOpsPanel } from './CompanionOpsPanel';
import { OrderDisputePanel } from './OrderDisputePanel';
import { WithdrawalReviewPanel } from './WithdrawalReviewPanel';

export const operationTabs = ['资产管理', '提现审核', '陪玩管理', '订单管理'] as const;
export type OperationTab = (typeof operationTabs)[number];

/** 后台操作管理（docx §2）。 */
export function OperationsSection({ activeTab }: { activeTab: OperationTab }) {
  return (
    <section className="space-y-5">
      {activeTab === '资产管理' && <AssetManagementPanel />}
      {activeTab === '提现审核' && <WithdrawalReviewPanel />}
      {activeTab === '陪玩管理' && <CompanionOpsPanel />}
      {activeTab === '订单管理' && <OrderDisputePanel />}
    </section>
  );
}
