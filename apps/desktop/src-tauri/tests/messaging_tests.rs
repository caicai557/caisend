use teleflow_desktop_lib::actuator::scheduler::FocusScheduler;
use teleflow_desktop_lib::adapters::db::init_db;
use teleflow_desktop_lib::domain::events::AppEvent;
use teleflow_desktop_lib::domain::models::Message;
use teleflow_desktop_lib::state::{AppState, AppStore, Cold};

#[tokio::test]
async fn test_message_broadcast() {
    // Setup
    let db_pool = init_db("sqlite::memory:").await.unwrap();
    // Run migrations manually or ensure init_db does it.
    // init_db calls sqlx::migrate!(), so it should work if migrations are embedded.

    let cold: AppStore<Cold> = AppStore::new(db_pool, FocusScheduler::noop());
    let app_state: AppState = cold.into_ready();
    let mut rx = app_state.subscribe_events();

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
    let _ = app_state
        .event_sender()
        .send(AppEvent::NewMessageReceived(message.clone()));

    // Assert: Receive from event bus
    let received = rx.recv().await.unwrap();
    match received {
        AppEvent::NewMessageReceived(msg) => {
            assert_eq!(msg.content, "Hello World");
            assert_eq!(msg.id, "msg_1");
        }
        _ => panic!("Unexpected event variant"),
    }
}
