use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NodeStatus {
    Success,
    Failure,
    Running,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BehaviorNode {
    Selector {
        id: String,
        children: Vec<BehaviorNode>,
    },
    Sequence {
        id: String,
        children: Vec<BehaviorNode>,
    },
    Action {
        id: String,
        action_type: String,
        params: HashMap<String, String>,
    },
    Condition {
        id: String,
        condition_type: String,
        params: HashMap<String, String>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreeState {
    pub tree_id: String,
    pub current_node_id: Option<String>,
    pub context: HashMap<String, serde_json::Value>,
    pub status: String, // "running", "paused", "completed", "failed"
}

impl BehaviorNode {
    pub fn id(&self) -> &str {
        match self {
            BehaviorNode::Selector { id, .. } => id,
            BehaviorNode::Sequence { id, .. } => id,
            BehaviorNode::Action { id, .. } => id,
            BehaviorNode::Condition { id, .. } => id,
        }
    }
}
