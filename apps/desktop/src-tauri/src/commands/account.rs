use tauri::{State, AppHandle};
use crate::state::AppState;
use crate::domain::account::Account;

#[tauri::command]
pub async fn create_account(
    state: State<'_, AppState>,
    name: String,
) -> Result<Account, String> {
    let account = Account::new(name);
    
    sqlx::query!(
        "INSERT INTO accounts (id, name, status, proxy_config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        account.id,
        account.name,
        account.status,
        account.proxy_config,
        account.created_at,
        account.updated_at
    )
    .execute(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(account)
}

#[tauri::command]
pub async fn list_accounts(
    state: State<'_, AppState>,
) -> Result<Vec<Account>, String> {
    let accounts = sqlx::query_as!(
        Account,
        "SELECT * FROM accounts ORDER BY created_at DESC"
    )
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(accounts)
}
