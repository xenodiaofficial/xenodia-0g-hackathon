# 0G 开发计划与系统影响评估

更新时间：2026-04-24  
配套备忘录：[/Users/uniteyoo/Documents/myxenoall/0G/0G-dev-memo.md](/Users/uniteyoo/Documents/myxenoall/0G/0G-dev-memo.md)

## 1. 这份计划解决什么问题

这份文档回答两个问题：

1. Xenodia 如果接入 0G，应该怎么分阶段做
2. 这个方案会对当前系统造成多大面积的影响

核心目标不是“为了接 0G 而重写现有系统”，而是：

`在不破坏当前调用、支付、计费主路径的前提下，把 Xenodia 升级为 0G 上可验证的能力交易层。`

## 2. 先给结论

### 2.1 推荐实现策略

推荐采用：

`异步镜像到 0G（asynchronous anchoring / sidecar write path）`

也就是：

- Xenodia 现有热路径继续使用当前数据库和服务
- 0G 写入通过后台 worker / outbox 异步完成
- 0G 成为“可验证层”和“审计层”，而不是当前业务主数据库

### 2.2 对系统的总体影响评级

如果按推荐方案做，整体影响评级是：

`中等影响（Medium）`

原因：

- 会新增数据模型、后台任务、管理端页面和能力元数据
- 但不会强制改写 `chat/image/capability invoke/billing reserve/commit` 的主流程
- 现有 API 可以保持稳定，只做扩展

如果采用不推荐方案：

`把 0G 放进同步支付 / 同步调用主路径`

那么影响评级会变成：

`大面积影响（High）`

因为会直接触碰：

- billing 正确性
- request latency
- availability
- 调用幂等
- 运营可恢复性

## 3. 当前系统边界与接入点

## 3.1 已有能力市场边界

当前 capability 市场核心在：

- [gateway-svc/main.go](/Users/uniteyoo/Documents/myxenoall/myxeno/gateway-svc/main.go)
- [capability_registry.go](/Users/uniteyoo/Documents/myxenoall/myxeno/gateway-svc/service/capability_registry.go)
- [capability_execute.go](/Users/uniteyoo/Documents/myxenoall/myxeno/gateway-svc/service/capability_execute.go)
- [capability_admin.go](/Users/uniteyoo/Documents/myxenoall/myxeno/gateway-svc/service/capability_admin.go)
- [admin_capabilities_handler.go](/Users/uniteyoo/Documents/myxenoall/myxeno/gateway-svc/handler/admin_capabilities_handler.go)
- [CapabilitiesTab.tsx](/Users/uniteyoo/Documents/myxenoall/myxeno-fe/components/console/capabilities/CapabilitiesTab.tsx)
- [CapabilityDetailPage.tsx](/Users/uniteyoo/Documents/myxenoall/myxeno-fe/components/capabilities/CapabilityDetailPage.tsx)

当前已有数据对象：

- [capabilities](/Users/uniteyoo/Documents/myxenoall/myxeno/shared/model/capability.go)
- [capability_versions](/Users/uniteyoo/Documents/myxenoall/myxeno/shared/model/capability_version.go)

这说明：

- capability 目录和版本快照已经存在
- 0G 接入最自然的切点是“版本发布 + receipt 锚定”

## 3.2 已有支付与结算边界

当前支付与结算核心在：

- [billing-svc/main.go](/Users/uniteyoo/Documents/myxenoall/myxeno/billing-svc/main.go)
- [ledger.go](/Users/uniteyoo/Documents/myxenoall/myxeno/billing-svc/service/ledger.go)
- [payment_rail.go](/Users/uniteyoo/Documents/myxenoall/myxeno/billing-svc/service/payment_rail.go)
- [billing_fusion.go](/Users/uniteyoo/Documents/myxenoall/myxeno/shared/model/billing_fusion.go)
- [BillingTab.tsx](/Users/uniteyoo/Documents/myxenoall/myxeno-fe/components/console/billing/BillingTab.tsx)

当前已有数据对象：

- `payment_transactions`
- `billing_sessions`
- `account_credit_buckets`
- `agent_billing_policies`

