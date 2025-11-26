use super::schema::WorkflowDefinition as SchemaDefinition;
use anyhow::Result;
use sqlx::SqlitePool;
use tauri::AppHandle;

/// WorkflowEngine placeholder to keep build green while full workflow runtime is being iterated.
pub struct WorkflowEngine {
    #[allow(dead_code)]
    app_handle: AppHandle,
    #[allow(dead_code)]
    pool: SqlitePool,
}

impl WorkflowEngine {
    pub fn new(app_handle: AppHandle, pool: SqlitePool) -> Self {
        Self { app_handle, pool }
    }

    /// Process an incoming message; current stub returns false (not handled).
    pub async fn process_message(
        &self,
        _account_id: &str,
        _contact_id: &str,
        _message_content: &str,
    ) -> Result<bool> {
        Ok(false)
    }

    /// Execute a node; current stub is a no-op.
    pub async fn execute_node(
        &self,
        _node_id: &str,
        _definition: &SchemaDefinition,
        _account_id: &str,
    ) -> Result<()> {
        Ok(())
    }
}
