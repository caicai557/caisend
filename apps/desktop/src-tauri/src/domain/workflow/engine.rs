use super::instance::{InstanceStatus, WorkflowInstance};
use super::schema::WorkflowDefinition as SchemaDefinition;
use crate::domain::ports::WorkflowRepositoryPort;
use crate::error::CoreError;
use crate::infrastructure::checkpointer::Checkpointer;
use anyhow::Result;
use chrono::Utc;
use std::sync::Arc;
use tauri::AppHandle;

/// ExecutionIntent represents the side-effect to be executed after LVCP.
#[derive(Debug, Clone)]
pub enum ExecutionIntent {
    SendMessage { node_id: String, content: String },
    Wait { node_id: String },
    Complete,
    None,
}

/// WorkflowEngine now depends on abstract ports, not concrete implementations.
pub struct WorkflowEngine {
    #[allow(dead_code)]
    app_handle: AppHandle,
    repo: Arc<dyn WorkflowRepositoryPort>,
    checkpointer: Checkpointer,
}

impl WorkflowEngine {
    pub fn new(app_handle: AppHandle, repo: Arc<dyn WorkflowRepositoryPort>) -> Self {
        let checkpointer = Checkpointer::new(repo.clone());
        Self {
            app_handle,
            repo,
            checkpointer,
        }
    }

