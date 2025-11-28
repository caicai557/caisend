use crate::adapters::db::behavior_tree_repo::BehaviorTreeRepository;
use crate::domain::behavior_tree::schema::{BehaviorTreeDefinition, BtNode, BtNodeType};
use crate::domain::behavior_tree::state::{BehaviorTreeInstance, Blackboard, TreeStatus};
use crate::actors::account::AccountMessage;
use crate::actors::supervisor::SupervisorMessage;
use ractor::ActorRef;
use tauri::State;
use std::sync::Arc;
use std::collections::HashMap;
use chrono::Utc;

#[derive(serde::Serialize)]
pub struct PbtDefinitionInfo {
    id: String,
    name: String,
    description: Option<String>,
    root_node_id: String,
}

#[derive(serde::Serialize)]
pub struct PbtInstanceInfo {
    id: String,
    definition_id: String,
    account_id: String,
    status: String,
    created_at: String,
    updated_at: String,
}

/// 创建行为树定义
#[tauri::command]
pub async fn create_pbt_definition(
    repo: State<'_, Arc<BehaviorTreeRepository>>,
    name: String,
    description: Option<String>,
    root_node_id: String,
    nodes_json: String,
) -> Result<String, String> {
    let nodes: HashMap<String, BtNode> = serde_json::from_str(&nodes_json)
        .map_err(|e| format!("Failed to parse nodes JSON: {}", e))?;

    let definition = BehaviorTreeDefinition {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        description,
        root_node_id,
        nodes,
    };

    repo.save_definition(&definition)
        .await
        .map_err(|e| format!("Failed to save definition: {}", e))?;

    Ok(definition.id)
}

/// 列出所有行为树定义
#[tauri::command]
pub async fn list_pbt_definitions(
    _repo: State<'_, Arc<BehaviorTreeRepository>>,
) -> Result<Vec<PbtDefinitionInfo>, String> {
    // Note: We need to add a list_all_definitions method to the repo
    // For now, return empty list as we don't have this implemented yet
    Ok(vec![])
}

/// 创建行为树实例
#[tauri::command]
pub async fn create_pbt_instance(
    repo: State<'_, Arc<BehaviorTreeRepository>>,
    definition_id: String,
    account_id: String,
) -> Result<String, String> {
    // Verify definition exists
    let definition = repo.get_definition(&definition_id)
        .await
        .map_err(|e| format!("Failed to load definition: {}", e))?
        .ok_or_else(|| format!("Definition not found: {}", definition_id))?;

    let instance = BehaviorTreeInstance {
        id: uuid::Uuid::new_v4().to_string(),
        definition_id: definition.id,
        account_id,
        node_states: HashMap::new(),
        blackboard: Blackboard::new(),
        status: TreeStatus::Running,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    repo.save_instance(&instance)
        .await
        .map_err(|e| format!("Failed to save instance: {}", e))?;

    Ok(instance.id)
}

/// 获取行为树实例状态
#[tauri::command]
pub async fn get_pbt_instance_status(
    repo: State<'_, Arc<BehaviorTreeRepository>>,
    instance_id: String,
) -> Result<PbtInstanceInfo, String> {
    let instance = repo.get_instance(&instance_id)
        .await
        .map_err(|e| format!("Failed to load instance: {}", e))?
        .ok_or_else(|| format!("Instance not found: {}", instance_id))?;

    Ok(PbtInstanceInfo {
        id: instance.id,
        definition_id: instance.definition_id,
        account_id: instance.account_id,
        status: format!("{:?}", instance.status),
        created_at: instance.created_at.to_rfc3339(),
        updated_at: instance.updated_at.to_rfc3339(),
    })
}

/// 手动触发 PBT Tick（用于测试）
#[tauri::command]
pub async fn trigger_pbt_tick(
    supervisor: State<'_, ActorRef<SupervisorMessage>>,
    account_id: String,
) -> Result<String, String> {
    // Get account actor reference
    let (tx, rx) = tokio::sync::oneshot::channel();
    supervisor.cast(SupervisorMessage::GetAccount(account_id.clone(), tx))
        .map_err(|e| format!("Failed to send message to supervisor: {}", e))?;

    let actor_ref = rx.await
        .map_err(|e| format!("Failed to receive response: {}", e))?
        .ok_or_else(|| format!("Account actor not found: {}", account_id))?;

    // Send Tick message
    actor_ref.cast(AccountMessage::Tick)
        .map_err(|e| format!("Failed to send Tick message: {}", e))?;

    Ok(format!("Tick triggered for account: {}", account_id))
}

/// 获取账户的活跃 PBT 实例
#[tauri::command]
pub async fn get_active_pbt_instance(
    repo: State<'_, Arc<BehaviorTreeRepository>>,
    account_id: String,
) -> Result<Option<PbtInstanceInfo>, String> {
    let instance = repo.get_active_instance_by_account(&account_id)
        .await
        .map_err(|e| format!("Failed to load active instance: {}", e))?;

    Ok(instance.map(|i| PbtInstanceInfo {
        id: i.id,
        definition_id: i.definition_id,
        account_id: i.account_id,
        status: format!("{:?}", i.status),
        created_at: i.created_at.to_rfc3339(),
        updated_at: i.updated_at.to_rfc3339(),
    }))
}

/// 创建简单测试定义（用于快速测试）
#[tauri::command]
pub async fn create_simple_test_definition(
    repo: State<'_, Arc<BehaviorTreeRepository>>,
) -> Result<String, String> {
    let mut nodes = HashMap::new();

    // Root: Sequence of two actions
    nodes.insert(
        "root".to_string(),
        BtNode {
            id: "root".to_string(),
            node_type: BtNodeType::Sequence,
            children: vec!["greet".to_string(), "farewell".to_string()],
            config: serde_json::json!({
                "children": ["greet", "farewell"]
            }),
        },
    );

    // Greet action
    nodes.insert(
        "greet".to_string(),
        BtNode {
            id: "greet".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({
                "action_type": "send_message",
                "peer_id": "test_peer",
                "content": "你好！这是一个测试消息。"
            }),
        },
    );

    // Farewell action
    nodes.insert(
        "farewell".to_string(),
        BtNode {
            id: "farewell".to_string(),
            node_type: BtNodeType::Action,
            children: vec![],
            config: serde_json::json!({
                "action_type": "send_message",
                "peer_id": "test_peer",
                "content": "再见！测试完成。"
            }),
        },
    );

    let definition = BehaviorTreeDefinition {
        id: uuid::Uuid::new_v4().to_string(),
        name: "Simple Test Tree".to_string(),
        description: Some("A simple test tree with two sequential messages".to_string()),
        root_node_id: "root".to_string(),
        nodes,
    };

    repo.save_definition(&definition)
        .await
        .map_err(|e| format!("Failed to save test definition: {}", e))?;

    Ok(definition.id)
}
