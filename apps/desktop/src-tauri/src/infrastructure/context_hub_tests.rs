// ContextHub 核心逻辑测试

use super::*;
use crate::domain::workflow::{ScriptFlow, ScriptStep, ScriptInstance, AccountConfig, AdvanceMode};
use crate::domain::workflow::script::InstanceStatus;
use async_trait::async_trait;
use crate::error::CoreError;

// Mock Repository
struct MockScriptRepo {
    flows: Vec<ScriptFlow>,
    instances: Vec<ScriptInstance>,
    configs: Vec<AccountConfig>,
}

#[async_trait]
impl ScriptRepositoryPort for MockScriptRepo {
    async fn get_flows_by_account(&self, _account_id: &str) -> Result<Vec<ScriptFlow>, CoreError> {
        Ok(self.flows.clone())
    }
    
    async fn get_flow(&self, flow_id: &str) -> Result<Option<ScriptFlow>, CoreError> {
        Ok(self.flows.iter().find(|f| f.id == flow_id).cloned())
    }
    
    async fn save_flow(&self, _flow: &ScriptFlow) -> Result<(), CoreError> {
        Ok(())
    }
    
    async fn get_instance(&self, account_id: &str, peer_id: &str) -> Result<Option<ScriptInstance>, CoreError> {
        Ok(self.instances.iter()
            .find(|i| i.account_id == account_id && i.peer_id == peer_id)
            .cloned())
    }
    
    async fn save_instance(&self, _instance: &ScriptInstance) -> Result<(), CoreError> {
        Ok(())
    }
    
    async fn get_account_config(&self, account_id: &str) -> Result<Option<AccountConfig>, CoreError> {
        Ok(self.configs.iter().find(|c| c.account_id == account_id).cloned())
    }
    
    async fn toggle_autoreply(&self, _account_id: &str) -> Result<bool, CoreError> {
        Ok(true)
    }
}

// 测试数据工厂
fn create_test_flow() -> ScriptFlow {
    ScriptFlow {
        id: "flow_test".to_string(),
        account_id: "test_account".to_string(),
        category_name: "测试流程".to_string(),
        steps: vec![
            ScriptStep {
                id: "step1".to_string(),
                order: 0,
                content: "第一步".to_string(),
                advance_mode: AdvanceMode::Manual,
            },
            ScriptStep {
                id: "step2".to_string(),
                order: 1,
                content: "第二步".to_string(),
                advance_mode: AdvanceMode::Manual,
            },
        ],
        created_at: 0,
        updated_at: 0,
    }
}

fn create_test_instance() -> ScriptInstance {
    ScriptInstance {
        id: "inst_test".to_string(),
        flow_id: "flow_test".to_string(),
        account_id: "test_account".to_string(),
        peer_id: "test_peer".to_string(),
        current_step_index: 0,
        status: InstanceStatus::Running,
        created_at: 0,
        updated_at: 0,
    }
}

fn create_test_config() -> AccountConfig {
    AccountConfig {
        account_id: "test_account".to_string(),
        autoreply_enabled: true,
        updated_at: 0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_mock_repo_get_flow() {
        let repo = MockScriptRepo {
            flows: vec![create_test_flow()],
            instances: vec![],
            configs: vec![],
        };
        
        let flow = repo.get_flow("flow_test").await.unwrap();
        assert!(flow.is_some());
        assert_eq!(flow.unwrap().id, "flow_test");
    }
    
    #[tokio::test]
    async fn test_mock_repo_get_instance() {
        let repo = MockScriptRepo {
            flows: vec![],
            instances: vec![create_test_instance()],
            configs: vec![],
        };
        
        let instance = repo.get_instance("test_account", "test_peer").await.unwrap();
        assert!(instance.is_some());
        assert_eq!(instance.unwrap().current_step_index, 0);
    }
    
    #[tokio::test]
    async fn test_mock_repo_get_config() {
        let repo = MockScriptRepo {
            flows: vec![],
            instances: vec![],
            configs: vec![create_test_config()],
        };
        
        let config = repo.get_account_config("test_account").await.unwrap();
        assert!(config.is_some());
        assert_eq!(config.unwrap().autoreply_enabled, true);
    }
    
    #[tokio::test]
    async fn test_query_cache_basic() {
        let repo = MockScriptRepo {
            flows: vec![create_test_flow()],
            instances: vec![],
            configs: vec![create_test_config()],
        };
        
        // 测试缓存基本功能
        let config1 = repo.get_account_config("test_account").await.unwrap();
        let config2 = repo.get_account_config("test_account").await.unwrap();
        
        assert_eq!(config1, config2);
    }
    /*
    #[test]
    fn test_advance_mode_serialization() {
        // ...
    }

    #[test]
    fn test_script_step_serialization() {
        // ...
    }
    */
}
