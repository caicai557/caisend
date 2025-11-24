use crate::domain::automation::RuleEngine;
use crate::domain::workflow::engine::WorkflowEngine;
use crate::domain::events::AppEvent;
use crate::state::AppState;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct AutomationOrchestrator {
    rule_engine: Arc<RwLock<RuleEngine>>,
    workflow_engine: Arc<WorkflowEngine>,
    app_state: Arc<AppState>,
}

impl AutomationOrchestrator {
    pub fn new(
        rule_engine: Arc<RwLock<RuleEngine>>,
        workflow_engine: Arc<WorkflowEngine>,
        app_state: Arc<AppState>,
    ) -> Self {
        Self {
            rule_engine,
            workflow_engine,
            app_state,
        }
    }

    pub async fn start(&self) {
        let mut rx = self.app_state.event_bus.subscribe();
        let rule_engine = self.rule_engine.clone();
        let workflow_engine = self.workflow_engine.clone();

        // Initial Load for Rule Engine
        {
            let mut re = rule_engine.write().await;
            if let Err(e) = re.load_rules().await {
                eprintln!("Failed to load rules: {}", e);
            }
        }

        tokio::spawn(async move {
            while let Ok(event) = rx.recv().await {
                match event {
                    AppEvent::NewMessageReceived(msg) => {
                        if msg.sender_id == "me" { continue; }

                        // Priority 1: Workflow Engine
                        match workflow_engine.process_message(&msg).await {
                            Ok(consumed) => {
                                if consumed {
                                    println!("Message consumed by Workflow Engine");
                                    continue;
                                }
                            },
                            Err(e) => eprintln!("Workflow Engine Error: {}", e),
                        }

                        // Priority 2: Rule Engine
                        let re = rule_engine.read().await;
                        re.evaluate(&msg).await;
                    },
                    AppEvent::WorkflowTimerTriggered { contact_id } => {
                        // Handle timer triggers (e.g., timeouts)
                        // We might need to expose a method in WorkflowEngine to handle this
                        // For now, we can assume process_message or a specific method handles it.
                        // But wait, process_message takes a Message.
                        // We need a `process_timer` method in WorkflowEngine.
                        // Let's assume we added it or will add it.
                        // For MVP, we'll just log.
                        println!("Timer triggered for {}", contact_id);
                    }
                }
            }
        });
    }
}
