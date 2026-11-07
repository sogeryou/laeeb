# MVP 技术基础修复 Implementation Plan

> **For agentic workers:** Use subagent-driven-development to implement this plan task-by-task. Steps use checkbox tracking. The user has already authorized agents, testing, and autonomous engineering fixes; do not ask again for routine engineering choices.

**Goal:** 建立可核对的交付基线，修复数据加载失败回退空库及管理员角色越权，并提供独立复审和测试证据。

**Architecture:** 复用完整隔离 checkout `/private/tmp/laeeb-auth-composer-20261021-FgZeQ4/repo`，从 `fa4a54c` 开始。保持现有 JSON 迁移和 Express 路由架构，仅修复明确缺陷。原工作目录先做差异清单，整合前保护用户文件。

**Tech Stack:** TypeScript、Express、Vitest、Supertest、Node.js fs、现有 React 客户端。

## Global Constraints

- 不改变用户已确认的资金比例、订单状态和原有视觉设计。
- 核心业务规则和业务边界由用户确认；本计划仅实施明确技术缺陷。
- 不读取或修改真实业务存储、真实账号、真实支付、生产环境。
- 保留原目录所有已有修改及 `backend/routes/auth 2.ts`；禁止 reset、clean 或覆盖不明来源差异。
- 使用现有依赖；Node 路径 `/Users/soger/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`。
- 每个修复先复现再修复；针对性测试通过后独立复审，整合阶段运行一次完整测试与类型检查。
- 开发 agent 仅编辑任务指定源文件与测试，不操作索引/提交/推送；主 agent 负责提交和进度表。
- 本批不发布 GitHub 或部署；外部渠道和未确认业务规则保持待处理状态。

## Task 0: M00 基线差异核对（只读）

**Inputs:** 原目录 `/Users/soger/Documents/New project/Le3eb_Club` 与完整 checkout `/private/tmp/laeeb-auth-composer-20261021-FgZeQ4/repo`。
**Output:** `.superpowers/mvp/baseline-report.md` 位于完整 checkout；报告 git HEAD、原目录脏文件与完整版本差异、可安全整合的明确文件清单和冲突/读取问题。

- [x] 查看两个目录 git 状态、提交范围和未跟踪文件。
- [x] 仅对开发涉及的源文件和测试逐一比较；不遍历 node_modules、数据、媒体或读取密钥。
- [x] 区分完全相同、原目录缺少后续已测试修改、原目录独有修改、无法确定四类。
- [x] 不修改源码、不建分支、不提交，提交报告给主 agent 决定整合。

## Task 1: M06 存储加载失败保护

**Files:** 修改 `backend/state/jsonState.ts`；扩展 `tests/unit/auth-storage.spec.ts`。报告 `.superpowers/mvp/storage-report.md`。

**Interface:** 保持 `loadState(): PersistedState`、`saveState(state): void`、`migrateState(raw, isProduction?)` 现有导出。现有数据文件读取/解析/迁移/保存失败时抛出错误，调用方启动失败；不得返回 `defaultState()`。仅确认文件不存在的新安装才初始化。保留既有原子写入行为。

**Required tests:**

```ts
// 在现有 setup() 创建的独立临时目录中测试，禁止生产数据。
it('does not replace an existing corrupt snapshot', async () => {
  const { loadState, file } = await setup();
  fs.writeFileSync(file, '{broken');
  expect(() => loadState()).toThrow();
  expect(fs.readFileSync(file, 'utf8')).toBe('{broken');
});
it('initializes a genuinely missing snapshot', async () => {
  const { loadState, file } = await setup();
  const state = loadState();
  expect(fs.existsSync(file)).toBe(true);
  expect(JSON.parse(fs.readFileSync(file, 'utf8')).schemaVersion).toBe(state.schemaVersion);
});
```

还需以独立测试覆盖：既有合法快照成功读取且余额不丢失；读取权限失败不初始化；迁移保存/rename失败保留旧字节并抛错；JSON根为null/数组/字符串不应被当作空库迁移；未来不支持的schema版本拒绝启动、不降级覆盖。兼容既有合法旧schema迁移。

- [x] 添加行为测试，运行观察预期失败：`node node_modules/vitest/vitest.mjs run tests/unit/auth-storage.spec.ts --maxWorkers=1 --minWorkers=1`。
- [x] 最小修复：读取错误传播；只有 ENOENT 才初始化；解析根与schema兼容性检查后迁移；迁移保存失败传播。禁止 catch 后 fallback default。
- [x] 同一命令运行通过；检查原有迁移与原子写入用例继续通过。
- [x] 输出 RED/GREEN 命令、关键结果、修改清单和风险到报告；等待独立复审。

## Task 2: M05 管理员角色越权

**Files:** 修改 `backend/server.ts` 中 `/api/admin/users/:id/role-template`；必要时新增聚焦授权模块；新增 `tests/integration/admin-role-authorization.spec.ts`。报告 `.superpowers/mvp/admin-role-report.md`。

**Interface:** 路由、成功响应和合法模板不变。仅 `role === 'ADMIN' && adminRoleTemplate === 'SUPER_ADMIN'` 的当前服务端用户允许分配管理员模板；不能只依赖客户端字段或宽泛的 ADMIN 角色。其他管理员返回403且不修改用户、权限或审计成功记录。无身份继续401，非管理员继续403。目标不存在404、非管理员400、非法模板400保持现有契约。

```ts
// 放在现有 authMiddleware、requireAdmin() 之后，目标修改之前。
const actor = (req as any).authUser as UserEntity;
if (actor.adminRoleTemplate !== 'SUPER_ADMIN') {
  return sendError(res, 403, 'AUTH_SUPER_ADMIN_ONLY', 'Super admin only');
}
```

**Required behavioral cases:** CONTENT_ADMIN、RISK_ADMIN、FINANCE_ADMIN 分别对自己与另一管理员请求 SUPER_ADMIN 均403且原权限未变化；SUPER_ADMIN 有效授权成功、审计存在；请求体伪造actor权限不能绕过；匿名/普通用户失败；非法模板不导致写入。使用实际 Express 路由和隔离数据的 Supertest 请求；不以源码字符串包含代替行为测试。若 server 启动接口难以隔离，先报告具体依赖，再选择最小抽取，不重复整套应用。

- [x] 写测试并验证原接口允许越权的失败结果。
- [x] 增加服务端授权检查，不扩展业务功能。
- [x] 运行新增测试及与授权相关既有集成测试。
- [x] 报告证据；独立复审确认需求和代码质量。

## Task 3: 整合验证与进度同步

- [x] 主 agent 检查每个 diff 和独立复审结果，修复所有严重项。
- [x] 运行 `node node_modules/vitest/vitest.mjs run --maxWorkers=1 --minWorkers=1` 与 `node node_modules/typescript/bin/tsc --noEmit`；本批修改引发的失败自行修复。
- [x] 对照 M00 清单，仅整合确定归属的代码；无法确认的用户修改保留并记录，不覆盖。
- [x] 更新 `docs/mvp/2026-10-22-progress.md` 中任务状态、测试证据、未解决依赖，用户可直接查看。

本计划不把整项目标记为完成；资金、举报、产品范围等另按用户确认结果进入后续计划。
