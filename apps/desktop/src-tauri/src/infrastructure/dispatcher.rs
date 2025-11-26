use crate::domain::events::AppEvent;
use crate::domain::ports::{WorkflowEnginePort, RuleEnginePort};
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
    workflow_engine: Option<Arc<dyn WorkflowEnginePort>>,
    rule_engine: Option<Arc<dyn RuleEnginePort>>,
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

    pub fn set_workflow_engine(&mut self, engine: Arc<dyn WorkflowEnginePort>) {
        self.workflow_engine = Some(engine);
    }

    pub fn set_rule_engine(&mut self, engine: Arc<dyn RuleEnginePort>) {
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
#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::models::{AutomationRule, Message};
    use tokio::sync::Mutex;

    // Mock Workflow Engine
    struct MockWorkflowEngine {
        should_handle: bool,
        handled_count: Arc<Mutex<usize>>,
    }

    #[async_trait::async_trait]
    impl WorkflowEnginePort for MockWorkflowEngine {
        async fn process_message(
            &self,
            _account_id: &str,
            _conversation_id: &str,
            _content: &str,
        ) -> Result<bool, anyhow::Error> {
            let mut count = self.handled_count.lock().await;
            *count += 1;
            Ok(self.should_handle)
        }
    }

    // Mock Rule Engine
    struct MockRuleEngine {
        should_match: bool,
        matched_count: Arc<Mutex<usize>>,
    }

    #[async_trait::async_trait]
    impl RuleEnginePort for MockRuleEngine {
        async fn evaluate_message(
            &self,
            _content: &str,
            _account_id: &str,
        ) -> Option<AutomationRule> {
            let mut count = self.matched_count.lock().await;
            *count += 1;
            
            if self.should_match {
                Some(AutomationRule {
                    id: "test_rule".to_string(),
                    account_id: None,
                    trigger_type: crate::domain::models::TriggerType::Keyword,
                    trigger_pattern: None,
                    reply_text: None,
                    delay_min_ms: 0,
                    delay_max_ms: 0,
                    is_enabled: true,
                })
            } else {
                None
            }
        }
    }

    #[tokio::test]
    async fn test_dispatch_priority_workflow_first() {
        let mut dispatcher = EventDispatcher::new();
        let wf_count = Arc::new(Mutex::new(0));
        let rule_count = Arc::new(Mutex::new(0));

        // Setup Workflow Engine (Handles message)
        let wf_engine = Arc::new(MockWorkflowEngine {
            should_handle: true,
            handled_count: wf_count.clone(),
        });
        dispatcher.set_workflow_engine(wf_engine);

        // Setup Rule Engine (Should NOT be called)
        let rule_engine = Arc::new(MockRuleEngine {
            should_match: true,
            matched_count: rule_count.clone(),
        });
        dispatcher.set_rule_engine(rule_engine);

        // Send message event
        let event = PrioritizedEvent {
            priority: EventPriority::Normal,
            event: AppEvent::NewMessageReceived(Message {
                id: "msg_1".to_string(),
                conversation_id: "conv_1".to_string(),
                content: "hello".to_string(),
                sender_id: "user".to_string(),
                message_type: "text".to_string(),
                status: "received".to_string(),
                created_at: "2023-01-01T00:00:00Z".to_string(),
            }),
            account_id: "acc_1".to_string(),
        };

        dispatcher.dispatch_event(event).await.unwrap();

        // Verify: Workflow handled it, Rule engine ignored
        assert_eq!(*wf_count.lock().await, 1);
        assert_eq!(*rule_count.lock().await, 0);
    }

    #[tokio::test]
    async fn test_dispatch_fallback_to_rule_engine() {
        let mut dispatcher = EventDispatcher::new();
        let wf_count = Arc::new(Mutex::new(0));
        let rule_count = Arc::new(Mutex::new(0));

        // Setup Workflow Engine (Does NOT handle message)
        let wf_engine = Arc::new(MockWorkflowEngine {
            should_handle: false,
            handled_count: wf_count.clone(),
        });
        dispatcher.set_workflow_engine(wf_engine);

        // Setup Rule Engine (Should be called)
        let rule_engine = Arc::new(MockRuleEngine {
            should_match: true,
            matched_count: rule_count.clone(),
        });
        dispatcher.set_rule_engine(rule_engine);

        // Send message event
        let event = PrioritizedEvent {
            priority: EventPriority::Normal,
            event: AppEvent::NewMessageReceived(Message {
                id: "msg_1".to_string(),
                conversation_id: "conv_1".to_string(),
                content: "hello".to_string(),
                sender_id: "user".to_string(),
                message_type: "text".to_string(),
                status: "received".to_string(),
                created_at: "2023-01-01T00:00:00Z".to_string(),
            }),
            account_id: "acc_1".to_string(),
        };

        dispatcher.dispatch_event(event).await.unwrap();

        // Verify: Workflow checked but passed, Rule engine handled it
        assert_eq!(*wf_count.lock().await, 1);
        assert_eq!(*rule_count.lock().await, 1);
    }
}
