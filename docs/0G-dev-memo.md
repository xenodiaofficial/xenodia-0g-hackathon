# 0G 专题开发备忘录

更新时间：2026-04-24  
工作区：`/Users/uniteyoo/Documents/myxenoall`

## 1. 备忘录目的

这份备忘录用于整理 Xenodia 与 0G 的结合方向，服务于后续黑客松选题、技术决策、Demo 设计和落地排期。

目标不是泛泛研究 0G，而是回答下面几个实际问题：

- Xenodia 现有的支付与能力市场，和 0G 的哪个层最契合
- 哪些方向适合现在做，哪些方向虽然性感但不适合当前阶段
- 如果不碰 0G Compute、不把 TEE 当作 MVP，项目是否依然成立
- MCP / skill / API provider 不是 agent 时，是否还能接入 0G 身份层
- 0G 当前是否已经有成熟的 x402 服务商或 facilitator 可直接复用

## 2. 当前结论摘要

最适合 Xenodia 的定位，不是“把支付接到 0G 上”，而是做成一个：

`基于 0G 的可验证能力交易层`

更具体地说：

- Xenodia 负责能力目录、调用入口、支付体验、账单归属和开发者市场
- 0G Chain 负责 provider 注册、能力版本锚定、批次结算摘要锚定
- 0G Storage 负责不可变回执、artifact、清结算批次、争议证据包
- 0G KV 负责最新状态、索引和快速检索
- 0G 身份层负责 provider 的可验证钱包身份，不要求 provider 一定是 agent

当前阶段建议：

- 不把 AXON 纳入方案主线
- 不把 0G Compute 作为核心依赖
- 不把 TEE 作为 MVP 前提
- 把重点放在 `Capability Registry + Payment/Settlement + Receipt Anchoring + Provider Identity`

## 3. Xenodia 现状与可复用能力

从本地代码来看，Xenodia 已经具备黑客松方案中最关键的一些基础件。

### 3.1 支付与资金归属

Xenodia 不是只有简单充值逻辑，而是已经有：

- `x402` 动态 top-up 能力
- `402 Payment Required` 失败后触发充值/重试的支付语义
- actor / owner / sponsor 的账单归属逻辑
- billing scope 与 funding context
- per-request 级别的支付上下文 token

本地相关实现：

- [x402_setup.go](/Users/uniteyoo/Documents/myxenoall/myxeno/billing-svc/internal/x402_setup.go:88)
- [billing_client.go](/Users/uniteyoo/Documents/myxenoall/myxeno/gateway-svc/internal/billing_client.go:15)
- [paymentctx.go](/Users/uniteyoo/Documents/myxenoall/myxeno/shared/paymentctx/paymentctx.go:20)
- [ledger.go](/Users/uniteyoo/Documents/myxenoall/myxeno/billing-svc/service/ledger.go:160)
- [agent_billing_policy.go](/Users/uniteyoo/Documents/myxenoall/myxeno/shared/model/agent_billing_policy.go:5)

这些现有能力意味着：

- Xenodia 已经有“按请求结算”的骨架
- 已经可以把一笔调用精确映射到某个 payer / beneficiary / capability operation
- 这非常适合和 0G 上的 receipt anchoring、provider settlement、dispute proof 做结合

### 3.2 能力市场与能力合约

Xenodia 的 capability 不是静态工具列表，而是带有完整元数据的能力合约雏形：

- capability slug / binding key / provider / category
- pricing / funding modes
- supports sync / async / polling / webhook
- operation 粒度的输入输出与调用模式
- version snapshot 与 drift detection

本地相关实现：

- [capability.go](/Users/uniteyoo/Documents/myxenoall/myxeno/shared/model/capability.go:9)
- [capability_execute.go](/Users/uniteyoo/Documents/myxenoall/myxeno/gateway-svc/service/capability_execute.go:19)
- [capability_contracts.go](/Users/uniteyoo/Documents/myxenoall/myxeno/gateway-svc/service/capability_contracts.go:34)

这意味着 Xenodia 最强的切口不是“支付”，而是：

`带版本、带价格、带执行模式、带可信信号的 capability exchange`

