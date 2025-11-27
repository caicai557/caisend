use ractor::{Actor, ActorProcessingErr, ActorRef, SupervisionEvent};
use std::collections::HashMap;
use std::sync::Arc;
use crate::adapters::browser::cdp_adapter::CdpManager;
use super::account::{AccountActor, AccountConfig, AccountMessage};

#[derive(Debug, Clone)]
pub enum SupervisorMessage {
    SpawnAccount { config: AccountConfig },
    GetAccount(String, tokio::sync::oneshot::Sender<Option<ActorRef<AccountMessage>>>),
    KillAccount(String),
}

pub struct SystemSupervisor;

pub struct SupervisorState {
    pub accounts: HashMap<String, ActorRef<AccountMessage>>,
    pub cdp_manager: Arc<CdpManager>,
}

#[async_trait::async_trait]
impl Actor for SystemSupervisor {
    type Msg = SupervisorMessage;
    type State = SupervisorState;
    type Arguments = Arc<CdpManager>;

    async fn pre_start(
        &self,
        _myself: ActorRef<Self::Msg>,
        cdp_manager: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        tracing::info!("[SystemSupervisor] Starting supervisor");
        Ok(SupervisorState {
            accounts: HashMap::new(),
            cdp_manager,
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
        _myself: ActorRef<Self::Msg>,
        message: SupervisionEvent,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            SupervisionEvent::ActorFailed(actor_cell, error) => {
                let actor_name = actor_cell.get_name().unwrap_or("unknown".to_string());
                tracing::error!("[SystemSupervisor] 🚨 Actor {} failed: {}", actor_name, error);
                
                // Identify which account failed
                // Name format: "account-{id}"
                if let Some(account_id) = actor_name.strip_prefix("account-") {
                    let account_id = account_id.to_string();
                    
                    // Remove dead reference
                    state.accounts.remove(&account_id);

                    // Self-healing: Restart the actor
                    // Note: In a real system, we'd need to persist the config to restart it.
                    // For this MVP, we might need to store config in state.accounts or similar.
                    // But wait, we don't have the config here easily unless we stored it.
                    // Let's assume for now we just log it. 
                    // To implement true self-healing, we should store `AccountConfig` in `SupervisorState`.
                    
                    tracing::warn!("[SystemSupervisor] TODO: Implement auto-restart for {}", account_id);
                }
            }
            SupervisionEvent::ActorTerminated(actor_cell, _, _) => {
                let actor_name = actor_cell.get_name().unwrap_or("unknown".to_string());
                tracing::info!("[SystemSupervisor] Actor {} terminated normally", actor_name);
                
                if let Some(account_id) = actor_name.strip_prefix("account-") {
                    state.accounts.remove(account_id);
                }
            }
            _ => {}
        }
        Ok(())
    }
}
