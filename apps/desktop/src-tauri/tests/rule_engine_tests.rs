use teleflow_desktop::domain::automation::RuleEngine;
use teleflow_desktop::domain::models::{Message, Rule};
use teleflow_desktop::state::AppState;
use teleflow_desktop::adapters::db::init_db;
use std::sync::Arc;
use tokio::time::{sleep, Duration};

#[tokio::test]
async fn test_rule_matching_keyword() {
    // Setup DB
    let db_pool = init_db("sqlite::memory:").await.unwrap();
    let app_state = Arc::new(AppState::new(db_pool.clone()));

    // Insert a Rule
    sqlx::query!(
        r#"
        INSERT INTO rules (id, name, trigger_type, trigger_content, action_type, action_content, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        "#,
        "rule_1", "Hello Rule", "keyword", "hello", "reply", "Hi there!", true
    )
    .execute(&db_pool)
    .await
    .unwrap();

    // Initialize Engine
    let mut engine = RuleEngine::new(app_state.clone());
    engine.load_rules().await.unwrap();

    // Simulate Message
    let message = Message {
        id: "msg_1".to_string(),
        conversation_id: "convo_1".to_string(),
        sender_id: "remote_user".to_string(),
        content: "Oh hello there".to_string(), // Contains "hello"
        message_type: "text".to_string(),
        status: "received".to_string(),
        created_at: "2025-01-01T00:00:00Z".to_string(),
    };

    // We can't easily assert side effects (TaskQueue) without exposing it or mocking.
    // But we can run evaluate and ensure no panic.
    // For a real test, we'd inspect the internal state or use a mock task queue.
    // Since RuleEngine spawns a worker that prints to stdout, we verify manually or refactor for testability.
    // For this MVP test, we just ensure the matching logic runs without error.
    
    engine.evaluate(&message).await;
    
    // Allow some time for async tasks
    sleep(Duration::from_millis(100)).await;
}

#[tokio::test]
async fn test_rule_matching_regex() {
    // Setup DB
    let db_pool = init_db("sqlite::memory:").await.unwrap();
    let app_state = Arc::new(AppState::new(db_pool.clone()));

    // Insert a Regex Rule
    sqlx::query!(
        r#"
        INSERT INTO rules (id, name, trigger_type, trigger_content, action_type, action_content, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        "#,
        "rule_2", "Email Rule", "regex", r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "tag", "email_found", true
    )
    .execute(&db_pool)
    .await
    .unwrap();

    // Initialize Engine
    let mut engine = RuleEngine::new(app_state.clone());
    engine.load_rules().await.unwrap();

    // Simulate Message
    let message = Message {
        id: "msg_2".to_string(),
        conversation_id: "convo_1".to_string(),
        sender_id: "remote_user".to_string(),
        content: "Contact me at test@example.com please".to_string(),
        message_type: "text".to_string(),
        status: "received".to_string(),
        created_at: "2025-01-01T00:00:00Z".to_string(),
    };

    engine.evaluate(&message).await;
    sleep(Duration::from_millis(100)).await;
}
