CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY NOT NULL,
    account_id TEXT NOT NULL,
    remote_id TEXT NOT NULL, -- The ID on the remote platform (e.g., WhatsApp JID)
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY NOT NULL,
    conversation_id TEXT NOT NULL,
    sender_id TEXT NOT NULL, -- 'me' or remote user ID
    content TEXT NOT NULL,
    message_type TEXT NOT NULL, -- 'text', 'image', etc.
    status TEXT NOT NULL, -- 'sent', 'received', 'read'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
