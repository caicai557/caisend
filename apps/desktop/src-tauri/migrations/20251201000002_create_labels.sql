-- Phase 2 (Milestone B): 创建标签系统
-- 创建时间: 2025-12-01
-- 用途: 支持基于阶段/场景的话术分类和推荐

-- 标签表 (阶段/场景)
CREATE TABLE IF NOT EXISTS labels (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,              -- '初次接触' / '价格咨询' / '催单'
    keywords TEXT,                   -- 关键词 (JSON 数组) 如: ["你好","咨询"]
    created_at INTEGER NOT NULL
    -- FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_labels_account ON labels(account_id);
CREATE INDEX IF NOT EXISTS idx_labels_name ON labels(account_id, name);

-- 话术-标签多对多关系表
CREATE TABLE IF NOT EXISTS script_step_labels (
    script_step_id TEXT NOT NULL,
    label_id TEXT NOT NULL,
    PRIMARY KEY (script_step_id, label_id),
    FOREIGN KEY (script_step_id) REFERENCES script_steps(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_step_labels_step ON script_step_labels(script_step_id);
CREATE INDEX IF NOT EXISTS idx_step_labels_label ON script_step_labels(label_id);

-- 种子数据: 创建默认标签 (示例)
-- 注意: 这需要账号已存在,可以在应用启动时通过代码创建
-- INSERT OR IGNORE INTO labels VALUES 
--   ('label_welcome', 'default', '初次接触', '["你好","欢迎","咨询"]', strftime('%s', 'now')),
--   ('label_pricing', 'default', '价格咨询', '["价格","多少钱","费用"]', strftime('%s', 'now')),
--   ('label_followup', 'default', '跟进催单', '["考虑","等待","再联系"]', strftime('%s', 'now'));
