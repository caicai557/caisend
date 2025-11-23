CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL,
    external_id TEXT,
    direction TEXT NOT NULL, -- 'in' or 'out'
    content TEXT NOT NULL,
    translated_content TEXT,
    status TEXT NOT NULL, -- 'received', 'sent', 'failed', 'pending'
    created_at INTEGER NOT NULL,
    FOREIGN KEY(account_id) REFERENCES accounts(id)
);

CREATE INDEX idx_messages_account_id ON messages(account_id);
