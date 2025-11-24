use sqlx::SqlitePool;
use std::sync::Arc;
use tokio::sync::{RwLock, broadcast};
use std::collections::HashMap;
use crate::adapters::cdp::CdpClient;
use crate::domain::events::AppEvent;
use crate::domain::models::Rule;

pub struct ConnectionManager {
    pub active_sessions: HashMap<String, CdpClient>,
}

impl ConnectionManager {
    pub fn new() -> Self {
        Self {
            active_sessions: HashMap::new(),
        }
    }

    pub fn add_session(&mut self, account_id: String, client: CdpClient) {
        self.active_sessions.insert(account_id, client);
    }

    pub fn get_session(&self, account_id: &str) -> Option<&CdpClient> {
        self.active_sessions.get(account_id)
    }
}

pub struct AppState {
    pub db_pool: SqlitePool,
    pub connection_manager: Arc<RwLock<ConnectionManager>>,
    pub event_bus: broadcast::Sender<AppEvent>,
    pub rule_cache: Arc<RwLock<HashMap<String, Vec<Rule>>>>, // Cache: AccountID -> Rules
}

impl AppState {
    pub fn new(db_pool: SqlitePool) -> Self {
        let (tx, _rx) = broadcast::channel(100); // Capacity of 100 events
        Self {
            db_pool,
            connection_manager: Arc::new(RwLock::new(ConnectionManager::new())),
            event_bus: tx,
            rule_cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}
