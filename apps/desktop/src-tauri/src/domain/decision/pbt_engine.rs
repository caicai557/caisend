use std::sync::Arc;
use tokio::sync::RwLock;
use crate::domain::decision::behavior_tree::{BehaviorNode, NodeStatus, TreeState};
use crate::infrastructure::ContextHub;
use anyhow::Result;

pub struct PbtEngine {
    context_hub: Arc<ContextHub>,
    // In-memory cache of active trees: account_id -> TreeState
    active_states: Arc<RwLock<std::collections::HashMap<String, TreeState>>>,
}

use futures::future::BoxFuture;
use futures::FutureExt;

use async_recursion::async_recursion;

impl PbtEngine {
    pub fn new(context_hub: Arc<ContextHub>) -> Self {
        Self {
            context_hub,
            active_states: Arc::new(RwLock::new(std::collections::HashMap::new())),
        }
    }

    /// Load a tree state for an account (from DB or create new)
    pub async fn load_state(&self, account_id: &str, tree_id: &str) -> Result<()> {
        // TODO: Load from DB
        let initial_state = TreeState {
            tree_id: tree_id.to_string(),
            current_node_id: None,
            context: std::collections::HashMap::new(),
            status: "running".to_string(),
        };
        self.active_states.write().await.insert(account_id.to_string(), initial_state);
        Ok(())
    }

    /// Execute a tick for a specific account's behavior tree
    pub async fn tick(&self, account_id: &str, root_node: &BehaviorNode) -> Result<NodeStatus> {
        // Clone state to avoid holding lock during execution
        let mut state = {
            let states = self.active_states.read().await;
            if let Some(state) = states.get(account_id) {
                state.clone()
            } else {
                return Err(anyhow::anyhow!("No active tree state for account"));
            }
        };

        if state.status != "running" {
            return Ok(NodeStatus::Failure);
        }

        tracing::info!("[PBT] Ticking tree for account: {}", account_id);
        let status = self.execute_node(root_node, &mut state).await?;

        // Update state back
        {
            let mut states = self.active_states.write().await;
            states.insert(account_id.to_string(), state);
        }

        Ok(status)
    }

    #[async_recursion]
    async fn execute_node(&self, node: &BehaviorNode, state: &mut TreeState) -> Result<NodeStatus> {
        match node {
            BehaviorNode::Selector { children, .. } => {
                for child in children {
                    let status = self.execute_node(child, state).await?;
                    if status == NodeStatus::Success {
                        return Ok(NodeStatus::Success);
                    }
                    if status == NodeStatus::Running {
                        return Ok(NodeStatus::Running);
                    }
                }
                Ok(NodeStatus::Failure)
            }
            BehaviorNode::Sequence { children, .. } => {
                for child in children {
                    let status = self.execute_node(child, state).await?;
                    if status == NodeStatus::Failure {
                        return Ok(NodeStatus::Failure);
                    }
                    if status == NodeStatus::Running {
                        return Ok(NodeStatus::Running);
                    }
                }
                Ok(NodeStatus::Success)
            }
            BehaviorNode::Action { action_type, params, .. } => {
                tracing::info!("Executing action: {} {:?}", action_type, params);
                // TODO: Dispatch to ContextHub or ActionHandler
                Ok(NodeStatus::Success)
            }
            BehaviorNode::Condition { condition_type, params, .. } => {
                tracing::info!("Checking condition: {} {:?}", condition_type, params);
                // TODO: Check via ContextHub
                Ok(NodeStatus::Success)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_behavior_node_structure() {
        let node = BehaviorNode::Sequence {
            id: "seq1".to_string(),
            children: vec![
                BehaviorNode::Action {
                    id: "act1".to_string(),
                    action_type: "log".to_string(),
                    params: HashMap::new(),
                },
                BehaviorNode::Condition {
                    id: "cond1".to_string(),
                    condition_type: "is_true".to_string(),
                    params: HashMap::new(),
                },
            ],
        };

        if let BehaviorNode::Sequence { children, .. } = node {
            assert_eq!(children.len(), 2);
        } else {
            panic!("Wrong node type");
        }
    }
}
