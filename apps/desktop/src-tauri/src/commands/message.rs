use tauri::{State, AppHandle};
use crate::state::AppState;
use crate::domain::message::Message;
use crate::events::SystemEvent;

#[tauri::command]
pub async fn send_message(
    state: State<'_, AppState>,
    account_id: String,
    content: String,
) -> Result<Message, String> {
    // 1. Get CDP Client
    let client = {
        let manager = state.connection_manager.read().await;
        manager.get_client(&account_id).ok_or("Session not found")?
    };

    // 2. Use CDP to simulate typing and sending
    // This is a simplified version. In reality, we need to find the input field.
    // For MVP, we assume the page is already on the chat and we can just type.
    // We might need to use `Input.insertText` and `Input.dispatchKeyEvent`.
    
    let pages = client.browser.pages().await.map_err(|e| e.to_string())?;
    if let Some(page) = pages.first() {
        // Focus the input field (selector needs to be accurate)
        // page.find_element(".input-message-input").await?.click().await?;
        
        // Type the message
        // page.type_str(&content).await?;
        
        // Press Enter
        // page.press_key("Enter").await?;
        
        // For MVP, we'll just log it as if we sent it
        log::info!("Sending message via CDP: {}", content);
    } else {
        return Err("No pages found".to_string());
    }

    // 3. Create Message Domain Object
    let message = Message::new_outgoing(account_id.clone(), content.clone());

    // 4. Persist to DB
    sqlx::query!(
        "INSERT INTO messages (id, account_id, external_id, direction, content, translated_content, status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        message.id,
        message.account_id,
        message.external_id,
        message.direction,
        message.content,
        message.translated_content,
        message.status,
        message.created_at
    )
    .execute(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    // 5. Publish Event
    state.event_bus.publish(SystemEvent::MessageSent {
        account_id: account_id,
        content: content,
        timestamp: message.created_at,
    });

    Ok(message)
}

#[tauri::command]
pub async fn list_messages(
    state: State<'_, AppState>,
    account_id: String,
) -> Result<Vec<Message>, String> {
    let messages = sqlx::query_as!(
        Message,
        "SELECT * FROM messages WHERE account_id = ? ORDER BY created_at ASC",
        account_id
    )
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(messages)
}