## 4. 0G 技术栈中最值得用的部分

## 4.1 0G Chain

最适合放下面这些最关键但体积小的事实：

- provider 注册
- capability version hash
- batch settlement root
- receipt root
- dispute case pointer

不建议把完整请求/响应明文塞上链。链上只放：

- hash
- pointer
- summary
- signer / payer / provider / amount

这样成本、可验证性和隐私是最平衡的。

官方部署信息参考：

- 0G 主网 RPC：`https://evmrpc.0g.ai`
- 主网 Chain ID：`16661`
- 合约部署文档要求 EVM 配置按 `cancun`

来源：

- [Deploy Contracts on 0G](https://docs.0g.ai/developer-hub/building-on-0g/contracts-on-0g/deploy-contracts)

## 4.2 0G Storage

0G Storage 最适合放不可变对象，而不是高频逐条热写业务日志。

适合放的内容：

- capability manifest
- capability version snapshot 导出的 JSON
- request / response receipt 批次包
- artifact
- audit bundle
- dispute evidence

关键点：

- 0G Storage 的 log 是 append-only
- whitepaper 写明每个 data entry 对应一次 storage request transaction
- specialized flow 可以给特定应用使用，并可获得更好的可靠性/定价配置

这说明如果每次 skill 调用都单独写 immutable log，会很快把成本和复杂度打高。

来源：

- [0G whitepaper](https://docs.0g.ai/whitepaper.pdf)

## 4.3 0G KV

0G KV 最适合做“最新状态”和“检索入口”，不适合当高并发核心数据库。

适合写：

- `request_id -> latest_status`
- `capability_slug -> latest_manifest_pointer`
- `provider_wallet -> latest_profile`
- `batch_id -> storage_cid`

官方 KV 实现是建立在 Storage log 之上的 KV 抽象，KV Node 通过回放 log 中的 KV 操作重建本地数据库。

这意味着：

- KV 是“可回放状态层”
- 仍然有底层 log 成本
- 但更适合作为 demo 和审计型系统的查询层

来源：

- [0g-storage-kv](https://github.com/0gfoundation/0g-storage-kv)
- [0g-storage-client](https://github.com/0gfoundation/0g-storage-client)

## 4.4 0G Identity

`.0g` 身份层并不只服务 agent。

官方表述明确覆盖：

- developers
- applications
- AI agents

本质上，`.0g` 绑定的是 0G 上的 EVM wallet identity，而不是“你必须是智能体”。

所以对 Xenodia 来说：

- provider 可以是 agent
- provider 可以是 MCP server
- provider 可以是 API 服务
- provider 可以是团队维护的 skill runtime

都可以用身份层。

更准确的理解是：

`provider identity` 不等于 `agent identity`

而是：

`一个有钱包、有签名能力、能收款、能对 manifest 负责的服务身份`

来源：

- [Introducing .0g](https://0g.ai/blog/introducing-0g-domain)

## 5. 当前不建议作为核心依赖的部分

## 5.1 AXON

AXON 支付方式即将被淘汰，不纳入主方案，不在黑客松叙事里占篇幅。

## 5.2 0G Compute

0G Compute 从产品叙事上很强，但目前不建议作为 Xenodia 方案的核心依赖。

原因：

- 当前应用路径复杂
- 对外部 broker / ledger / provider ack / transfer-to-provider 流程依赖较重
- 方案稳定性受 0G 官方当前实现成熟度影响
- 容易把项目从“能力市场 + 结算”带偏到“算力平台接入”

官方 starter kit 显示 Compute 路径目前更像：

- 先创建 ledger
- 再对 provider 进行 acknowledge
- 再向 provider 转账
- 再发起 query

这和 Xenodia 当前想做的“通用 capability 市场”相比，耦合更重。

来源：

- [0G Compute TS Starter Kit](https://github.com/0gfoundation/0g-compute-ts-starter-kit)

判断：

- 可以作为未来某些 premium capability 的后端运行选项
- 不应该作为 MVP 的前置条件

## 5.3 TEE

TEE 的价值主要在于：

- 保护 provider 私有逻辑
- 保护知识产权
- 提供 sealed execution / remote attestation

但当前阶段不建议强依赖 TEE。

原因：

- 实现重
- 调试重
- 叙事收益高，但交付风险也高
- 对当前最重要的“能力目录 + 支付结算 + receipt anchoring”不是必须条件

更合适的处理方式：

- MVP 阶段先做 `manifest hash + provider signature + immutable batch receipt`
- 后续版本再把 TEE 作为 premium skill 的可选增强项

## 6. 高频日志与写入策略

这个问题已经基本明确：

`不要把每次调用都直接写一条 0G immutable log。`

推荐做法是：

### 6.1 热路径

请求实时写：

- Postgres
- Redis
- 现有 Xenodia billing / request / task 表

用来保证：

- 低延迟
- 高吞吐
- 产品体验
- 实时 UI 展示

### 6.2 冷路径 / 审计路径

按固定窗口做批量沉淀：

- 每 30 到 120 秒
- 或每 100 到 1000 条请求
- 或按 provider / capability 分桶

生成：

- `batch.jsonl.gz`
- `receipt-bundle.json`
- `artifact-manifest.json`

然后：

- 批次文件写入 `0G Storage`
- 最新状态索引写入 `0G KV`
- 批次 root / cid / range 锚定到 `0G Chain`

### 6.3 为什么这样更合理

因为官方 whitepaper 已经说明：

- Storage log 是 append-only
- 高频逐条 settlement 会带来过高链上/协议层成本
- 低延迟服务应该采用批量 settlement

所以这里不是“是否 rollup”的问题，而是：

`Xenodia 应该做 batch anchoring，而不是 per-request immutable logging`

## 7. 0G 上是否有 x402 服务商

截至 2026-04-24，目前没有查到官方 0G 提供的成熟通用 x402 facilitator / merchant service。

查到的现状更接近：

- 0G Compute 使用自己的 broker / ledger / provider funding 体系
- 0G Storage Client 的 hot storage router 文档里提到 “402 without deposit falls back automatically”，但这更像某个下载路径中的计费分支，不是通用 x402 服务平台
- 官方文档和官方 repo 中，没有查到“像 Coinbase facilitator 那样的 0G 官方 x402 服务商”

来源：

- [0G Storage Client](https://github.com/0gfoundation/0g-storage-client)
- [0G Compute TS Starter Kit](https://github.com/0gfoundation/0g-compute-ts-starter-kit)
- [0G Serving User Broker](https://github.com/0gfoundation/0g-serving-user-broker)

因此当前最稳妥的结论是：

- `x402 仍然应该视为 Xenodia 自己掌握的支付层能力`
- `0G 应该视为结算锚定、存证、provider identity、capability registry 的底层`

这反而是好事，因为架构边界更清晰。

## 8. 推荐的项目定位

推荐项目定位：

`Xenodia Capability Exchange on 0G`

一句话解释：

`一个基于 0G 的可验证能力市场，支持 provider 注册、能力版本发布、按调用收费、批次回执存证与可审计结算。`

更适合对外讲的版本：

`Xenodia turns MCPs, APIs, and skills into verifiable capabilities on 0G, with provider identity, versioned manifests, per-call billing, and immutable settlement receipts.`

## 9. 推荐的 MVP 方案

MVP 不要做大全。

建议只做下面这几个最小闭环：

### 9.1 Provider Registry

链上注册：

- provider wallet
- provider metadata pointer
- optional `.0g`
- payout address
- reputation/dispute pointer

### 9.2 Capability Manifest Registry

每个 capability/version 发布时：

- 生成 manifest JSON
- manifest 写 0G Storage
- version hash 和 pointer 写 0G Chain

manifest 至少包含：

- capability slug
- provider
- version
- pricing
- invoke mode
- funding modes
- input schema
- output schema
- trust signals

### 9.3 Xenodia Invocation + Billing

继续沿用 Xenodia 现有调用与计费逻辑：

- 目录发现
- 请求调用
- 不足额时返回 402 语义
- billing scope 判定 self / owner / sponsor

这里不需要为了 0G 重写现有结算内核。

### 9.4 Batch Receipt Anchoring

每个时间窗内把：

- request_id
- capability slug / version
- provider
- payer
- amount
- status
- artifact pointer

打成 batch 包：

- batch 包上 0G Storage
- batch summary 写 0G KV
- batch root 上 0G Chain

### 9.5 Optional Identity Layer

如果时间允许，再加：

- provider `.0g`
- provider profile page
- provider-signed manifest 验证

## 10. 不推荐的 MVP 范围

下面这些不建议放进第一版：

- 把所有请求都逐条上 0G immutable log
- 把 0G Compute 当主执行引擎
- 把 TEE 作为必须条件
- 绑定 AXON
- 试图在黑客松内重建完整去中心化 x402 facilitator

这些会显著增加复杂度和不稳定性，稀释 Xenodia 最强的差异化。

## 11. 黑客松赛道建议

最适合主打：

- `Agent 经济与自主应用`

同时兼容：

- `Agentic Infra 与 OpenClaw 实验室`

可作为加分而非主线：

- `隐私与主权基础设施`

原因：

- Xenodia 的强项是“能力作为商品/服务”的发现、调用、计费、分账和存证
- 这天然属于 agent economy / capability economy
- OpenClaw 可以作为 orchestration / capability consumption 的展示层
- 隐私赛道只有在引入 TEE 或更强的加密执行时才应当主打

## 12. 风险与不确定项

### 12.1 Hackathon 时间信息有冲突

此前查到的 HackQuest 页面中，时间信息存在冲突：

- 提交截止写的是 `2026-05-16 23:59 UTC+8`
- 但页面其他位置出现了 “Early May 2026” 之类表述

工作上建议以 `2026-05-16` 作为操作性 deadline，同时去 0G Discord 再次确认。

### 12.2 0G testnet 链 ID 信息不一致

官方不同材料里出现过 `16601` 和 `16602` 的差异。

实际动手前建议：

- 先用钱包和 RPC 实测
- 以当前可连通 RPC 返回的 chain id 为准
- 不要直接照抄旧样例

### 12.3 生态能力还在快速变化

0G 仍然在快速演进，尤其是：

- Compute broker
- provider marketplace
- identity tooling
- storage hot path

因此架构上应尽量采用“弱耦合”方式接入 0G，不要把关键业务流程硬绑定到尚不稳定的官方中间层。

## 13. 推荐的技术路线图

### Phase 0：黑客松 MVP

- provider registry contract
- capability manifest schema
- batch receipt uploader
- 0G Storage / KV / Chain 三层打通
- Xenodia 前端展示 provider、capability、receipt proof

### Phase 1：市场增强

- provider reputation
- dispute object model
- settlement explorer
- manifest diff / version compare

### Phase 2：高级可信执行

- TEE-backed premium capability
- sealed artifact storage
- stronger proof-of-execution

### Phase 3：更开放的支付层

- 更通用的 x402 merchant rails
- provider direct settlement
- sponsor / split / revshare contractization

## 14. 最终建议

对当前团队最合理的策略是：

- 坚持 Xenodia 原有强项：支付、能力目录、调用体验、账单归属
- 让 0G 承担“可验证”和“可审计”的底层角色
- 用 `Chain + Storage + KV + Identity` 先做一个稳的、能跑的、可解释的 MVP
- 不把 Compute、TEE、AXON 绑成前置依赖

一句话收束：

`现在最值得做的，不是把 Xenodia 变成 0G 的算力入口，而是把 Xenodia 变成 0G 上可验证的能力交易层。`

## 15. 参考资料

- [0G Deploy Contracts](https://docs.0g.ai/developer-hub/building-on-0g/contracts-on-0g/deploy-contracts)
- [0G whitepaper](https://docs.0g.ai/whitepaper.pdf)
- [Introducing .0g](https://0g.ai/blog/introducing-0g-domain)
- [0g-storage-kv](https://github.com/0gfoundation/0g-storage-kv)
- [0g-storage-client](https://github.com/0gfoundation/0g-storage-client)
- [0G Compute TS Starter Kit](https://github.com/0gfoundation/0g-compute-ts-starter-kit)
- [0G Serving User Broker](https://github.com/0gfoundation/0g-serving-user-broker)

