use ractor::{Actor, ActorProcessingErr, ActorRef, SupervisionEvent};
use std::collections::HashMap;
use std::sync::Arc;
use crate::adapters::browser::cdp_adapter::CdpManager;
use super::account::{AccountActor, AccountConfig, AccountMessage};
use crate::adapters::db::behavior_tree_repo::BehaviorTreeRepository;
use ractor::async_trait as async_trait;
use tauri::Emitter;

#[derive(Debug)]
pub enum SupervisorMessage {
    SpawnAccount { config: AccountConfig },
    GetAccount(String, tokio::sync::oneshot::Sender<Option<ActorRef<AccountMessage>>>),
    KillAccount(String),
    GetSystemStatus(ractor::RpcReplyPort<crate::domain::dashboard::SystemStatus>),
}

pub struct SystemSupervisor;

pub struct SupervisorState {
    pub accounts: HashMap<String, ActorRef<AccountMessage>>,
    pub configs: HashMap<String, AccountConfig>,
    pub cdp_manager: Arc<CdpManager>,
    pub bt_repo: Arc<BehaviorTreeRepository>,
    pub app_handle: tauri::AppHandle,
}

#[async_trait]
impl Actor for SystemSupervisor {
    type Msg = SupervisorMessage;
    type State = SupervisorState;
    type Arguments = (Arc<CdpManager>, Arc<BehaviorTreeRepository>, tauri::AppHandle);

    async fn pre_start(
        &self,
        _myself: ActorRef<Self::Msg>,
        (cdp_manager, bt_repo, app_handle): Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        tracing::info!("[SystemSupervisor] Starting supervisor");
        Ok(SupervisorState {
            accounts: HashMap::new(),
            configs: HashMap::new(),
            cdp_manager,
            bt_repo,
            app_handle,
        })
    }

