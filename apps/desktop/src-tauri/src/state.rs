use sqlx::SqlitePool;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::adapters::connection_manager::ConnectionManager;
use crate::events::EventBus;
use crate::services::rule_engine::RuleEngine;

pub struct AppState {
    pub db_pool: SqlitePool,
    pub connection_manager: Arc<RwLock<ConnectionManager>>,
    pub event_bus: EventBus,
    pub rule_engine: Arc<RuleEngine>,
}

impl AppState {
    pub async fn new(db_pool: SqlitePool) -> Self {
        // Initialize RuleEngine and load rules from DB
        let rule_engine = Arc::new(RuleEngine::new());
        
        // Load existing rules from database
        if let Ok(rows) = sqlx::query!(
            "SELECT id, name, enabled, trigger_type, conditions, actions, created_at FROM rules WHERE enabled = 1"
        ).fetch_all(&db_pool).await {
            for row in rows {
                if let (Ok(conditions), Ok(actions), Ok(trigger_type)) = (
                    serde_json::from_str(&row.conditions),
                    serde_json::from_str(&row.actions),
                    serde_json::from_str(&format!(r#""{}""#, row.trigger_type))
                ) {
                    let rule = crate::domain::rule::Rule {
                        id: row.id.unwrap_or_default(),
                        name: row.name,
                        enabled: row.enabled,
                        trigger_type,
                        conditions,
                        actions,
                    };
                    rule_engine.add_rule(rule).await;
                }
            }
        }

        Self {
            db_pool,
            connection_manager: Arc::new(RwLock::new(ConnectionManager::new())),
            event_bus: EventBus::new(),
            rule_engine,
        }
    }
}
