use ractor::{Actor, ActorProcessingErr, ActorRef};
// use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::adapters::browser::cdp_adapter::CdpManager;
use crate::domain::workflow::ScriptStep;
use crate::infrastructure::ghost::circadian::CircadianRhythm;
use crate::infrastructure::ghost::biomechanics::HumanInput;
use crate::domain::behavior_tree::engine::{BehaviorTreeEngine, ActionContext};
use crate::domain::behavior_tree::state::NodeStatus;
use crate::adapters::db::behavior_tree_repo::BehaviorTreeRepository;
use crate::domain::lifecycle::{LifecycleManager, LifecycleStatus};
use ractor::async_trait as async_trait;

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
    SetLifecycleStatus(LifecycleStatus), // 新增：生命周期状态转换
}

pub struct AccountActor;

pub struct AccountState {
    pub config: AccountConfig,
    pub cdp_manager: Arc<CdpManager>,
    pub bt_repo: Arc<BehaviorTreeRepository>,
    pub is_connected: bool,
    pub circadian: CircadianRhythm,
    pub lifecycle_manager: LifecycleManager,
}

struct AccountActionContext {
    account_id: String,
    cdp_manager: Arc<CdpManager>,
    lifecycle_status: LifecycleStatus,
}

#[async_trait::async_trait]
impl ActionContext for AccountActionContext {
    async fn execute_action(&self, action_type: &str, params: &serde_json::Value) -> anyhow::Result<NodeStatus> {
        tracing::info!("[AccountActionContext] Executing action: {} for {}", action_type, self.account_id);
        
        match action_type {
            "send_message" => {
                let peer_id = params.get("peer_id").and_then(|v| v.as_str()).unwrap_or("");
                let content = params.get("content").and_then(|v| v.as_str()).unwrap_or("");
                
                if peer_id.is_empty() || content.is_empty() {
                    tracing::error!("Missing peer_id or content for send_message");
                    return Ok(NodeStatus::Failure);
                }

                // 👻 Ghost Protocol: Biomechanics
                let thinking_delay = HumanInput::get_thinking_delay();
                tokio::time::sleep(thinking_delay).await;
                
                let typing_delay = HumanInput::get_typing_delay() * content.len() as u32;
                tokio::time::sleep(typing_delay).await;

                match self.cdp_manager.send_message(&self.account_id, peer_id, content).await {
                    Ok(_) => Ok(NodeStatus::Success),
                    Err(e) => {
                        tracing::error!("Failed to send message: {}", e);
                        Ok(NodeStatus::Failure)
                    }
                }
            }
            "check_lifecycle" => {
                // 检查生命周期状态
                let required_status = params.get("status").and_then(|v| v.as_str());
                
                match required_status {
                    Some("active") => {
                        if matches!(self.lifecycle_status, LifecycleStatus::Active) {
                            Ok(NodeStatus::Success)
                        } else {
                            Ok(NodeStatus::Failure)
                        }
                    }
                    Some("login") => {
                        if matches!(self.lifecycle_status, LifecycleStatus::Login) {
                            Ok(NodeStatus::Success)
                        } else {
                            Ok(NodeStatus::Failure)
                        }
                    }
                    Some("restricted") => {
                        if matches!(self.lifecycle_status, LifecycleStatus::Restricted) {
                            Ok(NodeStatus::Success)
                        } else {
                            Ok(NodeStatus::Failure)
                        }
                    }
                    Some("banned") => {
                        if matches!(self.lifecycle_status, LifecycleStatus::Banned) {
                            Ok(NodeStatus::Success)
                        } else {
                            Ok(NodeStatus::Failure)
                        }
                    }
                    _ => {
                        tracing::warn!("Invalid or missing lifecycle status parameter");
                        Ok(NodeStatus::Failure)
                    }
                }
            }
            _ => {
                tracing::warn!("Unknown action type: {}", action_type);
                Ok(NodeStatus::Failure)
            }
        }
    }
    
    async fn detect_intent(&self, text: &str) -> anyhow::Result<crate::ai::IntentResult> {
        // TODO: 集成真实的IntentClassifier
        // 当前使用简单的关键词匹配进行Mock
        tracing::debug!("[AccountActionContext] Detecting intent for text: {}", text);
        
        let intent = if text.contains("你好") || text.contains("hello") || text.contains("hi") {
            crate::ai::IntentResult::new(crate::ai::intents::GREETING, 0.9)
        } else if text.contains("再见") || text.contains("bye") || text.contains("goodbye") {
            crate::ai::IntentResult::new(crate::ai::intents::FAREWELL, 0.9)
        } else if text.contains("?") || text.contains("？") || text.contains("什么") || text.contains("how") {
            crate::ai::IntentResult::new(crate::ai::intents::QUESTION, 0.8)
        } else {
            crate::ai::IntentResult::new(crate::ai::intents::UNKNOWN, 0.3)
        };
        
        tracing::info!("[AccountActionContext] Detected intent: {} (confidence: {})", intent.label, intent.confidence);
        Ok(intent)
    }
}

#[async_trait]
impl Actor for AccountActor {
    type Msg = AccountMessage;
    type State = AccountState;
    type Arguments = (AccountConfig, Arc<CdpManager>, Arc<BehaviorTreeRepository>);

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        (config, cdp_manager, bt_repo): Self::Arguments,
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
            bt_repo,
            is_connected: false,
            circadian: CircadianRhythm::default(), // TODO: Load from config
            lifecycle_manager: LifecycleManager::new(LifecycleStatus::Login),
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
                // Check lifecycle status first
                if !state.lifecycle_manager.can_execute_pbt() {
                    tracing::debug!(
                        "[AccountActor] PBT skipped - lifecycle status: {}",
                        state.lifecycle_manager.current_status().as_str()
                    );
                    return Ok(());
                }

                if state.is_connected {
                    // 1. Load active instance
                    if let Ok(Some(mut instance)) = state.bt_repo.get_active_instance_by_account(&state.config.account_id).await {
                        // 2. Load definition
                        if let Ok(Some(definition)) = state.bt_repo.get_definition(&instance.definition_id).await {
                            // 3. Create Context
                            let context = AccountActionContext {
                                account_id: state.config.account_id.clone(),
                                cdp_manager: state.cdp_manager.clone(),
                                lifecycle_status: state.lifecycle_manager.current_status(),
                            };

                            // 4. Tick
                            match BehaviorTreeEngine::tick(&mut instance, &definition, &context).await {
                                Ok(status) => {
                                    tracing::debug!("[AccountActor] Tick success, status: {:?}", status);
                                    // 5. Save state
                                    if let Err(e) = state.bt_repo.save_instance(&instance).await {
                                        tracing::error!("[AccountActor] Failed to save instance: {}", e);
                                    }
                                }
                                Err(e) => {
                                    tracing::error!("[AccountActor] Tick failed: {}", e);
                                }
                            }
                        }
                    }
                }
            }
            AccountMessage::SetLifecycleStatus(new_status) => {
                if let Some(transition) = state.lifecycle_manager.transition_to(new_status) {
                    tracing::info!(
                        "[AccountActor] Lifecycle transitioned: {} -> {}",
                        transition.from.as_str(),
                        transition.to.as_str()
                    );

                    // Handle state transition side effects
                    if transition.should_pause_pbt() {
                        tracing::info!("[AccountActor] PBT execution paused");
                        // Future: Update PBT instance status if needed
                    } else if transition.should_resume_pbt() {
                        tracing::info!("[AccountActor] PBT execution resumed");
                        // Future: Resume PBT instance if needed
                    }
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
