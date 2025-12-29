//! WorkflowState - The serializable state enum for PFSM
//!
//! This represents all possible states in a workflow lifecycle.
//! It is serialized to JSONB in SQLite for durable execution.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// The workflow execution status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum WorkflowStatus {
    Running,
    Paused,
    Completed,
    Failed,
}

impl Default for WorkflowStatus {
    fn default() -> Self {
        Self::Running
    }
}

/// The workflow state - represents what step the workflow is in
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "state_type", content = "data")]
pub enum WorkflowState {
    /// Idle - waiting for incoming messages
    Idle {
        last_check_time: DateTime<Utc>,
    },
    /// Analyzing context - received a message, determining intent
    AnalyzingContext {
        message_content: String,
        sender_id: String,
    },
    /// Typing reply - simulating human typing
    TypingReply {
        target_text: String,
        chars_typed: usize,
    },
    /// Awaiting confirmation - waiting for send confirmation
    AwaitingConfirmation {
        message_hash: String,
        timeout_at: DateTime<Utc>,
    },
    /// Error state - needs human intervention
    ErrorState {
        error_code: String,
        snapshot_path: Option<String>,
    },
}

impl Default for WorkflowState {
    fn default() -> Self {
        Self::Idle {
            last_check_time: Utc::now(),
        }
    }
}

/// A complete workflow instance record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowInstance {
    pub id: String,
    pub account_id: String,
    pub flow_definition_id: String,
    pub state: WorkflowState,
    pub status: WorkflowStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl WorkflowInstance {
    /// Create a new workflow instance
    pub fn new(account_id: &str, flow_definition_id: &str) -> Self {
        let now = Utc::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            account_id: account_id.to_string(),
            flow_definition_id: flow_definition_id.to_string(),
            state: WorkflowState::default(),
            status: WorkflowStatus::Running,
            created_at: now,
            updated_at: now,
        }
    }
}
