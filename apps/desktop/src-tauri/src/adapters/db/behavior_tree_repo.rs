use crate::domain::behavior_tree::schema::BehaviorTreeDefinition;
use crate::domain::behavior_tree::state::{BehaviorTreeInstance, Blackboard, NodeRuntimeState, TreeStatus};
use crate::error::CoreError;
use sqlx::SqlitePool;
use std::collections::HashMap;
use chrono::{DateTime, Utc};

pub struct BehaviorTreeRepository {
    pool: SqlitePool,
}

impl BehaviorTreeRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub fn new_mock() -> Self {
        // This panics if not in async context, but tests are async.
        // However, creating a pool requires async.
        // We might need to return a future or use a lazy static?
        // Actually, for unit tests, we usually pass the pool.
        // But the test calls `BehaviorTreeRepository::new_mock()`.
        // Let's make it async or use a blocking way if possible (sqlite in-memory is fast).
        // SqlitePool::connect_lazy("sqlite::memory:") is synchronous!
        let pool = SqlitePool::connect_lazy("sqlite::memory:").unwrap();
        Self { pool }
    }

    pub async fn save_definition(&self, def: &BehaviorTreeDefinition) -> Result<(), CoreError> {
        sqlx::query(
            r#"
            INSERT INTO behavior_tree_definitions (id, name, description, root_node_id, nodes, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                root_node_id = excluded.root_node_id,
                nodes = excluded.nodes,
                updated_at = datetime('now')
            "#
        )
        .bind(&def.id)
        .bind(&def.name)
        .bind(&def.description)
        .bind(&def.root_node_id)
        .bind(serde_json::to_value(&def.nodes).map_err(|e| CoreError::DbError(e.to_string()))?)
        .execute(&self.pool)
        .await
        .map_err(|e| CoreError::DbError(e.to_string()))?;

        Ok(())
    }

    pub async fn get_definition(&self, id: &str) -> Result<Option<BehaviorTreeDefinition>, CoreError> {
        let row = sqlx::query_as::<_, (String, String, Option<String>, String, String, String, String)>(
            "SELECT id, name, description, root_node_id, nodes, created_at, updated_at FROM behavior_tree_definitions WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| CoreError::DbError(e.to_string()))?;

        if let Some((id, name, description, root_node_id, nodes_json, _, _)) = row {
            let nodes = serde_json::from_str(&nodes_json).map_err(|e| CoreError::DbError(e.to_string()))?;
            Ok(Some(BehaviorTreeDefinition {
                id,
                name,
                description,
                root_node_id,
                nodes,
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn save_instance(&self, instance: &BehaviorTreeInstance) -> Result<(), CoreError> {
        let status_str = match instance.status {
            TreeStatus::Running => "Running",
            TreeStatus::Completed => "Completed",
            TreeStatus::Failed => "Failed",
            TreeStatus::Cancelled => "Cancelled",
        };

        sqlx::query(
            r#"
            INSERT INTO behavior_tree_instances (id, definition_id, account_id, node_states, blackboard, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                node_states = excluded.node_states,
                blackboard = excluded.blackboard,
                status = excluded.status,
                updated_at = excluded.updated_at
            "#
        )
        .bind(&instance.id)
        .bind(&instance.definition_id)
        .bind(&instance.account_id)
        .bind(serde_json::to_value(&instance.node_states).map_err(|e| CoreError::DbError(e.to_string()))?)
        .bind(serde_json::to_value(&instance.blackboard).map_err(|e| CoreError::DbError(e.to_string()))?)
        .bind(status_str)
        .bind(instance.created_at)
        .bind(instance.updated_at)
        .execute(&self.pool)
        .await
        .map_err(|e| CoreError::DbError(e.to_string()))?;

        Ok(())
    }

    pub async fn get_instance(&self, id: &str) -> Result<Option<BehaviorTreeInstance>, CoreError> {
        let row = sqlx::query_as::<_, (String, String, String, String, String, String, DateTime<Utc>, DateTime<Utc>)>(
            "SELECT id, definition_id, account_id, node_states, blackboard, status, created_at, updated_at FROM behavior_tree_instances WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| CoreError::DbError(e.to_string()))?;

        if let Some((id, definition_id, account_id, node_states_json, blackboard_json, status_str, created_at, updated_at)) = row {
            let node_states: HashMap<String, NodeRuntimeState> = serde_json::from_str(&node_states_json)
                .map_err(|e| CoreError::DbError(e.to_string()))?;
            
            let blackboard: Blackboard = serde_json::from_str(&blackboard_json)
                .map_err(|e| CoreError::DbError(e.to_string()))?;

            let status = match status_str.as_str() {
                "Running" => TreeStatus::Running,
                "Completed" => TreeStatus::Completed,
                "Failed" => TreeStatus::Failed,
                "Cancelled" => TreeStatus::Cancelled,
                _ => TreeStatus::Failed, // Default fallback
            };

            Ok(Some(BehaviorTreeInstance {
                id,
                definition_id,
                account_id,
                node_states,
                blackboard,
                status,
                created_at,
                updated_at,
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn get_active_instance_by_account(&self, account_id: &str) -> Result<Option<BehaviorTreeInstance>, CoreError> {
        // Get the most recent Running instance
        let row = sqlx::query_as::<_, (String, String, String, String, String, String, DateTime<Utc>, DateTime<Utc>)>(
            "SELECT id, definition_id, account_id, node_states, blackboard, status, created_at, updated_at FROM behavior_tree_instances WHERE account_id = ? AND status = 'Running' ORDER BY updated_at DESC LIMIT 1"
        )
        .bind(account_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| CoreError::DbError(e.to_string()))?;

        if let Some((id, definition_id, account_id, node_states_json, blackboard_json, status_str, created_at, updated_at)) = row {
            // ... (Same deserialization logic, could extract to helper)
             let node_states: HashMap<String, NodeRuntimeState> = serde_json::from_str(&node_states_json)
                .map_err(|e| CoreError::DbError(e.to_string()))?;
            
            let blackboard: Blackboard = serde_json::from_str(&blackboard_json)
                .map_err(|e| CoreError::DbError(e.to_string()))?;

            let status = match status_str.as_str() {
                "Running" => TreeStatus::Running,
                "Completed" => TreeStatus::Completed,
                "Failed" => TreeStatus::Failed,
                "Cancelled" => TreeStatus::Cancelled,
                _ => TreeStatus::Failed,
            };

            Ok(Some(BehaviorTreeInstance {
                id,
                definition_id,
                account_id,
                node_states,
                blackboard,
                status,
                created_at,
                updated_at,
            }))
        } else {
            Ok(None)
        }
    }
}
