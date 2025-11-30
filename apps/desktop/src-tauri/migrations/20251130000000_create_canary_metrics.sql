-- Create canary metrics table for A/B testing and validation
CREATE TABLE IF NOT EXISTS canary_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id TEXT NOT NULL,
    profile_type TEXT,  -- e.g., "Chrome126", "Firefox128", "None"
    is_canary BOOLEAN NOT NULL DEFAULT 0,
    
    -- Success metrics
    session_count INTEGER NOT NULL DEFAULT 0,
    successful_sessions INTEGER NOT NULL DEFAULT 0,
    failed_sessions INTEGER NOT NULL DEFAULT 0,
    
    -- Detection metrics
    captcha_count INTEGER NOT NULL DEFAULT 0,
    ban_count INTEGER NOT NULL DEFAULT 0,
    
    -- Performance metrics
    avg_session_duration_ms INTEGER,
    total_requests INTEGER NOT NULL DEFAULT 0,
    failed_requests INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_session_at TIMESTAMP,
    
    UNIQUE(account_id, profile_type)
);

CREATE INDEX IF NOT EXISTS idx_canary_metrics_account ON canary_metrics(account_id);
CREATE INDEX IF NOT EXISTS idx_canary_metrics_is_canary ON canary_metrics(is_canary);
CREATE INDEX IF NOT EXISTS idx_canary_metrics_profile ON canary_metrics(profile_type);
