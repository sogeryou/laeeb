type Row = Record<string, unknown>;
type Locator = { collection: string; index?: number };
type Finding = { code: string; severity: 'REVIEW' | 'ERROR'; locations: Locator[] };
const record = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);
const id = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);

/** Inventory only. No ledger sum can establish balances or external payment. */
export function analyzeFinanceSnapshot(input: unknown) {
  const findings: Finding[] = [];
  const counts: Record<string, number | null> = {};
  const add = (code: string, collection: string, index?: number, severity: Finding['severity'] = 'ERROR') => findings.push({ code, severity, locations: [{ collection, ...(index === undefined ? {} : { index }) }] });
  const root = record(input) ? input : {};
  if (!record(input)) add('INVALID_ROOT', 'root');
  const rows: Record<string, { row: Row; index: number }[]> = {};
  const ids: Record<string, Map<string, number>> = {};
  for (const collection of ['users', 'orders', 'withdrawalRequests', 'walletTransactions']) {
    const value = root[collection]; rows[collection] = []; ids[collection] = new Map();
    counts[collection] = Array.isArray(value) ? value.length : null;
    if (!Array.isArray(value)) { add('INVALID_COLLECTION', collection); continue; }
    value.forEach((row, index) => {
      if (!record(row)) { add('INVALID_ROW', collection, index); return; }
      rows[collection].push({ row, index });
      if (!id(row.id)) add('INVALID_ID', collection, index);
      else ids[collection].set(row.id, (ids[collection].get(row.id) ?? 0) + 1);
    });
    for (const { row, index } of rows[collection]) if (id(row.id) && ids[collection].get(row.id)! > 1) add('DUPLICATE_ID', collection, index);
  }
  for (const collection of ['wallets', 'diamondWallets']) {
    const value = root[collection]; counts[collection] = record(value) ? Object.keys(value).length : null;
    if (!record(value)) { add('INVALID_COLLECTION', collection); continue; }
    Object.entries(value).forEach(([key, row], index) => {
      if (!record(row)) { add('INVALID_ROW', collection, index); return; }
      if (!integer(row.balance) || row.balance < 0) add('INVALID_BALANCE', collection, index);
      if (!id(row.userId) || row.userId !== key) add('WALLET_OWNER_MISMATCH', collection, index);
      if (id(row.userId) && !ids.users.has(row.userId)) add('ORPHAN_WALLET_OWNER', collection, index);
      if (id(row.userId) && (ids.users.get(row.userId) ?? 0) > 1) add('AMBIGUOUS_WALLET_OWNER', collection, index);
    });
  }
  for (const { row, index } of rows.orders) {
    if (typeof row.totalPrice !== 'number' || !Number.isFinite(row.totalPrice) || row.totalPrice < 0 || Math.abs(row.totalPrice) > Number.MAX_SAFE_INTEGER) add('INVALID_ORDER_AMOUNT', 'orders', index);
    else if (!Number.isInteger(row.totalPrice)) add('FRACTIONAL_ORDER_AMOUNT', 'orders', index, 'REVIEW');
  }
  const debits = new Map<string, { row: Row; index: number }[]>();
  for (const entry of rows.walletTransactions) {
    const { row, index } = entry;
    const transactionTypes = ['RECHARGE', 'ORDER_PAY', 'REFUND', 'ADMIN_ADJUST', 'EXCHANGE', 'WITHDRAW', 'INCOME', 'GIFT_PAY'];
    if (typeof row.type !== 'string' || !transactionTypes.includes(row.type)) add('INVALID_TRANSACTION_TYPE', 'walletTransactions', index);
    if (Object.hasOwn(row, 'userId') && !id(row.userId)) add('INVALID_TRANSACTION_OWNER', 'walletTransactions', index);
    if (Object.hasOwn(row, 'referenceId') && !id(row.referenceId)) add('INVALID_TRANSACTION_REFERENCE', 'walletTransactions', index);
    if (row.type === 'WITHDRAW') {
      if (!Object.hasOwn(row, 'userId')) add('UNATTRIBUTED_WITHDRAWAL_OWNER', 'walletTransactions', index, 'REVIEW');
      if (!Object.hasOwn(row, 'referenceId')) add('UNATTRIBUTED_WITHDRAWAL_REFERENCE', 'walletTransactions', index, 'REVIEW');
    }
    if (typeof row.amount !== 'number' || !Number.isFinite(row.amount) || Math.abs(row.amount) > Number.MAX_SAFE_INTEGER) add('INVALID_TRANSACTION_AMOUNT', 'walletTransactions', index);
    if (row.type === 'WITHDRAW' && id(row.referenceId)) {
      const list = debits.get(row.referenceId) ?? []; list.push(entry); debits.set(row.referenceId, list);
    }
  }
  const pending = new Map<string, number>();
  for (const { row, index } of rows.withdrawalRequests) {
    const c = 'withdrawalRequests';
    if (!id(row.userId) || !ids.users.has(row.userId)) add('ORPHAN_WITHDRAWAL_OWNER', c, index);
    if (typeof row.status !== 'string' || !['PENDING', 'APPROVED', 'REJECTED'].includes(row.status)) add('UNKNOWN_WITHDRAWAL_STATUS', c, index);
    if (!integer(row.diamondAmount) || row.diamondAmount <= 0) add('INVALID_WITHDRAWAL_AMOUNT', c, index);
    if (row.status === 'APPROVED') add('APPROVED_PAYMENT_CONFIRMATION_REQUIRED', c, index, 'REVIEW');
    if (row.status === 'PENDING' && id(row.userId)) pending.set(row.userId, (pending.get(row.userId) ?? 0) + 1);
    const candidates = id(row.id) ? debits.get(row.id) ?? [] : [];
    const ambiguous = !id(row.id) || ids.withdrawalRequests.get(row.id) !== 1 || !id(row.userId) || ids.users.get(row.userId) !== 1 || candidates.some(t => !id(t.row.id) || ids.walletTransactions.get(t.row.id) !== 1);
    if (ambiguous) { add('AMBIGUOUS_WITHDRAWAL_JOIN', c, index, 'REVIEW'); continue; }
    for (const t of candidates) if (t.row.userId !== row.userId) add('CROSS_OWNER_REFERENCE_COLLISION', 'walletTransactions', t.index, 'REVIEW');
    const matching = candidates.filter(t => t.row.userId === row.userId && typeof t.row.amount === 'number' && t.row.amount < 0);
    if (row.status === 'APPROVED' && !matching.length) add('APPROVED_MISSING_DEBIT', c, index, 'REVIEW');
    if ((row.status === 'PENDING' || row.status === 'REJECTED') && matching.length) add('NON_APPROVED_WITHDRAWAL_DEBIT', c, index, 'REVIEW');
    if (matching.length > 1) add('DUPLICATE_WITHDRAWAL_DEBITS', c, index, 'REVIEW');
    for (const t of matching) if (!integer(row.diamondAmount) || t.row.amount !== -row.diamondAmount) add('WITHDRAWAL_DEBIT_AMOUNT_MISMATCH', 'walletTransactions', t.index, 'REVIEW');
  }
  for (const { row, index } of rows.withdrawalRequests) if (row.status === 'PENDING' && id(row.userId) && pending.get(row.userId)! > 1) add('MULTIPLE_PENDING_WITHDRAWALS', 'withdrawalRequests', index, 'REVIEW');
  return { reportVersion: 1 as const, scope: 'legacy-finance-inventory' as const, fullReconciliation: false as const, counts, findings, limitations: ['NO_CHAIN_PAYMENT_VERIFICATION', 'NO_CURRENCY_ATTRIBUTION', 'NO_OPENING_BALANCE_PROOF', 'NO_MIGRATION_APPROVAL'] };
}
