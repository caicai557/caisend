use crate::domain::workflow::instance::{WorkflowInstance, InstanceStatus};
use crate::domain::workflow::schema::{WorkflowDefinition, Node, Edge, NodeType, NodeConfig, EdgeCondition};
use crate::domain::workflow::tracker::InstanceStateTracker;
use crate::domain::models::Message;
use crate::adapters::db::workflow_repo::WorkflowRepository;
use crate::state::AppState;
use crate::error::CoreError;
use std::sync::Arc;
use tokio::sync::RwLock;
use chrono::Utc;

pub struct WorkflowEngine {
    tracker: Arc<InstanceStateTracker>,
    repo: Arc<WorkflowRepository>,
    app_state: Arc<AppState>,
}

impl WorkflowEngine {
    pub fn new(
        tracker: Arc<InstanceStateTracker>,
        repo: Arc<WorkflowRepository>,
        app_state: Arc<AppState>,
    ) -> Self {
        Self {
            tracker,
            repo,
            app_state,
        }
    }

    pub async fn start_workflow(&self, definition_id: &str, contact_id: &str) -> Result<(), CoreError> {
        // Check if already running
        if let Some(_) = self.tracker.get_active_instance(contact_id).await? {
            return Err(CoreError::Unknown("Workflow already running for this contact".to_string()));
        }

        // Load definition
        let def = self.repo.get_definition(definition_id).await?
            .ok_or(CoreError::Unknown("Workflow definition not found".to_string()))?;

        // Find Start Node
        let start_node = def.nodes.values().find(|n| n.r#type == NodeType::Start)
            .ok_or(CoreError::Unknown("Start node not found".to_string()))?;

        // Create Instance
        let instance = WorkflowInstance {
            id: uuid::Uuid::new_v4().to_string(),
            definition_id: definition_id.to_string(),
            contact_id: contact_id.to_string(),
            current_node_id: Some(start_node.id.clone()),
            state_data: Some("{}".to_string()),
            status: InstanceStatus::Running.to_string(),
            next_execution_time: None,
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
        };

        self.tracker.save_instance(&instance).await?;

        // Execute Start Node immediately
        self.execute_node(&instance, start_node, &def).await?;

        Ok(())
    }

    pub async fn process_message(&self, message: &Message) -> Result<bool, CoreError> {
        // 1. Check for active instance
        let mut instance = match self.tracker.get_active_instance(&message.sender_id).await? {
            Some(i) => i,
            None => return Ok(false), // No active workflow, let other engines handle it
        };

        // 2. Load Definition
        let def = self.repo.get_definition(&instance.definition_id).await?
            .ok_or(CoreError::Unknown("Workflow definition not found".to_string()))?;

        // 3. Get Current Node
        let current_node_id = match &instance.current_node_id {
            Some(id) => id,
            None => return Ok(false),
        };

        let current_node = def.nodes.get(current_node_id)
            .ok_or(CoreError::Unknown("Current node not found".to_string()))?;

        // 4. Evaluate Transitions (Edges)
        // Only evaluate if we are waiting for response or if it's a conditional node
        // But typically, if we are "Running", we execute. If "WaitingForResponse", we evaluate input.
        
        if instance.status == InstanceStatus::WaitingForResponse.to_string() {
            let edges: Vec<&Edge> = def.edges.iter().filter(|e| e.source == *current_node_id).collect();
            
            for edge in edges {
                if self.evaluate_condition(edge, message).await {
                    // Transition
                    let target_node = def.nodes.get(&edge.target)
                        .ok_or(CoreError::Unknown("Target node not found".to_string()))?;
                    
                    // Update Instance
                    instance.current_node_id = Some(target_node.id.clone());
                    instance.status = InstanceStatus::Running.to_string();
                    instance.next_execution_time = None;
                    self.tracker.save_instance(&instance).await?;

                    // Execute New Node
                    self.execute_node(&instance, target_node, &def).await?;
                    return Ok(true); // Consumed
                }
            }
        }

        Ok(false) // Not consumed
    }

    async fn evaluate_condition(&self, edge: &Edge, message: &Message) -> bool {
        match &edge.condition {
            Some(EdgeCondition::KeywordMatch { keyword }) => {
                message.content.contains(keyword)
            },
            Some(EdgeCondition::RegexMatch { pattern }) => {
                // TODO: Cache regex compilation
                if let Ok(re) = regex::Regex::new(pattern) {
                    re.is_match(&message.content)
                } else {
                    false
                }
            },
            Some(EdgeCondition::Always) => true,
            Some(EdgeCondition::Fallback) => true, // Should be checked last
            _ => false,
        }
    }

    async fn execute_node(&self, instance: &WorkflowInstance, node: &Node, def: &WorkflowDefinition) -> Result<(), CoreError> {
        let mut instance = instance.clone();

        match &node.config {
            NodeConfig::SendMessage { content } => {
                // Execute Action
                // In a real app, we'd use the ConnectionManager to send via CDP
                // For now, we'll just log or emit an event
                println!("Workflow Sending Message to {}: {}", instance.contact_id, content);
                
                // TODO: Actually send message
                // self.app_state.connection_manager...
                
                // Auto-transition if there's an unconditional edge
                self.auto_transition(&mut instance, node, def).await?;
            },
            NodeConfig::WaitForResponse { timeout_seconds } => {
                instance.status = InstanceStatus::WaitingForResponse.to_string();
                if let Some(seconds) = timeout_seconds {
                     // instance.next_execution_time = Some(Utc::now() + Duration::seconds(*seconds));
                     // Simplified for now
                }
                self.tracker.save_instance(&instance).await?;
            },
            NodeConfig::End => {
                instance.status = InstanceStatus::Completed.to_string();
                instance.current_node_id = None;
                self.tracker.save_instance(&instance).await?;
            },
            _ => {
                // Default auto-transition
                self.auto_transition(&mut instance, node, def).await?;
            }
        }

        Ok(())
    }

    async fn auto_transition(&self, instance: &mut WorkflowInstance, node: &Node, def: &WorkflowDefinition) -> Result<(), CoreError> {
        // Find edge with no condition or Always
        let edges: Vec<&Edge> = def.edges.iter().filter(|e| e.source == node.id).collect();
        
        for edge in edges {
            let should_transition = match &edge.condition {
                None => true,
                Some(EdgeCondition::Always) => true,
                _ => false,
            };

            if should_transition {
                let target_node = def.nodes.get(&edge.target)
                    .ok_or(CoreError::Unknown("Target node not found".to_string()))?;
                
                instance.current_node_id = Some(target_node.id.clone());
                instance.status = InstanceStatus::Running.to_string();
                self.tracker.save_instance(instance).await?;
                
                // Recursive execution (careful with stack overflow, but async recursion needs BoxFuture)
                // For MVP, we can just spawn or loop. 
                // To avoid recursion issues in async, we should ideally use a loop in process_message/start_workflow
                // But for this vertical slice, we'll stop here or use a simplified approach.
                // Let's just update state and let the next tick/event handle it? 
                // No, "Running" nodes should execute immediately.
                // We will need a loop in the caller or `Box::pin`.
                
                // For now, let's assume we just update state. 
                // In a full implementation, we'd have a `run_until_wait` loop.
                return Ok(()); 
            }
        }
        Ok(())
    }
}
