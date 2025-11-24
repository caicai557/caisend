use serde::{Deserialize, Serialize};
use crate::domain::models::Message;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AppEvent {
    NewMessageReceived(Message),
    InviteLinkFound { link: String },
    UnreadChatDetected { chat_id: String },
    WorkflowTimerTriggered { contact_id: String },
    // Add other events here as needed, e.g., ConnectionStatusChanged, etc.
}
