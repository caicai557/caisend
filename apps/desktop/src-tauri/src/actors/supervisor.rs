use ractor::{Actor, ActorProcessingErr, ActorRef, SupervisionEvent};
use std::collections::HashMap;
use std::sync::Arc;
use crate::adapters::browser::cdp_adapter::CdpManager;
use super::account::{AccountActor, AccountConfig, AccountMessage};

use crate::domain::decision::pbt_engine::PbtEngine;

#[derive(Debug)]
pub enum SupervisorMessage {
    SpawnAccount { config: AccountConfig },
    GetAccount(String, tokio::sync::oneshot::Sender<Option<ActorRef<AccountMessage>>>),
    KillAccount(String),
}

pub struct SystemSupervisor;

pub struct SupervisorState {
    pub accounts: HashMap<String, ActorRef<AccountMessage>>,
    pub configs: HashMap<String, AccountConfig>,
    pub cdp_manager: Arc<CdpManager>,
    pub pbt_engine: Arc<PbtEngine>,
}

// use async_trait::async_trait;

// #[async_trait]
impl Actor for SystemSupervisor {
    type Msg = SupervisorMessage;
    type State = SupervisorState;
    type Arguments = (Arc<CdpManager>, Arc<PbtEngine>);

    async fn pre_start(
        &self,
        _myself: ActorRef<Self::Msg>,
        (cdp_manager, pbt_engine): Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        tracing::info!("[SystemSupervisor] Starting supervisor");
        Ok(SupervisorState {
            accounts: HashMap::new(),
            configs: HashMap::new(),
            cdp_manager,
            pbt_engine,
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
                    (config, state.cdp_manager.clone()),
                    myself.get_cell(),
                ).await?;

                state.accounts.insert(account_id, actor_ref);
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
                }
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
                            (config.clone(), state.cdp_manager.clone()),
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
