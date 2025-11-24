use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum AccountStatus {
    Active,
    Inactive,
    Banned,
}

impl ToString for AccountStatus {
    fn to_string(&self) -> String {
        match self {
            AccountStatus::Active => "Active".to_string(),
            AccountStatus::Inactive => "Inactive".to_string(),
            AccountStatus::Banned => "Banned".to_string(),
        }
    }
}

impl From<String> for AccountStatus {
    fn from(s: String) -> Self {
        match s.as_str() {
            "Active" => AccountStatus::Active,
            "Inactive" => AccountStatus::Inactive,
            "Banned" => AccountStatus::Banned,
            _ => AccountStatus::Inactive,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Account {
    pub id: String,
    pub name: String,
    pub status: String, // Stored as string in DB
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum TriggerType {
    Keyword,
    Regex,
    AutoJoin,
    WelcomeMessage,
}

impl ToString for TriggerType {
    fn to_string(&self) -> String {
        match self {
            TriggerType::Keyword => "Keyword".to_string(),
            TriggerType::Regex => "Regex".to_string(),
            TriggerType::AutoJoin => "AutoJoin".to_string(),
            TriggerType::WelcomeMessage => "WelcomeMessage".to_string(),
        }
    }
}

impl From<String> for TriggerType {
    fn from(s: String) -> Self {
        match s.as_str() {
            "Keyword" => TriggerType::Keyword,
            "Regex" => TriggerType::Regex,
            "AutoJoin" => TriggerType::AutoJoin,
            "WelcomeMessage" => TriggerType::WelcomeMessage,
            _ => TriggerType::Keyword,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Rule {
    pub id: String,
    pub account_id: Option<String>,
    pub trigger_type: String, // Stored as string
    pub trigger_pattern: String,
    pub reply_text: Option<String>,
    pub delay_min_ms: i64,
    pub delay_max_ms: i64,
    pub is_enabled: bool,
}

// Legacy/Other structs restored
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub core_version: String,
    pub initialized: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub sender_id: String,
    pub content: String,
    pub message_type: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Contact {
    pub id: String,
    pub account_id: String,
    pub remote_id: String,
    pub name: Option<String>,
    pub tags: Option<String>,
    pub notes: Option<String>,
    pub updated_at: String, // Using String for simplicity with CURRENT_TIMESTAMP
}
