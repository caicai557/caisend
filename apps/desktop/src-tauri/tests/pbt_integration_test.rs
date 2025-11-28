use sqlx::SqlitePool;
use std::collections::HashMap;
use teleflow_desktop_lib::domain::behavior_tree::schema::{BehaviorTreeDefinition, BtNode, BtNodeType};
use teleflow_desktop_lib::domain::behavior_tree::state::{BehaviorTreeInstance, Blackboard, TreeStatus, NodeStatus};
use teleflow_desktop_lib::domain::behavior_tree::engine::{BehaviorTreeEngine, ActionContext};
use teleflow_desktop_lib::adapters::db::behavior_tree_repo::BehaviorTreeRepository;
use async_trait::async_trait;
use chrono::Utc;

// Mock ActionContext for testing
struct TestActionContext {
    executed_actions: std::sync::Arc<std::sync::Mutex<Vec<String>>>,
}

#[async_trait]
impl ActionContext for TestActionContext {
    async fn execute_action(&self, action_type: &str, _params: &serde_json::Value) -> anyhow::Result<NodeStatus> {
        let mut actions = self.executed_actions.lock().unwrap();
        actions.push(action_type.to_string());
        Ok(NodeStatus::Success)
    }
}

async fn setup_test_db() -> SqlitePool {
    let pool = SqlitePool::connect("sqlite::memory:")
        .await
        .expect("Failed to create in-memory database");

    // Run migrations
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run migrations");

    pool
}

fn create_simple_test_definition() -> BehaviorTreeDefinition {
    let mut nodes = HashMap::new();

    // Root: Sequence
    nodes.insert(
        "root".to_string(),
        BtNode {
            id: "root".to_string(),
            node_type: BtNodeType::Sequence,
            children: vec!["action1".to_string(), "action2".to_string()],
            config: serde_json::json!({
                "children": ["action1", "action2"]
            }),
        },
    );

    // Action 1
    nodes.insert(
        "action1".to_string(),
        BtNode {
            id: "action1".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({
                "action_type": "test_action_1"
            }),
        },
    );

    // Action 2
    nodes.insert(
        "action2".to_string(),
        BtNode {
            id: "action2".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({
                "action_type": "test_action_2"
            }),
        },
    );

    BehaviorTreeDefinition {
        id: "test_def_1".to_string(),
        name: "Simple Test Tree".to_string(),
        description: Some("A simple sequence of two actions".to_string()),
        root_node_id: "root".to_string(),
        nodes,
    }
}

fn create_wait_test_definition() -> BehaviorTreeDefinition {
    let mut nodes = HashMap::new();

    // Root: Wait node
    nodes.insert(
        "root".to_string(),
        BtNode {
            id: "root".to_string(),
            node_type: BtNodeType::Wait,
            children: vec![],
            config: serde_json::json!({
                "duration_ms": 1000
            }),
        },
    );

    BehaviorTreeDefinition {
        id: "test_def_wait".to_string(),
        name: "Wait Test Tree".to_string(),
        description: Some("A tree with a wait node for state persistence testing".to_string()),
        root_node_id: "root".to_string(),
        nodes,
    }
}

