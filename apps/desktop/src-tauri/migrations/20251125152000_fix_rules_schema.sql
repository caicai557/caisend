-- Align rules table with AutomationRule model (account_id, trigger_pattern, reply_text, delay_min/max, is_enabled)
-- 策略：删除旧表并创建新表（因为这是早期开发阶段，数据可以丢失）

-- 删除旧的rules表（如果存在）
DROP TABLE IF EXISTS rules;

-- 创建新的rules表（带account_id列）
CREATE TABLE rules (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT,
    trigger_type TEXT NOT NULL,
    trigger_pattern TEXT,
    reply_text TEXT,
    delay_min_ms INTEGER NOT NULL DEFAULT 0,
    delay_max_ms INTEGER NOT NULL DEFAULT 0,
    is_enabled BOOLEAN NOT NULL DEFAULT 1,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
);
