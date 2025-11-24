use crate::error::CoreError;
use crate::state::AppState;
use tauri::State;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct DailyStat {
    pub date: String,
    pub account_id: String,
    pub messages_sent: i64,
    pub messages_received: i64,
    pub auto_replies_triggered: i64,
}

#[tauri::command]
pub async fn get_dashboard_stats(
    state: State<'_, AppState>,
    account_id: Option<String>,
) -> Result<Vec<DailyStat>, CoreError> {
    let stats = if let Some(acc_id) = account_id {
        sqlx::query_as::<_, DailyStat>(
            "SELECT * FROM daily_stats WHERE account_id = ? ORDER BY date DESC LIMIT 30"
        )
        .bind(acc_id)
        .fetch_all(&state.db_pool)
        .await
    } else {
        sqlx::query_as::<_, DailyStat>(
            "SELECT * FROM daily_stats ORDER BY date DESC LIMIT 30"
        )
        .fetch_all(&state.db_pool)
        .await
    }
    .map_err(|e| CoreError::DbError(e.to_string()))?;

    Ok(stats)
}
