//! Database setup and schema management
//!
//! Uses SQLite with WAL mode for high concurrency.

use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use std::path::Path;
use tracing::info;

/// Initialize the database with schema
pub async fn init_db(db_path: &str) -> Result<SqlitePool, sqlx::Error> {
    // Ensure parent directory exists
    if let Some(parent) = Path::new(db_path).parent() {
        std::fs::create_dir_all(parent).ok();
    }

    // Create connection pool with WAL mode
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&format!("sqlite:{}?mode=rwc", db_path))
        .await?;

    // Enable WAL mode for better concurrency
    sqlx::query("PRAGMA journal_mode=WAL;")
        .execute(&pool)
        .await?;

    // Set synchronous to NORMAL for performance (safe with WAL)
    sqlx::query("PRAGMA synchronous=NORMAL;")
        .execute(&pool)
        .await?;

    // Create schema
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS workflow_instances (
            id TEXT PRIMARY KEY,
            account_id TEXT NOT NULL,
            flow_definition_id TEXT NOT NULL,
            state TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        "#,
    )
    .execute(&pool)
    .await?;

    // Create index for fast lookups by account
    sqlx::query(
        r#"
        CREATE INDEX IF NOT EXISTS idx_account_status 
        ON workflow_instances(account_id, status);
        "#,
    )
    .execute(&pool)
    .await?;

    info!("🗄️ Database initialized at: {}", db_path);
    Ok(pool)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_init_db() {
        let pool = init_db(":memory:").await.unwrap();
        
        // Verify table exists
        let result = sqlx::query("SELECT name FROM sqlite_master WHERE type='table' AND name='workflow_instances'")
            .fetch_one(&pool)
            .await;
        
        assert!(result.is_ok());
    }
}
