use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use crate::domain::lifecycle::LifecycleStatus;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Alert {
    pub id: String,
    pub severity: String, // "info", "warning", "error", "critical"
    pub message: String,
    pub timestamp: DateTime<Utc>,
    pub account_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountSnapshot {
    pub id: String,
    pub status: LifecycleStatus,
    pub is_connected: bool,
    pub current_action: Option<String>,
    pub last_heartbeat: DateTime<Utc>,
    pub stats: AccountStats,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AccountStats {
    pub messages_sent: u32,
    pub errors_count: u32,
    pub uptime_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStatus {
    pub total_accounts: usize,
    pub online_count: usize,
    pub lifecycle_distribution: HashMap<String, usize>, // Key is LifecycleStatus::as_str()
    pub recent_alerts: Vec<Alert>,
    pub throughput_per_minute: u32,
    pub timestamp: DateTime<Utc>,
    pub accounts: Vec<AccountSnapshot>,
}

impl SystemStatus {
    pub fn new() -> Self {
        Self {
            total_accounts: 0,
            online_count: 0,
            lifecycle_distribution: HashMap::new(),
            recent_alerts: Vec::new(),
            throughput_per_minute: 0,
            timestamp: Utc::now(),
            accounts: Vec::new(),
        }
    }
}
