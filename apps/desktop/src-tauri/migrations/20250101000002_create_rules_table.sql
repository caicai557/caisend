CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL, -- 'keyword', 'regex'
    trigger_content TEXT NOT NULL,
    action_type TEXT NOT NULL, -- 'reply', 'tag'
    action_content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
