# Implementation Plan: TeleFlow Desktop 架构重构与功能整合

**Branch**: `003-system-architecture-refactor` | **Date**: 2025-11-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-system-architecture-refactor/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

TeleFlow Desktop 是一个基于 Electron 的多账号 Telegram 管理平台，集成智能翻译、自动化消息处理、批量发送和 CRM 功能。项目采用多进程架构确保账号隔离，Repository 模式统一数据访问，事件驱动实现模块解耦。核心技术栈包括 React + TypeScript + SQLite + Playwright，支持插件化扩展和未来功能迭代。

## Technical Context

**Language/Version**: TypeScript 5.0+ / Node.js 20+ / Electron 28+  
**Primary Dependencies**: React 18, Playwright, SQLite3 (better-sqlite3), Zustand, Radix UI, TailwindCSS, Zod  
**Storage**: SQLite (local database) + Electron Store (preferences) + File system (cache/logs)  
**Testing**: Vitest (unit) + Playwright Test (e2e) + Electron Testing Library  
**Target Platform**: Windows 10+ (MVP), macOS 12+ / Linux (future)  
**Project Type**: Desktop application (Electron + React)  
**Performance Goals**: 启动 <5s, 账号切换 <1s, 消息处理 100/s, 翻译响应 <2s  
**Constraints**: 内存 <200MB/账号, CPU 空闲 <1%, 支持 7×24 运行, 离线可用  
**Scale/Scope**: 10 账号并发, ~50k LOC, 20+ 主要界面, 100+ API endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

基于项目宪法评估：

### ✅ 符合原则

1. **代码质量**: TypeScript 提供类型安全，模块化设计职责清晰
2. **架构风格**: 单代码库，模块划分清晰（config, models, engine, telegram_web, cli）
3. **平台约束**: Windows 平台，Playwright 控制 Telegram Web
4. **配置驱动**: YAML 配置所有业务行为，Pydantic/Zod 验证

### ⚠️ 需要调整

1. **MVP 边界**: 当前规格包含多账号、翻译等高级功能，需分阶段实施
2. **技术选型**: 使用 Electron 而非纯 Python CLI，需评估必要性
3. **依赖数量**: 引入较多前端框架，需权衡最小依赖原则

### 实施策略

**阶段划分**（符合宪法渐进式原则）：

- **Phase 1 (MVP)**: 单账号 + 关键词回复 + CLI 界面
- **Phase 2**: 多账号支持 + 基础翻译功能  
- **Phase 3**: 批量发送 + 会话管理
- **Phase 4**: 完整 GUI + 高级功能

**结论**: 通过阶段化实施符合宪法要求，但需严格控制 MVP 范围

## Project Structure

### Documentation (this feature)

```text
specs/003-system-architecture-refactor/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
teleflow-desktop/
├── electron/                     # 主进程代码
│   ├── main.ts                  # Electron 主入口
│   ├── managers/                # 核心管理器
│   │   ├── AccountManager.ts   # 账号管理
│   │   ├── BrowserManager.ts   # Playwright 实例管理
│   │   ├── IpcManager.ts       # IPC 通信管理
│   │   └── DatabaseManager.ts  # 数据库连接管理
│   └── handlers/                # IPC 处理器
│       ├── account.handler.ts
│       ├── message.handler.ts
│       └── translation.handler.ts
│
├── src/                         # 渲染进程代码 (React)
│   ├── components/              # UI 组件
│   │   ├── accounts/          # 账号管理组件
│   │   ├── messages/          # 消息处理组件
│   │   ├── translation/       # 翻译功能组件
│   │   └── shared/            # 共享组件
│   ├── pages/                  # 页面级组件
│   │   ├── Dashboard.tsx      # 仪表板
│   │   ├── Accounts.tsx       # 账号管理页
│   │   ├── Messages.tsx       # 消息中心页
│   │   └── Settings.tsx       # 设置页
│   ├── stores/                 # Zustand 状态管理
│   │   ├── accountStore.ts
│   │   ├── messageStore.ts
│   │   └── translationStore.ts
│   ├── services/               # 前端服务层
│   │   └── ipc.service.ts     # IPC 通信服务
│   └── types/                  # TypeScript 类型定义
│
├── shared/                      # 共享代码
│   ├── models/                 # 数据模型
│   │   ├── Account.ts
│   │   ├── Message.ts
│   │   ├── Rule.ts
│   │   └── Translation.ts
│   ├── constants/              # 共享常量
│   └── utils/                  # 工具函数
│
├── database/                    # 数据库相关
│   ├── migrations/             # 数据库迁移
│   ├── repositories/           # Repository 模式实现
│   │   ├── AccountRepository.ts
│   │   ├── MessageRepository.ts
│   │   └── BaseRepository.ts
│   └── schema.sql              # 数据库架构
│
├── engines/                     # 核心引擎
│   ├── translation/            # 翻译引擎
│   │   ├── GoogleTranslate.ts
│   │   ├── DeepL.ts
│   │   └── TranslationManager.ts
│   ├── rules/                  # 规则引擎
│   │   ├── RuleEngine.ts
│   │   └── RuleMatcher.ts
│   └── automation/             # 自动化引擎
│       ├── MessageQueue.ts
│       └── TaskScheduler.ts
│
├── tests/                       # 测试代码
│   ├── unit/                   # 单元测试
│   ├── integration/            # 集成测试
│   └── e2e/                    # 端到端测试
│
├── config/                      # 配置文件
│   ├── default.yaml            # 默认配置
│   └── schema.yaml             # 配置架构
│
└── scripts/                     # 构建和部署脚本
    ├── build.js
    └── package.js
```

**Structure Decision**: 采用 Electron 应用标准结构，主进程/渲染进程分离，共享代码独立管理，Repository 模式数据访问，引擎模块化设计

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Electron 框架 (非纯 Python) | 需要原生桌面体验和系统托盘 | 纯 CLI 无法提供实时监控和用户友好界面 |
| 多前端依赖 (React/Zustand) | 复杂状态管理和响应式 UI | 原生 HTML 无法满足实时更新需求 |
| 初始多账号支持 | 用户核心需求是管理多个账号 | 单账号限制会严重影响产品价值 |
