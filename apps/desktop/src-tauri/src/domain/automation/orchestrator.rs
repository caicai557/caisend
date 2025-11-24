use crate::domain::automation::RuleEngine;
use crate::domain::events::AppEvent;
use crate::domain::workflow::engine::WorkflowEngine;
use crate::state::AppState;
use std::sync::Arc;
use tauri::{AppHandle, Manager};
use tokio::sync::RwLock;

pub struct AutomationOrchestrator {
    rule_engine: Arc<RwLock<RuleEngine>>,
    workflow_engine: Arc<WorkflowEngine>,
    app_handle: AppHandle,
}

impl AutomationOrchestrator {
    pub fn new(
        rule_engine: Arc<RwLock<RuleEngine>>,
        workflow_engine: Arc<WorkflowEngine>,
        app_handle: AppHandle,
    ) -> Self {
        Self {
            rule_engine,
            workflow_engine,
            app_handle,
        }
    }

    pub async fn start(&self) {
        let mut rx = self.app_handle.state::<AppState>().subscribe_events();
        let rule_engine = self.rule_engine.clone();
        let workflow_engine = self.workflow_engine.clone();

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

                        // Priority 2: Rule Engine (conversation_id as temporary account key)
                        let re = rule_engine.read().await;
                        let _ = re
                            .evaluate_message(&msg.content, &msg.conversation_id)
                            .await;
                    },
                    AppEvent::WorkflowTimerTriggered { contact_id } => {
                        println!("Timer triggered for {}", contact_id);
                    }
                }
            }
        });
    }
}
