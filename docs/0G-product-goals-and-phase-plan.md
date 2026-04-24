# 0G 产品目标清单与分阶段实施方案

更新时间：2026-04-24  
工作区：`/Users/uniteyoo/Documents/myxenoall`

## 1. 这份文档的定位

这份文档只做四件事：

- 收敛本次 0G 黑客松分支版的产品目标
- 明确 MVP 不超过的范围
- 给出每个阶段的实施方案
- 明确顾问团队在每个阶段如何参与拍板

这不是完整架构设计文档。  
工程层面遵循一条原则：

`MVP 不为了未来的理想形态而过度设计。`

## 2. 顾问团队

本次方案制定与阶段开发，由两位顾问持续参与：

### 2.1 0G 链与黑客松顾问

职责：

- 校准 0G 官方能力与当前可用边界
- 把控黑客松提交要求、评审偏好和演示重点
- 判断哪些 0G 组件必须真实集成，哪些只适合做 roadmap

### 2.2 Xenodia 核心产品顾问

职责：

- 审视当前 Xenodia 的真实产品边界
- 控制本次 0G 黑客松分支不要过度侵入主系统
- 把控 MVP 只使用现有最稳的服务、表和页面骨架

## 3. 外部硬约束

基于截至 `2026-04-24` 可查到的官方信息，本次方案必须遵守下面这些外部硬约束。

### 3.1 主赛道选择

本项目主赛道锁定：

- `Track 3: Agentic Economy & Autonomous Applications`

原因：

- 官方明确欢迎 `micropayments / automated billing / revenue-sharing / AI marketplace / Agent-as-a-Service`
- 这与 Xenodia 的能力市场、计费、分账记录方向最一致

`Track 1` 和 `Track 5` 只作为辅助叙事，不应主导 MVP。

### 3.2 提交硬门槛

本项目必须尽早满足这些提交硬门槛：

- 一个真实的 `0G mainnet contract address`
- 一个 `Explorer` 可验证链接
- 至少一个真实使用到的 0G 核心组件
- 一个 `3 分钟以内` 的 demo 视频
- 一份 README
- 一条符合要求的公开 X 帖子

### 3.3 MVP 技术选择约束

对本次版本，0G 技术栈只锁定：

- `0G Chain`
- `0G Storage`
- 可选 `0G KV`
- 可选 `.0g`

明确降级：

- `0G Compute`
- `TEE / Sealed Inference`
- `Persistent Memory`

原因很简单：

- 这些能力要么路径更重，要么当前不适合作为主交付依赖
- 本次只需要真实、可验证、能演示的最小闭环

## 4. 产品目标清单

本次版本的产品目标，只保留下面四项。

## 目标 1：建立能力供应商身份与信誉骨架

目标描述：

- 为能力供应商建立可验证身份
- 身份只做到供应商级别，不细化到每个能力
- 信誉也先做到供应商级别，不做复杂 rank 系统

MVP 交付标准：

- 每个供应商至少有一个钱包身份
- 供应商可绑定基础公开信息
- 供应商有一个可展示的可信状态字段
- 可选挂载 `.0g`，但不是上线前置条件

MVP 不做：

- 复杂积分算法
- 全链上 reputation engine
- 每个 capability 的独立身份体系

## 目标 2：建立能力 Manifest 与版本发布能力

目标描述：

- 对外把 capability 定义成可发布、可引用、可追溯的对象
- 平台先负责发布，不要求 provider 自己发版
- 当前重点是 manifest 和 version，不做权限下放

MVP 交付标准：

- 每个选中的 capability 有明确 manifest
- 每个 manifest 有 version 和 hash
- manifest 可写入 0G Storage
- manifest 的 hash / pointer 可锚定到 0G

MVP 不做：

- 去中心化 capability 自助上架
- provider 侧复杂发布工作流
- 多角色审批系统

## 目标 3：让服务回执与结算证据可验证、不可篡改

目标描述：

