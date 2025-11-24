use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqliteRow, FromRow, Row};

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
#[serde(rename_all = "snake_case")]
pub enum TriggerType {
    Keyword,
    Regex,
    AutoJoin,
    WelcomeMessage,
}

impl TriggerType {
    pub fn as_db_value(&self) -> &'static str {
        match self {
            TriggerType::Keyword => "Keyword",
            TriggerType::Regex => "Regex",
            TriggerType::AutoJoin => "AutoJoin",
            TriggerType::WelcomeMessage => "WelcomeMessage",
        }
    }
}

impl From<String> for TriggerType {
    fn from(s: String) -> Self {
        match s.to_ascii_lowercase().as_str() {
            "keyword" => TriggerType::Keyword,
            "regex" => TriggerType::Regex,
            "auto_join" | "auto-join" => TriggerType::AutoJoin,
            "welcome_message" | "welcome" => TriggerType::WelcomeMessage,
            _ => TriggerType::Keyword,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AutomationRule {
    pub id: String,
    pub account_id: Option<String>,
    pub trigger_type: TriggerType,
    pub trigger_pattern: Option<String>,
    pub reply_text: Option<String>,
    pub delay_min_ms: u32,
    pub delay_max_ms: u32,
    pub is_enabled: bool,
}

impl AutomationRule {
    pub fn trigger_type_db_value(&self) -> String {
        self.trigger_type.as_db_value().to_string()
    }
}

impl<'r> FromRow<'r, SqliteRow> for AutomationRule {
    fn from_row(row: &'r SqliteRow) -> Result<Self, sqlx::Error> {
        let trigger_type_raw: String = row.try_get("trigger_type")?;
        Ok(Self {
            id: row.try_get("id")?,
            account_id: row.try_get("account_id")?,
            trigger_type: TriggerType::from(trigger_type_raw),
            trigger_pattern: row.try_get("trigger_pattern")?,
            reply_text: row.try_get("reply_text")?,
            delay_min_ms: row.try_get::<i64, _>("delay_min_ms")? as u32,
            delay_max_ms: row.try_get::<i64, _>("delay_max_ms")? as u32,
            is_enabled: row.try_get("is_enabled")?,
        })
    }
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
