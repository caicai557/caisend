CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT,
    trigger_type TEXT NOT NULL,
    trigger_pattern TEXT NOT NULL,
    reply_text TEXT,
    delay_min_ms INTEGER NOT NULL,
    delay_max_ms INTEGER NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT 1,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
);
