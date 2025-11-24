CREATE TABLE IF NOT EXISTS daily_stats (
    date TEXT NOT NULL, -- YYYY-MM-DD
    account_id TEXT NOT NULL,
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    auto_replies_triggered INTEGER DEFAULT 0,
    PRIMARY KEY (date, account_id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);
