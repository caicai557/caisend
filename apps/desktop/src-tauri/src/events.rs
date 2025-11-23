use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum SystemEvent {
    // Account Events
    AccountCreated { id: String, name: String },
    
    // Session Events
    SessionStarted { account_id: String },
    QrCodeDetected { account_id: String, status: String },
    
    // Message Events
    MessageReceived { 
        account_id: String, 
        external_id: String, 
        content: String,
        timestamp: i64 
    },
    MessageSent { 
        account_id: String, 
        content: String,
        timestamp: i64 
    },
}

#[derive(Clone)]
pub struct EventBus {
    sender: broadcast::Sender<SystemEvent>,
}

impl EventBus {
    pub fn new() -> Self {
        let (sender, _) = broadcast::channel(100);
        Self { sender }
    }

    pub fn publish(&self, event: SystemEvent) {
        let _ = self.sender.send(event);
    }

    pub fn subscribe(&self) -> broadcast::Receiver<SystemEvent> {
        self.sender.subscribe()
    }
}
