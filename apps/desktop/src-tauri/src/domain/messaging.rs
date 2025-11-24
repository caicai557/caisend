use crate::domain::events::AppEvent;
use crate::domain::models::Message;
use crate::state::AppState;
use std::sync::Arc;
use tauri::{Emitter, Manager};
use uuid::Uuid;

pub async fn handle_incoming_message(
    app_handle: tauri::AppHandle,
    state: Arc<AppState>,
    raw_content: String,
    account_id: String,
) -> Result<(), String> {
    // 1. Parse raw content (simplified for MVP)
    // In reality, raw_content would be JSON from the mutation observer
    let content = raw_content; 
    
    // 2. Create Message struct
    let message_id = Uuid::new_v4().to_string();
    let conversation_id = Uuid::new_v4().to_string(); // Simplified: New convo for every msg for MVP
    
    let message = Message {
        id: message_id.clone(),
        conversation_id: conversation_id.clone(),
        sender_id: "remote_user".to_string(), // Placeholder
        content: content.clone(),
        message_type: "text".to_string(),
        status: "received".to_string(),
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    // 3. Persist to DB
    // Note: We should check if conversation exists, etc.
    // Skipping DB insert for this specific step to keep it simple, 
    // but in E2-T2 we created the tables.
    // Let's assume we insert it here.
    
    // 4. Broadcast Event (Internal Rust Bus)
    let _ = state.event_bus.send(AppEvent::NewMessageReceived(message.clone()));

    // 5. Emit Tauri Event (Frontend)
    app_handle.emit("new-message", message)
        .map_err(|e| e.to_string())?;

    Ok(())
}
