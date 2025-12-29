//! SystemSupervisor - The Root Supervisor managing all AccountActors
//!
//! Implements the "Let It Crash" philosophy with automatic restart.
//! Strategy: OneForOne (if one account crashes, others are unaffected)

use std::collections::HashMap;

use ractor::{Actor, ActorProcessingErr, ActorRef, SupervisionEvent};
use tracing::{error, info, warn};

use super::account::AccountActor;
use super::messages::{AccountMessage, SupervisorMessage, SupervisorStatus};

/// State held by the SystemSupervisor
pub struct SupervisorState {
    /// Map of account_id -> ActorRef
    pub accounts: HashMap<String, ActorRef<AccountMessage>>,
}

impl Default for SupervisorState {
    fn default() -> Self {
        Self {
            accounts: HashMap::new(),
        }
    }
}

/// The SystemSupervisor - root of the Actor hierarchy
pub struct SystemSupervisor;

impl SystemSupervisor {
    pub fn new() -> Self {
        Self
    }

    /// Spawn an AccountActor as a child
    async fn spawn_account(
        &self,
        myself: &ActorRef<SupervisorMessage>,
        account_id: &str,
        state: &mut SupervisorState,
    ) -> Result<ActorRef<AccountMessage>, ActorProcessingErr> {
        let actor_name = format!("account_{}", account_id);
        
        // Spawn the actor linked to this supervisor
        let (actor_ref, _handle) = Actor::spawn_linked(
            Some(actor_name),
            AccountActor::new(),
            account_id.to_string(),
            myself.get_cell(),
        )
        .await
        .map_err(|e| ActorProcessingErr::from(format!("Failed to spawn account: {}", e)))?;

        state.accounts.insert(account_id.to_string(), actor_ref.clone());
        info!("👑 Supervisor spawned AccountActor: {}", account_id);
        
        Ok(actor_ref)
    }
}

#[ractor::async_trait]
impl Actor for SystemSupervisor {
    type Msg = SupervisorMessage;
    type State = SupervisorState;
    type Arguments = ();

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        _args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        info!(
            "👑 SystemSupervisor initialized. Actor ID: {:?}",
            myself.get_id()
        );
        Ok(SupervisorState::default())
    }

    async fn handle(
        &self,
        myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            SupervisorMessage::SpawnAccount { account_id } => {
                if state.accounts.contains_key(&account_id) {
                    warn!("Account {} already exists", account_id);
                } else {
                    self.spawn_account(&myself, &account_id, state).await?;
                }
            }
            SupervisorMessage::RemoveAccount { account_id } => {
                if let Some(actor_ref) = state.accounts.remove(&account_id) {
                    actor_ref.stop(Some("Removed by supervisor".to_string()));
                    info!("👑 Removed AccountActor: {}", account_id);
                }
            }
            SupervisorMessage::GetStatus => {
                let _status = SupervisorStatus {
                    active_accounts: state.accounts.keys().cloned().collect(),
                };
                // TODO: Return via reply channel
            }
        }
        Ok(())
    }

    async fn handle_supervisor_evt(
        &self,
        myself: ActorRef<Self::Msg>,
        event: SupervisionEvent,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match event {
            SupervisionEvent::ActorTerminated(actor_cell, _actor_id, reason) => {
                // Find which account this was
                let account_id = state
                    .accounts
                    .iter()
                    .find(|(_, v)| v.get_id() == actor_cell.get_id())
                    .map(|(k, _)| k.clone());

                if let Some(account_id) = account_id {
                    error!(
                        "🔥 AccountActor [{}] terminated: {:?}. Initiating Phoenix Protocol...",
                        account_id, reason
                    );
                    
                    // Remove from map
                    state.accounts.remove(&account_id);
                    
                    // Respawn (Phoenix Protocol)
                    match self.spawn_account(&myself, &account_id, state).await {
                        Ok(_) => {
                            info!("🐦‍🔥 Phoenix Protocol successful: [{}] has been reborn!", account_id);
                        }
                        Err(e) => {
                            error!("❌ Phoenix Protocol FAILED for [{}]: {:?}", account_id, e);
                        }
                    }
                }
            }
            SupervisionEvent::ActorStarted(actor_cell) => {
                info!("✨ Child actor started: {:?}", actor_cell.get_id());
            }
            SupervisionEvent::ActorFailed(actor_cell, panic_msg) => {
                error!(
                    "💥 Child actor FAILED: {:?}, reason: {:?}",
                    actor_cell.get_id(),
                    panic_msg
                );
                // ActorTerminated will follow, which handles restart
            }
            _ => {}
        }
        Ok(())
    }

    async fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        _state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        info!("👑 SystemSupervisor shutting down.");
        Ok(())
    }
}
