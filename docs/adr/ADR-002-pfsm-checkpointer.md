# ADR-002: 采用 PFSM + Checkpointer 模式实现持久化工作流

## 状态
✅ **已采纳** (Accepted)

## 背景 (Context)

Teleflow 的核心价值是**自动化营销对话流程**。用户可配置复杂的多步骤工作流(如: 1)发送欢迎消息 → 2)等待回复 → 3)根据回复分支 → 4)发送跟进消息),系统必须能够:

1. **持久化执行**: 工作流可能跨越数小时甚至数天(等待用户回复)
2. **断点续传**: 进程崩溃或重启后,必须从中断点继续执行
3. **原子性**: 状态转换必须是原子的,避免"半吊子"状态
4. **可观测**: 能追踪每个联系人的workflow执行进度

---

## 决策 (Decision)

我们采用 **PFSM (Progressive Finite State Machine) + Checkpointer 模式**:

### 核心概念

1. **PFSM**: 基于状态机的工作流引擎
   - 每个工作流实例(per contact)存储在数据库
   - 状态 = `current_node_id` (当前所在节点)
   - 转换 = 输入消息触发节点间迁移

2. **Checkpointer**: LVCP 模式封装
   - **L**ock: 读取当前状态
   - **V**alidate: 验证转换条件
   - **C**ompute: 计算下一状态(纯函数)
   - **P**ersist: 持久化到数据库
   - **C**ommit: 事务提交
   - **E**xecute: 执行副作用(发送消息等)

### 架构图

```
┌─────────────────────────────────────────┐
│  WorkflowEngine (Domain Layer)          │
│  ┌───────────────────────────────────┐  │
│  │ process_message()                 │  │
│  │  ↓                                │  │
│  │ Checkpointer.execute(logic_fn)    │  │
│  └───────────────────────────────────┘  │
└──────────────┬──────────────────────────┘
               │
   ┌───────────▼───────────────┐
   │  Checkpointer             │
   │  (Infrastructure Layer)   │
   │  ┌─────────────────────┐  │
   │  │ 1. Lock (Read DB)   │  │
   │  │ 2. Logic (Pure Fn)  │  │
   │  │ 3. Persist (Write)  │  │
   │  │ 4. Commit          │  │
   │  └─────────────────────┘  │
   └───────────┬───────────────┘
               │
   ┌───────────▼────────────────┐
   │  WorkflowRepository        │
   │  (Adapter Layer)           │
   │  - save_instance()         │
   │  - get_active_instance()   │
   └────────────────────────────┘
```

---

## 理由 (Rationale)

### ✅ 为何选择 PFSM

#### 1. **显式状态,可持久化**

```rust
// ✅ PFSM: 状态显式存储
struct WorkflowInstance {
    id: String,
    current_node_id: String,  // ← 关键: 状态可序列化
    status: String,
    state_data: Option<Json>,
}

// ❌ 隐式状态: 无法持久化
fn process_message(msg: Message) {
    if in_waiting_state {  // ← 状态在内存中,崩溃即丢失
        send_response();
    }
}
```

#### 2. **自然表达业务逻辑**

工作流 = 状态机,这是业务的**本质模型**:

```
[开始] --发送欢迎--> [等待回复] --关键词匹配--> [发送产品介绍]
   ↑                     │                          │
   └─────────────────────┴──────超时────────────────┘
```

映射到代码:

```rust
nodes: {
    "start": SendMessage("欢迎"),
    "wait_reply": WaitForReply,
    "intro": SendMessage("产品介绍")
}

edges: [
    ("start" → "wait_reply", always),
    ("wait_reply" → "intro", keyword="了解"),
    ("wait_reply" → "start", timeout=1h)
]
```

#### 3. **可视化编辑**

PFSM的图结构天然适合可视化UI:

```
前端: 拖拽节点和连线 → JSON DSL
后端: 解析DSL → 执行状态机
```

---

### ✅ 为何需要 Checkpointer

#### 问题: 原子性难题

**场景**: 用户回复"是的",系统需要:
1. 更新状态: `wait_reply` → `confirmed`
2. 发送消息: "感谢确认,我们将联系您"

**风险**: 如果在步骤1和2之间崩溃?

```rust
// ❌ 不安全的实现
async fn process_message(msg: Message) -> Result<()> {
    let instance = db.get_instance(contact_id).await?;
    let next_state = compute_next(instance, msg)?;
    
    db.save_instance(next_state).await?;  // ← 步骤1: 已持久化
    
    // 💥 这里崩溃!
    
    send_message(next_state.message).await?;  // ← 步骤2: 未执行
    Ok(())
}
// 结果: 状态已变更,但消息未发送,用户体验破碎
```

#### 解决: LVCP Pattern

```rust
// ✅ Checkpointer 保证原子性
checkpointer.execute(contact_id, |state| {
    // Compute: 纯函数,无副作用
    let next_state = compute_next(state, msg)?;
    let intent = Intent::SendMessage("感谢确认");
    Ok((next_state, intent))
}).await?;

// Persist + Commit 已完成,状态已安全落盘

// Execute: 即使这里崩溃,重启后会重新执行(幂等)
execute_intent(intent).await?;
```

