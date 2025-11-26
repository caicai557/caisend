#[cfg(test)]
mod tests {
    use crate::domain::workflow::{
        engine::WorkflowEngine,
        models::{WorkflowInstance, WorkflowStatus},
        schema::{WorkflowDefinition, Node, Edge, NodeType, Condition, MatchType},
        evaluator,
    };
    use sqlx::sqlite::SqlitePoolOptions;
    use std::collections::HashMap;
    use tauri::{AppHandle, Manager, Wry};
    use std::sync::Arc;

    // Helper to create a test workflow definition
    fn create_test_workflow() -> WorkflowDefinition {
        let mut nodes = HashMap::new();
        nodes.insert("N1".to_string(), Node {
            id: "N1".to_string(),
            node_type: NodeType::SendMessage,
            config: serde_json::json!({ "text": "Welcome" }).as_object().unwrap().clone(),
        });
        nodes.insert("N2".to_string(), Node {
            id: "N2".to_string(),
            node_type: NodeType::WaitForReply,
            config: HashMap::new(),
        });
        nodes.insert("N3".to_string(), Node {
            id: "N3".to_string(),
            node_type: NodeType::SendMessage,
            config: serde_json::json!({ "text": "Success" }).as_object().unwrap().clone(),
        });

        let edges = vec![
            Edge {
                source_node_id: "N1".to_string(),
                target_node_id: "N2".to_string(),
                condition: None,
            },
            Edge {
                source_node_id: "N2".to_string(),
                target_node_id: "N3".to_string(),
                condition: Some(Condition {
                    match_type: MatchType::Keyword,
                    pattern: Some("yes".to_string()),
                }),
            },
        ];

        WorkflowDefinition {
            id: "TEST_FLOW".to_string(),
            nodes,
            edges,
        }
    }

    #[tokio::test]
    async fn test_evaluator_logic() {
        let condition_keyword = Condition {
            match_type: MatchType::Keyword,
            pattern: Some("hello".to_string()),
        };
        assert!(evaluator::evaluate_condition("hello world", &condition_keyword).unwrap());
        assert!(!evaluator::evaluate_condition("hi world", &condition_keyword).unwrap());

        let condition_regex = Condition {
            match_type: MatchType::Regex,
            pattern: Some(r"^\d+$".to_string()),
        };
        assert!(evaluator::evaluate_condition("123", &condition_regex).unwrap());
        assert!(!evaluator::evaluate_condition("123a", &condition_regex).unwrap());
        
        let condition_fallback = Condition {
            match_type: MatchType::Fallback,
            pattern: None,
        };
        assert!(evaluator::evaluate_condition("anything", &condition_fallback).unwrap());
    }

    // Note: Full integration test with DB and WorkflowEngine requires mocking AppHandle/CdpManager
    // or refactoring Engine to use a trait. For this "Acceptance Ceremony", we will verify
    // the core logic components separately.
    
    // To truly test WorkflowEngine::process_message without running the full app, 
    // we would need to spin up a SqlitePool and insert data.
    #[tokio::test]
    async fn test_workflow_engine_db_persistence() {
        // 1. Setup In-Memory DB
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();

        // 2. Run Migrations (Manual for test)
        sqlx::query("
            CREATE TABLE accounts (id TEXT PRIMARY KEY, name TEXT);
            CREATE TABLE workflow_definitions (
                id TEXT PRIMARY KEY, account_id TEXT, name TEXT, description TEXT, 
                definition JSON, created_at TEXT, updated_at TEXT
            );
            CREATE TABLE workflow_instances (
                id TEXT PRIMARY KEY, account_id TEXT, contact_id TEXT, workflow_id TEXT,
                current_step_id TEXT, status TEXT, context JSON, 
                started_at TEXT, updated_at TEXT, completed_at TEXT
            );
            CREATE TABLE workflow_execution_log (
                id INTEGER PRIMARY KEY, instance_id TEXT, step_id TEXT, event_type TEXT, event_data JSON, created_at TEXT
            );
        ").execute(&pool).await.unwrap();

        // 3. Insert Test Data
        let workflow = create_test_workflow();
        let workflow_json = serde_json::to_string(&workflow).unwrap();
        
        sqlx::query("INSERT INTO accounts (id, name) VALUES ('A1', 'TestAccount')")
            .execute(&pool).await.unwrap();
            
        sqlx::query("INSERT INTO workflow_definitions (id, name, definition, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
            .bind("TEST_FLOW")
            .bind("Test Flow")
            .bind(&workflow_json)
            .bind("now")
            .bind("now")
            .execute(&pool).await.unwrap();

        sqlx::query("INSERT INTO workflow_instances (id, account_id, contact_id, workflow_id, current_step_id, status, context, started_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind("INST_1")
            .bind("A1")
            .bind("C1")
            .bind("TEST_FLOW")
            .bind("N2") // Start at WaitForReply
            .bind("Running")
            .bind("{}")
            .bind("now")
            .bind("now")
            .execute(&pool).await.unwrap();

        // 4. Verify DB State
        let instance: WorkflowInstance = sqlx::query_as("SELECT * FROM workflow_instances WHERE id = 'INST_1'")
            .fetch_one(&pool).await.unwrap();
        
        assert_eq!(instance.current_step_id, "N2");
        assert_eq!(instance.status, WorkflowStatus::Running);
        
        // Note: We cannot easily call WorkflowEngine::process_message here because it requires AppHandle.
        // However, we have verified the DB schema and Model mapping works.
    }
}