    /// Process an incoming message using the LVCP pattern.
    ///
    /// Returns true if the workflow handled the message, false otherwise.
    pub async fn process_message(
        &self,
        _account_id: &str,
        contact_id: &str,
        message_content: &str,
    ) -> Result<bool> {
        // Phase 1: Check if there's an active workflow instance
        let current_instance = self.repo.get_active_instance(contact_id).await?;
        
        if current_instance.is_none() {
            // No active workflow
            return Ok(false);
        }

        // Phase 2: Load workflow definition (outside of Checkpointer closure!)
        let definition_id = current_instance
            .as_ref()
            .map(|i| i.definition_id.clone())
            .ok_or_else(|| anyhow::anyhow!("No definition ID"))?;
        
        let definition = self
            .repo
            .get_definition(&definition_id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Definition not found: {}", definition_id))?;

        // Phase 3: Use Checkpointer with pure closure
        let message_owned = message_content.to_string();
        let intent = self
            .checkpointer
            .execute(contact_id, move |current_state| {
                Self::compute_and_transition_pure(current_state, &definition, &message_owned)
            })
            .await
            .map_err(|e| anyhow::anyhow!("LVCP execution failed: {:?}", e))?;

        // Phase 4: Execute Intent (side-effects)
        self.execute_intent(&intent).await?;

        match intent {
            ExecutionIntent::None => Ok(false),
            _ => Ok(true),
        }
    }

    /// Pure compute logic: takes current state, returns new state + intent.
    /// This is a pure, synchronous function suitable for use in Checkpointer.
    fn compute_and_transition_pure(
        current_state: Option<WorkflowInstance>,
        definition: &SchemaDefinition,
        message_content: &str,
    ) -> Result<(Option<WorkflowInstance>, ExecutionIntent), CoreError> {
        let Some(mut instance) = current_state else {
            return Ok((None, ExecutionIntent::None));
        };

        let Some(current_node_id) = &instance.current_node_id else {
            return Ok((Some(instance), ExecutionIntent::None));
        };

        // Compute next step (using async_std or tokio runtime if needed, but preferably sync)
        // For now, we'll use a synchronous version
        let next_node_id = Self::compute_transition_sync(definition, current_node_id, message_content)
            .map_err(|e| CoreError::DomainError(e.to_string()))?;

        let Some(next_node_id) = next_node_id else {
            // No transition matched
            return Ok((Some(instance), ExecutionIntent::None));
        };

        // Update instance state
        instance.current_node_id = Some(next_node_id.clone());
        instance.updated_at = Utc::now().to_rfc3339();

        // Determine intent based on node type
        let node = definition
            .nodes
            .get(&next_node_id)
            .ok_or_else(|| CoreError::DomainError(format!("Node {} not found", next_node_id)))?;

        let intent = match node.node_type.as_str() {
            "SendMessage" => {
                let content = node
                    .config
                    .get("text")
                    .and_then(|v| v.as_str())
                    .unwrap_or("(no message)")
                    .to_string();
                ExecutionIntent::SendMessage {
                    node_id: next_node_id.clone(),
                    content,
                }
            }
            "Wait" => ExecutionIntent::Wait {
                node_id: next_node_id.clone(),
            },
            "End" => {
                instance.status = InstanceStatus::Completed.to_string();
                ExecutionIntent::Complete
            }
            _ => ExecutionIntent::None,
        };

        Ok((Some(instance), intent))
    }

   /// Synchronous version of compute_transition for use in pure closures
    fn compute_transition_sync(
        definition: &SchemaDefinition,
        current_step_id: &str,
        input_message: &str,
    ) -> Result<Option<String>> {
        
        use super::schema::MatchType;

        let edges: Vec<&super::schema::WorkflowEdge> = definition
            .edges
            .iter()
            .filter(|e| e.source_node_id == current_step_id)
            .collect();

        let mut fallback_edge = None;

        for edge in edges {
            if let Some(condition) = &edge.condition {
                if condition.match_type == MatchType::Fallback {
                    fallback_edge = Some(edge);
                    continue;
                }

                // For synchronous evaluation, we can only do Keyword/Regex
                // Semantic matching would require async, so we skip it here
                let matches = match condition.match_type {
                    MatchType::Keyword => {
                        if let Some(pattern) = &condition.pattern {
                            input_message.to_lowercase().contains(&pattern.to_lowercase())
                        } else {
                            false
                        }
                    }
                    MatchType::Regex => {
                        if let Some(pattern) = &condition.pattern {
                            regex::Regex::new(pattern)
                                .ok()
                                .and_then(|re| Some(re.is_match(input_message)))
                                .unwrap_or(false)
                        } else {
                            false
                        }
                    }
                    _ => false,
                };

                if matches {
                    return Ok(Some(edge.target_node_id.clone()));
                }
            } else {
                // Unconditional transition
                return Ok(Some(edge.target_node_id.clone()));
            }
        }

        // Check fallback
        if let Some(edge) = fallback_edge {
            return Ok(Some(edge.target_node_id.clone()));
        }

        Ok(None)
    }
    
    /// Execute side-effects based on Intent.
    async fn execute_intent(&self, intent: &ExecutionIntent) -> Result<()> {
        match intent {
            ExecutionIntent::SendMessage { node_id, content } => {
                tracing::info!(
                    "[WorkflowEngine] Executing SendMessage for {}: {}",
                    node_id,
                    content
                );
                // TODO: Call CDP adapter to send message
                Ok(())
            }
            ExecutionIntent::Wait { node_id } => {
                tracing::info!("[WorkflowEngine] Waiting at node {}", node_id);
                Ok(())
            }
            ExecutionIntent::Complete => {
                tracing::info!("[WorkflowEngine] Workflow completed");
                Ok(())
            }
            ExecutionIntent::None => Ok(()),
        }
    }

    /// Compute the next step based on the current step and input message.
    /// This async version is kept for compatibility with tests.
    pub async fn compute_transition(
        definition: &SchemaDefinition,
        current_step_id: &str,
        input_message: &str,
    ) -> Result<Option<String>> {
        use super::evaluator::evaluate_condition;
        use super::schema::MatchType;

        let edges: Vec<&super::schema::WorkflowEdge> = definition
            .edges
            .iter()
            .filter(|e| e.source_node_id == current_step_id)
            .collect();

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

        // If no specific match, check fallback
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
        self.process_message(account_id, conversation_id, content)
            .await
    }
}

