use sqlx::{SqlitePool, sqlite::SqlitePoolOptions};
use teleflow_desktop_lib::domain::behavior_tree::schema::{BehaviorTreeDefinition, BtNode, BtNodeType};
use teleflow_desktop_lib::domain::behavior_tree::state::{BehaviorTreeInstance, Blackboard, NodeStatus, TreeStatus};
use teleflow_desktop_lib::adapters::db::behavior_tree_repo::BehaviorTreeRepository;
use std::collections::HashMap;
use chrono::Utc;
use uuid::Uuid;

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
async fn test_save_and_load_definition() {
    let pool = create_test_pool().await;
    let repo = BehaviorTreeRepository::new(pool);

    let mut nodes = HashMap::new();
    nodes.insert(
        "root".to_string(),
        BtNode {
            id: "root".to_string(),
            node_type: BtNodeType::Sequence,
            children: vec![],
            config: serde_json::json!({}),
        },
    );

    let def = BehaviorTreeDefinition {
        id: "def_1".to_string(),
        name: "Test Def".to_string(),
        description: Some("Desc".to_string()),
        root_node_id: "root".to_string(),
        nodes,
    };

    repo.save_definition(&def).await.unwrap();

    let loaded = repo.get_definition("def_1").await.unwrap().unwrap();
    assert_eq!(loaded.name, "Test Def");
    assert_eq!(loaded.nodes.len(), 1);
}

#[tokio::test]
async fn test_save_and_load_instance() {
    let pool = create_test_pool().await;
    let repo = BehaviorTreeRepository::new(pool);

    // Need definition first (FK constraint)
    let mut nodes = HashMap::new();
    nodes.insert(
        "root".to_string(),
        BtNode {
            id: "root".to_string(),
            node_type: BtNodeType::Sequence,
            children: vec![],
            config: serde_json::json!({}),
        },
    );
    let def = BehaviorTreeDefinition {
        id: "def_1".to_string(),
        name: "Test Def".to_string(),
        description: None,
        root_node_id: "root".to_string(),
        nodes,
    };
    repo.save_definition(&def).await.unwrap();

    let instance = BehaviorTreeInstance {
        id: "inst_1".to_string(),
        definition_id: "def_1".to_string(),
        account_id: "acc_1".to_string(),
        node_states: HashMap::new(),
        blackboard: Blackboard::new(),
        status: TreeStatus::Running,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    repo.save_instance(&instance).await.unwrap();

    let loaded = repo.get_instance("inst_1").await.unwrap().unwrap();
    assert_eq!(loaded.account_id, "acc_1");
    assert_eq!(loaded.status, TreeStatus::Running);
}
