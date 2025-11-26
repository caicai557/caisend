use async_trait::async_trait;
use crate::domain::workflow::instance::WorkflowInstance;
use crate::domain::workflow::schema::WorkflowDefinition;
use crate::error::CoreError;

#[async_trait]
pub trait WorkflowRepositoryPort: Send + Sync {
    async fn save_definition(&self, def: &WorkflowDefinition) -> Result<(), CoreError>;
    async fn get_definition(&self, id: &str) -> Result<Option<WorkflowDefinition>, CoreError>;
    async fn save_instance(&self, instance: &WorkflowInstance) -> Result<(), CoreError>;
    async fn get_active_instance(&self, contact_id: &str) -> Result<Option<WorkflowInstance>, CoreError>;
}

#[async_trait]
pub trait ExecutionAdapterPort: Send + Sync {
    // 暂时使用 String 作为 Action 和 Result 的占位符，后续会具体化
    async fn execute_action(&self, action: &str) -> Result<String, CoreError>;
}

#[async_trait]
pub trait WorkflowEnginePort: Send + Sync {
    async fn process_message(&self, account_id: &str, conversation_id: &str, content: &str) -> Result<bool, anyhow::Error>;
}

#[async_trait]
pub trait RuleEnginePort: Send + Sync {
    async fn evaluate_message(&self, content: &str, account_id: &str) -> Option<crate::domain::models::AutomationRule>;
}

// 幽灵座舱：脚本仓库端口
pub mod script_repository;
pub use script_repository::ScriptRepositoryPort;
