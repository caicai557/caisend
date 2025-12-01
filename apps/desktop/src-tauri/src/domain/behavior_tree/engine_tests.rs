#[cfg(test)]
mod tests {
    use crate::domain::behavior_tree::engine::{BehaviorTreeEngine, ActionContext};
    use crate::domain::behavior_tree::schema::{BehaviorTreeDefinition, BtNode, BtNodeType};
    use crate::domain::behavior_tree::state::{BehaviorTreeInstance, TreeStatus, NodeStatus, Blackboard};
    use std::collections::HashMap;
    use chrono::Utc;
    use async_trait::async_trait;

    // Mock ActionContext for testing
    struct MockActionContext {
        action_results: HashMap<String, NodeStatus>,
    }

    #[async_trait]
    impl ActionContext for MockActionContext {
        async fn execute_action(&self, action_type: &str, _params: &serde_json::Value) -> anyhow::Result<NodeStatus> {
            Ok(self.action_results.get(action_type).cloned().unwrap_or(NodeStatus::Success))
        }

        async fn detect_intent(&self, _text: &str) -> anyhow::Result<crate::ai::IntentResult> {
            Ok(crate::ai::IntentResult {
                label: "test_intent".to_string(),
                confidence: 0.9,
            })
        }
    }

    fn create_test_instance(tree_id: &str) -> BehaviorTreeInstance {
        BehaviorTreeInstance {
            id: "test_instance".to_string(),
            definition_id: tree_id.to_string(),
            account_id: "test_account".to_string(),
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
        nodes.insert("root".to_string(), BtNode {
            id: "root".to_string(),
            node_type: BtNodeType::Sequence,
            children: vec!["child1".to_string(), "child2".to_string()],
            config: serde_json::json!({}),
        });
        nodes.insert("child1".to_string(), BtNode {
            id: "child1".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({"action_type": "test1"}),
        });
        nodes.insert("child2".to_string(), BtNode {
            id: "child2".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({"action_type": "test2"}),
        });

        let definition = BehaviorTreeDefinition {
            id: "test_tree".to_string(),
            name: "Test Tree".to_string(),
            description: Some("".to_string()),
            root_node_id: "root".to_string(),
            nodes,
        };

        let mut instance = create_test_instance("test_tree");
        let context = MockActionContext { action_results: HashMap::new() };

        let result = BehaviorTreeEngine::tick(&mut instance, &definition, &context).await.unwrap();
        assert_eq!(result, TreeStatus::Completed);
    }

    #[tokio::test]
    async fn test_sequence_failure() {
        let mut nodes = HashMap::new();
        nodes.insert("root".to_string(), BtNode {
            id: "root".to_string(),
            node_type: BtNodeType::Sequence,
            children: vec!["child1".to_string(), "child2".to_string()],
            config: serde_json::json!({}),
        });
        nodes.insert("child1".to_string(), BtNode {
            id: "child1".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({"action_type": "test1"}),
        });
        nodes.insert("child2".to_string(), BtNode {
            id: "child2".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({"action_type": "fail"}),
        });

        let definition = BehaviorTreeDefinition {
            id: "test_tree".to_string(),
            name: "Test Tree".to_string(),
            description: Some("".to_string()),
            root_node_id: "root".to_string(),
            nodes,
        };

        let mut instance = create_test_instance("test_tree");
        let mut action_results = HashMap::new();
        action_results.insert("fail".to_string(), NodeStatus::Failure);
        let context = MockActionContext { action_results };

        let result = BehaviorTreeEngine::tick(&mut instance, &definition, &context).await.unwrap();
        assert_eq!(result, TreeStatus::Failed);
    }

    #[tokio::test]
    async fn test_selector_success() {
        let mut nodes = HashMap::new();
        nodes.insert("root".to_string(), BtNode {
            id: "root".to_string(),
            node_type: BtNodeType::Selector,
            children: vec!["child1".to_string(), "child2".to_string()],
            config: serde_json::json!({}),
        });
        nodes.insert("child1".to_string(), BtNode {
            id: "child1".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({"action_type": "fail"}),
        });
        nodes.insert("child2".to_string(), BtNode {
            id: "child2".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({"action_type": "success"}),
        });

        let definition = BehaviorTreeDefinition {
            id: "test_tree".to_string(),
            name: "Test Tree".to_string(),
            description: Some("".to_string()),
            root_node_id: "root".to_string(),
            nodes,
        };

        let mut instance = create_test_instance("test_tree");
        let mut action_results = HashMap::new();
        action_results.insert("fail".to_string(), NodeStatus::Failure);
        action_results.insert("success".to_string(), NodeStatus::Success);
        let context = MockActionContext { action_results };

        let result = BehaviorTreeEngine::tick(&mut instance, &definition, &context).await.unwrap();
        assert_eq!(result, TreeStatus::Completed);
    }

    #[tokio::test]
    async fn test_parallel_all_success() {
        let mut nodes = HashMap::new();
        nodes.insert("root".to_string(), BtNode {
            id: "root".to_string(),
            node_type: BtNodeType::Parallel,
            children: vec!["child1".to_string(), "child2".to_string()],
            config: serde_json::json!({}),
        });
        nodes.insert("child1".to_string(), BtNode {
            id: "child1".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({"action_type": "test1"}),
        });
        nodes.insert("child2".to_string(), BtNode {
            id: "child2".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({"action_type": "test2"}),
        });

        let definition = BehaviorTreeDefinition {
            id: "test_tree".to_string(),
            name: "Test Tree".to_string(),
            description: Some("".to_string()),
            root_node_id: "root".to_string(),
            nodes,
        };

        let mut instance = create_test_instance("test_tree");
        let context = MockActionContext { action_results: HashMap::new() };

        let result = BehaviorTreeEngine::tick(&mut instance, &definition, &context).await.unwrap();
        assert_eq!(result, TreeStatus::Completed);
    }

    #[tokio::test]
    async fn test_parallel_one_failure() {
        let mut nodes = HashMap::new();
        nodes.insert("root".to_string(), BtNode {
            id: "root".to_string(),
            node_type: BtNodeType::Parallel,
            children: vec!["child1".to_string(), "child2".to_string()],
            config: serde_json::json!({}),
        });
        nodes.insert("child1".to_string(), BtNode {
            id: "child1".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({"action_type": "success"}),
        });
        nodes.insert("child2".to_string(), BtNode {
            id: "child2".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({"action_type": "fail"}),
        });

        let definition = BehaviorTreeDefinition {
            id: "test_tree".to_string(),
            name: "Test Tree".to_string(),
            description: Some("".to_string()),
            root_node_id: "root".to_string(),
            nodes,
        };

        let mut instance = create_test_instance("test_tree");
        let mut action_results = HashMap::new();
        action_results.insert("fail".to_string(), NodeStatus::Failure);
        action_results.insert("success".to_string(), NodeStatus::Success);
        let context = MockActionContext { action_results };

        let result = BehaviorTreeEngine::tick(&mut instance, &definition, &context).await.unwrap();
        assert_eq!(result, TreeStatus::Failed);
    }

    #[tokio::test]
    async fn test_inverter() {
        let mut nodes = HashMap::new();
        nodes.insert("root".to_string(), BtNode {
            id: "root".to_string(),
            node_type: BtNodeType::Inverter,
            children: vec!["child".to_string()],
            config: serde_json::json!({}),
        });
        nodes.insert("child".to_string(), BtNode {
            id: "child".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({"action_type": "fail"}),
        });

        let definition = BehaviorTreeDefinition {
            id: "test_tree".to_string(),
            name: "Test Tree".to_string(),
            description: Some("".to_string()),
            root_node_id: "root".to_string(),
            nodes,
        };

        let mut instance = create_test_instance("test_tree");
        let mut action_results = HashMap::new();
        action_results.insert("fail".to_string(), NodeStatus::Failure);
        let context = MockActionContext { action_results };

        let result = BehaviorTreeEngine::tick(&mut instance, &definition, &context).await.unwrap();
        assert_eq!(result, TreeStatus::Completed); // Inverted failure = success
    }

    #[tokio::test]
    async fn test_force_success() {
        let mut nodes = HashMap::new();
        nodes.insert("root".to_string(), BtNode {
            id: "root".to_string(),
            node_type: BtNodeType::ForceSuccess,
            children: vec!["child".to_string()],
            config: serde_json::json!({}),
        });
        nodes.insert("child".to_string(), BtNode {
            id: "child".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({"action_type": "fail"}),
        });

        let definition = BehaviorTreeDefinition {
            id: "test_tree".to_string(),
            name: "Test Tree".to_string(),
            description: Some("".to_string()),
            root_node_id: "root".to_string(),
            nodes,
        };

        let mut instance = create_test_instance("test_tree");
        let mut action_results = HashMap::new();
        action_results.insert("fail".to_string(), NodeStatus::Failure);
        let context = MockActionContext { action_results };

        let result = BehaviorTreeEngine::tick(&mut instance, &definition, &context).await.unwrap();
        assert_eq!(result, TreeStatus::Completed);
    }

    #[tokio::test]
    async fn test_force_failure() {
        let mut nodes = HashMap::new();
        nodes.insert("root".to_string(), BtNode {
            id: "root".to_string(),
            node_type: BtNodeType::ForceFailure,
            children: vec!["child".to_string()],
            config: serde_json::json!({}),
        });
        nodes.insert("child".to_string(), BtNode {
            id: "child".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({"action_type": "success"}),
        });

        let definition = BehaviorTreeDefinition {
            id: "test_tree".to_string(),
            name: "Test Tree".to_string(),
            description: Some("".to_string()),
            root_node_id: "root".to_string(),
            nodes,
        };

        let mut instance = create_test_instance("test_tree");
        let context = MockActionContext { action_results: HashMap::new() };

        let result = BehaviorTreeEngine::tick(&mut instance, &definition, &context).await.unwrap();
        assert_eq!(result, TreeStatus::Failed);
    }
}
