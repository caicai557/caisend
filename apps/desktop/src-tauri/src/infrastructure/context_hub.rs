use std::sync::Arc;
use tokio::sync::RwLock;
use tauri::{AppHandle, Emitter};  // Emitter trait for emit()
use serde::{Serialize, Deserialize};
use crate::domain::ports::ScriptRepositoryPort;
use crate::domain::workflow::{ScriptFlow, ScriptInstance, AccountConfig};
use crate::infrastructure::persistence::cache::CacheManager;

/// 当前活跃上下文（三重焦点感知的核心）
#[derive(Debug, Clone, Default)]
struct ActiveContext {
    account_id: Option<String>,
    peer_id: Option<String>,
}

#[derive(Clone, Debug, Hash, PartialEq, Eq)]
pub enum ContextCacheKey {
    AccountConfig(String),
    Instance(String, String), // account_id, peer_id
    Flow(String), // flow_id
}

#[derive(Clone, Debug)]
pub enum ContextCacheValue {
    Config(AccountConfig),
    Instance(ScriptInstance),
    Flow(ScriptFlow),
}

/// 上下文中枢 - 幽灵座舱的大脑
/// 
/// 职责：
/// 1. 窗口感知：追踪活跃账号
/// 2. 会话感知：追踪活跃对话
/// 3. 状态感知：查询PFSM状态并广播给HUD
pub struct ContextHub {
    context: Arc<RwLock<ActiveContext>>,
    cache: CacheManager<ContextCacheKey, ContextCacheValue>,
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
            cache: CacheManager::new(1000), // Capacity 1000
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
        
        // 1. 获取上下文
        let (account_id, peer_id) = match self.get_context().await {
            Some(ctx) => ctx,
            None => {
                tracing::debug!("[ContextHub] Incomplete context, skipping broadcast");
                return;
            }
        };
        
        // 2. 查询数据（带缓存优化）
        let config = self.query_account_config(&account_id).await;
        let instance = self.query_instance(&account_id, &peer_id).await;
        let flow = self.query_flow(&account_id, &instance).await;
        
        // 3. 组装Payload
        let payload = self.build_payload(
            &account_id,
            &peer_id,
            config,
            instance.as_ref(),
            flow,
        );
        
        // 4. 广播到前端
        self.emit_update(payload, start.elapsed()).await;
    }
    
    /// 获取当前上下文（避免重复读锁）
    async fn get_context(&self) -> Option<(String, String)> {
        let ctx = self.context.read().await;
        match (&ctx.account_id, &ctx.peer_id) {
            (Some(a), Some(p)) => Some((a.clone(), p.clone())),
            _ => None,
        }
    }
    
    /// 查询账号配置（带缓存）
    async fn query_account_config(&self, account_id: &str) -> Option<AccountConfig> {
        let key = ContextCacheKey::AccountConfig(account_id.to_string());
        
        // 检查缓存
        if let Some(ContextCacheValue::Config(config)) = self.cache.get(&key).await {
            tracing::debug!("[ContextHub] Cache hit: account_config");
            return Some(config);
        }
        
        // 查询数据库
        let config = self.script_repo
            .get_account_config(account_id)
            .await
            .ok()
            .flatten();
        
        // 更新缓存
        if let Some(ref cfg) = config {
            self.cache.populate(key, ContextCacheValue::Config(cfg.clone())).await;
        }
        
        config
    }
    
    /// 查询运行实例
    async fn query_instance(
        &self,
        account_id: &str,
        peer_id: &str,
    ) -> Option<ScriptInstance> {
        let key = ContextCacheKey::Instance(account_id.to_string(), peer_id.to_string());

        // 检查缓存
        if let Some(ContextCacheValue::Instance(instance)) = self.cache.get(&key).await {
            tracing::debug!("[ContextHub] Cache hit: instance");
            return Some(instance);
        }

        let instance = self.script_repo
            .get_instance(account_id, peer_id)
            .await
            .ok()
            .flatten();

        if let Some(ref inst) = instance {
            self.cache.populate(key, ContextCacheValue::Instance(inst.clone())).await;
        }

        instance
    }
    
    /// 查询话术流程（带缓存）
    async fn query_flow(
        &self,
        account_id: &str,
        instance: &Option<ScriptInstance>,
    ) -> Option<ScriptFlow> {
        let flow_id = instance.as_ref()?.flow_id.clone();
        let key = ContextCacheKey::Flow(flow_id.clone());
        
        // 检查缓存
        if let Some(ContextCacheValue::Flow(flow)) = self.cache.get(&key).await {
            tracing::debug!("[ContextHub] Cache hit: flow");
            return Some(flow);
        }
        
        // 查询数据库
        let flows = self.script_repo
            .get_flows_by_account(account_id)
            .await
            .ok()?;
        
        let flow = flows.into_iter().find(|f| f.id == flow_id)?;
        
        // 更新缓存
        self.cache.populate(key, ContextCacheValue::Flow(flow.clone())).await;
        
        Some(flow)
    }
    
    /// 组装HUD更新载荷
    fn build_payload(
        &self,
        account_id: &str,
        peer_id: &str,
        config: Option<AccountConfig>,
        instance: Option<&ScriptInstance>,
        flow: Option<ScriptFlow>,
    ) -> HudUpdatePayload {
        let current_step_id = instance.and_then(|i| {
            flow.as_ref()
                .and_then(|f| f.steps.get(i.current_step_index))
                .map(|s| s.id.clone())
        });
        
        HudUpdatePayload {
            account_id: account_id.to_string(),
            peer_id: peer_id.to_string(),
            flow,
            current_step_id,
            is_autoreply_enabled: config
                .as_ref()
                .map(|c| c.autoreply_enabled)
                .unwrap_or(false),
        }
    }
    
    /// 发送事件到前端
    async fn emit_update(&self, payload: HudUpdatePayload, elapsed: std::time::Duration) {
        tracing::info!(
            "[ContextHub] Broadcasting update: account={}, peer={}, latency={}ms",
            payload.account_id, payload.peer_id, elapsed.as_millis()
        );
        
        if elapsed.as_millis() > 150 {
            tracing::warn!(
                "[ContextHub] ⚠️  Update latency exceeded 150ms target: {}ms",
                elapsed.as_millis()
            );
        }
        
        if let Err(e) = self.app_handle.emit("teleflow/hud-update", &payload) {
            tracing::error!("[ContextHub] Failed to emit event: {}", e);
        }
    }
    
    /// 手动触发广播（用于配置变更后）
    pub async fn notify_config_changed(&self) {
        // TODO: Invalidate specific config cache
        // self.cache.invalidate(...).await;
        self.broadcast_update().await;
    }
    
    /// 清除缓存（用于数据更新后）
    pub async fn clear_cache(&self) {
        // *self.cache.write().await = None;
        tracing::debug!("[ContextHub] Cache clear requested (handled by TTL/Eviction)");
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
