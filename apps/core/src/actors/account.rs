//! AccountActor - The Worker Actor for a single Telegram account
//!
//! Responsibilities:
//! - Handle Start/Stop commands
//! - Process perception signals
//! - Manage workflow state (PFSM)

use ractor::{Actor, ActorProcessingErr, ActorRef};
use tracing::{info, warn};

use super::messages::AccountMessage;

/// State held by the AccountActor
#[derive(Default)]
pub struct AccountState {
    pub account_id: String,
    pub is_running: bool,
    pub current_flow_id: Option<String>,
}

/// The AccountActor worker
pub struct AccountActor;

impl AccountActor {
    pub fn new() -> Self {
        Self
    }
}

#[ractor::async_trait]
impl Actor for AccountActor {
    type Msg = AccountMessage;
    type State = AccountState;
    type Arguments = String; // account_id

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        account_id: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        info!(
            "🏛️ Lord [{}] has risen. Actor ID: {:?}",
            account_id,
            myself.get_id()
        );
        Ok(AccountState {
            account_id,
            is_running: false,
            current_flow_id: None,
        })
    }

    async fn handle(
        &self,
        _myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            AccountMessage::Start { flow_id } => {
                info!(
                    "[{}] 🚀 Starting workflow: {}",
                    state.account_id, flow_id
                );
                state.is_running = true;
                state.current_flow_id = Some(flow_id);
            }
            AccountMessage::Stop => {
                info!("[{}] ⏹️ Stopping workflow", state.account_id);
                state.is_running = false;
                state.current_flow_id = None;
            }
            AccountMessage::Signal { source, payload } => {
                info!(
                    "[{}] 📡 Received signal from {:?}, payload size: {} bytes",
                    state.account_id,
                    source,
                    payload.len()
                );
                // TODO: Forward to WorkflowActor for processing
            }
            AccountMessage::Heartbeat => {
                // Silent heartbeat for health monitoring
            }
            #[cfg(test)]
            AccountMessage::Kill => {
                warn!("[{}] ☠️ Kill command received - simulating crash!", state.account_id);
                panic!("Intentional crash for Phoenix Test");
            }
        }
        Ok(())
    }

    async fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        info!("[{}] 💀 Lord has fallen.", state.account_id);
        Ok(())
    }
}