    async fn handle(
        &self,
        myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            SupervisorMessage::SpawnAccount { config } => {
                let account_id = config.account_id.clone();
                if state.accounts.contains_key(&account_id) {
                    tracing::warn!("[SystemSupervisor] Account {} already exists", account_id);
                    return Ok(());
                }

                tracing::info!("[SystemSupervisor] Spawning actor for {}", account_id);
                
                // Store config for self-healing
                state.configs.insert(account_id.clone(), config.clone());

                // Spawn the actor linked to this supervisor
                let (actor_ref, _) = Actor::spawn_linked(
                    Some(format!("account-{}", account_id)),
                    AccountActor,
                    (config, state.cdp_manager.clone(), state.bt_repo.clone()),
                    myself.get_cell(),
                ).await?;

                state.accounts.insert(account_id, actor_ref);
                
                // Emit system status update
                Self::emit_system_status(state).await;
            }
            SupervisorMessage::GetAccount(account_id, reply) => {
                let actor = state.accounts.get(&account_id).cloned();
                let _ = reply.send(actor);
            }
            SupervisorMessage::KillAccount(account_id) => {
                state.configs.remove(&account_id); // Stop self-healing for this account
                if let Some(actor) = state.accounts.remove(&account_id) {
                    tracing::info!("[SystemSupervisor] Killing actor for {}", account_id);
                    actor.stop(None);
                    
                    // Emit system status update
                    Self::emit_system_status(state).await;
                }
            }
            SupervisorMessage::GetSystemStatus(reply) => {
                let mut status = crate::domain::dashboard::SystemStatus::new();
                status.total_accounts = state.configs.len();
                status.online_count = state.accounts.len(); // Approximate, assuming active actors are "online"
                
                // Collect snapshots from all actors
                // Note: This is a scatter-gather operation. For simplicity in this iteration,
                // we might just count them or do a quick check. 
                // To do it properly, we need to ask each actor.
                
                // For now, let's just return the basic counts and iterate over known states if we had them cached.
                // Since we don't cache snapshots in SupervisorState yet, we'll just return the counts
                // and maybe implement a proper scatter-gather later or if requested.
                
                // BUT, the requirement is "Real-time visualization".
                // So we SHOULD try to get real data.
                
                let mut snapshots = Vec::new();
                for (id, actor) in &state.accounts {
                    // We fire and forget requests, but here we need to wait for replies.
                    // Doing this sequentially is slow. Doing it concurrently is better.
                    // For MVP, let's spawn tasks to collect them.
                    
                    // Actually, for the "GetSystemStatus" to be responsive, maybe we should maintain
                    // a cache of statuses pushed by actors?
                    // OR, we just return what we know (alive actors) and let the frontend query details?
                    
                    // Let's try a simple concurrent gather with timeout.
                    if let Ok(snapshot) = ractor::call!(actor, AccountMessage::GetSnapshot) {
                        snapshots.push(snapshot);
                    }
                }
                
                // Aggregate data
                for snap in &snapshots {
                    *status.lifecycle_distribution.entry(snap.status.as_str().to_string()).or_insert(0) += 1;
                }
                
                status.accounts = snapshots;
                
                // TODO: Add alerts
                
                let _ = reply.send(status);
            }
        }
        Ok(())
    }

    // Supervision logic: Handle child failures
    async fn handle_supervisor_evt(
        &self,
        myself: ActorRef<Self::Msg>,
        message: SupervisionEvent,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            SupervisionEvent::ActorFailed(actor_cell, error) => {
                let actor_name = actor_cell.get_name().unwrap_or("unknown".to_string());
                tracing::error!("[SystemSupervisor] 🚨 Actor {} failed: {}", actor_name, error);
                
                // Identify which account failed
                if let Some(account_id) = actor_name.strip_prefix("account-") {
                    let account_id = account_id.to_string();
                    
                    // Remove dead reference
                    state.accounts.remove(&account_id);

                    // Self-healing: Restart the actor
                    if let Some(config) = state.configs.get(&account_id) {
                        tracing::info!("[SystemSupervisor] 🩹 Self-healing: Restarting {}", account_id);
                        
                        // Re-spawn
                        match Actor::spawn_linked(
                            Some(format!("account-{}", account_id)),
                            AccountActor,
                            (config.clone(), state.cdp_manager.clone(), state.bt_repo.clone()),
                            myself.get_cell(),
                        ).await {
                            Ok((new_actor, _)) => {
                                state.accounts.insert(account_id, new_actor);
                                tracing::info!("[SystemSupervisor] ✅ Restarted successfully");
                            }
                            Err(e) => {
                                tracing::error!("[SystemSupervisor] ❌ Restart failed: {}", e);
                                // If restart fails, we might want to retry later or give up.
                                // For now, we leave it dead but config remains if we want to try again manually.
                            }
                        }
                    } else {
                        tracing::warn!("[SystemSupervisor] No config found for {}, cannot restart", account_id);
                    }
                }
            }
            SupervisionEvent::ActorTerminated(actor_cell, _, _) => {
                let actor_name = actor_cell.get_name().unwrap_or("unknown".to_string());
                tracing::info!("[SystemSupervisor] Actor {} terminated normally", actor_name);
                
                if let Some(account_id) = actor_name.strip_prefix("account-") {
                    state.accounts.remove(account_id);
                    // If terminated normally (e.g. via KillAccount), config should have been removed already.
                    // If it was a crash that looked like termination (unlikely with ractor), we check config.
                    // But usually KillAccount removes config.
                }
            }
            _ => {}
        }
        Ok(())
    }
}

impl SystemSupervisor {
    /// Helper to emit system status to frontend via Tauri events
    async fn emit_system_status(state: &SupervisorState) {
        // Collect snapshots
        let mut snapshots = Vec::new();
        for (_id, actor) in &state.accounts {
            if let Ok(snapshot) = ractor::call!(actor, AccountMessage::GetSnapshot) {
                snapshots.push(snapshot);
            }
        }
        
        // Build status
        let mut status = crate::domain::dashboard::SystemStatus::new();
        status.total_accounts = state.configs.len();
        status.online_count = state.accounts.len();
        
        for snap in &snapshots {
            *status.lifecycle_distribution.entry(snap.status.as_str().to_string()).or_insert(0) += 1;
        }
        
        status.accounts = snapshots;
        
        // Emit event to all frontend windows
        if let Err(e) = state.app_handle.emit("system_status_update", &status) {
            tracing::error!("[SystemSupervisor] Failed to emit system status: {}", e);
        } else {
            tracing::debug!("[SystemSupervisor] Emitted system status update");
        }
    }
}
