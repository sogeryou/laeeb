# 恢复原版陪玩中心

用户明确要求按之前前端实现，不重新设计。

基准：`../epal-gaming-companion/src/App.tsx` 的 PLAYER_CENTER、`components/CompanionCenter.tsx`、`components/ReviewModules.tsx`。

1. 直接迁移原组件的布局、配色、字号、卡片、独立子页和弹层；不保留新紫色重设计。
2. 以独立适配层接入现有统计接口：收入展开、客户分群、排序、分页；不将原型虚构数字重新混入真实统计。
3. 原版 My Order 与 Game Services 入口恢复并接到现有订单/服务管理页。
4. My Level、Task Center、Level Benefits保持独立；等级未迁移显示占位，任务采用真实预估；只修正与已确认PRD冲突的数值，不改版式。
5. 先写原结构/数据适配回归测试，再迁移；检查类型、测试、构建和浏览器核心路径。
6. 只改本地，不提交、不上传GitHub。验收文档明确本轮恢复范围和剩余未接通数据。