这说明：

- 现有账本足够当业务主账本
- 0G 不需要替代它
- 0G 更适合接在结算之后做锚定

## 3.3 一个很重要的边界判断

当前 [provider.go](/Users/uniteyoo/Documents/myxenoall/myxeno/shared/model/provider.go) 中的 `Provider`，表示的是：

- 上游 LLM API 供应商
- 存储连接配置、API key、Base URL

它不是“能力市场里的 provider identity”。

所以：

`不要直接把现有 providers 表改造成 0G provider identity 表。`

这样做会把：

- 上游路由供应商
- 公开卖 skill 的能力提供者

混成一个概念，后面会非常难维护。

正确做法是：

- 保留现有 `providers` 作为“底层模型/路由供应商”
- 新增一个“0G capability provider identity”对象

## 4. 推荐的系统设计原则

### 原则 1：业务主事实仍然在 Xenodia

下面这些继续以当前数据库为主事实源：

- 调用请求
- 调用状态
- 计费
- 分账归属
- 退款
- 审批和运营控制

### 原则 2：0G 作为可验证镜像层

0G 承担：

- provider 身份锚定
- capability version manifest 发布
- receipt batch 存证
- settlement summary anchoring

### 原则 3：热路径不依赖 0G 可用性

即使 0G 暂时不可写：

- Xenodia 现有 capability invoke 仍然能跑
- billing reserve / commit 仍然能跑
- worker 后续补写即可

这是把风险从“用户请求失败”降到“证明稍后补齐”的关键。

### 原则 4：按批次上 0G，不按请求逐条上 0G

原因：

- 高频逐条 immutable log 成本和复杂度都不划算
- 低延迟服务应采用 batch settlement
- 适合你们现在的 skill / capability 市场特征

## 5. 推荐新增的数据对象

下面是建议新增的最小对象集合。

## 5.1 `zerog_provider_identities`

用途：

- 表示 capability provider 在 0G 上的身份

建议字段：

- `id`
- `provider_kind`：`agent | mcp | api | team | app`
- `display_name`
- `wallet_address`
- `zero_g_domain`
- `status`
- `profile_storage_uri`
- `profile_hash`
- `metadata_json`
- `created_at`
- `updated_at`

说明：

- 这不是替代现有 `providers` 表
- 这是能力市场的公开身份层

## 5.2 `zerog_capability_publications`

用途：

- 记录某个 capability version 已经发布到 0G 的状态

建议字段：

- `id`
- `capability_slug`
- `capability_version`
- `provider_identity_id`
- `manifest_hash`
- `manifest_storage_uri`
- `chain_tx_hash`
- `chain_network`
- `publish_status`
- `published_at`
- `metadata_json`

说明：

- 也可以选择把部分字段并入 `capability_versions`
- 但单独拆表更利于后续多次发布 / 失败重试 / 多网络扩展

## 5.3 `zerog_receipt_batches`

用途：

- 批次级别存储一组 receipt 的锚定状态

建议字段：

- `id`
- `batch_key`
- `window_started_at`
- `window_ended_at`
- `item_count`
- `batch_hash`
- `storage_uri`
- `chain_tx_hash`
- `anchor_status`
- `retry_count`
- `last_error`
- `created_at`
- `updated_at`

## 5.4 `zerog_receipt_batch_items`

用途：

- 可选。记录哪些 request / payment 被纳入某个 batch

建议字段：

- `id`
- `batch_id`
- `request_id`
- `capability_slug`
- `capability_operation`
- `payer_account_id`
- `billing_account_id`
- `payment_transaction_id`
- `billing_session_id`
- `status`
- `actual_amount_micro_usdc`
- `artifact_pointer`

如果不想一开始多建表，也可以先通过 SQL 查询现有表生成 batch，然后只存 batch 主表。

## 5.5 `zerog_anchor_outbox`

用途：

- 把 0G 写入彻底异步化

建议字段：

- `id`
- `event_type`
- `aggregate_type`
- `aggregate_key`
- `payload_json`
- `status`
- `attempt_count`
- `last_error`
- `available_at`
- `created_at`
- `updated_at`