- 不追求把全过程逐条上链
- 只追求让关键回执、结算摘要、证据包可验证
- 技术路径采用批处理，不做逐请求链上同步写入

MVP 交付标准：

- 能生成批次级 receipt bundle
- batch 可写入 0G Storage
- batch 的 hash / pointer / summary 可锚定到 0G Chain
- 页面上能看到 proof 指针或链上锚定信息

MVP 不做：

- 每次调用全过程逐条上链
- 让用户调用依赖 0G 同步写入成功
- 链上实时状态替代 Xenodia 主数据库

## 目标 4：记录能力分账台账，为后续线下结算提供依据

目标描述：

- 当前不做链上自动分账
- 当前不做复杂清结算协议
- 只记录“理论上该分多少”的分账数据

MVP 交付标准：

- 每次被纳入结算范围的能力调用都能形成分账记录
- 能按供应商统计应结算金额
- 能按时间窗口导出结算台账

MVP 不做：

- 自动打款
- 链上 revenue split
- 复杂的退款回滚映射协议

## 5. MVP 边界

MVP 只能在下面范围内交付。

### 4.1 必做

- 供应商级身份骨架
- capability manifest + version
- 0G Storage 写入 manifest 或 receipt batch
- 0G Chain 上至少一个可验证合约地址和链上活动
- receipt / batch / manifest 至少一条公开可验证路径
- 分账记录表与导出视图

### 4.2 可做但不强求

- `.0g` 名称展示
- 更完整的 provider profile 页面
- 更漂亮的 proof explorer 页面
- 简单信誉标签

### 4.3 明确不做

- 0G Compute 作为主执行引擎
- TEE 作为主线路径
- 每个请求逐条上链
- 自动链上分账
- 去中心化 marketplace 完整开放上架
- 重构 Xenodia 的支付主路径
- 重构 provider pool / channel / auth 主逻辑

## 6. 每阶段实施方案

为避免范围膨胀，本次版本分成 4 个阶段。

## Phase 0：范围冻结与对象定义

阶段目标：

- 把概念冻结，不再继续横向扩张
- 明确本次 MVP 的四个目标与禁区
- 明确 demo 只围绕 2 到 3 个 capability 展示

实施方案：

1. 冻结本次 MVP 目标清单
2. 选定演示用 capability
3. 选定 0G 集成组合：
   - `0G Chain`
   - `0G Storage`
   - 可选 `Agent ID / .0g`
4. 冻结 out-of-scope 列表
5. 冻结一句话项目定位

阶段输出：

- 产品目标文档
- MVP 范围确认
- 演示 capability 列表
- 一句话项目定位

顾问团队参与：

- 0G 顾问：确认是否满足黑客松有效集成要求
- Xenodia 顾问：确认是否超出当前产品承受范围

完成标准：

- 团队对“做什么、不做什么”不再反复横跳

## Phase 1：供应商身份与 Manifest 发布

阶段目标：

- 做出最小的供应商身份层
- 让 capability version 能发布成 0G 可引用对象

实施方案：

1. 新增供应商身份对象
   - 不污染现有上游 `providers`
   - 单独表示 capability provider identity
2. 选 2 到 3 个 capability 生成 manifest
3. 为 manifest 生成 version/hash
4. 把 manifest 上传到 0G Storage
5. 把 manifest hash / pointer 通过 0G Chain 合约登记
6. 管理台增加最小发布状态展示

阶段输出：

- 供应商身份记录
- 已发布 manifest
- 0G 主网合约地址
- 可公开展示的 storage pointer / tx hash

顾问团队参与：

- 0G 顾问：确认 0G 集成方式、主网合约与证明材料满足提交要求
- Xenodia 顾问：确认新增对象没有误入现有 provider/route 主模型

完成标准：

- 至少一个 capability version 完成发布并可验证

## Phase 2：回执批处理与可验证证据

阶段目标：

