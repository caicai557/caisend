use crate::domain::events::AppEvent;
use crate::domain::workflow::engine::WorkflowEngine;
use crate::domain::automation::RuleEngine;
use tokio::sync::mpsc;
use std::sync::Arc;

/// 事件优先级
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum EventPriority {
    Low = 0,
    Normal = 1,
    High = 2,
    Critical = 3,
}

/// 带优先级的事件
#[derive(Debug, Clone)]
pub struct PrioritizedEvent {
    pub priority: EventPriority,
    pub event: AppEvent,
    pub account_id: String,
}

/// 中央事件调度器
/// 
/// 实现优先级调度：
/// 1. Critical: 系统级事件
/// 2. High: WorkflowEngine 事件（PFSM 优先）
/// 3. Normal: RuleEngine 事件
/// 4. Low: 日志、分析等
pub struct EventDispatcher {
    event_rx: mpsc::UnboundedReceiver<PrioritizedEvent>,
    event_tx: mpsc::UnboundedSender<PrioritizedEvent>,
    workflow_engine: Option<Arc<WorkflowEngine>>,
    rule_engine: Option<Arc<RuleEngine>>,
}

impl EventDispatcher {
    pub fn new() -> Self {
        let (tx, rx) = mpsc::unbounded_channel();
        Self {
            event_rx: rx,
            event_tx: tx,
            workflow_engine: None,
            rule_engine: None,
        }
    }

    pub fn sender(&self) -> mpsc::UnboundedSender<PrioritizedEvent> {
        self.event_tx.clone()
    }

    pub fn set_workflow_engine(&mut self, engine: Arc<WorkflowEngine>) {
        self.workflow_engine = Some(engine);
    }

    pub fn set_rule_engine(&mut self, engine: Arc<RuleEngine>) {
        self.rule_engine = Some(engine);
    }

    /// 启动事件循环
    pub async fn run(mut self) {
        tracing::info!("EventDispatcher started");
        
        while let Some(event) = self.event_rx.recv().await {
            if let Err(e) = self.dispatch_event(event).await {
                tracing::error!("Error dispatching event: {:?}", e);
            }
        }
        
        tracing::info!("EventDispatcher stopped");
    }

    async fn dispatch_event(&self, prioritized: PrioritizedEvent) -> Result<(), Box<dyn std::error::Error>> {
        match prioritized.event {
            AppEvent::NewMessageReceived(msg) => {
                // Priority 1: Try WorkflowEngine (PFSM)
                if let Some(workflow_engine) = &self.workflow_engine {
                    let handled = workflow_engine
                        .process_message(
                            &prioritized.account_id,
                            &msg.conversation_id,
                            &msg.content,
                        )
                        .await
                        .unwrap_or(false);
                    
                    if handled {
                        tracing::info!("Message handled by WorkflowEngine");
                        return Ok(());
                    }
                }

                // Priority 2: Fallback to RuleEngine
                if let Some(rule_engine) = &self.rule_engine {
                    if let Some(matched_rule) = rule_engine
                        .evaluate_message(&msg.content, &prioritized.account_id)
                        .await
                    {
                        tracing::info!("Message handled by RuleEngine (Rule: {})", matched_rule.id);
                    } else {
                        tracing::debug!("No rule matched for message");
                    }
                }
            }
            AppEvent::InviteLinkFound { link } => {
                tracing::info!("Invite link found: {}", link);
                // Handle invite link logic
            }
            AppEvent::UnreadChatDetected { chat_id } => {
                tracing::info!("Unread chat detected: {}", chat_id);
                // Handle unread chat logic
            }
            AppEvent::WorkflowTimerTriggered { contact_id } => {
                tracing::info!("Workflow timer triggered for contact: {}", contact_id);
                // TODO: Trigger workflow execution for the contact
                if let Some(workflow_engine) = &self.workflow_engine {
                    let _ = workflow_engine
                        .process_message(&prioritized.account_id, &contact_id, "")
                        .await;
                }
            }
        }

        Ok(())
    }
}

impl Default for EventDispatcher {
    fn default() -> Self {
        Self::new()
    }
}
