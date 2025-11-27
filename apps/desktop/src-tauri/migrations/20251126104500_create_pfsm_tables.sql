-- Phase 3.1: Create PFSM (Programmable Finite State Machine) Tables
-- Linear Workflow System for Multi-Round Conversations

-- 工作流定义表 (Workflow Templates)
CREATE TABLE IF NOT EXISTS workflow_definitions (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    definition JSON NOT NULL,  -- 线性步骤定义: [{"id": "step1", "condition": "...", "action": "..."}]
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- 兼容旧表：如果 workflow_definitions 已存在（早期版本没有 account_id/definition 列），补充缺失字段
ALTER TABLE workflow_definitions ADD COLUMN IF NOT EXISTS account_id TEXT;
ALTER TABLE workflow_definitions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE workflow_definitions ADD COLUMN IF NOT EXISTS definition JSON;

-- 工作流实例表 (Runtime State - 检查点核心)
CREATE TABLE IF NOT EXISTS workflow_instances (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL,
    contact_id TEXT NOT NULL,       -- 对话对象标识 (例如 Telegram chat_id)
    workflow_id TEXT NOT NULL,
    current_step_id TEXT NOT NULL,  -- 当前状态 (PFSM 指针)
    status TEXT NOT NULL CHECK(status IN ('Running', 'Waiting', 'Completed', 'Failed', 'Cancelled')),
    context JSON,                   -- 上下文数据 (变量存储,例如用户输入)
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY(workflow_id) REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- 兼容旧表：如果 workflow_instances 已存在（早期版本缺少 account_id 等列），补充缺失字段
ALTER TABLE workflow_instances ADD COLUMN IF NOT EXISTS account_id TEXT;
ALTER TABLE workflow_instances ADD COLUMN IF NOT EXISTS workflow_id TEXT;
ALTER TABLE workflow_instances ADD COLUMN IF NOT EXISTS current_step_id TEXT;
ALTER TABLE workflow_instances ADD COLUMN IF NOT EXISTS context JSON;
ALTER TABLE workflow_instances ADD COLUMN IF NOT EXISTS started_at TEXT DEFAULT (datetime('now'));
ALTER TABLE workflow_instances ADD COLUMN IF NOT EXISTS completed_at TEXT;

-- 工作流执行日志 (Audit Trail)
CREATE TABLE IF NOT EXISTS workflow_execution_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instance_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    event_type TEXT NOT NULL,  -- 'StepEntered', 'StepCompleted', 'StepFailed', 'TransitionTriggered'
    event_data JSON,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE
);

-- 索引优化 (提升查询性能)
CREATE INDEX IF NOT EXISTS idx_workflow_instances_account_contact 
    ON workflow_instances(account_id, contact_id);

CREATE INDEX IF NOT EXISTS idx_workflow_instances_status 
    ON workflow_instances(status);

CREATE INDEX IF NOT EXISTS idx_workflow_execution_log_instance 
    ON workflow_execution_log(instance_id, created_at DESC);
