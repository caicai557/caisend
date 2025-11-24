use crate::domain::workflow::schema::WorkflowDefinition;
use crate::domain::workflow::instance::WorkflowInstance;
use crate::adapters::db::workflow_repo::WorkflowRepository;
use crate::state::AppState;
use crate::error::CoreError;
use tauri::State;
use std::sync::Arc;

#[tauri::command]
pub async fn save_workflow_definition(
    state: State<'_, AppState>,
    definition: WorkflowDefinition,
) -> Result<(), CoreError> {
    let repo = WorkflowRepository::new(state.db_pool.clone());
    repo.save_definition(&definition).await?;
    Ok(())
}

#[tauri::command]
pub async fn get_workflow_definition(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<WorkflowDefinition>, CoreError> {
    let repo = WorkflowRepository::new(state.db_pool.clone());
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
    .fetch_all(&state.db_pool)
    .await
    .map_err(|e| CoreError::DbError(e.to_string()))?;

    Ok(instances)
}
