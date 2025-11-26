use super::schema::WorkflowDefinition as SchemaDefinition;
use crate::domain::ports::WorkflowRepositoryPort;
use anyhow::Result;
use std::sync::Arc;
use tauri::AppHandle;

/// WorkflowEngine now depends on abstract ports, not concrete implementations.
pub struct WorkflowEngine {
    #[allow(dead_code)]
    app_handle: AppHandle,
    #[allow(dead_code)]
    repo: Arc<dyn WorkflowRepositoryPort>,
}

impl WorkflowEngine {
    pub fn new(app_handle: AppHandle, repo: Arc<dyn WorkflowRepositoryPort>) -> Self {
        Self { app_handle, repo }
    }

    /// Process an incoming message; current stub returns false (not handled).
    pub async fn process_message(
        &self,
        _account_id: &str,
        _contact_id: &str,
        _message_content: &str,
    ) -> Result<bool> {
        // Here we would use self.repo.get_active_instance(...)
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

#[async_trait::async_trait]
impl crate::domain::ports::WorkflowEnginePort for WorkflowEngine {
    async fn process_message(
        &self,
        account_id: &str,
        conversation_id: &str,
        content: &str,
    ) -> Result<bool, anyhow::Error> {
        self.process_message(account_id, conversation_id, content).await
    }
}
