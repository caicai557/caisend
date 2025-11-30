use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, Row};
use anyhow::Result;
use chrono::{DateTime, Utc};

pub mod service;

/// Canary metrics for A/B testing browser impersonation effectiveness
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct CanaryMetrics {
    pub id: Option<i64>,
    pub account_id: String,
    pub profile_type: Option<String>,
    pub is_canary: bool,
    
    // Success metrics
    pub session_count: i32,
    pub successful_sessions: i32,
    pub failed_sessions: i32,
    
    // Detection metrics
    pub captcha_count: i32,
    pub ban_count: i32,
    
    // Performance metrics
    pub avg_session_duration_ms: Option<i64>,
    pub total_requests: i32,
    pub failed_requests: i32,
    
    // Timestamps
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_session_at: Option<DateTime<Utc>>,
}

impl CanaryMetrics {
    /// Create or update canary metrics
    pub async fn upsert(pool: &SqlitePool, account_id: &str, profile_type: Option<&str>, is_canary: bool) -> Result<()> {
        sqlx::query(
            r#"
            INSERT INTO canary_metrics (account_id, profile_type, is_canary)
            VALUES (?1, ?2, ?3)
            ON CONFLICT(account_id, profile_type) DO UPDATE SET
                is_canary = excluded.is_canary,
                updated_at = CURRENT_TIMESTAMP
            "#
        )
        .bind(account_id)
        .bind(profile_type)
        .bind(is_canary)
        .execute(pool)
        .await?;
        
        Ok(())
    }
    
    /// Record a successful session
    pub async fn record_success(pool: &SqlitePool, account_id: &str, profile_type: Option<&str>, duration_ms: i64) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE canary_metrics 
            SET session_count = session_count + 1,
                successful_sessions = successful_sessions + 1,
                avg_session_duration_ms = COALESCE(
                    (avg_session_duration_ms * session_count + ?) / (session_count + 1),
                    ?
                ),
                last_session_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE account_id = ? AND (profile_type = ? OR (profile_type IS NULL AND ? IS NULL))
            "#
        )
        .bind(duration_ms)
        .bind(duration_ms)
        .bind(account_id)
        .bind(profile_type)
        .bind(profile_type)
        .execute(pool)
        .await?;
        
        Ok(())
    }
    
    /// Record a failed session
    pub async fn record_failure(pool: &SqlitePool, account_id: &str, profile_type: Option<&str>) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE canary_metrics 
            SET session_count = session_count + 1,
                failed_sessions = failed_sessions + 1,
                last_session_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE account_id = ? AND (profile_type = ? OR (profile_type IS NULL AND ? IS NULL))
            "#
        )
        .bind(account_id)
        .bind(profile_type)
        .bind(profile_type)
        .execute(pool)
        .await?;
        
        Ok(())
    }
    
    /// Record captcha encounter
    pub async fn record_captcha(pool: &SqlitePool, account_id: &str, profile_type: Option<&str>) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE canary_metrics 
            SET captcha_count = captcha_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE account_id = ? AND (profile_type = ? OR (profile_type IS NULL AND ? IS NULL))
            "#
        )
        .bind(account_id)
        .bind(profile_type)
        .bind(profile_type)
        .execute(pool)
        .await?;
        
        Ok(())
    }
    
    /// Record ban/block
    pub async fn record_ban(pool: &SqlitePool, account_id: &str, profile_type: Option<&str>) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE canary_metrics 
            SET ban_count = ban_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE account_id = ? AND (profile_type = ? OR (profile_type IS NULL AND ? IS NULL))
            "#
        )
        .bind(account_id)
        .bind(profile_type)
        .bind(profile_type)
        .execute(pool)
        .await?;
        
        Ok(())
    }
    
    /// Get metrics for an account
    pub async fn get(pool: &SqlitePool, account_id: &str, profile_type: Option<&str>) -> Result<Option<CanaryMetrics>> {
        let metrics = sqlx::query_as::<_, CanaryMetrics>(
            r#"
            SELECT 
                id, 
                account_id, 
                profile_type,
                is_canary,
                session_count,
                successful_sessions,
                failed_sessions,
                captcha_count,
                ban_count,
                avg_session_duration_ms,
                total_requests,
                failed_requests,
                created_at,
                updated_at,
                last_session_at
            FROM canary_metrics 
            WHERE account_id = ? AND (profile_type = ? OR (profile_type IS NULL AND ? IS NULL))
            "#
        )
        .bind(account_id)
        .bind(profile_type)
        .bind(profile_type)
        .fetch_optional(pool)
        .await?;
        
        Ok(metrics)
    }
    
    /// Get comparison between canary and control groups
    pub async fn compare_groups(pool: &SqlitePool) -> Result<CanaryComparison> {
        let canary_stats = sqlx::query(
            r#"
            SELECT 
                COUNT(*) as account_count,
                AVG(CAST(successful_sessions AS FLOAT) / NULLIF(session_count, 0)) as success_rate,
                AVG(CAST(captcha_count AS FLOAT) / NULLIF(session_count, 0)) as captcha_rate,
                AVG(CAST(ban_count AS FLOAT) / NULLIF(session_count, 0)) as ban_rate,
                AVG(avg_session_duration_ms) as avg_duration
            FROM canary_metrics 
            WHERE is_canary = 1
            "#
        )
        .fetch_one(pool)
        .await?;
        
        let control_stats = sqlx::query(
            r#"
            SELECT 
                COUNT(*) as account_count,
                AVG(CAST(successful_sessions AS FLOAT) / NULLIF(session_count, 0)) as success_rate,
                AVG(CAST(captcha_count AS FLOAT) / NULLIF(session_count, 0)) as captcha_rate,
                AVG(CAST(ban_count AS FLOAT) / NULLIF(session_count, 0)) as ban_rate,
                AVG(avg_session_duration_ms) as avg_duration
            FROM canary_metrics 
            WHERE is_canary = 0
            "#
        )
        .fetch_one(pool)
        .await?;
        
        Ok(CanaryComparison {
            canary_count: canary_stats.try_get::<i32, _>("account_count")?,
            control_count: control_stats.try_get::<i32, _>("account_count")?,
            canary_success_rate: canary_stats.try_get::<f64, _>("success_rate").unwrap_or(0.0),
            control_success_rate: control_stats.try_get::<f64, _>("success_rate").unwrap_or(0.0),
            canary_captcha_rate: canary_stats.try_get::<f64, _>("captcha_rate").unwrap_or(0.0),
            control_captcha_rate: control_stats.try_get::<f64, _>("captcha_rate").unwrap_or(0.0),
            canary_ban_rate: canary_stats.try_get::<f64, _>("ban_rate").unwrap_or(0.0),
            control_ban_rate: control_stats.try_get::<f64, _>("ban_rate").unwrap_or(0.0),
            canary_avg_duration_ms: canary_stats.try_get::<Option<f64>, _>("avg_duration")?.map(|d| d as i64),
            control_avg_duration_ms: control_stats.try_get::<Option<f64>, _>("avg_duration")?.map(|d| d as i64),
        })
    }
}

