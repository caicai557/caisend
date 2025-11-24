use teleflow_desktop::domain::models::Message;
use teleflow_desktop::domain::events::AppEvent;
use teleflow_desktop::state::AppState;
use teleflow_desktop::adapters::db::init_db;
use std::sync::Arc;
use tokio::sync::broadcast;

#[tokio::test]
async fn test_message_broadcast() {
    // Setup
    let db_pool = init_db("sqlite::memory:").await.unwrap();
    // Run migrations manually or ensure init_db does it. 
    // init_db calls sqlx::migrate!(), so it should work if migrations are embedded.
    
    let app_state = AppState::new(db_pool);
    let mut rx = app_state.event_bus.subscribe();

    // Simulate incoming message
    let message = Message {
        id: "msg_1".to_string(),
        conversation_id: "convo_1".to_string(),
        sender_id: "remote_user".to_string(),
        content: "Hello World".to_string(),
        message_type: "text".to_string(),
        status: "received".to_string(),
        created_at: "2025-01-01T00:00:00Z".to_string(),
    };

    // Action: Send to event bus
    let _ = app_state.event_bus.send(AppEvent::NewMessageReceived(message.clone()));

    // Assert: Receive from event bus
    let received = rx.recv().await.unwrap();
    match received {
        AppEvent::NewMessageReceived(msg) => {
            assert_eq!(msg.content, "Hello World");
            assert_eq!(msg.id, "msg_1");
        }
    }
}
