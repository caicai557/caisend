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

    /// Compute the next step based on the current step and input message.
    /// This is a pure function (mostly) that can be tested easily.
    pub async fn compute_transition(
        definition: &SchemaDefinition,
        current_step_id: &str,
        input_message: &str,
    ) -> Result<Option<String>> {
        use super::evaluator::evaluate_condition;
        use super::schema::MatchType;

        // 1. Find all edges starting from current_step_id
        let edges: Vec<&super::schema::WorkflowEdge> = definition.edges.iter()
            .filter(|e| e.source_node_id == current_step_id)
            .collect();

        // 2. Evaluate conditions
        // Priority: Specific matches first, Fallback last.
        // We might need to sort edges if they are not sorted by priority in the definition.
        // For now, we assume the order in Vec is the evaluation order, but we should handle Fallback specifically.
        
        let mut fallback_edge = None;

        for edge in edges {
            if let Some(condition) = &edge.condition {
                if condition.match_type == MatchType::Fallback {
                    fallback_edge = Some(edge);
                    continue;
                }

                // Evaluate
                // TODO: Pass real CognitionService and Pool when available
                if evaluate_condition(input_message, condition, None, None).await? {
                    return Ok(Some(edge.target_node_id.clone()));
                }
            } else {
                // Unconditional transition (always true)
                return Ok(Some(edge.target_node_id.clone()));
            }
        }

        // 3. If no specific match, check fallback
        if let Some(edge) = fallback_edge {
            return Ok(Some(edge.target_node_id.clone()));
        }

        Ok(None)
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
