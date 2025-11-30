use std::sync::Arc;
use sqlx::SqlitePool;
use crate::domain::canary::{CanaryMetrics, CanaryComparison};
use anyhow::Result;

/// Service for managing canary metrics and A/B testing
#[derive(Clone)]
pub struct CanaryService {
    pool: SqlitePool,
}

impl CanaryService {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Record a successful session for an account
    pub async fn record_success(&self, account_id: &str, profile_type: Option<&str>, duration_ms: i64) -> Result<()> {
        CanaryMetrics::record_success(&self.pool, account_id, profile_type, duration_ms).await
    }

    /// Record a failed session
    pub async fn record_failure(&self, account_id: &str, profile_type: Option<&str>) -> Result<()> {
        CanaryMetrics::record_failure(&self.pool, account_id, profile_type).await
    }

    /// Record a captcha encounter
    pub async fn record_captcha(&self, account_id: &str, profile_type: Option<&str>) -> Result<()> {
        CanaryMetrics::record_captcha(&self.pool, account_id, profile_type).await
    }

    /// Record a ban event
    pub async fn record_ban(&self, account_id: &str, profile_type: Option<&str>) -> Result<()> {
        CanaryMetrics::record_ban(&self.pool, account_id, profile_type).await
    }

    /// Initialize metrics for a new or existing account
    pub async fn initialize_account(&self, account_id: &str, profile_type: Option<&str>, is_canary: bool) -> Result<()> {
        CanaryMetrics::upsert(&self.pool, account_id, profile_type, is_canary).await
    }

    /// Get current A/B testing comparison stats
    pub async fn get_comparison_stats(&self) -> Result<CanaryComparison> {
        CanaryMetrics::compare_groups(&self.pool).await
    }
}
