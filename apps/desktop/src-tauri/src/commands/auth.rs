use crate::error::CoreError;
use crate::state::AppState;
use crate::adapters::cdp::CdpClient;
use tauri::State;

#[tauri::command]
pub async fn start_session(
    state: State<'_, AppState>,
    account_id: String,
) -> Result<(), CoreError> {
    // 1. Check if session already exists
    {
        let manager = state.connection_manager.read().await;
        if manager.get_session(&account_id).is_some() {
            return Ok(());
        }
    }

    // 2. Launch browser
    let client = CdpClient::launch(&account_id).await?;

    // 3. Store session
    {
        let mut manager = state.connection_manager.write().await;
        manager.add_session(account_id, client);
    }

    Ok(())
}
