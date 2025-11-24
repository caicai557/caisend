use crate::state::AppState;
use std::sync::Arc;
use chrono::Local;

pub struct AnalyticsEngine {
    state: Arc<AppState>,
}

impl AnalyticsEngine {
    pub fn new(state: Arc<AppState>) -> Self {
        Self { state }
    }

    pub async fn track_event(&self, account_id: &str, event_type: &str) -> Result<(), String> {
        let date = Local::now().format("%Y-%m-%d").to_string();
        
        let column = match event_type {
            "message_sent" => "messages_sent",
            "message_received" => "messages_received",
            "auto_reply" => "auto_replies_triggered",
            _ => return Ok(()), // Ignore unknown events
        };

        // Upsert stats
        let query = format!(
            r#"
            INSERT INTO daily_stats (date, account_id, {0})
            VALUES (?, ?, 1)
            ON CONFLICT(date, account_id) DO UPDATE SET
                {0} = daily_stats.{0} + 1
            "#,
            column
        );

        sqlx::query(&query)
            .bind(date)
            .bind(account_id)
            .execute(&self.state.db_pool)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}
