-- Phase 2 (Milestone B): 创建使用记录表
-- 创建时间: 2025-12-01
-- 用途: 追踪话术使用历史,为推荐引擎提供数据

CREATE TABLE IF NOT EXISTS usage_log (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    telegram_chat TEXT NOT NULL,    -- 会话标识 (从窗口标题解析)
    snippet_id TEXT,                 -- 关联的话术 ID (script_steps.id)
    outcome TEXT NOT NULL,           -- 'success' / 'failure' / 'ignored'
    context_label TEXT,              -- 上下文标签 (阶段/场景)
    recommendation_source TEXT,      -- 'rule' / 'sequence' / 'manual'
    created_at INTEGER NOT NULL
    -- FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_usage_account ON usage_log(account_id);
CREATE INDEX IF NOT EXISTS idx_usage_chat ON usage_log(account_id, telegram_chat);
CREATE INDEX IF NOT EXISTS idx_usage_time ON usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_snippet ON usage_log(snippet_id);

-- FTS5 全文搜索虚拟表 (支持快速上下文检索)
CREATE VIRTUAL TABLE IF NOT EXISTS usage_log_fts USING fts5(
    telegram_chat, 
    context_label,
    content='usage_log',
    content_rowid='rowid'
);

-- 触发器: 自动同步到 FTS 表
CREATE TRIGGER IF NOT EXISTS usage_log_fts_insert AFTER INSERT ON usage_log BEGIN
    INSERT INTO usage_log_fts(rowid, telegram_chat, context_label)
    VALUES (new.rowid, new.telegram_chat, new.context_label);
END;

CREATE TRIGGER IF NOT EXISTS usage_log_fts_delete AFTER DELETE ON usage_log BEGIN
    DELETE FROM usage_log_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS usage_log_fts_update AFTER UPDATE ON usage_log BEGIN
    DELETE FROM usage_log_fts WHERE rowid = old.rowid;
    INSERT INTO usage_log_fts(rowid, telegram_chat, context_label)
    VALUES (new.rowid, new.telegram_chat, new.context_label);
END;