#[tokio::test]
async fn test_pbt_basic_lifecycle() {
    // Setup
    let pool = setup_test_db().await;
    let repo = BehaviorTreeRepository::new(pool);

    // 1. Save definition
    let definition = create_simple_test_definition();
    repo.save_definition(&definition)
        .await
        .expect("Failed to save definition");

    // 2. Load definition
    let loaded_def = repo
        .get_definition(&definition.id)
        .await
        .expect("Failed to load definition")
        .expect("Definition not found");

    assert_eq!(loaded_def.id, definition.id);
    assert_eq!(loaded_def.name, definition.name);

    // 3. Create instance
    let instance = BehaviorTreeInstance {
        id: "test_instance_1".to_string(),
        definition_id: definition.id.clone(),
        account_id: "test_account".to_string(),
        node_states: HashMap::new(),
        blackboard: Blackboard::new(),
        status: TreeStatus::Running,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    repo.save_instance(&instance)
        .await
        .expect("Failed to save instance");

    // 4. Load instance
    let loaded_instance = repo
        .get_instance(&instance.id)
        .await
        .expect("Failed to load instance")
        .expect("Instance not found");

    assert_eq!(loaded_instance.id, instance.id);
    assert_eq!(loaded_instance.definition_id, instance.definition_id);
    assert_eq!(loaded_instance.status, TreeStatus::Running);
}

#[tokio::test]
async fn test_pbt_action_execution() {
    // Setup
    let pool = setup_test_db().await;
    let repo = BehaviorTreeRepository::new(pool);

    let definition = create_simple_test_definition();
    repo.save_definition(&definition)
        .await
        .expect("Failed to save definition");

    let mut instance = BehaviorTreeInstance {
        id: "test_instance_2".to_string(),
        definition_id: definition.id.clone(),
        account_id: "test_account".to_string(),
        node_states: HashMap::new(),
        blackboard: Blackboard::new(),
        status: TreeStatus::Running,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    // Track executed actions
    let executed_actions = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
    let context = TestActionContext {
        executed_actions: executed_actions.clone(),
    };

    // Execute tick
    let result = BehaviorTreeEngine::tick(&mut instance, &definition, &context)
        .await
        .expect("Tick failed");

    // Verify execution
    assert_eq!(result, TreeStatus::Completed);

    let actions = executed_actions.lock().unwrap();
    assert_eq!(actions.len(), 2);
    assert_eq!(actions[0], "test_action_1");
    assert_eq!(actions[1], "test_action_2");
}

#[tokio::test]
async fn test_pbt_state_persistence() {
    // Setup
    let pool = setup_test_db().await;
    let repo = BehaviorTreeRepository::new(pool);

    let definition = create_wait_test_definition();
    repo.save_definition(&definition)
        .await
        .expect("Failed to save definition");

    let mut instance = BehaviorTreeInstance {
        id: "test_instance_3".to_string(),
        definition_id: definition.id.clone(),
        account_id: "test_account".to_string(),
        node_states: HashMap::new(),
        blackboard: Blackboard::new(),
        status: TreeStatus::Running,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let executed_actions = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
    let context = TestActionContext {
        executed_actions: executed_actions.clone(),
    };

    // First tick - should return Running
    let result = BehaviorTreeEngine::tick(&mut instance, &definition, &context)
        .await
        .expect("First tick failed");

    assert_eq!(result, TreeStatus::Running);

    // Save state
    repo.save_instance(&instance)
        .await
        .expect("Failed to save instance after first tick");

    // Load state
    let mut loaded_instance = repo
        .get_instance(&instance.id)
        .await
        .expect("Failed to load instance")
        .expect("Instance not found");

    assert_eq!(loaded_instance.status, TreeStatus::Running);

    // Wait for the wait duration to pass
    tokio::time::sleep(tokio::time::Duration::from_millis(1100)).await;

    // Second tick - should complete
    let result2 = BehaviorTreeEngine::tick(&mut loaded_instance, &definition, &context)
        .await
        .expect("Second tick failed");

    assert_eq!(result2, TreeStatus::Completed);

    // Save final state
    repo.save_instance(&loaded_instance)
        .await
        .expect("Failed to save instance after second tick");

    // Verify final state
    let final_instance = repo
        .get_instance(&loaded_instance.id)
        .await
        .expect("Failed to load final instance")
        .expect("Final instance not found");

    assert_eq!(final_instance.status, TreeStatus::Completed);
}

#[tokio::test]
async fn test_get_active_instance() {
    // Setup
    let pool = setup_test_db().await;
    let repo = BehaviorTreeRepository::new(pool);

    let definition = create_simple_test_definition();
    repo.save_definition(&definition)
        .await
        .expect("Failed to save definition");

    // Create multiple instances for the same account
    let instance1 = BehaviorTreeInstance {
        id: "test_instance_4a".to_string(),
        definition_id: definition.id.clone(),
        account_id: "test_account_multi".to_string(),
        node_states: HashMap::new(),
        blackboard: Blackboard::new(),
        status: TreeStatus::Completed,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let instance2 = BehaviorTreeInstance {
        id: "test_instance_4b".to_string(),
        definition_id: definition.id.clone(),
        account_id: "test_account_multi".to_string(),
        node_states: HashMap::new(),
        blackboard: Blackboard::new(),
        status: TreeStatus::Running,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    repo.save_instance(&instance1)
        .await
        .expect("Failed to save instance1");
    repo.save_instance(&instance2)
        .await
        .expect("Failed to save instance2");

    // Get active instance (should return the Running one)
    let active = repo
        .get_active_instance_by_account("test_account_multi")
        .await
        .expect("Failed to get active instance")
        .expect("No active instance found");

    assert_eq!(active.id, instance2.id);
    assert_eq!(active.status, TreeStatus::Running);
}
