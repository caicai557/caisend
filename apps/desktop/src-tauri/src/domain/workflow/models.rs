use super::schema;
use serde::{Serialize, Deserialize};
use sqlx::{FromRow, Row};
use sqlx::sqlite::SqliteRow;
use serde_json;

/// 工作流定义 (模板)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WorkflowDefinition {
    pub id: String,
    pub account_id: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub definition: schema::WorkflowDefinition, // 使用新的 DSL 结构
    pub created_at: String,
    pub updated_at: String,
}

// 旧的线性结构已移除，使用 schema::Node 和 schema::Edge 替代

/// 工作流实例 (运行时状态 - 检查点)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowInstance {
    pub id: String,
    pub account_id: String,
    pub contact_id: String,
    pub workflow_id: String,
    pub current_step_id: String,
    pub status: WorkflowStatus,
    pub context: serde_json::Value,
    pub started_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "PascalCase")]
pub enum WorkflowStatus {
    Running,
    Waiting,
    Completed,
    Failed,
    Cancelled,
}

impl WorkflowStatus {
    pub fn as_db_value(&self) -> &'static str {
        match self {
            WorkflowStatus::Running => "Running",
            WorkflowStatus::Waiting => "Waiting",
            WorkflowStatus::Completed => "Completed",
            WorkflowStatus::Failed => "Failed",
            WorkflowStatus::Cancelled => "Cancelled",
        }
    }
}

impl From<String> for WorkflowStatus {
    fn from(s: String) -> Self {
        match s.as_str() {
            "Running" => WorkflowStatus::Running,
            "Waiting" => WorkflowStatus::Waiting,
            "Completed" => WorkflowStatus::Completed,
            "Failed" => WorkflowStatus::Failed,
            "Cancelled" => WorkflowStatus::Cancelled,
            _ => WorkflowStatus::Failed,
        }
    }
}

impl<'r> FromRow<'r, SqliteRow> for WorkflowInstance {
    fn from_row(row: &'r SqliteRow) -> Result<Self, sqlx::Error> {
        let status_raw: String = row.try_get("status")?;
        let context_raw: String = row.try_get("context")?;
        
        Ok(Self {
            id: row.try_get("id")?,
            account_id: row.try_get("account_id")?,
            contact_id: row.try_get("contact_id")?,
            workflow_id: row.try_get("workflow_id")?,
            current_step_id: row.try_get("current_step_id")?,
            status: WorkflowStatus::from(status_raw),
            context: serde_json::from_str(&context_raw).unwrap_or(serde_json::json!({})),
            started_at: row.try_get("started_at")?,
            updated_at: row.try_get("updated_at")?,
            completed_at: row.try_get("completed_at")?,
        })
    }
}

/// 工作流执行日志
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WorkflowExecutionLog {
    pub id: i64,
    pub instance_id: String,
    pub step_id: String,
    pub event_type: String,
    pub event_data: Option<String>,
    pub created_at: String,
}
