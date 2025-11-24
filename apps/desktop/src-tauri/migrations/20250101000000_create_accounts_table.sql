CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'active', 'inactive', 'error'
    proxy_config TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
