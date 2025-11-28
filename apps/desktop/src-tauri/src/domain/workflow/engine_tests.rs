#[cfg(test)]
mod tests {
    use crate::domain::workflow::engine::{WorkflowEngine, ExecutionIntent};
    use crate::domain::workflow::schema::{WorkflowDefinition, WorkflowNode, WorkflowEdge, Condition, MatchType};
    use crate::domain::workflow::instance::WorkflowInstance;
    use std::collections::HashMap;
    use chrono::Utc;
    use serde_json::json;

    // Helper to create a simple definition
    fn create_simple_definition() -> WorkflowDefinition {
        let mut nodes = HashMap::new();
        nodes.insert("step1".to_string(), WorkflowNode {
            id: "step1".to_string(),
            node_type: "WaitForReply".to_string(),
            config: serde_json::json!({}),
        });
        nodes.insert("step2".to_string(), WorkflowNode {
            id: "step2".to_string(),
            node_type: "SendMessage".to_string(),
            config: serde_json::json!({}),
        });

        let edges = vec![
            WorkflowEdge {
                source_node_id: "step1".to_string(),
                target_node_id: "step2".to_string(),
                condition: Some(Condition {
                    match_type: MatchType::Keyword,
                    pattern: Some("next".to_string()),
                }),
            }
        ];

        WorkflowDefinition {
            id: "wf1".to_string(),
            name: "Test".to_string(),
            description: "Test".to_string(),
            nodes,
            edges,
        }
    }

    #[tokio::test]
    async fn test_compute_next_step_match() {
        let def = create_simple_definition();
        let next_step = WorkflowEngine::compute_transition_sync(&def, "step1", "next").unwrap();
        assert_eq!(next_step, Some("step2".to_string()));
    }

    #[tokio::test]
    async fn test_compute_next_step_no_match() {
        let def = create_simple_definition();
        let next_step = WorkflowEngine::compute_transition_sync(&def, "step1", "other").unwrap();
        assert_eq!(next_step, None);
    }
    
    #[tokio::test]
    async fn test_compute_next_step_fallback() {
        let mut def = create_simple_definition();
        // Add fallback edge
        def.edges.push(WorkflowEdge {
            source_node_id: "step1".to_string(),
            target_node_id: "fallback_step".to_string(),
            condition: Some(Condition {
                match_type: MatchType::Fallback,
                pattern: None,
            }),
        });
        
        let next_step = WorkflowEngine::compute_transition_sync(&def, "step1", "unknown").unwrap();
        assert_eq!(next_step, Some("fallback_step".to_string()));
    }

    #[test]
    fn test_execute_pbt_node() {
        // Setup definition with PBT node
        let mut nodes = HashMap::new();
        nodes.insert("start".to_string(), WorkflowNode {
            id: "start".to_string(),
            node_type: "Start".to_string(),
            config: serde_json::json!({}),
        });
        nodes.insert("pbt_step".to_string(), WorkflowNode {
            id: "pbt_step".to_string(),
            node_type: "ExecuteBehaviorTree".to_string(),
            config: serde_json::json!({
                "tree_id": "test_tree",
                "context_mapping": { "key": "value" }
            }),
        });

        let edges = vec![
            WorkflowEdge {
                source_node_id: "start".to_string(),
                target_node_id: "pbt_step".to_string(),
                condition: None, // Unconditional
            }
        ];

        let def = WorkflowDefinition {
            id: "wf1".to_string(),
            name: "Test".to_string(),
            description: "Test".to_string(),
            nodes,
            edges,
        };

        let instance = WorkflowInstance {
            id: "inst1".to_string(),
            definition_id: "wf1".to_string(),
            contact_id: "contact1".to_string(),
            current_node_id: Some("start".to_string()),
            status: "Running".to_string(),
            state_data: Some("{}".to_string()),
            next_execution_time: None,
            created_at: Utc::now().to_rfc3339(),
            updated_at: Utc::now().to_rfc3339(),
        };

        let (new_instance, intent) = WorkflowEngine::compute_and_transition_pure(
            Some(instance),
            &def,
            "any message"
        ).unwrap();

        // Verify intent
        match intent {
            ExecutionIntent::ExecutePbt { node_id, tree_id, context_mapping } => {
                assert_eq!(node_id, "pbt_step");
                assert_eq!(tree_id, "test_tree");
                assert_eq!(context_mapping["key"], "value");
            }
            _ => panic!("Expected ExecutePbt intent, got {:?}", intent),
        }
        
        // Verify instance updated
        assert_eq!(new_instance.unwrap().current_node_id, Some("pbt_step".to_string()));
    }
}
