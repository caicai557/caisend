//! Checkpointer - Implements the LVCP (Lock-Validate-Compute-Persist-Execute) pattern
//!
//! Uses Moka cache as L1 (fast) and SQLite as L2 (durable).
//! Write-behind pattern: Updates cache immediately, flushes to DB asynchronously.

use std::time::Duration;

use moka::future::Cache;
use sqlx::SqlitePool;
use tracing::{debug, info, warn};

use super::state::{WorkflowInstance, WorkflowState, WorkflowStatus};

/// The Checkpointer manages state persistence with write-behind caching
pub struct Checkpointer {
    /// L1 Cache (fast, in-memory)
    cache: Cache<String, WorkflowInstance>,
    /// L2 Storage (durable, SQLite)
    pool: SqlitePool,
}

impl Checkpointer {
    /// Create a new Checkpointer with the given database pool
    pub fn new(pool: SqlitePool) -> Self {
        // Configure cache with TTL and max entries
        let cache = Cache::builder()
            .max_capacity(1000)
            .time_to_idle(Duration::from_secs(300)) // 5 minutes idle eviction
            .build();

        Self { cache, pool }
    }

    /// Create a new workflow instance and persist it
    pub async fn create_instance(
        &self,
        account_id: &str,
        flow_definition_id: &str,
    ) -> Result<WorkflowInstance, sqlx::Error> {
        let instance = WorkflowInstance::new(account_id, flow_definition_id);
        
        // Persist to DB first (for durability on create)
        self.persist_to_db(&instance).await?;
        
        // Then cache
        self.cache.insert(instance.id.clone(), instance.clone()).await;
        
        info!("📝 Created workflow instance: {}", instance.id);
        Ok(instance)
    }

