use crate::domain::workflow::schema::WorkflowDefinition;
use crate::domain::workflow::instance::WorkflowInstance;
use crate::domain::workflow::validator::{WorkflowValidator, ValidationReport};
use crate::adapters::db::workflow_repo::WorkflowRepository;
use crate::state::AppState;
use crate::error::CoreError;
use tauri::State;
use sqlx::Row;

#[tauri::command]
pub async fn save_workflow_definition(
    state: State<'_, AppState>,
    definition: WorkflowDefinition,
) -> Result<(), CoreError> {
    let repo = WorkflowRepository::new(state.pool().clone());
    repo.save_definition(&definition).await?;
    Ok(())
}

#[tauri::command]
pub async fn get_workflow_definition(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<WorkflowDefinition>, CoreError> {
    let repo = WorkflowRepository::new(state.pool().clone());
    repo.get_definition(&id).await
}

#[tauri::command]
pub async fn list_active_instances(
    state: State<'_, AppState>,
) -> Result<Vec<WorkflowInstance>, CoreError> {
    // For MVP, just return all or limit. 
    // We didn't implement list_all in Repo yet, let's do a quick query here or add to Repo.
    // Adding to Repo is cleaner but for speed:
    let instances = sqlx::query_as::<_, WorkflowInstance>(
        "SELECT * FROM workflow_instances WHERE status IN ('Running', 'WaitingForResponse') ORDER BY updated_at DESC LIMIT 50"
    )
    .fetch_all(state.pool())
    .await
    .map_err(|e| CoreError::DbError(e.to_string()))?;

    Ok(instances)
}

// ========== 新增：【帝国统御术】Commands ==========

/// 验证工作流定义
#[tauri::command]
pub async fn validate_workflow(
    definition: WorkflowDefinition,
) -> Result<ValidationReport, String> {
    WorkflowValidator::validate(&definition)
        .map_err(|e| e.to_string())
}

/// 保存工作流（带验证）
#[tauri::command]
pub async fn save_workflow(
    state: State<'_, AppState>,
    workflow: WorkflowDefinition,
) -> Result<(), String> {
    // 1. 验证
    let report = WorkflowValidator::validate(&workflow)
        .map_err(|e| e.to_string())?;
    
    if !report.errors.is_empty() {
        return Err(format!("验证失败: {}", report.errors.join(", ")));
    }

    // 2. 保存
    let repo = WorkflowRepository::new(state.pool().clone());
    repo.save_definition(&workflow).await
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// 加载所有工作流
#[tauri::command]
pub async fn load_workflows(
    state: State<'_, AppState>,
) -> Result<Vec<WorkflowDefinition>, String> {
    let rows = sqlx::query(
        r#"
        SELECT id, name, version, nodes, edges, created_at, updated_at
        FROM workflow_definitions
        ORDER BY updated_at DESC
        "#
    )
    .fetch_all(state.pool())
    .await
    .map_err(|e| e.to_string())?;

    let mut workflows = Vec::new();
    for row in rows {
        let nodes_json: String = row.try_get("nodes").map_err(|e| e.to_string())?;
        let edges_json: String = row.try_get("edges").map_err(|e| e.to_string())?;

        let nodes: std::collections::HashMap<String, crate::domain::workflow::schema::WorkflowNode> = 
            serde_json::from_str(&nodes_json).map_err(|e| e.to_string())?;
        let edges: Vec<crate::domain::workflow::schema::WorkflowEdge> = 
            serde_json::from_str(&edges_json).map_err(|e| e.to_string())?;

        let id: String = row.try_get("id").map_err(|e| e.to_string())?;
        let name: String = row.try_get("name").map_err(|e| e.to_string())?;

        workflows.push(WorkflowDefinition {
            id,
            name,
            description: "".to_string(), // 旧表没有 description 字段，待迁移后更新
            nodes,
            edges,
        });
    }

    Ok(workflows)
}

/// 删除工作流
#[tauri::command]
pub async fn delete_workflow(
    state: State<'_, AppState>,
    workflow_id: String,
) -> Result<(), String> {
    sqlx::query(
        "DELETE FROM workflow_definitions WHERE id = ?"
    )
    .bind(workflow_id)
    .execute(state.pool())
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// 激活/停用工作流
#[tauri::command]
pub async fn toggle_workflow_active(
    state: State<'_, AppState>,
    workflow_id: String,
    is_active: bool,
) -> Result<(), String> {
    sqlx::query(
        "UPDATE workflow_definitions SET is_active = ? WHERE id = ?"
    )
    .bind(is_active)
    .bind(workflow_id)
    .execute(state.pool())
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
