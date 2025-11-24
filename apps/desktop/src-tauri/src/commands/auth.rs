use crate::adapters::db::mvp_repo::MvpRepository;
use crate::error::CoreError;
use crate::managers::session_manager::SessionManager;
use crate::state::AppState;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn start_session(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    account_id: String,
) -> Result<(), CoreError> {
    // 1. Get account details
    let repo = MvpRepository::new(state.pool().clone());
    let account = repo
        .get_account(&account_id)
        .await?
        .ok_or_else(|| CoreError::DomainError(format!("Account not found: {}", account_id)))?;

    // 2. Spawn window using SessionManager
    let manager = SessionManager::new(app_handle);
    manager.spawn_account_window(&account).await?;

    Ok(())
}
