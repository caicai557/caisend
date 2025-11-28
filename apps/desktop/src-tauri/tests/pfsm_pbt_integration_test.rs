use std::collections::HashMap;
use teleflow_desktop_lib::domain::behavior_tree::schema::{BehaviorTreeDefinition, BtNode, BtNodeType};
use teleflow_desktop_lib::domain::behavior_tree::state::{BehaviorTreeInstance, Blackboard, TreeStatus, NodeStatus};
use teleflow_desktop_lib::domain::behavior_tree::engine::{BehaviorTreeEngine, ActionContext};
use teleflow_desktop_lib::domain::lifecycle::{LifecycleStatus, LifecycleManager, LifecycleTransition};
use async_trait::async_trait;
use chrono::Utc;

// Test ActionContext with lifecycle support
struct TestActionContextWithLifecycle {
    lifecycle_status: LifecycleStatus,
    executed_actions: std::sync::Arc<std::sync::Mutex<Vec<String>>>,
}

#[async_trait]
impl ActionContext for TestActionContextWithLifecycle {
    async fn execute_action(&self, action_type: &str, params: &serde_json::Value) -> anyhow::Result<NodeStatus> {
        match action_type {
            "check_lifecycle" => {
                let required_status = params.get("status").and_then(|v| v.as_str());
                match required_status {
                    Some("active") => {
                        if matches!(self.lifecycle_status, LifecycleStatus::Active) {
                            Ok(NodeStatus::Success)
                        } else {
                            Ok(NodeStatus::Failure)
                        }
                    }
                    Some("login") => {
                        if matches!(self.lifecycle_status, LifecycleStatus::Login) {
                            Ok(NodeStatus::Success)
                        } else {
                            Ok(NodeStatus::Failure)
                        }
                    }
                    Some("restricted") => {
                        if matches!(self.lifecycle_status, LifecycleStatus::Restricted) {
                            Ok(NodeStatus::Success)
                        } else {
                            Ok(NodeStatus::Failure)
                        }
                    }
                    _ => Ok(NodeStatus::Failure),
                }
            }
            _ => {
                // Track executed actions
                let mut actions = self.executed_actions.lock().unwrap();
                actions.push(action_type.to_string());
                Ok(NodeStatus::Success)
            }
        }
    }
}

fn create_lifecycle_aware_pbt() -> BehaviorTreeDefinition {
    let mut nodes = HashMap::new();

    // Root: Sequence (check lifecycle, then process)
    nodes.insert(
        "root".to_string(),
        BtNode {
            id: "root".to_string(),
            node_type: BtNodeType::Sequence,
            children: vec!["check_active".to_string(), "send_message".to_string()],
            config: serde_json::json!({}),
        },
    );

    // Lifecycle check
    nodes.insert(
        "check_active".to_string(),
        BtNode {
            id: "check_active".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({
                "action_type": "check_lifecycle",
                "status": "active"
            }),
        },
    );

    // Send message action
    nodes.insert(
        "send_message".to_string(),
        BtNode {
            id: "send_message".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({
                "action_type": "send_message",
                "content": "Hello"
            }),
        },
    );

    BehaviorTreeDefinition {
        id: "lifecycle_aware_test".to_string(),
        name: "Lifecycle Aware Test Tree".to_string(),
        description: Some("Tests lifecycle status checking".to_string()),
        root_node_id: "root".to_string(),
        nodes,
    }
}

#[tokio::test]
async fn test_lifecycle_status_enum() {
    // Test lifecycle status checks
    assert_eq!(LifecycleStatus::Login.can_execute_pbt(), false);
    assert_eq!(LifecycleStatus::Active.can_execute_pbt(), true);
    assert_eq!(LifecycleStatus::Restricted.can_execute_pbt(), false);
    assert_eq!(LifecycleStatus::Banned.can_execute_pbt(), false);
}

#[tokio::test]
async fn test_lifecycle_manager_transition() {
    let mut manager = LifecycleManager::new(LifecycleStatus::Login);
    
    // Initially can't execute PBT
    assert_eq!(manager.can_execute_pbt(), false);
    
    // Transition to Active
    let transition = manager.transition_to(LifecycleStatus::Active);
    assert!(transition.is_some());
    assert_eq!(manager.can_execute_pbt(), true);
    
    // Transition to Restricted
    let transition = manager.transition_to(LifecycleStatus::Restricted);
    assert!(transition.is_some());
    
    let t = transition.unwrap();
    assert_eq!(t.should_pause_pbt(), true);
    assert_eq!(manager.can_execute_pbt(), false);
    
    // Transition back to Active
    let transition = manager.transition_to(LifecycleStatus::Active);
    assert!(transition.is_some());
    
    let t = transition.unwrap();
    assert_eq!(t.should_resume_pbt(), true);
    assert_eq!(manager.can_execute_pbt(), true);
}

#[tokio::test]
async fn test_pbt_lifecycle_check_active() {
    let definition = create_lifecycle_aware_pbt();
    
    let mut instance = BehaviorTreeInstance {
        id: "test_lifecycle_1".to_string(),
        definition_id: definition.id.clone(),
        account_id: "test_account".to_string(),
        node_states: HashMap::new(),
        blackboard: Blackboard::new(),
        status: TreeStatus::Running,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let executed_actions = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
    
    // Context with Active status
    let context = TestActionContextWithLifecycle {
        lifecycle_status: LifecycleStatus::Active,
        executed_actions: executed_actions.clone(),
    };

    // Execute - should succeed because status is Active
    let result = BehaviorTreeEngine::tick(&mut instance, &definition, &context)
        .await
        .expect("Tick failed");

    assert_eq!(result, TreeStatus::Completed);
    
    // Verify message was sent
    let actions = executed_actions.lock().unwrap();
    assert_eq!(actions.len(), 1); // send_message
    assert_eq!(actions[0], "send_message");
}

#[tokio::test]
async fn test_pbt_lifecycle_check_restricted() {
    let definition = create_lifecycle_aware_pbt();
    
    let mut instance = BehaviorTreeInstance {
        id: "test_lifecycle_2".to_string(),
        definition_id: definition.id.clone(),
        account_id: "test_account".to_string(),
        node_states: HashMap::new(),
        blackboard: Blackboard::new(),
        status: TreeStatus::Running,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let executed_actions = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
    
    // Context with Restricted status
    let context = TestActionContextWithLifecycle {
        lifecycle_status: LifecycleStatus::Restricted,
        executed_actions: executed_actions.clone(),
    };

    // Execute - should fail at lifecycle check
    let result = BehaviorTreeEngine::tick(&mut instance, &definition, &context)
        .await
        .expect("Tick failed");

    assert_eq!(result, TreeStatus::Failed);
    
    // Verify no message was sent (lifecycle check failed)
    let actions = executed_actions.lock().unwrap();
    assert_eq!(actions.len(), 0); // No actions executed
}

#[tokio::test]
async fn test_lifecycle_transition_events() {
    let transition = LifecycleTransition::new(LifecycleStatus::Active, LifecycleStatus::Restricted);
    
    assert_eq!(transition.should_pause_pbt(), true);
    assert_eq!(transition.should_resume_pbt(), false);
    assert_eq!(transition.is_valid(), true);
    
    let transition2 = LifecycleTransition::new(LifecycleStatus::Restricted, LifecycleStatus::Active);
    
    assert_eq!(transition2.should_pause_pbt(), false);
    assert_eq!(transition2.should_resume_pbt(), true);
}
