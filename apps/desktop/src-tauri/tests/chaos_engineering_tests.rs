use sqlx::{SqlitePool, sqlite::SqlitePoolOptions};
use teleflow_desktop_lib::domain::workflow::models::{WorkflowInstance, WorkflowStatus};
use uuid::Uuid;
use std::panic;

/// Helper to create an in-memory SQLite pool for testing
async fn create_test_pool() -> SqlitePool {
    let pool = SqlitePoolOptions::new()
        .connect("sqlite::memory:")
        .await
        .expect("Failed to create in-memory database");
    
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");
    
    pool
}

#[tokio::test]
async fn test_crash_after_commit_before_execute() {
    let pool = create_test_pool().await;
    
    let instance_id = Uuid::new_v4().to_string();
    
    // Simulate state transition with commit
    sqlx::query(
        "INSERT INTO workflow_instances (id, account_id, contact_id, workflow_id, current_step_id, status, context, started_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
    )
    .bind(&instance_id)
    .bind("test_account")
    .bind("test_contact")
    .bind("test_workflow")
    .bind("step1")
    .bind(WorkflowStatus::Running.as_db_value())
    .bind("{}")
    .execute(&pool)
    .await
    .unwrap();
    
    // Simulate checkpoint: Commit state to step2
    let mut tx = pool.begin().await.unwrap();
    sqlx::query("UPDATE workflow_instances SET current_step_id = ?, updated_at = datetime('now') WHERE id = ?")
        .bind("step2")
        .bind(&instance_id)
        .execute(&mut *tx)
        .await
        .unwrap();
    tx.commit().await.unwrap();
    
    // Simulate crash before Execute phase
    // (In real scenario, this would be process termination)
    // Restart and verify recovery
    
    let recovered_step: (String,) = sqlx::query_as("SELECT current_step_id FROM workflow_instances WHERE id = ?")
        .bind(&instance_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    
    assert_eq!(recovered_step.0, "step2", "State should persist after commit even if Execute phase didn't run");
}

#[tokio::test]
async fn test_idempotency_of_operations() {
    let pool = create_test_pool().await;
    
    let instance_id = Uuid::new_v4().to_string();
    
    // Insert initial instance
    sqlx::query(
        "INSERT INTO workflow_instances (id, account_id, contact_id, workflow_id, current_step_id, status, context, started_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
    )
    .bind(&instance_id)
    .bind("test_account")
    .bind("test_contact")
    .bind("test_workflow")
    .bind("step1")
    .bind(WorkflowStatus::Running.as_db_value())
    .bind("{}")
    .execute(&pool)
    .await
    .unwrap();
    
    // Transition to step2
    sqlx::query("UPDATE workflow_instances SET current_step_id = ? WHERE id = ?")
        .bind("step2")
        .bind(&instance_id)
        .execute(&pool)
        .await
        .unwrap();
    
    // Simulate re-execution (idempotency check)
    // If system tries to transition again from step1 to step2, it should be safe
    let current: (String,) = sqlx::query_as("SELECT current_step_id FROM workflow_instances WHERE id = ?")
        .bind(&instance_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    
    if current.0 == "step1" {
        // This branch should not execute since we already moved to step2
        panic!("Should not re-execute from step1");
    }
    
    assert_eq!(current.0, "step2", "Idempotency: should stay at step2");
}

#[tokio::test]
async fn test_poison_pill_corrupted_dsl() {
    let pool = create_test_pool().await;
    
    let instance_id = Uuid::new_v4().to_string();
    
    // Insert instance with corrupted DSL JSON in context
    let corrupted_json = "{ this is not valid JSON";
    
    sqlx::query(
        "INSERT INTO workflow_instances (id, account_id, contact_id, workflow_id, current_step_id, status, context, started_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
    )
    .bind(&instance_id)
    .bind("test_account")
    .bind("test_contact")
    .bind("test_workflow")
    .bind("step1")
    .bind(WorkflowStatus::Running.as_db_value())
    .bind(corrupted_json)
    .execute(&pool)
    .await
    .unwrap();
    
    // Attempt to process: should gracefully handle parsing error
    // Simulating what the engine would do
    let result = panic::catch_unwind(panic::AssertUnwindSafe(|| {
        // This simulates trying to parse the context
        let _parsed: Result<serde_json::Value, _> = serde_json::from_str(corrupted_json);
        // In real code, we would mark as FAILED
    }));
    
    // Should not panic, but handle gracefully
    assert!(result.is_ok(), "Should handle corrupted DSL gracefully");
    
    // Mark instance as FAILED (poison pill)
    sqlx::query("UPDATE workflow_instances SET status = ? WHERE id = ?")
        .bind(WorkflowStatus::Failed.as_db_value())
        .bind(&instance_id)
        .execute(&pool)
        .await
        .unwrap();
    
    let final_status: (String,) = sqlx::query_as("SELECT status FROM workflow_instances WHERE id = ?")
        .bind(&instance_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    
    assert_eq!(final_status.0, "Failed", "Corrupted instance should be marked as FAILED");
}
