CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL,
    remote_id TEXT NOT NULL, -- The ID on the remote platform (e.g., WhatsApp JID)
    name TEXT,
    phone TEXT,
    email TEXT,
    tags TEXT, -- JSON array of strings
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    UNIQUE(account_id, remote_id)
);
