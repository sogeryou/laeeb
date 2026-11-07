# 提现纯领域核心 v1 契约

## 本批次范围

新增 `backend/finance/withdrawalDomain.ts`，只提供纯函数、类型和稳定错误码；不读写文件、数据库、网络，不导入服务器，不触发转账。旧提现接口、旧策略、存储与 UI **均未切换**。未修改任何真实历史余额、订单或提现记录。本批次不代表线上提现已完成，亦不替代真实数据备份。

## 金额契约

`quoteWithdrawalUsd(usd: string)` 返回 `{ cents, diamondAmount, grossUsdt, platformFeeUsdt }`。

- 150 整数钻石 = 1 USD，最低 20 USD，步长 0.02 USD = 3 钻石，平台费为零。
- USD 必须是无符号的普通十进制字符串，整数部分至少一位，小数部分若存在必须为 1–2 位；拒绝空白、指数、NaN、Infinity、数字类型和隐式转换。允许前导零，输出 `grossUsdt` 统一为两位小数。
- 20 → 2000 美分 / 3000 钻石；20.02 → 2002 美分 / 3003 钻石。20.01 抛出 `INVALID_STEP`，`suggestions` 为 `['20.00', '20.02']`，从不自动选择。
- 先使用 BigInt 检查金额与整数钻石的安全表示，再转换为 Number。超出 `Number.MAX_SAFE_INTEGER` 的金额拒绝；这是表示边界，不是新增业务金额上限。
- `grossUsdt` 与 USD 1:1；`CONFIRM_PAID` 的 `actualChainFeeUsdt` 使用非负普通十进制字符串，必须严格小于 gross，可为零，不接受符号、指数、空白或省略整数部分。
- 实际净额 = gross − 实际链费。整数缩放精确相减，不依赖共享 Decimal 精度，不静默舍入。`payout.netUsdt` 去除末尾无意义零；实际链费保留调用方字符串。

## 公共调用

```ts
createWithdrawal({ id, userId, usd, address, now, wallet, existingTickets })
// -> { ticket, wallet }

transitionWithdrawal({ ticket, wallet, command, actor, now, expectedVersion })
// -> { ticket, wallet }
```

`Wallet = { available: number; frozen: number }` 两项均要求非负安全整数。创建从 available 转入 frozen，余额不足拒绝；冻结或释放溢出拒绝。每次活动票据转换前均检查 frozen 至少覆盖该票据金额。所有结果为新对象，历史事件复制，原输入在成功和失败时均不修改。

`Actor = { kind: 'owner' | 'finance'; userId: string }`。owner 必须等于票据 userId，且只能 CANCEL；finance 可以处理其余命令，不能代替用户取消。finance 是受信任调用方提供的能力标记，**不是 API 鉴权**。创建的 APPLY 事件归属于 userId；创建前的身份认证由调用方负责。

`schemaVersion: 1` 与乐观并发 `revision` 分离；创建 revision 为 0，此后每次加 1。`expectedVersion` 必须等于当前 revision。时间戳必须为非负安全整数且不得倒退（允许相等），单位须由接入层统一，建议 Unix 毫秒。

票据保存 id/userId/address/quote、状态、时间、revision 和追加式事件 `{ revision, at, actor, command }`。应用后无地址修改命令。运行时校验 schema、规范报价一致性、事件序列、身份、状态路径、时间和付款结果；无法通过结构校验的已有票据一律拒绝。结构自洽并不能证明记录真实性，不能把客户端提供的票据当可信账本。

## 状态与余额

| 当前状态 | 命令 | 结果 | 钱包变化 |
| --- | --- | --- | --- |
| 创建 | APPLY（内部事件） | PENDING_REVIEW | available −金额，frozen +金额 |
| PENDING_REVIEW | CANCEL（owner） | CANCELLED | frozen −金额，available +金额 |
| PENDING_REVIEW | REJECT(reason) | REJECTED | frozen −金额，available +金额 |
| PENDING_REVIEW | APPROVE | APPROVED_AWAITING_PAYMENT | 不变 |
| APPROVED_AWAITING_PAYMENT | MARK_UNKNOWN(reason) | PAYMENT_UNKNOWN | 保持冻结 |
| APPROVED_AWAITING_PAYMENT / PAYMENT_UNKNOWN | CONFIRM_PAID(actualChainFeeUsdt, paymentProof) | PAID | 只消耗本次金额的 frozen |
| APPROVED_AWAITING_PAYMENT / PAYMENT_UNKNOWN | CLOSE_UNPAID(nonpaymentEvidence) | CLOSED_UNPAID | frozen −金额，available +金额 |

reason、paymentProof、nonpaymentEvidence 必须为非空白文本。付款证明只是人工证据文本，不是链上核验。未知付款不能重新批准或自动重试。终态 PAID/CANCELLED/REJECTED/CLOSED_UNPAID 拒绝任何后续操作；不会发生第二次扣款/解冻。无付款后纠正、自动转账、重试或退款命令。

同用户的 PENDING_REVIEW / APPROVED_AWAITING_PAYMENT / PAYMENT_UNKNOWN 阻止新申请；其他用户的活动票据不阻止。终态允许使用新 id 重新申请；列表中重复 id 拒绝。

## 表示长度与错误

长度按 JavaScript 字符串 `.length` 计算：USD 最多 32；链费最多 128；id/userId（含 actor）最多 128；address 最多 512；reason/proof/evidence 最多 4096。这些是输入表示与资源保护界限，不是业务金额限制。地址在本层仅视为非空白不透明文本，**不校验 TRC20 网络或 checksum**。

`WithdrawalDomainError.code`：`INVALID_USD`、`BELOW_MINIMUM`、`INVALID_STEP`、`UNSAFE_AMOUNT`、`INVALID_INPUT`、`INVALID_WALLET`、`INSUFFICIENT_BALANCE`、`INSUFFICIENT_RESERVE`、`ACTIVE_TICKET`、`DUPLICATE_ID`、`INVALID_TICKET`、`FORBIDDEN`、`STALE_VERSION`、`TERMINAL_TICKET`、`INVALID_TRANSITION`、`INVALID_FEE`、`INVALID_COMMAND`。多个输入错误同时出现时不保证优先级；`INVALID_TICKET` 将存储记录的内部错误统一封装。

## 接入层必须承担的责任（本批次未实现）

受信任调用方必须提供与 `ticket.userId` 绑定的钱包，以及完整、权威、同一事务快照下的已有票据列表。聚合 frozen 足额并不能证明冻结款属于本票据：持久化适配器仍须记录逐票据 reserve、验证归属，并保留无关冻结款。

钱包、票据、审计事件、幂等键须通过持久化事务或等价的原子提交机制一起保存，并配合唯一活动票据约束、并发锁/CAS、请求幂等和付款证明唯一性。纯函数的 expectedVersion 不提供跨进程或重启幂等保护，也不能防止用旧快照并发调用。

后续仍需真实数据备份、迁移与对账、API 身份和财务权限验证、账户限制、地址与网络验证、外部付款核验、手动运营 UI、钱包刷新、线上启用与回滚方案。未具备这些条件前，不应将本模块视为可直接接入线上真实资金的完整提现系统。
