use crate::domain::models::Account;
use crate::error::CoreError;
use crate::state::AppState;
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn create_account(
    state: State<'_, AppState>,
    name: String,
    proxy_config: Option<String>,
) -> Result<Account, CoreError> {
    let id = Uuid::new_v4().to_string();
    let status = "inactive";

    let account = sqlx::query_as::<_, Account>(
        r#"
        INSERT INTO accounts (id, name, status, proxy_config)
        VALUES (?, ?, ?, ?)
        RETURNING id, name, status, proxy_config, created_at as "created_at!"
        "#
    )
    .bind(id)
    .bind(name)
    .bind(status)
    .bind(proxy_config)
    .fetch_one(&state.db_pool)
    .await?;

    Ok(account)
}

#[tauri::command]
pub async fn list_accounts(state: State<'_, AppState>) -> Result<Vec<Account>, CoreError> {
    let accounts = sqlx::query_as::<_, Account>(
        r#"
        SELECT id, name, status, proxy_config, created_at as "created_at!"
        FROM accounts
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(&state.db_pool)
    .await?;

    Ok(accounts)
}
