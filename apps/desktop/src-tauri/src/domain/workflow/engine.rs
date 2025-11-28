use super::instance::{InstanceStatus, WorkflowInstance};
use super::schema::WorkflowDefinition as SchemaDefinition;
use crate::domain::ports::WorkflowRepositoryPort;
use crate::error::CoreError;
use crate::infrastructure::checkpointer::Checkpointer;
use anyhow::Result;
use chrono::Utc;
use std::sync::Arc;
use tauri::AppHandle;
use regex::Regex;
use serde_json::Value;

/// ExecutionIntent represents the side-effect to be executed after LVCP.
#[derive(Debug, Clone)]
pub enum ExecutionIntent {
    SendMessage { node_id: String, content: String },
    Wait { node_id: String },
    ExecutePbt { node_id: String, tree_id: String, context_mapping: serde_json::Value },
    Complete,
    None,
}

/// WorkflowEngine now depends on abstract ports, not concrete implementations.
pub struct WorkflowEngine {
    #[allow(dead_code)]
    app_handle: AppHandle,
    repo: Arc<dyn WorkflowRepositoryPort>,
    bt_repo: Arc<crate::adapters::db::behavior_tree_repo::BehaviorTreeRepository>,
    checkpointer: Checkpointer,
}

impl WorkflowEngine {
    pub fn new(
        app_handle: AppHandle, 
        repo: Arc<dyn WorkflowRepositoryPort>,
        bt_repo: Arc<crate::adapters::db::behavior_tree_repo::BehaviorTreeRepository>
    ) -> Self {
        let checkpointer = Checkpointer::new(repo.clone());
        Self {
            app_handle,
            repo,
            bt_repo,
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
        self.execute_intent(account_id, contact_id, &intent).await?;

        match intent {
            ExecutionIntent::None => Ok(false),
            _ => Ok(true),
        }
    }

    async fn execute_intent(
        &self,
        account_id: &str,
        contact_id: &str,
        intent: &ExecutionIntent,
    ) -> Result<()> {
        match intent {
            ExecutionIntent::SendMessage { node_id: _, content } => {
                // TODO: Use AccountActor to send message
                tracing::info!("Executing SendMessage intent: {}", content);
                Ok(())
            }
            ExecutionIntent::Wait { node_id: _ } => {
                tracing::info!("Executing Wait intent");
                Ok(())
            }
            ExecutionIntent::ExecutePbt { node_id, tree_id, context_mapping } => {
                tracing::info!("[WorkflowEngine] Triggering PBT {} at node {} for contact {}", tree_id, node_id, contact_id);

                // 1. Deterministic PBT Instance ID
                let pbt_instance_id = format!("{}_{}", contact_id, node_id);

                // 2. Check if instance exists
                let existing = self.bt_repo.get_instance(&pbt_instance_id).await
                    .map_err(|e| anyhow::anyhow!("Failed to check PBT instance: {}", e))?;

                if existing.is_none() {
                    // 3. Create new instance
                    tracing::info!("[WorkflowEngine] Creating new PBT instance {}", pbt_instance_id);

                    // Load definition to verify it exists
                    let _definition = self.bt_repo.get_definition(tree_id).await
                        .map_err(|e| anyhow::anyhow!("Failed to load PBT definition: {}", e))?
                        .ok_or_else(|| anyhow::anyhow!("PBT definition {} not found", tree_id))?;

                    // Create instance
                    use crate::domain::behavior_tree::state::{BehaviorTreeInstance, TreeStatus};

                    let new_instance = BehaviorTreeInstance {
                        id: pbt_instance_id.clone(),
                        definition_id: tree_id.clone(),
                        account_id: account_id.to_string(),
                        node_states: std::collections::HashMap::new(),
                        blackboard: context_mapping.clone().into(), // Initialize blackboard with context mapping
                        status: TreeStatus::Running,
                        created_at: chrono::Utc::now(),
                        updated_at: chrono::Utc::now(),
                    };

                    self.bt_repo.save_instance(&new_instance).await
                        .map_err(|e| anyhow::anyhow!("Failed to save PBT instance: {}", e))?;

                    tracing::info!("[WorkflowEngine] PBT instance created and saved. AccountActor should pick it up.");
                } else {
                    tracing::info!("[WorkflowEngine] PBT instance {} already exists, skipping creation", pbt_instance_id);
                }

                Ok(())
            }
            ExecutionIntent::Complete => {
                tracing::info!("Workflow completed");
                Ok(())
            }
            ExecutionIntent::None => Ok(()),
        }
    }

    /// Pure compute logic: takes current state, returns new state + intent.
    /// This is a pure, synchronous function suitable for use in Checkpointer.
    pub(crate) fn compute_and_transition_pure(
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
            "ExecuteBehaviorTree" => {
                let tree_id = node.config.get("tree_id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let context_mapping = node.config.get("context_mapping").cloned().unwrap_or(serde_json::json!({}));
                
                ExecutionIntent::ExecutePbt {
                    node_id: next_node_id.clone(),
                    tree_id,
                    context_mapping,
                }
            }
            "End" => {
                instance.status = InstanceStatus::Completed.to_string();
                ExecutionIntent::Complete
            }
            _ => ExecutionIntent::None,

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

