use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct WorkflowInstance {
    pub id: String,
    pub definition_id: String,
    pub contact_id: String,
    pub current_node_id: Option<String>,
    pub state_data: Option<String>, // JSON string
    pub status: String, // Running, WaitingForResponse, WaitingForChild, Scheduled, Completed, Failed
    pub next_execution_time: Option<String>,
    /// 当前执行的PBT instance ID (如果有)
    #[sqlx(default)]
    pub current_pbt_instance_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum InstanceStatus {
    Running,
    WaitingForResponse,
    WaitingForChild,  // 等待PBT执行完成
    Scheduled,
    Completed,
    Failed,
}

impl ToString for InstanceStatus {
    fn to_string(&self) -> String {
        match self {
            InstanceStatus::Running => "Running".to_string(),
            InstanceStatus::WaitingForResponse => "WaitingForResponse".to_string(),
            InstanceStatus::WaitingForChild => "WaitingForChild".to_string(),
            InstanceStatus::Scheduled => "Scheduled".to_string(),
            InstanceStatus::Completed => "Completed".to_string(),
            InstanceStatus::Failed => "Failed".to_string(),
        }
    }
}
