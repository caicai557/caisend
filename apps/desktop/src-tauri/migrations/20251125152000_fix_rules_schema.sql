-- Align rules table with AutomationRule model (account_id, trigger_pattern, reply_text, delay_min/max, is_enabled)
-- Preserve existing data before rebuilding the table
ALTER TABLE rules RENAME TO rules_legacy;

-- Recreate rules table with the expected schema
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

-- Migrate legacy data (legacy columns: trigger_content, action_content, is_active)
INSERT INTO rules (id, account_id, trigger_type, trigger_pattern, reply_text, delay_min_ms, delay_max_ms, is_enabled)
SELECT
    id,
    NULL,
    trigger_type,
    trigger_content,
    action_content,
    0,
    0,
    is_active
FROM rules_legacy;

-- Drop the legacy table
DROP TABLE rules_legacy;
