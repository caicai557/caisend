-- Create rules table for automation
CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT 1,
    trigger_type TEXT NOT NULL,
    conditions TEXT NOT NULL, -- JSON array of conditions
    actions TEXT NOT NULL,     -- JSON array of actions
    created_at INTEGER NOT NULL
);

CREATE INDEX idx_rules_enabled ON rules(enabled);
CREATE INDEX idx_rules_trigger_type ON rules(trigger_type);
