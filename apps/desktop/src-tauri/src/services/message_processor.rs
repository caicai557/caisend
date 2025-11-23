use crate::events::{EventBus, SystemEvent};
use crate::domain::message::Message;
use crate::services::rule_engine::RuleEngine;
use crate::domain::rule::ActionType;
use sqlx::SqlitePool;
use tauri::{AppHandle, Emitter};
use std::sync::Arc;

pub struct MessageProcessor {
    event_bus: EventBus,
    db_pool: SqlitePool,
    app_handle: AppHandle,
    rule_engine: Arc<RuleEngine>,
}

impl MessageProcessor {
    pub fn new(event_bus: EventBus, db_pool: SqlitePool, app_handle: AppHandle, rule_engine: Arc<RuleEngine>) -> Self {
        Self {
            event_bus,
            db_pool,
            app_handle,
            rule_engine,
        }
    }

    pub async fn start(&self) {
        let mut rx = self.event_bus.subscribe();
        
        while let Ok(event) = rx.recv().await {
            match event {
                SystemEvent::MessageReceived { account_id, external_id, content, timestamp: _ } => {
                    // 1. Create Message Domain Object
                    let message = Message::new_incoming(account_id.clone(), external_id, content);
                    
                    // 2. Persist to DB
                    if let Err(e) = self.persist_message(&message).await {
                        log::error!("Failed to persist message: {}", e);
                        continue;
                    }

                    // 3. Emit to Frontend
                    if let Err(e) = self.app_handle.emit("msg-new", &message) {
                        log::error!("Failed to emit msg-new: {}", e);
                    }

                    // 4. Evaluate Rules
                    let actions = self.rule_engine.evaluate(&message).await;
                    
                    // 5. Execute Matched Actions
                    for action in actions {
                        if let Err(e) = self.execute_action(&account_id, action).await {
                            log::error!("Failed to execute action: {}", e);
                        }
                    }
                }
                _ => {}
            }
        }
    }

    async fn persist_message(&self, message: &Message) -> Result<(), sqlx::Error> {
        sqlx::query!(
            "INSERT INTO messages (id, account_id, external_id, direction, content, translated_content, status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            message.id,
            message.account_id,
            message.external_id,
            message.direction,
            message.content,
            message.translated_content,
            message.status,
            message.created_at
        )
        .execute(&self.db_pool)
        .await?;
        Ok(())
    }

    async fn execute_action(&self, account_id: &str, action: crate::domain::rule::Action) -> Result<(), String> {
        match action.action_type {
            ActionType::AutoReply => {
                // Parse payload as reply content
                let reply_content = action.payload;
                
                // Create outgoing message
                let reply_message = Message::new_outgoing(account_id.to_string(), reply_content.clone());
                
                // Persist the reply
                if let Err(e) = self.persist_message(&reply_message).await {
                    return Err(format!("Failed to persist auto-reply: {}", e));
                }
                
                // Publish MessageSent event
                self.event_bus.publish(SystemEvent::MessageSent {
                    account_id: account_id.to_string(),
                    content: reply_content,
                    timestamp: chrono::Utc::now().timestamp(),
                });
                
                log::info!("Auto-reply sent for account {}", account_id);
                Ok(())
            }
            ActionType::ForwardToUser => {
                // TODO: Implement forwarding logic
                log::info!("Forward action triggered: {}", action.payload);
                Ok(())
            }
            ActionType::Translate => {
                // TODO: Implement translation logic
                log::info!("Translate action triggered: {}", action.payload);
                Ok(())
            }
        }
    }
}
