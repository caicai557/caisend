# Feature Specification: 消息追踪和方向识别增强

**Feature Branch**: `002-message-tracking-enhancement`  
**Created**: 2024-11-16  
**Status**: Draft  
**Input**: User description: "实现消息追踪和方向识别增强功能，包括消息ID唯一标识追踪、消息方向区分、增强的消息监控器支持批量操作、消息去重和缓存机制"

**参考来源**: 基于 Traneasy 工具的消息处理机制分析（docs/traneasy-analysis.md）

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - 消息去重防止重复处理 (Priority: P1)

作为系统运维人员，当系统重启或网络波动时，我需要系统能够准确识别已处理过的消息，避免重复回复给用户，这样可以提供更专业的服务体验。

**Why this priority**: 这是最核心的问题，重复回复会严重影响用户体验，且可能导致业务逻辑错误。这是从 Traneasy 分析中发现的关键优化点。

**Independent Test**: 可以通过手动发送测试消息，然后重启系统，验证系统不会再次回复同一条消息。

**Acceptance Scenarios**:

1. **Given** 系统已接收并回复了消息 ID "msg_001"，**When** 系统重启后再次扫描消息列表，**Then** 系统识别出 "msg_001" 已处理，不会重复回复
2. **Given** 消息追踪器缓存了 1000 条消息 ID，**When** 接收到第 1001 条新消息，**Then** 系统自动清理最旧的 100 条记录，保持缓存在合理范围
3. **Given** 系统正在监控聊天，**When** 同一条消息在快速刷新中出现多次，**Then** 系统仅处理一次该消息

---

### User Story 2 - 消息方向识别优化回复逻辑 (Priority: P2)

作为系统开发者，我需要系统能够准确区分收到的消息和发出的消息，这样才能正确实现"只对收到的消息进行自动回复"的逻辑，避免对自己发送的消息进行回复。

**Why this priority**: 防止系统陷入自我回复循环，这是基本的逻辑正确性要求。参考 Traneasy 的 `isOut` 标识设计。

**Independent Test**: 可以在测试环境中手动发送消息，验证系统不会对自己发送的消息触发自动回复。

**Acceptance Scenarios**:

1. **Given** 系统监控聊天 "TestUser"，**When** 接收到对方发来的消息 "Hello"（isOut=false），**Then** 系统触发自动回复逻辑
2. **Given** 系统监控聊天 "TestUser"，**When** 系统自己发出消息 "Hi there"（isOut=true），**Then** 系统不触发自动回复，继续监控
3. **Given** 系统获取消息列表，**When** 列表中包含收发混合的消息，**Then** 系统能准确标识每条消息的方向并分别处理

---

### User Story 3 - 批量消息处理提升性能 (Priority: P3)

作为系统性能优化人员，我需要系统能够一次性获取多条消息并批量处理，而不是逐条查询，这样可以减少 DOM 操作次数，提升整体性能。

**Why this priority**: 性能优化对用户体验有积极影响，但不影响核心功能。这是从 Traneasy 的批量操作模式中学习的优化。

**Independent Test**: 可以通过性能测试工具对比单条查询和批量查询的耗时差异。

**Acceptance Scenarios**:

1. **Given** 聊天中有 10 条新消息，**When** 系统执行消息检测，**Then** 系统一次性获取所有 10 条消息，而不是执行 10 次查询
2. **Given** 消息列表包含 100 条历史消息，**When** 系统需要查找新消息，**Then** 系统通过消息 ID 快速过滤，仅处理新增的消息
3. **Given** 系统在高频监控模式下，**When** 连续检测消息，**Then** 每次检测的平均耗时不超过 500ms

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- **消息 ID 不存在**: 当 Telegram Web 页面不提供 `data-message-id` 属性时，系统使用回退方案：基于消息文本和位置生成哈希 ID
- **缓存溢出**: 当消息 ID 缓存超过 1000 条时，自动清理最旧的 100 条记录
- **网络波动导致重复扫描**: 系统重启或网络恢复后，通过消息 ID 去重避免重复处理
- **消息方向判断失败**: 如果无法从 DOM 属性判断消息方向，默认按"收到的消息"处理（保守策略）
- **空消息列表**: 当聊天中没有任何消息时，系统正常返回空列表，不抛出异常
- **并发消息处理**: 多个聊天同时有新消息时，系统按顺序处理，不会出现竞态条件

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

#### 消息追踪
- **FR-001**: 系统必须为每条消息分配或识别唯一的消息 ID
- **FR-002**: 系统必须维护已处理消息 ID 的集合，防止重复处理
- **FR-003**: 系统必须在消息 ID 缓存超过 1000 条时自动清理最旧的记录
- **FR-004**: 系统必须提供消息 ID 的回退生成机制（当页面不提供 ID 时）

#### 消息方向识别
- **FR-005**: 系统必须能够区分收到的消息（incoming）和发出的消息（outgoing）
- **FR-006**: 系统必须检查多种 DOM 属性来判断消息方向（data-is-out, class="is-out", class="outgoing"等）
- **FR-007**: 系统必须仅对收到的消息（isOut=false）触发自动回复逻辑

#### 批量处理
- **FR-008**: 系统必须支持一次性获取多条消息（批量操作）
- **FR-009**: 系统必须能够批量判断哪些消息是新消息
- **FR-010**: 系统必须在批量处理时保持消息顺序

#### 性能要求
- **FR-011**: 系统必须在每次消息检测中完成 DOM 查询、ID 提取、去重判断，总耗时不超过 500ms
- **FR-012**: 系统必须使用缓存机制减少重复的 DOM 查询

#### 错误处理
- **FR-013**: 系统必须在无法获取消息 ID 时记录警告日志并使用回退方案
- **FR-014**: 系统必须在消息方向判断失败时采用保守策略（视为收到的消息）
- **FR-015**: 系统必须在处理异常时不影响其他消息的正常处理

### Key Entities

- **MessageInfo**: 表示一条消息的完整信息
  - 属性：消息 ID（唯一标识）、消息文本、是否为发出的消息（isOut）、时间戳、聊天 ID
  - 用途：统一的消息数据结构，便于传递和处理

- **MessageTracker**: 消息追踪器
  - 属性：已见消息 ID 集合、消息信息缓存字典、最大缓存大小
  - 职责：判断消息是否已处理、管理消息缓存、提供消息查询
  - 关系：被 MessageMonitor 使用

- **MessageMonitor**: 增强的消息监控器
  - 属性：Playwright Page 对象、MessageTracker 实例、日志记录器
  - 职责：从页面获取消息、批量处理、调用追踪器去重
  - 关系：使用 MessageTracker 进行消息追踪

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 消息重复处理率降低到 0%（系统重启或网络波动后不会重复回复已处理的消息）
- **SC-002**: 消息方向识别准确率达到 100%（系统不会对自己发送的消息触发自动回复）
- **SC-003**: 单次消息检测的平均耗时不超过 500ms（包含 DOM 查询、ID 提取、去重判断）
- **SC-004**: 系统能够稳定处理包含 100+ 条消息的聊天，无性能降级
- **SC-005**: 消息 ID 缓存内存占用稳定在 1MB 以内（通过自动清理机制）
- **SC-006**: 在 24 小时连续运行测试中，消息处理逻辑准确率保持 100%