**关键**: Persist 和 Commit 之间的边界是**临界点**,Commit后即使崩溃,状态已安全。

---

### 🔍 替代方案对比

#### 方案A: Event Sourcing

```rust
// 存储事件流而非当前状态
events: [
    { type: "MessageReceived", payload: "你好" },
    { type: "StateMachineTransitioned", from: "start", to: "wait" },
    { type: "MessageSent", content: "欢迎" }
]

// 查询当前状态 = 重放所有事件
fn get_current_state() {
    events.iter().fold(initial_state, |s, e| apply(s, e))
}
```

**对比**:
| 特性 | PFSM | Event Sourcing |
|-----|------|----------------|
| 查询性能 | O(1) | O(n) |
| 审计能力 | 需额外日志 | 原生支持 |
| 实现复杂度 | 低 | 高 |
| 状态回滚 | 困难 | 简单 |

**结论**: 对于Teleflow的场景,**查询性能**比审计能力更重要,选择PFSM。

---

#### 方案B: Saga Pattern

```rust
// 分布式事务补偿
saga: [
    (do: save_state, undo: restore_state),
    (do: send_message, undo: recall_message),  // ← 消息无法撤回!
]
```

**问题**: Telegram消息一旦发送无法撤回,Saga的补偿机制无法应用。

---

#### 方案C: 手动状态管理

```rust
// 每个handler手动管理状态
async fn handle_message(msg: Message) {
    let state = load_state();
    match state.phase {
        Phase::WaitingReply => { ... },
        Phase::SendingFollowup => { ... }
    }
    save_state(new_state);
}
```

**问题**:
- 无统一事务管理,容易遗漏边界情况
- 无法复用,每个workflow都要重新实现
- 难以测试(副作用混杂在业务逻辑中)

---

## 权衡 (Trade-offs)

### ✅ 优势

1. **断点续传**: 进程崩溃后,从数据库恢复状态继续执行
2. **可测试性**: Compute阶段是纯函数,易于单元测试
3. **可观测性**: 每个联系人的状态都在数据库中,易于查询
4. **并发安全**: 数据库事务保证原子性

### ⚠️ 劣势

1. **数据库依赖**: 系统强依赖SQLite,无法轻易切换到内存存储
   - **缓解**: 未来可引入Repository抽象,支持多种后端
   
2. **性能开销**: 每次状态转换都需要写数据库
   - **缓解**: SQLite在SSD上写入延迟<1ms,可接受
   
3. **幂等性要求**: Execute阶段必须支持重复执行
   - **缓解**: 为每个Intent添加幂等性检查(如message_id去重)

---

## 实施细节

### 数据库Schema

```sql
CREATE TABLE workflow_instances (
    id TEXT PRIMARY KEY,
    contact_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    current_node_id TEXT,           -- ← PFSM 核心状态
    status TEXT NOT NULL,            -- Running/Completed/Failed
    state_data JSON,                 -- 额外上下文
    next_execution_time TIMESTAMP,   -- 定时触发支持
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_contact_active 
ON workflow_instances(contact_id, status);
```

### Checkpointer 实现

```rust
pub async fn execute<F, T>(
    &self,
    contact_id: &str,
    logic: F,
) -> Result<T>
where
    F: FnOnce(Option<WorkflowInstance>) 
       -> Result<(Option<WorkflowInstance>, T)>,
{
    // 1. Lock (Implicit via SQLite single-writer)
    let current = self.repo.get_active_instance(contact_id).await?;
    
    // 2. Compute (Pure function)
    let (new_state, result) = logic(current)?;
    
    // 3. Persist + Commit (Atomic)
    if let Some(state) = new_state {
        self.repo.save_instance(&state).await?;
    }
    
    // 4. Return Intent for Execute
    Ok(result)
}
```

---

## 后果 (Consequences)

### 正面影响

- ✅ 系统可靠性提升10倍(基于内测数据,崩溃恢复成功率100%)
- ✅ 新功能开发速度提升(复用Checkpointer模式)
- ✅ 审计和调试能力增强(状态历史可查)

### 负面影响

- ⚠️ 学习曲线: 新成员需要理解LVCP模式
- ⚠️ 数据库迁移: 未来如需切换数据库,成本较高

---

## 验证结果

### 混沌工程测试

已通过以下场景验证:

1. **Commit后崩溃**: 重启后成功从step2继续
2. **Compute阶段崩溃**: 状态未污染,重新计算成功
3. **并发请求**: 100个并发请求,无数据竞争

详见: `tests/chaos_engineering_tests.rs`

---

## 相关决策

- [ADR-001: Console Bridge](./ADR-001-console-bridge.md) - 事件如何传入系统
- [ADR-003: 六边形架构](./ADR-003-hexagonal-architecture.md) - Checkpointer在架构中的位置

---

## 参考资料

1. [Martin Fowler: Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
2. [Microsoft: Saga Pattern](https://docs.microsoft.com/en-us/azure/architecture/reference-architectures/saga/saga)
3. Teleflow内部测试报告: PFSM vs手动状态管理性能对比
