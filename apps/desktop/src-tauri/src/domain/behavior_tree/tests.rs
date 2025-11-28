use super::engine::{BehaviorTreeEngine, ActionContext};
use super::schema::{BehaviorTreeDefinition, BtNode, BtNodeType};
use super::state::{BehaviorTreeInstance, Blackboard, NodeStatus, TreeStatus};
use chrono::Utc;
use std::collections::HashMap;
use async_trait::async_trait;

struct MockActionContext;

#[async_trait]
impl ActionContext for MockActionContext {
    async fn execute_action(&self, _action_type: &str, params: &serde_json::Value) -> anyhow::Result<NodeStatus> {
        let result = params.get("result").and_then(|v| v.as_str()).unwrap_or("success");
        match result {
            "success" => Ok(NodeStatus::Success),
            "failure" => Ok(NodeStatus::Failure),
            "running" => Ok(NodeStatus::Running),
            _ => Ok(NodeStatus::Success),
        }
    }
    
    async fn detect_intent(&self, text: &str) -> anyhow::Result<crate::ai::IntentResult> {
        // Mock implementation: 简单的关键词匹配
        let intent = if text.contains("你好") || text.contains("hello") {
            crate::ai::IntentResult::new(crate::ai::intents::GREETING, 0.95)
        } else if text.contains("再见") || text.contains("bye") {
            crate::ai::IntentResult::new(crate::ai::intents::FAREWELL, 0.95)
        } else {
            crate::ai::IntentResult::new(crate::ai::intents::UNKNOWN, 0.5)
        };
        Ok(intent)
    }
}

fn create_test_instance(definition: &BehaviorTreeDefinition) -> BehaviorTreeInstance {
    BehaviorTreeInstance {
        id: "inst_1".to_string(),
        definition_id: definition.id.clone(),
        account_id: "acc_1".to_string(),
        node_states: HashMap::new(),
        blackboard: Blackboard::new(),
        status: TreeStatus::Running,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    }
}

#[tokio::test]
async fn test_sequence_success() {
    let mut nodes = HashMap::new();
    nodes.insert(
        "root".to_string(),
        BtNode {
            id: "root".to_string(),
            node_type: BtNodeType::Sequence,
            children: vec!["child1".to_string(), "child2".to_string()],
            config: serde_json::json!({}),
        },
    );
    nodes.insert(
        "child1".to_string(),
        BtNode {
            id: "child1".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({"result": "success"}),
        },
    );
    nodes.insert(
        "child2".to_string(),
        BtNode {
            id: "child2".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({"result": "success"}),
        },
    );

    let def = BehaviorTreeDefinition {
        id: "test".to_string(),
        name: "Test".to_string(),
        description: None,
        root_node_id: "root".to_string(),
        nodes,
    };

    let mut instance = create_test_instance(&def);

    let context = MockActionContext;
    let status = BehaviorTreeEngine::tick(&mut instance, &def, &context).await.unwrap();
    assert_eq!(status, TreeStatus::Completed);
}

#[tokio::test]
async fn test_sequence_failure() {
    let mut nodes = HashMap::new();
    nodes.insert(
        "root".to_string(),
        BtNode {
            id: "root".to_string(),
            node_type: BtNodeType::Sequence,
            children: vec!["child1".to_string(), "child2".to_string()],
            config: serde_json::json!({}),
        },
    );
    nodes.insert(
        "child1".to_string(),
        BtNode {
            id: "child1".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({"result": "failure"}),
        },
    );
    nodes.insert(
        "child2".to_string(),
        BtNode {
            id: "child2".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({"result": "success"}),
        },
    );

    let def = BehaviorTreeDefinition {
        id: "test".to_string(),
        name: "Test".to_string(),
        description: None,
        root_node_id: "root".to_string(),
        nodes,
    };

    let mut instance = create_test_instance(&def);

    let context = MockActionContext;
    let status = BehaviorTreeEngine::tick(&mut instance, &def, &context).await.unwrap();
    assert_eq!(status, TreeStatus::Failed);
}

#[tokio::test]
async fn test_selector_success() {
    let mut nodes = HashMap::new();
    nodes.insert(
        "root".to_string(),
        BtNode {
            id: "root".to_string(),
            node_type: BtNodeType::Selector,
            children: vec!["child1".to_string(), "child2".to_string()],
            config: serde_json::json!({}),
        },
    );
    nodes.insert(
        "child1".to_string(),
        BtNode {
            id: "child1".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({"result": "failure"}),
        },
    );
    nodes.insert(
        "child2".to_string(),
        BtNode {
            id: "child2".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({"result": "success"}),
        },
    );

    let def = BehaviorTreeDefinition {
        id: "test".to_string(),
        name: "Test".to_string(),
        description: None,
        root_node_id: "root".to_string(),
        nodes,
    };

    let mut instance = create_test_instance(&def);

    let context = MockActionContext;
    let status = BehaviorTreeEngine::tick(&mut instance, &def, &context).await.unwrap();
    assert_eq!(status, TreeStatus::Completed);
}

#[tokio::test]
async fn test_wait_node() {
    let mut nodes = HashMap::new();
    nodes.insert(
        "root".to_string(),
        BtNode {
            id: "root".to_string(),
            node_type: BtNodeType::Wait,
            children: vec![],
            config: serde_json::json!({"duration_ms": 200}),
        },
    );

    let def = BehaviorTreeDefinition {
        id: "test".to_string(),
        name: "Test".to_string(),
        description: None,
        root_node_id: "root".to_string(),
        nodes,
    };

    let mut instance = create_test_instance(&def);

    let context = MockActionContext;

    // First tick: should be Running
    let status = BehaviorTreeEngine::tick(&mut instance, &def, &context).await.unwrap();
    assert_eq!(status, TreeStatus::Running);
    assert!(instance.node_states.contains_key("root"));

    // Wait a bit
    tokio::time::sleep(std::time::Duration::from_millis(300)).await;

    // Second tick: should be Completed
    let status = BehaviorTreeEngine::tick(&mut instance, &def, &context).await.unwrap();
    assert_eq!(status, TreeStatus::Completed);
}

#[tokio::test]
async fn test_condition_node() {
    let mut nodes = HashMap::new();
    nodes.insert(
        "root".to_string(),
        BtNode {
            id: "root".to_string(),
            node_type: BtNodeType::Condition,
            children: vec![],
            config: serde_json::json!({"key": "is_ready", "value": true}),
        },
    );

    let def = BehaviorTreeDefinition {
        id: "test".to_string(),
        name: "Test".to_string(),
        description: None,
        root_node_id: "root".to_string(),
        nodes,
    };

    let mut instance = create_test_instance(&def);

    let context = MockActionContext;

    // Initially false (missing) -> Failure
    let status = BehaviorTreeEngine::tick(&mut instance, &def, &context).await.unwrap();
    assert_eq!(status, TreeStatus::Failed);

    // Set value -> Success
    instance.blackboard.set("is_ready".to_string(), serde_json::json!(true));
    // Reset status for next tick
    instance.status = TreeStatus::Running;
    
    let status = BehaviorTreeEngine::tick(&mut instance, &def, &context).await.unwrap();
    assert_eq!(status, TreeStatus::Completed);
}
