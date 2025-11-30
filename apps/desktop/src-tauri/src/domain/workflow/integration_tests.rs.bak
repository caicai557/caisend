// 集成测试：Workflow-PBT端到端流程
// 
// 这些测试验证Workflow和PBT的完整集成，包括：
// - PBT被Workflow正确启动
// - 状态在两者之间同步
// - 意图识别在PBT中正常工作

#[cfg(test)]
mod integration_tests {
    use crate::domain::workflow::engine::*;
    use crate::domain::workflow::schema::*;
    use crate::domain::workflow::instance::*;
    use crate::domain::behavior_tree::schema::*;
    use crate::domain::decision::bridge::*;
    use std::sync::Arc;
    use std::collections::HashMap;

    // TODO: 这些测试需要真实的数据库连接和repository实现
    // 当前仅作为结构示例，实际运行需要完整的testing infrastructure

    /// 测试Workflow正确创建和启动PBT实例
    #[tokio::test]
    #[ignore] // 需要数据库连接
    async fn test_workflow_starts_pbt() {
        // 1. 准备测试数据
        // - 创建PBT定义（greeting detection tree）
        // - 创建Workflow定义（包含ExecutePbt节点）
        
        // 2. 启动Workflow
        // let instance = workflow_engine.create_instance(&workflow_def.id, "contact_1").await?;
        
        // 3. 验证PBT被创建
        // let pbt_instances = bt_repo.get_instances_by_account("acc_1").await?;
        // assert_eq!(pbt_instances.len(), 1);
        
        // 4. 验证Workflow状态
        // assert_eq!(instance.current_pbt_instance_id, Some(pbt_id));
    }

    /// 测试Bridge的start_pbt和tick_pbt功能
    #[tokio::test]
    #[ignore]
    async fn test_bridge_lifecycle() {
        // Mock repositories
        // let bt_repo = Arc::new(MockBtRepo::new());
        // let workflow_repo = Arc::new(MockWorkflowRepo::new());
        
        // let bridge = WorkflowPbtBridge::new(bt_repo.clone(), workflow_repo);
        
        // 1. Start PBT
        // let pbt_id = bridge.start_pbt("wf_1", "acc_1", "greeting_tree", &json!({})).await?;
        // assert!(!pbt_id.is_empty());
        
        // 2. Tick PBT
        // let context = MockActionContext;
        // let result = bridge.tick_pbt(&pbt_id, &context).await?;
        // assert!(matches!(result, PbtTickResult::Running | PbtTickResult::Completed));
        
        // 3. Check completion
        // let is_done = bridge.is_pbt_completed(&pbt_id).await?;
        // assert!(is_done);
    }

    /// 测试意图识别完整流程
    #[tokio::test]
    #[ignore]
    async fn test_intent_detection_end_to_end() {
        // 1. 创建包含DetectIntent和IntentMatch节点的PBT
        // let pbt_def = create_intent_detection_tree();
        
        // 2. 在Workflow中调用此PBT
        // let workflow_def = create_workflow_with_intent_pbt();
        
        // 3. 触发Workflow
        // workflow_engine.process_message("acc_1", "contact_1", "你好").await?;
        
        // 4. 验证意图被正确检测
        // let pbt_instance = bt_repo.get_instance(&pbt_id).await?;
        // let detected_intent = pbt_instance.blackboard.get("detected_intent");
        // assert_eq!(detected_intent, Some("greeting"));
    }

    /// 测试断点续传功能
    #[tokio::test]
    #[ignore]
    async fn test_checkpoint_resume() {
        // 1. 启动Workflow，执行到PBT中途
        // 2. 保存checkpointer状态
        // 3. 模拟崩溃
        // 4. 恢复WorkflowInstance
        // 5. 验证PBT从中断点继续执行
    }
}

// Helper函数用于创建测试用的PBT定义
#[cfg(test)]
fn create_greeting_detection_tree() -> BehaviorTreeDefinition {
    let mut nodes = HashMap::new();
    
    // Root: Sequence
    nodes.insert("root".to_string(), BtNode {
        id: "root".to_string(),
        node_type: BtNodeType::Sequence,
        children: vec!["detect".to_string(), "check".to_string()],
        config: serde_json::json!({}),
    });
    
    // Detect Intent
    nodes.insert("detect".to_string(), BtNode {
        id: "detect".to_string(),
        node_type: BtNodeType::Action,
        children: vec![],
        config: serde_json::json!({
            "action_type": "DetectIntent",
            "text": "{{input_message}}"  // 从blackboard获取
        }),
    });
    
    // Check Intent Match
    nodes.insert("check".to_string(), BtNode {
        id: "check".to_string(),
        node_type: BtNodeType::Condition,
        children: vec![],
        config: serde_json::json!({
            "type": "intent_match",
            "expected_intent": "greeting",
            "confidence_threshold": 0.7
        }),
    });
    
    BehaviorTreeDefinition {
        id: "greeting_detection".to_string(),
        name: "Greeting Detection Tree".to_string(),
        description: Some("Detects greeting intent".to_string()),
        root_node_id: "root".to_string(),
        nodes,
    }
}

#[cfg(test)]
fn create_workflow_with_pbt(pbt_id: &str) -> WorkflowDefinition {
    WorkflowDefinition {
        id: "test_workflow".to_string(),
        name: "Test Workflow".to_string(),
        description: Some("Workflow that uses PBT".to_string()),
        trigger: TriggerConfig {
            trigger_type: TriggerType::Message,
            config: serde_json::json!({}),
        },
        nodes: vec![
            WorkflowNode {
                id: "start".to_string(),
                node_type: NodeType::Start,
                config: serde_json::json!({}),
            },
            WorkflowNode {
                id: "pbt_node".to_string(),
                node_type: NodeType::ExecutePbt,
                config: serde_json::json!({
                    "tree_id": pbt_id,
                    "context_mapping": {
                        "input_message": "{{trigger.message}}"
                    }
                }),
            },
            WorkflowNode {
                id: "end".to_string(),
                node_type: NodeType::End,
                config: serde_json::json!({}),
            },
        ],
        edges: vec![
            WorkflowEdge {
                id: "e1".to_string(),
                from: "start".to_string(),
                to: "pbt_node".to_string(),
                condition: None,
            },
            WorkflowEdge {
                id: "e2".to_string(),
                from: "pbt_node".to_string(),
                to: "end".to_string(),
                condition: None,
            },
        ],
        initial_node_id: "start".to_string(),
    }
}
