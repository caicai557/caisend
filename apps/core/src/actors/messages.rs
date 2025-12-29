//! Message Protocol for the Actor System
//! 
//! All messages are strictly typed enums as per .spec-kit/03_ACTOR_SYSTEM.md

use serde::{Deserialize, Serialize};

/// Messages that can be sent to an AccountActor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AccountMessage {
    /// Start a workflow
    Start { flow_id: String },
    /// Stop all activities
    Stop,
    /// Perception signal from Console Bridge
    Signal { source: SignalSource, payload: Vec<u8> },
    /// Internal heartbeat for health check
    Heartbeat,
    /// Kill command for testing supervision (Phoenix Test)
    #[cfg(test)]
    Kill,
}

/// Source of perception signals
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SignalSource {
    Fiber,
    Dom,
    Ocr,
}

/// Messages for the System Supervisor
#[derive(Debug, Clone)]
pub enum SupervisorMessage {
    /// Spawn a new account actor
    SpawnAccount { account_id: String },
    /// Remove an account actor
    RemoveAccount { account_id: String },
    /// Get status of all accounts
    GetStatus,
}

/// Status response from supervisor
#[derive(Debug, Clone)]
pub struct SupervisorStatus {
    pub active_accounts: Vec<String>,
}
