use sqlx::{SqlitePool, sqlite::SqlitePoolOptions};
use tokio;
use std::sync::Arc;
use crate::domain::workflow::models::{WorkflowInstance, WorkflowStatus};
use uuid::Uuid;

/// Helper to create an in-memory SQLite pool for testing
async fn create_test_pool() -> SqlitePool {
    let pool = SqlitePoolOptions::new()
        .connect("sqlite::memory:")
        .await
        .expect("Failed to create in-memory database");
    
    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");
    
    pool
}

#[tokio::test]
async fn test_checkpoint_atomicity() {
    let pool = create_test_pool().await;
    
    // Create a test workflow instance
    let instance_id = Uuid::new_v4().to_string();
    let account_id = "test_account";
    let contact_id = "test_contact";
    let workflow_id = "test_workflow";
    
    // Simulate LVCP: Lock -> Validate -> Compute -> Persist -> Commit -> Execute
    // Insert initial state
    sqlx::query(
        "INSERT INTO workflow_instances (id, account_id, contact_id, workflow_id, current_step_id, status, context, started_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
    )
    .bind(&instance_id)
    .bind(account_id)
    .bind(contact_id)
    .bind(workflow_id)
    .bind("step1")
    .bind(WorkflowStatus::Running.as_db_value())
    .bind("{}")
    .execute(&pool)
    .await
    .expect("Failed to insert instance");
    
    // Simulate state transition in a transaction
    let mut tx = pool.begin().await.unwrap();
    
    // Lock (SELECT FOR UPDATE equivalent in SQLite is just using a transaction)
    let instance: (String, String) = sqlx::query_as(
        "SELECT current_step_id, status FROM workflow_instances WHERE id = ?"
    )
    .bind(&instance_id)
    .fetch_one(&mut *tx)
    .await
    .unwrap();
    
    assert_eq!(instance.0, "step1");
    
    // Compute: update to step2
    sqlx::query("UPDATE workflow_instances SET current_step_id = ?, updated_at = datetime('now') WHERE id = ?")
        .bind("step2")
        .bind(&instance_id)
        .execute(&mut *tx)
        .await
        .unwrap();
    
    // Commit
    tx.commit().await.unwrap();
    
    // Verify the change persisted
    let final_step: (String,) = sqlx::query_as("SELECT current_step_id FROM workflow_instances WHERE id = ?")
        .bind(&instance_id)
        .fetch_one(&pool)
        .await
        .unwrap();
    
    assert_eq!(final_step.0, "step2");
}

#[tokio::test]
async fn test_concurrent_access() {
    let pool = Arc::new(create_test_pool().await);
    
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
    .execute(pool.as_ref())
    .await
    .expect("Failed to insert instance");
    
    // Spawn multiple concurrent tasks trying to update the same instance
    let mut handles = vec![];
    
    for i in 0..10 {
        let pool_clone = Arc::clone(&pool);
        let instance_id_clone = instance_id.clone();
        
        let handle = tokio::spawn(async move {
            let mut tx = pool_clone.begin().await.unwrap();
            
            // Read current step
            let current: (String,) = sqlx::query_as("SELECT current_step_id FROM workflow_instances WHERE id = ?")
                .bind(&instance_id_clone)
                .fetch_one(&mut *tx)
                .await
                .unwrap();
            
            // Small delay to increase race condition chance
            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
            
            // Update to a new step based on iteration
            let new_step = format!("step_{}", i);
            sqlx::query("UPDATE workflow_instances SET current_step_id = ?, updated_at = datetime('now') WHERE id = ? AND current_step_id = ?")
                .bind(&new_step)
                .bind(&instance_id_clone)
                .bind(&current.0)
                .execute(&mut *tx)
                .await
                .unwrap();
            
            tx.commit().await.unwrap();
            i
        });
        
        handles.push(handle);
    }
    
    // Wait for all
    let results: Vec<usize> = futures::future::join_all(handles)
        .await
        .into_iter()
        .map(|r| r.unwrap())
        .collect();
    
    // Verify final state is consistent (one of the steps should have won)
    let final_step: (String,) = sqlx::query_as("SELECT current_step_id FROM workflow_instances WHERE id = ?")
        .bind(&instance_id)
        .fetch_one(pool.as_ref())
        .await
        .unwrap();
    
    // The final step should be one of the attempted steps
    assert!(final_step.0.starts_with("step_"));
    println!("Final step after concurrent updates: {}", final_step.0);
    println!("All tasks completed: {:?}", results);
}