    /// Load an instance from cache (L1) or database (L2)
    pub async fn load_instance(&self, id: &str) -> Result<Option<WorkflowInstance>, sqlx::Error> {
        // L1: Check cache first
        if let Some(instance) = self.cache.get(id).await {
            debug!("💨 Cache hit for instance: {}", id);
            return Ok(Some(instance));
        }

        // L2: Load from database
        debug!("🗄️ Cache miss, loading from DB: {}", id);
        let row = sqlx::query_as::<_, (String, String, String, String, String, String, String)>(
            "SELECT id, account_id, flow_definition_id, state, status, created_at, updated_at 
             FROM workflow_instances WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some((id, account_id, flow_definition_id, state_json, status_str, created_at, updated_at)) = row {
            let state: WorkflowState = serde_json::from_str(&state_json)
                .map_err(|e| sqlx::Error::Decode(Box::new(e)))?;
            let status: WorkflowStatus = serde_json::from_str(&format!("\"{}\"", status_str))
                .unwrap_or(WorkflowStatus::Running);
            
            let instance = WorkflowInstance {
                id,
                account_id,
                flow_definition_id,
                state,
                status,
                created_at: chrono::DateTime::parse_from_rfc3339(&created_at)
                    .map(|dt| dt.with_timezone(&chrono::Utc))
                    .unwrap_or_else(|_| chrono::Utc::now()),
                updated_at: chrono::DateTime::parse_from_rfc3339(&updated_at)
                    .map(|dt| dt.with_timezone(&chrono::Utc))
                    .unwrap_or_else(|_| chrono::Utc::now()),
            };

            // Populate cache
            self.cache.insert(instance.id.clone(), instance.clone()).await;
            
            Ok(Some(instance))
        } else {
            Ok(None)
        }
    }

    /// Update the state of an instance (write-behind pattern)
    /// 
    /// This updates the cache immediately and persists to DB.
    /// In production, you'd batch these writes for better performance.
    pub async fn update_state(
        &self,
        id: &str,
        new_state: WorkflowState,
    ) -> Result<(), sqlx::Error> {
        // Load current instance
        let mut instance = self.load_instance(id).await?.ok_or_else(|| {
            sqlx::Error::RowNotFound
        })?;

        // Update state
        instance.state = new_state;
        instance.updated_at = chrono::Utc::now();

        // L1: Update cache immediately (fast path)
        self.cache.insert(id.to_string(), instance.clone()).await;
        debug!("💨 Cache updated for instance: {}", id);

        // L2: Persist to DB (this could be batched/async in production)
        self.persist_to_db(&instance).await?;
        
        Ok(())
    }

    /// Update the status of an instance
    pub async fn update_status(
        &self,
        id: &str,
        new_status: WorkflowStatus,
    ) -> Result<(), sqlx::Error> {
        let mut instance = self.load_instance(id).await?.ok_or_else(|| {
            sqlx::Error::RowNotFound
        })?;

        instance.status = new_status;
        instance.updated_at = chrono::Utc::now();

        self.cache.insert(id.to_string(), instance.clone()).await;
        self.persist_to_db(&instance).await?;
        
        Ok(())
    }

    /// Persist an instance to the database
    async fn persist_to_db(&self, instance: &WorkflowInstance) -> Result<(), sqlx::Error> {
        let state_json = serde_json::to_string(&instance.state)
            .map_err(|e| sqlx::Error::Encode(Box::new(e)))?;
        let status_str = match instance.status {
            WorkflowStatus::Running => "Running",
            WorkflowStatus::Paused => "Paused",
            WorkflowStatus::Completed => "Completed",
            WorkflowStatus::Failed => "Failed",
        };

        sqlx::query(
            "INSERT OR REPLACE INTO workflow_instances 
             (id, account_id, flow_definition_id, state, status, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&instance.id)
        .bind(&instance.account_id)
        .bind(&instance.flow_definition_id)
        .bind(&state_json)
        .bind(status_str)
        .bind(instance.created_at.to_rfc3339())
        .bind(instance.updated_at.to_rfc3339())
        .execute(&self.pool)
        .await?;

        debug!("🗄️ Persisted instance to DB: {}", instance.id);
        Ok(())
    }

    /// Flush cache to database (force persistence)
    pub async fn flush(&self) -> Result<(), sqlx::Error> {
        warn!("🔄 Flushing cache to database...");
        // In a real implementation, we'd iterate dirty entries
        // For now, moka handles eviction automatically
        Ok(())
    }
}

impl Clone for Checkpointer {
    fn clone(&self) -> Self {
        Self {
            cache: self.cache.clone(),
            pool: self.pool.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::persistence::database::init_db;

    #[tokio::test]
    async fn test_highlander_protocol() {
        // "There can be only one truth" - State must survive restart
        
        let _ = tracing_subscriber::fmt().try_init();
        
        // 1. Create database and checkpointer
        let pool = init_db(":memory:").await.unwrap();
        let checkpointer = Checkpointer::new(pool.clone());

        // 2. Create a workflow instance
        let instance = checkpointer
            .create_instance("account_1", "flow_greeting")
            .await
            .unwrap();
        let instance_id = instance.id.clone();

        // 3. Transition to TypingReply state
        let typing_state = WorkflowState::TypingReply {
            target_text: "Hello, how can I help you?".to_string(),
            chars_typed: 10,
        };
        checkpointer.update_state(&instance_id, typing_state).await.unwrap();

        // 4. "Simulate crash" - drop the checkpointer and create a new one
        drop(checkpointer);
        
        // 5. "Resurrection" - Create new checkpointer with same DB
        let checkpointer2 = Checkpointer::new(pool);

        // 6. Load instance from DB (cache is empty after "crash")
        let recovered_instance = checkpointer2
            .load_instance(&instance_id)
            .await
            .unwrap()
            .expect("Instance should exist after crash");

        // 7. ASSERT: State must be preserved!
        match recovered_instance.state {
            WorkflowState::TypingReply { target_text, chars_typed } => {
                assert_eq!(target_text, "Hello, how can I help you?");
                assert_eq!(chars_typed, 10);
                println!("✅ Highlander Test PASSED - State survived the crash!");
            }
            other => {
                panic!("❌ Highlander Test FAILED - Expected TypingReply, got {:?}", other);
            }
        }
    }
}
