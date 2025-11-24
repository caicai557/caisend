use crate::actuator::scheduler::FocusScheduler;
use crate::adapters::cdp::CdpClient;
use crate::domain::events::AppEvent;
use crate::domain::models::AutomationRule;
use sqlx::SqlitePool;
use std::collections::HashMap;
use std::marker::PhantomData;
use tokio::sync::{broadcast, RwLock};

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

pub struct Cold;
pub struct Ready;

pub struct AppStore<S> {
    phase: PhantomData<S>,
    db_pool: SqlitePool,
    connection_manager: RwLock<ConnectionManager>,
    event_bus: broadcast::Sender<AppEvent>,
    rule_cache: RwLock<HashMap<String, Vec<AutomationRule>>>,
    focus_scheduler: FocusScheduler,
}

pub type AppState = AppStore<Ready>;

impl<S> AppStore<S> {
    pub fn pool(&self) -> &SqlitePool {
        &self.db_pool
    }

    pub fn connections(&self) -> &RwLock<ConnectionManager> {
        &self.connection_manager
    }

    pub fn event_sender(&self) -> &broadcast::Sender<AppEvent> {
        &self.event_bus
    }

    pub fn subscribe_events(&self) -> broadcast::Receiver<AppEvent> {
        self.event_bus.subscribe()
    }

    pub fn focus_scheduler(&self) -> &FocusScheduler {
        &self.focus_scheduler
    }
}

impl AppStore<Cold> {
    pub fn new(db_pool: SqlitePool, focus_scheduler: FocusScheduler) -> Self {
        let (tx, _rx) = broadcast::channel(100);
        Self {
            phase: PhantomData,
            db_pool,
            connection_manager: RwLock::new(ConnectionManager::new()),
            event_bus: tx,
            rule_cache: RwLock::new(HashMap::new()),
            focus_scheduler,
        }
    }

    pub fn with_rule_cache(self, rules: Vec<AutomationRule>) -> AppStore<Ready> {
        let mut cache: HashMap<String, Vec<AutomationRule>> = HashMap::new();
        for rule in rules {
            if let Some(account_id) = &rule.account_id {
                cache.entry(account_id.clone()).or_default().push(rule);
            }
        }

        AppStore {
            phase: PhantomData,
            db_pool: self.db_pool,
            connection_manager: self.connection_manager,
            event_bus: self.event_bus,
            rule_cache: RwLock::new(cache),
            focus_scheduler: self.focus_scheduler,
        }
    }

    pub fn into_ready(self) -> AppStore<Ready> {
        self.with_rule_cache(Vec::new())
    }
}

impl AppStore<Ready> {
    pub async fn replace_rule_cache(&self, rules: Vec<AutomationRule>) {
        let mut cache = self.rule_cache.write().await;
        cache.clear();

        for rule in rules {
            if let Some(account_id) = &rule.account_id {
                cache.entry(account_id.clone()).or_default().push(rule);
            }
        }
    }

    pub async fn add_rule(&self, rule: AutomationRule) -> Option<usize> {
        if let Some(account_id) = &rule.account_id {
            let mut cache = self.rule_cache.write().await;
            let rules = cache.entry(account_id.clone()).or_default();
            rules.push(rule);
            return Some(rules.len());
        }

        None
    }

    pub async fn rules_for_account(&self, account_id: &str) -> Vec<AutomationRule> {
        let cache = self.rule_cache.read().await;
        cache.get(account_id).cloned().unwrap_or_default()
    }

    pub async fn cached_accounts(&self) -> Vec<String> {
        let cache = self.rule_cache.read().await;
        cache.keys().cloned().collect()
    }
}
