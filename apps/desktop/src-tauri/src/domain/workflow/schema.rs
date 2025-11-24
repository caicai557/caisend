use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowDefinition {
    pub id: String,
    pub name: String,
    pub version: String,
    pub nodes: HashMap<String, Node>,
    pub edges: Vec<Edge>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    pub id: String,
    pub r#type: NodeType,
    pub position: Position, // For UI rendering
    pub config: NodeConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum NodeType {
    Start,
    SendMessage,
    WaitForResponse,
    ConditionalBranch,
    AddTag,
    End,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum NodeConfig {
    Start,
    SendMessage { content: String },
    WaitForResponse { timeout_seconds: Option<u64> },
    ConditionalBranch, // Conditions are on the edges
    AddTag { tag: String },
    End,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub condition: Option<EdgeCondition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum EdgeCondition {
    KeywordMatch { keyword: String },
    RegexMatch { pattern: String },
    Timeout,
    Fallback, // Default path if no other condition matches
    Always,   // Unconditional transition
}
