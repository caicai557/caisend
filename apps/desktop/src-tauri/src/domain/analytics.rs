use crate::state::AppState;
use chrono::Local;
use tauri::{AppHandle, Manager};

pub struct AnalyticsEngine {
    app_handle: AppHandle,
}

impl AnalyticsEngine {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
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

        let state: tauri::State<AppState> = self.app_handle.state();
        sqlx::query(&query)
            .bind(date)
            .bind(account_id)
            .execute(state.pool())
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }
}
