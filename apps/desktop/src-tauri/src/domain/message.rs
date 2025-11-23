use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Message {
    pub id: String,
    pub account_id: String,
    pub external_id: Option<String>, // ID from Telegram
    pub direction: String, // "in" or "out"
    pub content: String,
    pub translated_content: Option<String>,
    pub status: String, // "received", "sent", "failed", "pending"
    pub created_at: i64,
}

impl Message {
    pub fn new_incoming(account_id: String, external_id: String, content: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            account_id,
            external_id: Some(external_id),
            direction: "in".to_string(),
            content,
            translated_content: None,
            status: "received".to_string(),
            created_at: chrono::Utc::now().timestamp(),
        }
    }

    pub fn new_outgoing(account_id: String, content: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            account_id,
            external_id: None,
            direction: "out".to_string(),
            content,
            translated_content: None,
            status: "pending".to_string(),
            created_at: chrono::Utc::now().timestamp(),
        }
    }
}
