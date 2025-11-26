use std::sync::Arc;
use tokio::sync::RwLock;
use tauri::{AppHandle, Manager};  // Manager trait needed for emit()
use serde::{Serialize, Deserialize};
use crate::domain::ports::ScriptRepositoryPort;
use crate::domain::workflow::{ScriptFlow};

/// 当前活跃上下文（三重焦点感知的核心）
#[derive(Debug, Clone, Default)]
struct ActiveContext {
    account_id: Option<String>,
    peer_id: Option<String>,
}

/// 上下文中枢 - 幽灵座舱的大脑
/// 
/// 职责：
/// 1. 窗口感知：追踪活跃账号
/// 2. 会话感知：追踪活跃对话
/// 3. 状态感知：查询PFSM状态并广播给HUD
pub struct ContextHub {
    context: Arc<RwLock<ActiveContext>>,
    script_repo: Arc<dyn ScriptRepositoryPort>,
    app_handle: AppHandle,
}

impl ContextHub {
    pub fn new(
        app_handle: AppHandle,
        script_repo: Arc<dyn ScriptRepositoryPort>,
    ) -> Self {
        Self {
            context: Arc::new(RwLock::new(ActiveContext::default())),
            script_repo,
            app_handle,
        }
    }
    
    /// 窗口感知：更新活跃账号
    /// 
    /// 当用户聚焦某个账号窗口时调用
    pub async fn update_active_account(&self, account_id: String) {
        tracing::info!("[ContextHub] Window focus changed: account={}", account_id);
        
        let mut ctx = self.context.write().await;
        ctx.account_id = Some(account_id.clone());
        drop(ctx);
        
        // 触发上下文广播
        self.broadcast_update().await;
    }
    
    /// 会话感知：更新活跃对话
    /// 
    /// 当用户切换对话时调用（由JS注入脚本上报）
    pub async fn update_active_peer(&self, peer_id: String) {
        tracing::info!("[ContextHub] Conversation focus changed: peer={}", peer_id);
        
        let mut ctx = self.context.write().await;
        ctx.peer_id = Some(peer_id.clone());
        drop(ctx);
        
        self.broadcast_update().await;
    }
    
    /// 状态感知 + 广播（核心玄机）
    /// 
    /// 查询当前上下文的完整状态并广播给HUD前端
    pub async fn broadcast_update(&self) {
        let start = std::time::Instant::now();
        
        let ctx = self.context.read().await;
        
        let (account_id, peer_id) = match (&ctx.account_id, &ctx.peer_id) {
            (Some(a), Some(p)) => (a.clone(), p.clone()),
            _ => {
                tracing::debug!("[ContextHub] Incomplete context, skipping broadcast");
                return; // 上下文不完整,不广播
            }
        };
        drop(ctx);
        
        // 1. 查询账号配置
        let config = self.script_repo
            .get_account_config(&account_id)
            .await
            .ok()
            .flatten();
        
        // 2. 查询运行时实例
        let instance = self.script_repo
            .get_instance(&account_id, &peer_id)
            .await
            .ok()
            .flatten();
        
        // 3. 查询话术流程
        let flow = if let Some(inst) = &instance {
            self.script_repo
                .get_flows_by_account(&account_id)
                .await
                .ok()
                .and_then(|flows| {
                    flows.into_iter()
                        .find(|f| f.id == inst.flow_id)
                })
        } else {
            None
        };
        
        // 4. 组装Payload
        let payload = HudUpdatePayload {
            account_id: account_id.clone(),
            peer_id: peer_id.clone(),
            flow: flow.clone(),
            current_step_id: instance.as_ref().and_then(|i| {
                flow.as_ref()
                    .and_then(|f| f.steps.get(i.current_step_index))
                    .map(|s| s.id.clone())
            }),
            is_autoreply_enabled: config
                .as_ref()
                .map(|c| c.autoreply_enabled)
                .unwrap_or(false),
        };
        
        // 5. 广播到前端
        let elapsed = start.elapsed();
        tracing::info!(
            "[ContextHub] Broadcasting update: account={}, peer={}, latency={}ms",
            account_id, peer_id, elapsed.as_millis()
        );
        
        if elapsed.as_millis() > 150 {
            tracing::warn!(
                "[ContextHub] ⚠️  Update latency exceeded 150ms target: {}ms",
                elapsed.as_millis()
            );
        }
        
        let _ = self.app_handle.emit("teleflow/hud-update", payload);
    }
    
    /// 手动触发广播（用于配置变更后）
    pub async fn notify_config_changed(&self) {
        self.broadcast_update().await;
    }
}

/// HUD更新载荷（发送给前端）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HudUpdatePayload {
    pub account_id: String,
    pub peer_id: String,
    pub flow: Option<ScriptFlow>,
    pub current_step_id: Option<String>,
    pub is_autoreply_enabled: bool,
}

#[cfg(test)]
mod tests {
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
    
    // 注：因为需要真实的Tauri AppHandle，完整测试需要集成测试环境
    // 这里只测试逻辑结构
}
