use async_trait::async_trait;
use crate::domain::workflow::script::{ScriptFlow, ScriptInstance, AccountConfig};
use crate::error::CoreError;

/// 脚本仓库端口（Hexagonal Architecture）
#[async_trait]
pub trait ScriptRepositoryPort: Send + Sync {
    /// 获取账号的所有话术流程
    async fn get_flows_by_account(
        &self, 
        account_id: &str
    ) -> Result<Vec<ScriptFlow>, CoreError>;
    
    /// 获取特定流程
    async fn get_flow(
        &self,
        flow_id: &str,
    ) -> Result<Option<ScriptFlow>, CoreError>;
    
    /// 保存流程
    async fn save_flow(
        &self,
        flow: &ScriptFlow,
    ) -> Result<(), CoreError>;
    
    /// 获取运行时实例
    async fn get_instance(
        &self,
        account_id: &str,
        peer_id: &str,
    ) -> Result<Option<ScriptInstance>, CoreError>;
    
    /// 保存/更新实例
    async fn save_instance(
        &self,
        instance: &ScriptInstance,
    ) -> Result<(), CoreError>;
    
    /// 获取账号配置
    async fn get_account_config(
        &self,
        account_id: &str,
    ) -> Result<Option<AccountConfig>, CoreError>;
    
    /// 切换自动回复开关
    async fn toggle_autoreply(
        &self,
        account_id: &str,
    ) -> Result<bool, CoreError>;
}
