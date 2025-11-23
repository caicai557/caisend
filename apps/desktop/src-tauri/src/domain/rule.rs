use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub trigger_type: TriggerType,
    pub conditions: Vec<Condition>,
    pub actions: Vec<Action>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TriggerType {
    MessageReceived,
    // Add more triggers later
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Condition {
    pub field: String,
    pub operator: Operator,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Operator {
    Contains,
    Equals,
    StartsWith,
    EndsWith,
    Regex,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Action {
    pub action_type: ActionType,
    pub payload: String, // JSON payload for flexibility
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ActionType {
    AutoReply,
    ForwardToUser,
    Translate,
    // Add more actions later
}

impl Rule {
    pub fn new(name: String, trigger_type: TriggerType) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            enabled: true,
            trigger_type,
            conditions: vec![],
            actions: vec![],
        }
    }
}