/// Comparison statistics between canary and control groups
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanaryComparison {
    pub canary_count: i32,
    pub control_count: i32,
    pub canary_success_rate: f64,
    pub control_success_rate: f64,
    pub canary_captcha_rate: f64,
    pub control_captcha_rate: f64,
    pub canary_ban_rate: f64,
    pub control_ban_rate: f64,
    pub canary_avg_duration_ms: Option<i64>,
    pub control_avg_duration_ms: Option<i64>,
}

impl CanaryComparison {
    /// Calculate improvement/degradation percentages
    pub fn calculate_deltas(&self) -> CanaryDelta {
        CanaryDelta {
            success_rate_delta: self.canary_success_rate - self.control_success_rate,
            captcha_rate_delta: self.canary_captcha_rate - self.control_captcha_rate,
            ban_rate_delta: self.canary_ban_rate - self.control_ban_rate,
            success_rate_improvement_pct: if self.control_success_rate > 0.0 {
                ((self.canary_success_rate - self.control_success_rate) / self.control_success_rate) * 100.0
            } else {
                0.0
            },
            captcha_reduction_pct: if self.control_captcha_rate > 0.0 {
                ((self.control_captcha_rate - self.canary_captcha_rate) / self.control_captcha_rate) * 100.0
            } else {
                0.0
            },
            ban_reduction_pct: if self.control_ban_rate > 0.0 {
                ((self.control_ban_rate - self.canary_ban_rate) / self.control_ban_rate) * 100.0
            } else {
                0.0
            },
        }
    }
}

/// Delta calculations for A/B test results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanaryDelta {
    pub success_rate_delta: f64,
    pub captcha_rate_delta: f64,
    pub ban_rate_delta: f64,
    pub success_rate_improvement_pct: f64,
    pub captcha_reduction_pct: f64,
    pub ban_reduction_pct: f64,
}
