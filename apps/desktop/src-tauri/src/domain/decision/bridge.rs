use crate::domain::behavior_tree::engine::{BehaviorTreeEngine, ActionContext};
use crate::domain::behavior_tree::state::{BehaviorTreeInstance, TreeStatus};
use crate::adapters::db::behavior_tree_repo::BehaviorTreeRepository;
use crate::domain::ports::WorkflowRepositoryPort;
use crate::infrastructure::PbtCheckpointer;
use anyhow::Result;
use std::sync::Arc;
use std::collections::HashMap;

/// PBT Tick执行结果
#[derive(Debug, Clone)]
pub enum PbtTickResult {
    /// PBT仍在运行中
    Running,
    /// PBT已完成
    Completed,
    /// PBT执行失败
    Failed(String),
}

/// WorkflowPbtBridge - Workflow和PBT之间的状态同步桥梁
/// 
/// 职责：
/// - PBT生命周期管理（启动、Tick、完成检查）
/// - Workflow和PBT之间的状态同步
/// - LVCP模式的PBT持久化
pub struct WorkflowPbtBridge {
    bt_repo: Arc<BehaviorTreeRepository>,
    workflow_repo: Arc<dyn WorkflowRepositoryPort>,
    pbt_checkpointer: PbtCheckpointer,
}

impl WorkflowPbtBridge {
    pub fn new(
        bt_repo: Arc<BehaviorTreeRepository>,
        workflow_repo: Arc<dyn WorkflowRepositoryPort>,
    ) -> Self {
        let pbt_checkpointer = PbtCheckpointer::new(bt_repo.clone());
        Self {
            bt_repo,
            workflow_repo,
            pbt_checkpointer,
        }
    }

    /// 启动PBT执行
    /// 
    /// 创建新的PBT实例，使用确定性的instance ID
    pub async fn start_pbt(
        &self,
        workflow_instance_id: &str,
        account_id: &str,
        tree_id: &str,
        context_mapping: &serde_json::Value,
    ) -> Result<String> {
        // 生成确定性的PBT instance ID
        let pbt_instance_id = format!("{}_{}", workflow_instance_id, tree_id);
        
        tracing::info!("[Bridge] Starting PBT {} for workflow {}", tree_id, workflow_instance_id);
        
        // 检查实例是否已存在
        let existing = self.bt_repo.get_instance(&pbt_instance_id).await?;
        
        if existing.is_some() {
            tracing::debug!("[Bridge] PBT instance {} already exists, reusing", pbt_instance_id);
            return Ok(pbt_instance_id);
        }
        
        // 加载PBT定义验证其存在
        let _definition = self.bt_repo.get_definition(tree_id).await?
            .ok_or_else(|| anyhow::anyhow!("PBT definition {} not found", tree_id))?;
        
        // 创建新的PBT实例
        let new_instance = BehaviorTreeInstance {
            id: pbt_instance_id.clone(),
            definition_id: tree_id.to_string(),
            account_id: account_id.to_string(),
            node_states: HashMap::new(),
            blackboard: context_mapping.clone().into(),
            status: TreeStatus::Running,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };
        
        self.bt_repo.save_instance(&new_instance).await?;
        
        tracing::info!("[Bridge] Created PBT instance {}", pbt_instance_id);
        
        Ok(pbt_instance_id)
    }

    /// 执行一次PBT Tick
    /// 
    /// 加载PBT实例和定义，执行一次tick，保存更新后的状态
    pub async fn tick_pbt(
        &self,
        pbt_instance_id: &str,
        context: &impl ActionContext,
    ) -> Result<PbtTickResult> {
        tracing::debug!("[Bridge] Ticking PBT {}", pbt_instance_id);
        
        // 加载PBT实例
        let mut instance = self.bt_repo.get_instance(pbt_instance_id).await?
            .ok_or_else(|| anyhow::anyhow!("PBT instance {} not found", pbt_instance_id))?;
        
        // 如果已经完成或失败，直接返回
        match instance.status {
            TreeStatus::Completed => return Ok(PbtTickResult::Completed),
            TreeStatus::Failed => return Ok(PbtTickResult::Failed("PBT already failed".to_string())),
            TreeStatus::Cancelled => return Ok(PbtTickResult::Failed("PBT cancelled".to_string())),
            TreeStatus::Running => {}
        }
        
        // 加载定义
        let definition = self.bt_repo.get_definition(&instance.definition_id).await?
            .ok_or_else(|| anyhow::anyhow!("PBT definition {} not found", instance.definition_id))?;
        
        // 执行tick
        let result_status = BehaviorTreeEngine::tick(&mut instance, &definition, context).await?;
        
        // 保存更新后的实例
        self.bt_repo.save_instance(&instance).await?;
        
        // 转换结果
        let tick_result = match result_status {
            TreeStatus::Running => {
                tracing::debug!("[Bridge] PBT {} still running", pbt_instance_id);
                PbtTickResult::Running
            }
            TreeStatus::Completed => {
                tracing::info!("[Bridge] PBT {} completed", pbt_instance_id);
                PbtTickResult::Completed
            }
            TreeStatus::Failed => {
                tracing::warn!("[Bridge] PBT {} failed", pbt_instance_id);
                PbtTickResult::Failed("PBT execution failed".to_string())
            }
            TreeStatus::Cancelled => {
                tracing::warn!("[Bridge] PBT {} cancelled", pbt_instance_id);
                PbtTickResult::Failed("PBT cancelled".to_string())
            }
        };
        
        Ok(tick_result)
    }

    /// 检查PBT是否已完成
    pub async fn is_pbt_completed(&self, pbt_instance_id: &str) -> Result<bool> {
        let instance = self.bt_repo.get_instance(pbt_instance_id).await?
            .ok_or_else(|| anyhow::anyhow!("PBT instance {} not found", pbt_instance_id))?;
        
        Ok(matches!(instance.status, TreeStatus::Completed | TreeStatus::Failed))
    }

    /// 获取PBT的blackboard数据（用于同步回Workflow）
    pub async fn get_pbt_blackboard(&self, pbt_instance_id: &str) -> Result<serde_json::Value> {
        let instance = self.bt_repo.get_instance(pbt_instance_id).await?
            .ok_or_else(|| anyhow::anyhow!("PBT instance {} not found", pbt_instance_id))?;
        
        // 将Blackboard转换为JSON
        Ok(serde_json::to_value(&instance.blackboard)?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pbt_instance_id_generation() {
        let workflow_id = "wf_123";
        let tree_id = "greeting_tree";
        let expected = format!("{}_{}", workflow_id, tree_id);
        assert_eq!(expected, "wf_123_greeting_tree");
    }
}
