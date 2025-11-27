use ractor::{Actor, ActorProcessingErr, ActorRef};
// use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::adapters::browser::cdp_adapter::CdpManager;
use crate::domain::workflow::ScriptStep;
use crate::infrastructure::ghost::circadian::CircadianRhythm;
use crate::infrastructure::ghost::biomechanics::HumanInput;
use crate::domain::decision::pbt_engine::PbtEngine;

#[derive(Debug, Clone)]
pub struct AccountConfig {
    pub account_id: String,
    pub proxy: Option<String>,
    pub user_agent: Option<String>,
}

#[derive(Debug, Clone)]
pub enum AccountMessage {
    Connect { port: u16 },
    Disconnect,
    ExecuteWorkflow { peer_id: String, step: ScriptStep },
    UpdateConfig(AccountConfig),
    HealthCheck,
    Tick, // PBT Tick
}

pub struct AccountActor;

pub struct AccountState {
    pub config: AccountConfig,
    pub cdp_manager: Arc<CdpManager>,
    pub pbt_engine: Arc<PbtEngine>,
    pub is_connected: bool,
    pub circadian: CircadianRhythm,
}

// use async_trait::async_trait;

// #[async_trait]
impl Actor for AccountActor {
    type Msg = AccountMessage;
    type State = AccountState;
    type Arguments = (AccountConfig, Arc<CdpManager>, Arc<PbtEngine>);

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        (config, cdp_manager, pbt_engine): Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        tracing::info!("[AccountActor] Starting for account {}", config.account_id);
        
        // Start PBT Tick Loop
        let myself_clone = myself.clone();
        tokio::spawn(async move {
            loop {
                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                if let Err(e) = myself_clone.cast(AccountMessage::Tick) {
                    tracing::warn!("[AccountActor] Failed to send Tick: {}", e);
                    break;
                }
            }
        });

        Ok(AccountState {
            config,
            cdp_manager,
            pbt_engine,
            is_connected: false,
            circadian: CircadianRhythm::default(), // TODO: Load from config
        })
    }

    async fn handle(
        &self,
        _myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            AccountMessage::Connect { port } => {
                tracing::info!("[AccountActor] Connecting {} on port {}", state.config.account_id, port);
                match state.cdp_manager.connect(state.config.account_id.clone(), port).await {
                    Ok(_) => {
                        state.is_connected = true;
                        tracing::info!("[AccountActor] Connected successfully");
                    }
                    Err(e) => {
                        tracing::error!("[AccountActor] Connection failed: {}", e);
                    }
                }
            }
            AccountMessage::Disconnect => {
                tracing::info!("[AccountActor] Disconnecting {}", state.config.account_id);
                state.cdp_manager.disconnect(&state.config.account_id).await;
                state.is_connected = false;
            }
            AccountMessage::ExecuteWorkflow { peer_id, step } => {
                if !state.is_connected {
                    tracing::warn!("[AccountActor] Cannot execute workflow: Not connected");
                    return Ok(());
                }

                // 👻 Ghost Protocol: Circadian Rhythm Check
                if !state.circadian.should_be_active() {
                    tracing::warn!("[AccountActor] 🌙 Circadian Rhythm: Account is resting. Skipping execution.");
                    // In a real system, we might reschedule or queue this.
                    // For now, we just drop it to simulate "offline".
                    return Ok(());
                }
                
                tracing::info!("[AccountActor] Executing step {} for peer {}", step.id, peer_id);

                // 👻 Ghost Protocol: Biomechanics (Thinking Delay)
                let thinking_delay = HumanInput::get_thinking_delay();
                tracing::debug!("[AccountActor] 🤔 Thinking for {:?}", thinking_delay);
                tokio::time::sleep(thinking_delay).await;

                // 👻 Ghost Protocol: Biomechanics (Typing Delay)
                // Simulate typing time based on content length
                let typing_delay = HumanInput::get_typing_delay() * step.content.len() as u32;
                tracing::debug!("[AccountActor] ⌨️ Typing simulation for {:?}", typing_delay);
                tokio::time::sleep(typing_delay).await;

                match state.cdp_manager.send_message(&state.config.account_id, &peer_id, &step.content).await {
                    Ok(_) => tracing::info!("[AccountActor] Message sent"),
                    Err(e) => tracing::error!("[AccountActor] Send failed: {}", e),
                }
            }
            AccountMessage::UpdateConfig(new_config) => {
                tracing::info!("[AccountActor] Updating config for {}", new_config.account_id);
                state.config = new_config;
            }
            AccountMessage::HealthCheck => {
                tracing::debug!("[AccountActor] Health check for {}", state.config.account_id);
            }
            AccountMessage::Tick => {
                if state.is_connected {
                    // TODO: Get root node from DB or cache
                    // For now, we skip ticking if no tree is loaded
                    // state.pbt_engine.tick(&state.config.account_id, &root_node).await?;
                    tracing::debug!("[AccountActor] Tick received (PBT not fully connected yet)");
                }
            }
        }
        Ok(())
    }

    async fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        tracing::info!("[AccountActor] Stopping {}", state.config.account_id);
        state.cdp_manager.disconnect(&state.config.account_id).await;
        Ok(())
    }
}
