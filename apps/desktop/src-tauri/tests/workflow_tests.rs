use teleflow_desktop::domain::workflow::engine::WorkflowEngine;
use teleflow_desktop::domain::workflow::schema::{WorkflowDefinition, Node, Edge, NodeType, NodeConfig, EdgeCondition, Position};
use teleflow_desktop::domain::workflow::instance::InstanceStatus;
use teleflow_desktop::domain::workflow::tracker::InstanceStateTracker;
use teleflow_desktop::adapters::db::workflow_repo::WorkflowRepository;
use teleflow_desktop::adapters::db::init_db;
use teleflow_desktop::state::AppState;
use teleflow_desktop::domain::models::Message;
use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::RwLock;

#[tokio::test]
async fn test_workflow_execution_flow() {
    // 1. Setup DB
    let pool = init_db("sqlite::memory:").await.unwrap();
    let app_state = Arc::new(AppState::new(pool.clone()));
    
    let repo = Arc::new(WorkflowRepository::new(pool.clone()));
    let tracker = Arc::new(InstanceStateTracker::new(repo.clone()));
    let engine = Arc::new(WorkflowEngine::new(tracker.clone(), repo.clone(), app_state.clone()));

    // 2. Create Definition
    let mut nodes = HashMap::new();
    nodes.insert("start".to_string(), Node {
        id: "start".to_string(),
        r#type: NodeType::Start,
        position: Position { x: 0.0, y: 0.0 },
        config: NodeConfig::Start,
    });
    nodes.insert("msg1".to_string(), Node {
        id: "msg1".to_string(),
        r#type: NodeType::SendMessage,
        position: Position { x: 0.0, y: 0.0 },
        config: NodeConfig::SendMessage { content: "Hello".to_string() },
    });
    nodes.insert("wait".to_string(), Node {
        id: "wait".to_string(),
        r#type: NodeType::WaitForResponse,
        position: Position { x: 0.0, y: 0.0 },
        config: NodeConfig::WaitForResponse { timeout_seconds: None },
    });
    nodes.insert("end".to_string(), Node {
        id: "end".to_string(),
        r#type: NodeType::End,
        position: Position { x: 0.0, y: 0.0 },
        config: NodeConfig::End,
    });

    let edges = vec![
        Edge { id: "e1".to_string(), source: "start".to_string(), target: "msg1".to_string(), condition: None },
        Edge { id: "e2".to_string(), source: "msg1".to_string(), target: "wait".to_string(), condition: None },
        Edge { 
            id: "e3".to_string(), 
            source: "wait".to_string(), 
            target: "end".to_string(), 
            condition: Some(EdgeCondition::KeywordMatch { keyword: "yes".to_string() }) 
        },
    ];

    let def = WorkflowDefinition {
        id: "wf1".to_string(),
        name: "Test WF".to_string(),
        version: "1.0".to_string(),
        nodes,
        edges,
        created_at: "".to_string(),
        updated_at: "".to_string(),
    };

    repo.save_definition(&def).await.unwrap();

    // 3. Start Workflow
    let contact_id = "user1";
    engine.start_workflow("wf1", contact_id).await.unwrap();

    // Verify State: Should be at 'wait' node (Start -> msg1 -> wait)
    // Because msg1 is SendMessage (auto-transition), it should move to wait.
    let instance = tracker.get_active_instance(contact_id).await.unwrap().unwrap();
    assert_eq!(instance.current_node_id, Some("wait".to_string()));
    assert_eq!(instance.status, InstanceStatus::WaitingForResponse.to_string());

    // 4. Process Message "no" (should not match)
    let msg_no = Message {
        id: "m1".to_string(),
        conversation_id: "c1".to_string(),
        sender_id: contact_id.to_string(),
        content: "no".to_string(),
        timestamp: "".to_string(),
        status: "received".to_string(),
        direction: "incoming".to_string(),
    };
    let consumed = engine.process_message(&msg_no).await.unwrap();
    assert!(!consumed);
    
    // Verify State Unchanged
    let instance = tracker.get_active_instance(contact_id).await.unwrap().unwrap();
    assert_eq!(instance.current_node_id, Some("wait".to_string()));

    // 5. Process Message "yes" (should match)
    let msg_yes = Message {
        id: "m2".to_string(),
        conversation_id: "c1".to_string(),
        sender_id: contact_id.to_string(),
        content: "yes please".to_string(),
        timestamp: "".to_string(),
        status: "received".to_string(),
        direction: "incoming".to_string(),
    };
    let consumed = engine.process_message(&msg_yes).await.unwrap();
    assert!(consumed);

    // Verify State: Should be Completed (wait -> end)
    // End node sets status to Completed
    // Wait, get_active_instance only returns Running/Waiting.
    // So it should return None now.
    let instance = tracker.get_active_instance(contact_id).await.unwrap();
    assert!(instance.is_none());

    // Verify in DB directly
    let instance = sqlx::query!("SELECT status FROM workflow_instances WHERE contact_id = ?", contact_id)
        .fetch_one(&pool).await.unwrap();
    assert_eq!(instance.status, InstanceStatus::Completed.to_string());
}