- 把服务过程的关键结果沉淀成可验证回执
- 但不把 0G 写入放进同步调用主路径

实施方案：

1. 定义 receipt batch 的最小字段
   - request id
   - capability
   - version
   - provider identity
   - payer / billing account
   - amount
   - status
2. 用后台任务按时间窗生成 batch
3. batch 写入 0G Storage
4. batch summary / root 锚定到 0G Chain
5. 在管理端和公共页展示 proof 信息

阶段输出：

- receipt batch 生成器
- batch storage pointer
- chain anchor 记录
- 页面 proof 展示

顾问团队参与：

- 0G 顾问：确认 batch + chain anchor 的可验证叙事足够成立
- Xenodia 顾问：确保 billing / invoke 主路径没有被强耦合到 0G

完成标准：

- 一次真实能力调用能追到它所属的 proof batch

## Phase 3：分账台账与演示闭环

阶段目标：

- 记录理论分账
- 打通从供应商身份到 capability 发布，再到回执和结算台账的闭环

实施方案：

1. 新增分账记录逻辑
   - 按能力调用生成理论应分账金额
   - 先只记录，不自动打款
2. 做供应商维度的汇总视图
3. 支持按时间窗口导出结算台账
4. 把 demo flow 固定成一条标准路径：
   - provider identity
   - capability publish
   - invoke
   - batch proof
   - revshare ledger

阶段输出：

- 分账记录表
- 汇总视图
- 导出能力
- 标准演示闭环

顾问团队参与：

- 0G 顾问：确认提交材料里如何证明 0G 组件在核心流程里真正起作用
- Xenodia 顾问：确认分账逻辑没有误伤现有 billing 主账本

完成标准：

- 能给评委演示“谁提供了什么能力，产生了哪些调用，理论应分多少钱，证据在哪里”

## Phase 4：黑客松提交打磨

阶段目标：

- 准备最终提交材料
- 压缩成评委能 3 分钟看懂的版本

实施方案：

1. 准备 README
2. 准备系统图
3. 准备 demo 视频
4. 准备 0G 集成证明清单
5. 准备 X 帖子材料
6. 做一次全流程彩排

阶段输出：

- README
- Demo video
- Explorer link
- 合约地址
- X post

顾问团队参与：

- 0G 顾问：审查提交完整性与评委视角叙事
- Xenodia 顾问：审查项目描述是否偏离产品真实能力

完成标准：

- 所有提交物一轮通过，不临时返工核心功能

## 7. 每阶段的工程约束

为了防止过度设计，每个阶段都遵守下面的工程约束。

### 约束 1

不把 0G 写入放进同步 invoke / 同步 billing commit 主路径。

### 约束 2

不把现有 `providers` 表直接改造成能力供应商身份表。

### 约束 3

不为“将来的完全去中心化市场”提前铺过多抽象层。

### 约束 4

先支持平台发布 capability manifest，不做 provider 自助发布系统。

### 约束 5

先记账，不自动分账；先证据闭环，不自动结算。

### 约束 6

如引入 TEE，只能作为展示型附加点，不能阻塞主交付。

## 8. 阶段验收顺序

本次版本的验收顺序必须是：

1. 先证明 `0G 集成真实有效`
2. 再证明 `产品闭环成立`
3. 最后再优化 `UI、信誉和故事表达`

不允许倒过来做。

## 9. 最终版本的产品表达

本次版本建议统一用下面这类表达：

`Xenodia is a verifiable capability layer on 0G: providers publish versioned capabilities, executions generate tamper-resistant receipts, and settlement evidence can be audited transparently.`

对应中文可以用：

`Xenodia 是构建在 0G 上的可验证能力层：供应商发布带版本的能力，调用产生不可篡改的回执，结算证据可被透明审计。`

## 10. 一句话总结

这次 0G 黑客松分支版，只做四件事：

- 建供应商身份
- 发 capability manifest
- 做可验证回执
- 记分账台账

超过这个范围，就不再是 MVP。
