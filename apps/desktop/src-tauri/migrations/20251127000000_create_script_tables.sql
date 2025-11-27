-- 【幽灵座舱】数据库迁移：线性脚本流程
-- 创建时间: 2025-11-27

-- 1. 话术流程表（分类）
CREATE TABLE IF NOT EXISTS script_flows (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
    -- FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX idx_script_flows_account ON script_flows(account_id);

-- 2. 话术步骤表（具体内容）
CREATE TABLE IF NOT EXISTS script_steps (
    id TEXT PRIMARY KEY,
    flow_id TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    advance_mode_json TEXT NOT NULL,  -- JSON存储AdvanceMode枚举
    FOREIGN KEY (flow_id) REFERENCES script_flows(id) ON DELETE CASCADE
);

CREATE INDEX idx_script_steps_flow ON script_steps(flow_id);

-- 3. 运行时实例表（追踪对话进度）
CREATE TABLE IF NOT EXISTS script_instances (
    id TEXT PRIMARY KEY,
    flow_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    peer_id TEXT NOT NULL,           -- 对话唯一标识
    current_step_index INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'running',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    
    -- 每个账号+对话只能有一个活跃实例
    UNIQUE(account_id, peer_id)
    
    -- FOREIGN KEY (flow_id) REFERENCES script_flows(id) ON DELETE CASCADE,
    -- FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX idx_script_instances_account_peer ON script_instances(account_id, peer_id);

-- 4. 账号配置表（自动回复开关）
CREATE TABLE IF NOT EXISTS account_configs (
    account_id TEXT PRIMARY KEY,
    autoreply_enabled INTEGER NOT NULL DEFAULT 0,  -- SQLite使用INTEGER表示BOOLEAN
    updated_at INTEGER NOT NULL
    -- FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- 初始化种子数据：为现有账号创建默认配置
-- 注意：这个语句在初始迁移时会失败，因为 accounts 表为空
-- INSERT OR IGNORE INTO account_configs (account_id, autoreply_enabled, updated_at)
-- SELECT id, 0, strftime('%s', 'now')
-- FROM accounts;