这是整个“低风险接入”的核心。

## 6. 按模块的影响面积评估

## 6.1 数据库 Migration

影响评级：

`中`

原因：

- 需要新增 3 到 5 张表
- 可能需要给现有表加少量索引
- 不需要大改旧表核心约束

建议：

- 尽量新增表，不要重写 `payment_transactions` / `billing_sessions` 结构
- 如果需要补字段，优先加 nullable 字段，不动现有约束

## 6.2 gateway-svc

影响评级：

`中偏高`

原因：

- capability 发布状态和 provider identity 主要都属于 gateway 负责的市场层
- 需要新增 admin API 和 consumer API 字段
- 可能需要新增 worker

预期改动：

- 新增 `0GPublicationService`
- capability admin/list/get 响应增加：
  - provider identity
  - 0G publish status
  - manifest pointer
  - receipt proof pointer
- 新增 admin endpoints：
  - provider identity CRUD
  - publish capability version
  - republish / retry
  - query receipt batches

触达面：

- `service/`
- `handler/`
- `main.go`
- admin capability 页面
- capability detail 页面

## 6.3 billing-svc

影响评级：

`中`

前提：

- 只做异步事件出站，不改主账本逻辑

预期改动：

- 在 payment settled / billing committed 后写一条 outbox event
- 或新增一个扫描 worker 从现有 `payment_transactions + billing_sessions` 抽取 batch

不建议的做法：

- 在同步支付完成时立刻要求 0G 写成功
- 让 billing commit 依赖链上确认

如果这么做，影响会从中直接升到高。

## 6.4 myxeno-fe 管理台

影响评级：

`中`

预期改动：

- capability 管理页增加：
  - provider identity 选择或绑定
  - 0G 发布状态
  - manifest hash / storage link / chain tx
- billing 管理页增加：
  - receipt batch 列表
  - anchor 状态
  - 重试按钮

这部分主要是表单和状态展示，不会触碰现有用户支付核心体验。

## 6.5 公共能力页 / 消费者页面

影响评级：

`低到中`

预期改动：

- capability detail 页增加：
  - provider identity
  - manifest version
  - proof / receipt 链接
  - 0G badge

这属于展示增强，对既有调用机制影响很小。

## 6.6 auth-svc / 账户体系

影响评级：

`低`

原因：

- 当前账号系统只需继续提供 owner / agent / wallet 基础能力
- provider identity 可以独立建模，不必强耦合到 auth

除非后面要把 provider identity 变成“可登录主体”，否则 auth-svc 不需要先动。

## 6.7 模型路由 / provider pool / channel 治理

影响评级：

`低`

原因：

- 这些是底层 LLM 供应链和流量治理
- 0G capability provider identity 与它们是不同维度

建议尽量不要让 0G 项目第一版碰这块。

## 7. 两种实现路径对比

## 路径 A：推荐方案

`异步锚定到 0G`

特点：

- 现有请求和计费主路径保持不变
- 通过 outbox / worker 异步写 Storage、KV、Chain
- 0G 失败不会导致用户请求失败

优点：

- 风险低
- 易回滚
- 易灰度
- 最适合黑客松和第一版上线

缺点：

- 链上状态与业务状态存在短暂延迟
- 需要额外的重试与补偿机制

总体推荐度：

`强烈推荐`

## 路径 B：不推荐方案

`同步 0G 写入主路径`

特点：

- 用户调用完成前，必须等 0G 写入成功

问题：

- request latency 直接上升
- 0G 故障会传播成业务故障
- billing 正确性变复杂
- 幂等与补偿逻辑极重

总体推荐度：

`不推荐`

## 8. 推荐开发计划

下面按 4 个阶段规划。

## Phase 0：架构冻结与 Schema 设计

周期：

`2 到 3 天`

目标：

- 明确对象模型
- 明确链上最小锚定内容
- 明确不进入 MVP 的范围

产出：

- 数据模型草图
- receipt batch JSON schema
- capability manifest JSON schema
- 0G 写入失败补偿规则

