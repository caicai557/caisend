use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct WorkflowInstance {
    pub id: String,
    pub definition_id: String,
    pub contact_id: String,
    pub current_node_id: Option<String>,
    pub state_data: Option<String>, // JSON string
    pub status: String, // Running, WaitingForResponse, Scheduled, Completed, Failed
    pub next_execution_time: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InstanceStatus {
    Running,
    WaitingForResponse,
    Scheduled,
    Completed,
    Failed,
}

impl ToString for InstanceStatus {
    fn to_string(&self) -> String {
        match self {
            InstanceStatus::Running => "Running".to_string(),
            InstanceStatus::WaitingForResponse => "WaitingForResponse".to_string(),
            InstanceStatus::Scheduled => "Scheduled".to_string(),
            InstanceStatus::Completed => "Completed".to_string(),
            InstanceStatus::Failed => "Failed".to_string(),
        }
    }
}
