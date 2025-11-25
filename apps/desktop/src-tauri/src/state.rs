
use crate::domain::events::AppEvent;
use crate::domain::models::AutomationRule;
use sqlx::SqlitePool;
use std::collections::HashMap;
use std::marker::PhantomData;
use tokio::sync::{broadcast, RwLock};

pub struct Cold;
pub struct Ready;

pub struct AppStore<S> {
    phase: PhantomData<S>,
    db_pool: SqlitePool,
    event_bus: broadcast::Sender<AppEvent>,
    rule_cache: RwLock<HashMap<String, Vec<AutomationRule>>>,
}

pub type AppState = AppStore<Ready>;

impl<S> AppStore<S> {
    pub fn pool(&self) -> &SqlitePool {
        &self.db_pool
    }

    pub fn event_sender(&self) -> &broadcast::Sender<AppEvent> {
        &self.event_bus
    }

    pub fn subscribe_events(&self) -> broadcast::Receiver<AppEvent> {
        self.event_bus.subscribe()
    }

}

impl AppStore<Cold> {
    pub fn new(db_pool: SqlitePool) -> Self {
        let (tx, _rx) = broadcast::channel(100);
        Self {
            phase: PhantomData,
            db_pool,
            event_bus: tx,
            rule_cache: RwLock::new(HashMap::new()),
        }
    }

    pub fn with_rule_cache(self, rules: Vec<AutomationRule>) -> AppStore<Ready> {
        let mut cache: HashMap<String, Vec<AutomationRule>> = HashMap::new();
        for rule in rules {
            let key = rule
                .account_id
                .clone()
                .unwrap_or_else(|| GLOBAL_ACCOUNT_ID.to_string());
            cache.entry(key).or_default().push(rule);
        }

        AppStore {
            phase: PhantomData,
            db_pool: self.db_pool,
            event_bus: self.event_bus,
            rule_cache: RwLock::new(cache),
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
            let key = rule
                .account_id
                .clone()
                .unwrap_or_else(|| GLOBAL_ACCOUNT_ID.to_string());
            cache.entry(key).or_default().push(rule);
        }
    }

    pub async fn add_rule(&self, rule: AutomationRule) -> Option<usize> {
        let account_id = rule
            .account_id
            .clone()
            .unwrap_or_else(|| GLOBAL_ACCOUNT_ID.to_string());
        let mut cache = self.rule_cache.write().await;
        let rules = cache.entry(account_id.clone()).or_default();
        rules.push(rule);
        Some(rules.len())
    }

    pub async fn rules_for_account(&self, account_id: &str) -> Vec<AutomationRule> {
        let cache = self.rule_cache.read().await;
        let mut combined = Vec::new();

        if let Some(global_rules) = cache.get(GLOBAL_ACCOUNT_ID) {
            combined.extend(global_rules.clone());
        }

        if let Some(account_rules) = cache.get(account_id) {
            combined.extend(account_rules.clone());
        }

        combined
    }

    pub async fn cached_accounts(&self) -> Vec<String> {
        let cache = self.rule_cache.read().await;
        cache.keys().cloned().collect()
    }
}
const GLOBAL_ACCOUNT_ID: &str = "__global__";
