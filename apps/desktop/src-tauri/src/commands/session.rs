use tauri::{State, AppHandle};
use crate::state::AppState;
use crate::adapters::cdp::CdpClient;

#[tauri::command]
pub async fn start_session(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    account_id: String,
) -> Result<(), String> {
    // Check if session already exists
    {
        let manager = state.connection_manager.read().await;
        if manager.get_client(&account_id).is_some() {
            return Ok(());
        }
    }

    // Launch new session
    let client = CdpClient::launch_browser(&app_handle, &account_id)
        .await
        .map_err(|e| e.to_string())?;

    // Start QR monitoring
    if let Err(e) = client.start_qr_monitoring().await {
        log::error!("Failed to start QR monitoring: {}", e);
    }

    // Store session
    {
        let mut manager = state.connection_manager.write().await;
        manager.add_client(account_id, client);
    }

    Ok(())
}