验收标准：

- 团队对“什么进 0G、什么不进 0G”达成一致

## Phase 1：后端最小数据层与 Outbox

周期：

`4 到 6 天`

目标：

- 建新表
- 打通事件出站
- 不改变现有热路径

开发项：

- migration 新增：
  - `zerog_provider_identities`
  - `zerog_capability_publications`
  - `zerog_receipt_batches`
  - `zerog_anchor_outbox`
- gateway-svc：
  - provider identity service
  - capability publication service
- billing-svc：
  - receipt outbox event 写入

验收标准：

- 本地可创建 provider identity
- 可把 capability version 标记为待发布
- 可生成待锚定 outbox 事件

## Phase 2：0G Worker 与 Anchoring 流水线

周期：

`5 到 8 天`

目标：

- 能真实把 manifest / batch 写到 0G
- 能回填 storage uri / chain tx / 状态

开发项：

- 新增 `zerog worker`
  - 可以做成 gateway-svc 内部 worker
  - 或独立 `zerog-svc`
- 实现：
  - 写 0G Storage
  - 写 0G KV
  - 可选写 0G Chain
- 失败重试与死信处理

验收标准：

- 至少 1 个 capability manifest 成功发布
- 至少 1 个 receipt batch 成功锚定
- 系统在 0G 写入失败时仍可正常完成用户调用

## Phase 3：前端管理台与公开展示

周期：

`3 到 5 天`

目标：

- 管理员可看到 0G 状态
- 用户可看到 proof / manifest / provider identity

开发项：

- Admin capabilities：
  - 显示 publish status
  - publish / republish 操作
- Admin billing：
  - 显示 batch anchor 状态
- Public capability page：
  - 显示 provider identity / manifest / receipt proof

验收标准：

- 管理员能完成发布和重试
- 公共页能展示 proof 信息

## Phase 4：黑客松打磨

周期：

`2 到 4 天`

目标：

- 准备 demo
- 准备评委叙事
- 保证链上/存储链接可现场展示

开发项：

- demo capability 选择
- demo accounts / provider identities
- 录制 fallback 方案
- 加 dashboard 或 explorer 截图入口

验收标准：

- 3 分钟内能完整讲完一次 capability 发布、调用、结算、锚定

## 9. 对现有系统的真实风险评估

## 9.1 低风险区

- auth-svc
- chat/image 既有路由逻辑
- provider pool / channel 治理
- 用户充值 UI 主流程

这些区域第一版应尽量不动。

## 9.2 中风险区

- capability admin service
- capability consumer response schema
- billing-svc 出站事件
- 新 migration
- 管理台页面扩展

这部分是主要施工区域。

## 9.3 高风险区

- 任何把 0G 写入放进同步 invoke / 同步 billing commit 的设计
- 任何把现有 `providers` 表直接改造成 0G provider identity 的设计
- 任何让 0G 成为唯一账本真相源的第一版尝试

这些都会显著放大爆炸半径。

## 10. 预计工程工作量

按推荐范围估算：

- 后端：`1.5 到 2.5 周`
- 前端：`0.5 到 1 周`
- 联调测试与 demo：`0.5 周`

总量：

`约 2.5 到 4 周`

如果只做黑客松最小版，压缩成：

`7 到 10 个有效开发日`

可进一步裁剪掉的部分：

- 先不上链，只先上 Storage + 本地状态回填
- 先不做完整 provider profile 页
- 先不做 batch explorer，只做 admin 列表

## 11. 最终建议

这件事值得做，但要以“边缘接入”而不是“核心重构”的方式做。

最稳的执行路线是：

1. 新增 0G 专属对象，不污染现有 Provider/账本模型
2. 通过 outbox + worker 异步写入 0G
3. 先打通 manifest 发布和 receipt batch 锚定
4. 最后再决定是否要把更强的链上 settlement 或 TEE 加进来

一句话总结：

`如果按推荐方案做，0G 接入会对当前系统造成中等面积影响，但主要集中在新增能力层与异步锚定层，不会伤到现有支付和调用主路径。`

