# LE3EB 运营后台（laeeb-backend）

LE3EB Club 关联的内部运营后台系统，供运营人员监控平台数据、管理账号资产、处理订单与提现、执行风控等日常工作。

当前为**演示阶段**：所有实时数据通过 Mock 后门以内存 store 形式提供，并预留了切换真实后端的开关，便于未来接入线上 API 后快速清理 Mock。

> 详细的设计与实施记录见仓库根目录的 `laeeb-backend-开发方案.md`。

---

## 技术栈

| 分类 | 选型 |
| --- | --- |
| 框架 | React 19 |
| 语言 | TypeScript 5.8 |
| 构建 | Vite 6 |
| 样式 | Tailwind CSS 4（`@tailwindcss/vite`） |
| 图标 | lucide-react |
| 图表 | recharts / d3 |
| 动效 | motion |
| 本地服务 | Express 4 + tsx（开发态由 Vite 中间件托管） |

## 架构设计

后台采用分层架构，自上而下单向依赖，便于维护与未来替换数据源：

```
UI 层（sections / components）
   ↓ 仅通过 hooks/dispatch 交互
状态层（AdminStore：Context + useReducer）
   ↓ 统一接口
服务层（services，受 USE_MOCK 开关控制）
   ├─ USE_MOCK=true  → Mock 层（src/admin/mock，内存数据）
   └─ USE_MOCK=false → 真实后端（services/apiClient）
```

核心约定：

- **Mock 后门**：所有 Mock 数据集中在 `src/admin/mock/`，由 `src/admin/config.ts` 的 `USE_MOCK` 总开关控制，相关代码统一打 `// [MOCK]` 标记。切换真实数据的 SOP 见 `src/admin/mock/README.md`。
- **内存状态**：`AdminStore` 用 `useReducer` 维护全量领域实体（用户、账目、订单、提现等）的内存快照，所有"写"操作都会真实改动数据并即时联动各模块 UI。
- **高复用**：通用能力抽象为可复用组件与 hooks（`DataTable`、`ModalShell`、`Toast`、`Fields`、`useTableQuery`、`useClipboard` 等），降低重复代码。
- **路由**：单页应用按路径分流（见 `src/main.tsx`）——`/admin` 进入运营后台，其余进入 C 端 Club 应用。

目录结构（`src/admin/`）：

```
admin/
├─ config.ts            # USE_MOCK 等运行时配置
├─ AdminApp.tsx         # 后台入口，挂载 Provider 与分区路由
├─ types/               # 领域类型定义（账号 / 操作 / 数据 / 风控 / 通用）
├─ store/               # AdminStore：actions、reducer、Context、hook
├─ services/            # 数据访问层（apiClient 真实后端占位）
├─ mock/                # [MOCK] 各领域 Mock 数据与 seed 聚合
├─ hooks/               # useTableQuery、useClipboard
├─ components/          # 可复用 UI：DataTable、ModalShell、Toast、Fields…
├─ utils/               # format / filter / csv / ui 工具
└─ sections/            # 业务分区
   ├─ accounts/         # 账号管理
   ├─ operations/       # 后台操作
   ├─ data/             # 数据系统
   └─ risk/             # 风控监控
```

## 功能设计

- **账号管理（accounts）**：用户检索、基础信息查看与字段编辑、封禁/解封（按维度与模块配置）、关联账号查看与跳转、账目与订单记录的筛选导出。
- **后台操作（operations）**
  - 资产管理：对用户金币/钻石/代金券进行校验、调整与操作留痕。
  - 提现审核：提现申请筛选与逐条审核处理。
  - 陪玩运营：陪玩审核、移除、服务项目与定价调整。
  - 订单纠纷：纠纷取证查看与裁决处理。
- **数据系统（data）**：充值/订单/提现/陪玩等数据表格（支持搜索、筛选、日期范围、分页、CSV 导出），财务总览指标、平台资产余额、充值与订单趋势图表。
- **风控监控（risk）**：风险命中列表监控与规则处置（含处理弹窗）。

通用表格能力（由 `useTableQuery` + `DataTable` 提供）：关键词搜索、字段筛选、日期范围过滤、排序、分页、带 UTF-8 BOM 的 CSV 导出（Excel 友好）。

## 本地运行调试

**前置要求**：Node.js 18+（推荐 20/22）。

1. 安装依赖：

```bash
npm install
```

2. 启动开发服务（Express + Vite 中间件，默认端口 `3000`）：

```bash
npm run dev
```

3. 在浏览器访问：

- 运营后台： http://localhost:3000/admin
- C 端 Club 应用： http://localhost:3000/

> 端口 3000 被占用时，先结束占用进程或修改 `server.ts` 中的 `PORT` 再启动。

### 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器（热更新） |
| `npm run lint` | 仅做 TypeScript 类型检查（`tsc --noEmit`） |
| `npm run build` | 生产构建（Vite 打包 + 构建 Node 服务） |
| `npm run start` | 运行生产构建产物 |
| `npm run preview` | 预览 Vite 构建结果 |

### 切换真实后端（未来接入）

数据源由 `src/admin/config.ts` 的 `USE_MOCK` 控制，可用环境变量覆盖：

```bash
# .env.local
VITE_USE_MOCK=false               # 关闭 Mock，走真实后端
VITE_API_BASE_URL=/api/admin      # 真实后端基址
```

关闭 Mock 后，数据访问会走 `src/admin/services/apiClient.ts`。完整的 Mock 清理步骤参见 `src/admin/mock/README.md`。
