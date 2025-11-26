#[cfg(test)]
mod tests {
    use crate::domain::workflow::engine::WorkflowEngine;
    use crate::domain::workflow::schema::{WorkflowDefinition, WorkflowNode, WorkflowEdge, Condition, MatchType};
    use std::collections::HashMap;
    use std::sync::Arc;
    use tauri::{AppHandle, Manager}; // We might need to mock AppHandle or avoid it in pure logic tests

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
        // We need a way to call compute_next_step without a full engine instance if possible, 
        // or we construct a lightweight engine.
        // Since WorkflowEngine needs AppHandle and Repo, maybe we should extract the logic to a static function or a separate struct "TransitionComputer".
        // For now, let's assume we refactor Engine to have a static method or we can instantiate it with mocks.
        // But AppHandle is hard to mock.
        // Strategy: Test `WorkflowEngine::compute_transition` which should be a pure function (or close to it).
        
        let next_step = WorkflowEngine::compute_transition(&def, "step1", "next").await.unwrap();
        assert_eq!(next_step, Some("step2".to_string()));
    }

    #[tokio::test]
    async fn test_compute_next_step_no_match() {
        let def = create_simple_definition();
        let next_step = WorkflowEngine::compute_transition(&def, "step1", "other").await.unwrap();
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
        
        let next_step = WorkflowEngine::compute_transition(&def, "step1", "unknown").await.unwrap();
        assert_eq!(next_step, Some("fallback_step".to_string()));
    }
}
