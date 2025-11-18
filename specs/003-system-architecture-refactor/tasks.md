# Tasks: TeleFlow Desktop 架构重构与功能整合

**Input**: Design documents from `/specs/003-system-architecture-refactor/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 为 Electron + React 单体应用搭建基础目录、依赖和环境配置

- [x] T001 创建计划中约定的目录骨架（teleflow-desktop/{electron/managers,electron/handlers,shared/{models,constants,utils},engines/{translation,rules,automation}}）并添加 README/placeholder 说明文件
- [x] T002 更新 teleflow-desktop/package.json，补充 `dev`, `build`, `test`, `lint`, `playwright` 等脚本并锁定 Node/Electron 版本
- [x] T003 [P] 配置 ESLint/Prettier/TypeScript 基线（.eslintrc.cjs、.prettierrc、tsconfig.json），确保 Electron + React 双端可 lint
- [x] T004 [P] 扩充 teleflow-desktop/.env.example，包含数据库路径、翻译 API 密钥、日志目录等变量

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 建立数据库、IPC、Playwright、日志等所有用户故事都依赖的底座

- [x] T005 在 teleflow-desktop/electron/managers/DatabaseManager.ts 实现 better-sqlite3 连接池与生命周期管理
- [x] T006 [P] 定义核心表（accounts、messages、sessions 基础字段）并写入 teleflow-desktop/database/schema.sql 与 database/migrations/001_core_tables.sql
- [ ] T007 [P] 在 teleflow-desktop/database/repositories/BaseRepository.ts 建立 Repository 抽象及事务辅助函数
- [ ] T008 [P] 创建 shared/constants/ipcChannels.ts，集中维护 Account/Message/Translation/Task/Session IPC 常量
- [ ] T009 在 teleflow-desktop/electron/managers/BrowserManager.ts 接入 Playwright，封装多账号独立持久化上下文管理
- [ ] T010 在 shared/utils/logger.ts 和 config/index.ts 配置结构化日志（winston/console）与 YAML 配置加载，贯穿 Electron/React 端

---

## Phase 3: User Story 1 - 多账号管理与消息自动化 (Priority: P1) 🎯 MVP

**Goal**: 支持同时管理 ≥10 个 Telegram 账号，保证账号隔离、快速切换，并为每个账号提供自动化开关

**Independent Test**: 使用 2 个真实账号登录，验证各自会话独立、能切换且自动回复开关按账号生效

### Implementation for User Story 1

- [ ] T011 [P] [US1] 在 shared/models/Account.ts 定义 Account/AccountSettings/AccountStatus 接口与 Zod 校验
- [ ] T012 [P] [US1] 新增迁移 database/migrations/002_account_metadata.sql，补充 session_data、browser_context_path、preferences 列
- [ ] T013 [P] [US1] 在 database/repositories/AccountRepository.ts 实现账号 CRUD、状态查询、会话保存
- [ ] T014 [US1] 在 teleflow-desktop/electron/managers/AccountManager.ts 实现账号登录、自动重连、账号切换及与 BrowserManager 的协同
- [ ] T015 [US1] 在 engines/automation/AutomationController.ts 接入账号级自动化开关与消息派发入口
- [ ] T016 [US1] 在 electron/handlers/account.handler.ts 暴露账号增删改查、状态订阅 IPC API
- [ ] T017 [US1] 在 src/stores/accountStore.ts 实现 Zustand 状态、账号切换动作与 IPC 绑定
- [ ] T018 [US1] 构建 src/components/accounts/{AccountList.tsx,AccountToolbar.tsx} 展示账号状态、快速切换与自动化开关

---

## Phase 4: User Story 2 - 智能翻译与多语言支持 (Priority: P1)

**Goal**: 自动检测消息语言、调用多翻译引擎并提供双语显示及降级机制

**Independent Test**: 发送 EN→ZH、ZH→EN、JP→EN 消息，验证主引擎可用、主引擎禁用时自动降级、译文和原文并行显示

### Implementation for User Story 2

- [ ] T019 [P] [US2] 在 shared/models/Translation.ts 与 database/migrations/003_translation_records.sql 定义翻译记录结构与缓存字段
- [ ] T020 [P] [US2] 实现 engines/translation/{GoogleTranslate.ts,DeepL.ts,BaiduTranslate.ts,LibreTranslate.ts} 适配器骨架
- [ ] T021 [US2] 在 engines/translation/TranslationManager.ts 实现策略排序、可用性检测、缓存读取/写入逻辑
- [ ] T022 [US2] 在 electron/handlers/translation.handler.ts 暴露 translate/detect/engine-list IPC，并挂接错误降级
- [ ] T023 [US2] 扩展 src/stores/translationStore.ts 与 src/components/translation/TranslationPanel.tsx，提供语言选择、双语视图
- [ ] T024 [US2] 在 shared/utils/cache/TranslationCache.ts 引入 LRU + SQLite 缓存，确保重复文本命中

---

## Phase 5: User Story 3 - 定时消息与批量发送 (Priority: P2)

**Goal**: 支持单次定时、循环定时和批量发送，含重试与速率控制

**Independent Test**: 创建一个定时、一个循环、一个批量任务，观察按计划发送、失败重试与执行日志

### Implementation for User Story 3

- [ ] T025 [P] [US3] 在 database/migrations/004_tasks_and_batches.sql 定义 tasks、scheduled_messages、batch_targets 表
- [ ] T026 [P] [US3] 编写 engines/automation/MessageQueue.ts 与 database/repositories/TaskRepository.ts，实现持久化队列 + backoff
- [ ] T027 [US3] 在 engines/automation/TaskScheduler.ts 引入 cron 调度、速率限制与执行状态持久化
- [ ] T028 [US3] 在 electron/handlers/task.handler.ts 提供 schedule/cancel/list/status IPC
- [ ] T029 [US3] 构建 src/components/tasks/{TaskCreator.tsx,TaskList.tsx} 与 src/stores/taskStore.ts
- [ ] T030 [US3] 更新 quickstart.md“定时与群发”章节，加入 CLI/UI 操作示例与限制说明

---

## Phase 6: User Story 4 - 会话管理与智能分类 (Priority: P2)

**Goal**: 提供会话列表、未读统计、标签筛选与实时更新

**Independent Test**: 收到多条消息后，验证未读数量、筛选、实时推送均按预期刷新

### Implementation for User Story 4

- [ ] T031 [P] [US4] 在 shared/models/Session.ts 与 database/migrations/005_sessions.sql 定义会话/参与者结构
- [ ] T032 [P] [US4] 实现 engines/session/ChatSessionManager.ts，处理会话缓存、未读计算、标签索引
- [ ] T033 [US4] 在 electron/handlers/session.handler.ts 暴露 getSessions/filter/markRead/unreadStats IPC
- [ ] T034 [US4] 创建 src/stores/sessionStore.ts 与 src/components/sessions/{SessionList.tsx,Filters.tsx}
- [ ] T035 [US4] 在 electron/services/SessionMonitor.ts 实现实时广播（WebSocket/SSE）以同步前端

---

## Phase 7: User Story 5 - 联系人管理与智能备注 (Priority: P3)

**Goal**: 记录联系人、标签、互动统计并生成智能备注/标签

**Independent Test**: 导入联系人并与之互动，确认备注、标签、智能提示自动更新

### Implementation for User Story 5

- [ ] T036 [P] [US5] 在 shared/models/Contact.ts 与 database/migrations/006_contacts.sql 定义联系人、标签、备注字段
- [ ] T037 [P] [US5] 实现 database/repositories/ContactRepository.ts（查找、标签过滤、统计更新）
- [ ] T038 [US5] 在 engines/contact/ContactManager.ts 处理互动统计、备注更新、标签维护
- [ ] T039 [US5] 在 electron/handlers/contact.handler.ts 提供 contacts CRUD、标签与备注 IPC
- [ ] T040 [US5] 构建 src/components/contacts/{ContactTable.tsx,ContactDetailDrawer.tsx}
- [ ] T041 [US5] 在 engines/contact/SmartNoteGenerator.ts 实现智能备注/标签计算并接入 ContactManager

---

## Phase 8: User Story 6 - 规则引擎与自动化工作流 (Priority: P3)

**Goal**: 通过规则条件-动作链实现自动回复、通知、翻译等自动化

**Independent Test**: 创建多条规则并触发不同条件，确认优先级执行、延迟配置与动作链全部生效

### Implementation for User Story 6

- [ ] T042 [P] [US6] 在 shared/models/Rule.ts 与 database/migrations/007_rules.sql 定义规则、条件、动作结构
- [ ] T043 [P] [US6] 实现 database/repositories/RuleRepository.ts 与 shared/validation/ruleSchema.ts 做运行时校验
- [ ] T044 [US6] 在 engines/rules/RuleEngine.ts + RuleMatcher.ts 编排责任链、优先级与动作执行
- [ ] T045 [US6] 在 electron/handlers/rule.handler.ts 提供 rule CRUD、启停、执行日志 IPC
- [ ] T046 [US6] 构建 src/components/rules/{RuleBuilder.tsx,RuleList.tsx} 与 src/stores/ruleStore.ts
- [ ] T047 [US6] 在 engines/automation/MessageListener.ts 集成规则执行流程并记录 automation 日志

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: 文档、性能、安全与整体体验优化

- [ ] T048 [P] 更新 docs/manual-testing-guide.md 与 quickstart.md，覆盖新功能操作流程
- [ ] T049 在 shared/telemetry/perfMetrics.ts 汇总性能指标（翻译延迟、消息吞吐、内存占用）并暴露到 UI
- [ ] T050 运行 end-to-end 烟雾测试脚本（scripts/run-smoke-tests.ps1）并整理回归结果

---

## Dependencies & Execution Order

### Phase Dependencies

1. **Phase 1 Setup** → 无依赖，首先完成
2. **Phase 2 Foundational** → 依赖 Phase 1，完成后解锁所有用户故事
3. **Phases 3-8 (US1-US6)** → 均依赖 Phase 2，可按优先级或并行实现
4. **Phase 9 Polish** → 依赖所需用户故事完成

### User Story Dependencies

- **US1 (P1)**: 无其他故事依赖，完成后即为 MVP
- **US2 (P1)**: 依赖 US1 输出的账号/自动化底座以调用翻译
- **US3 (P2)**: 依赖 US1 的账号能力与 US2 的翻译（批量消息可选翻译）
- **US4 (P2)**: 依赖 US1（账号）与 Phase2 日志/IPC，用于实时会话
- **US5 (P3)**: 依赖 US1（账号）和 US4（会话数据）获取互动信息
- **US6 (P3)**: 依赖 US1（账号）+ US2（翻译）+ US3（任务）提供动作选择

### Within Each Story

- 先完成模型/迁移 → Repository → Engine/Manager → IPC → 前端 Store/UI
- 只要前置任务完成，标记 [P] 的任务可并行执行
- 每个故事完成后可独立验收与演示

### Parallel Opportunities

- Setup 阶段 T003/T004 可与结构/脚本任务并行
- Foundational 阶段 T006-T008-T009 可由不同成员并行推进
- US 章节内的模型/迁移多用 [P]，可分工并行
- 不同用户故事在满足依赖后可分配给不同小组同步进行

---

## Parallel Example: User Story 2

```bash
# 并行开发流水线示例
Task T019: 定义翻译模型+迁移
Task T020: 实现翻译引擎适配器骨架
Task T023: 构建前端 store/UI（需等 T019/T022 数据接口就绪，可在 UI 侧 mock）
```

---

## Implementation Strategy

### MVP First

1. 完成 Phase 1-2 构建底座
2. 专注 US1，交付多账号管理 + 自动化开关 → **首个可演示版本**
3. 合并/发布前，运行基础冒烟测试并验证 quickstart.md

### Incremental Delivery

- **迭代 1**: MVP（US1）
- **迭代 2**: 增加翻译生态（US2）
- **迭代 3**: 批量/定时（US3）+ 会话管理（US4）
- **迭代 4**: 联系人/CRM（US5）+ 高级规则（US6）
- **迭代 5**: Polish Phase（性能、安全、文档）

### Parallel Team Strategy

- Team A：核心 Electron/Playwright（Phase2 + US1）
- Team B：翻译与批量任务（US2 + US3）
- Team C：前端 UX（US4-6 + Polish）
- Scrum of Scrums 每日同步依赖，确保 IPC/数据契约一致
