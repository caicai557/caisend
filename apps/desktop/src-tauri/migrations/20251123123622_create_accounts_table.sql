CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'inactive',
    proxy_config TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
