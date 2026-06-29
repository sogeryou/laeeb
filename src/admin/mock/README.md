# Mock 后门 —— 清理与真实接入说明

本目录承载运营后台**全部演示用 Mock 数据**，与业务/UI 代码物理隔离。
切换到真实后端时按以下 SOP 清理，UI 层无需改动。

## 总开关

`src/admin/config.ts` 中的 `USE_MOCK`（由环境变量 `VITE_USE_MOCK` 驱动，缺省 `true`）：

- `true`  → store 由 `createMockSeed()` 注入本目录数据
- `false` → 走 `src/admin/services/apiClient.ts` 调用真实后端

## 真实接入 SOP

1. 在 `src/admin/services/apiClient.ts` 实现各后端 endpoint。
2. 在 `src/admin/services/*Service.ts` 中把 `USE_MOCK` 分支的 Mock 调用替换为真实请求
   （这些分支均带 `// [MOCK]` 注释）。
3. `AdminStoreProvider` 改为异步加载真实初始数据（移除对 `createMockSeed` 的 import）。
4. 全局检索 `// [MOCK]`，逐一删除/替换命中处。
5. 删除整个 `src/admin/mock/` 目录。
6. 设 `VITE_USE_MOCK=false`，执行 `npm run lint && npm run build` 验证通过。

## 检索命令

```bash
# 列出所有 Mock 触点
grep -rn "// \[MOCK\]" src/admin
```
