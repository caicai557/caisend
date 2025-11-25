use crate::error::CoreError;
use crate::managers::cdp_manager::{CdpManager, DEFAULT_WEBVIEW2_CDP_PORT};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub async fn send_message(
    _state: State<'_, AppState>,
    cdp_manager: State<'_, CdpManager>,
    account_id: String,
    _conversation_id: String,
    content: String,
) -> Result<(), CoreError> {
    cdp_manager
        .connect(account_id.clone(), DEFAULT_WEBVIEW2_CDP_PORT)
        .await
        .map_err(|e| CoreError::Unknown(format!("Failed to establish CDP session: {}", e)))?;

    if let Some(_browser) = cdp_manager.get_browser(&account_id).await {
        // 1. Focus the input field (Selector would be platform specific)
        // For MVP, we assume there's an active element or we select 'body'
        // In reality: client.browser.find_element("textarea").click()...

        // 2. Simulate typing
        // chromiumoxide doesn't have a high-level "type" on page yet,
        // so we might need to use input domain directly or evaluate JS.
        // Using JS to insert text is safer and faster for now than simulating keypresses one by one via CDP for MVP.
        // However, for "Human-like" behavior (Anti-Magic), we should use Input.insertText or dispatchKeyEvent.

        // Placeholder for CDP Input.insertText
        // let page = client.browser.get_page(...);
        // page.evaluate(format!("document.activeElement.value = '{}'", content)).await?;

        // For this MVP, we'll just log it.
        println!(
            "Sending message via CDP to account {}: {}",
            account_id, content
        );

        Ok(())
    } else {
        Err(CoreError::Unknown(format!(
            "CDP session not found for account {}",
            account_id
        )))
    }
}
