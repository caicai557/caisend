-- 001_core_tables.sql
-- Initializes core entities required for Phase 2 foundation
PRAGMA foreign_keys = ON;

BEGIN;

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  username TEXT,
  session_data TEXT,
  status TEXT NOT NULL DEFAULT 'offline',
  browser_context_path TEXT,
  preferences_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  chat_type TEXT NOT NULL,
  title TEXT,
  participants_json TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_message_id TEXT,
  metadata_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  session_id TEXT,
  chat_id TEXT NOT NULL,
  message_id TEXT,
  sender_json TEXT NOT NULL,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  metadata_json TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  is_translated INTEGER NOT NULL DEFAULT 0,
  translated_text TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_message ON sessions(last_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_account_chat ON messages(account_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

COMMIT;
