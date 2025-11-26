use tauri::State;
use std::sync::Arc;
use crate::domain::ports::ScriptRepositoryPort;
use crate::infrastructure::ContextHub;
use crate::domain::workflow::ScriptFlow;
use crate::domain::workflow::script::InstanceStatus;  // 修正导入路径

/// 切换账号自动回复开关
/// 
/// 陛下要求：不同账号可以独立设置
#[tauri::command]
pub async fn toggle_account_autoreply(
    account_id: String,
    repo: State<'_, Arc<dyn ScriptRepositoryPort>>,
    hub: State<'_, Arc<ContextHub>>,
) -> Result<bool, String> {
    tracing::info!("[Command] toggle_account_autoreply: account={}", account_id);
    
    let new_state = repo.toggle_autoreply(&account_id)
        .await
        .map_err(|e| e.to_string())?;
    
    // 触发HUD更新
    hub.notify_config_changed().await;
    
    Ok(new_state)
}

/// 手动执行当前步骤并推进流程
/// 
/// 陛下要求：能手动按照当前阶段一键发送，这个将会被发送的话术应该高亮
#[tauri::command]
pub async fn execute_and_advance_workflow(
    account_id: String,
    peer_id: String,
    step_id: String,
    repo: State<'_, Arc<dyn ScriptRepositoryPort>>,
    // cdp: State<'_, Arc<CdpManager>>,  // TODO: 集成CDP发送
) -> Result<(), String> {
    tracing::info!(
        "[Command] execute_and_advance: account={}, peer={}, step={}",
        account_id, peer_id, step_id
    );
    
    // 1. 获取实例
    let mut instance = repo.get_instance(&account_id, &peer_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Instance not found")?;
    
    // 2. 获取流程
    let flows = repo.get_flows_by_account(&account_id)
        .await
        .map_err(|e| e.to_string())?;
    
    let flow = flows.into_iter()
        .find(|f| f.id == instance.flow_id)
        .ok_or("Flow not found")?;
    
    // 3. 验证步骤
    let step = flow.steps.get(instance.current_step_index)
        .ok_or("Step index out of bounds")?;
    
    if step.id != step_id {
        return Err(format!(
            "Step ID mismatch: expected {}, got {}",
            step.id, step_id
        ));
    }
    
    // 4. TODO: 执行发送（需要集成CDP）
    // cdp.send_message(&account_id, &peer_id, &step.content).await?;
    tracing::info!("[Command] Would send message: {}", step.content);
    
    // 5. 推进状态
    instance.current_step_index += 1;
    if instance.current_step_index >= flow.steps.len() {
        instance.status = InstanceStatus::Completed;
        tracing::info!("[Command] Workflow completed for {}/{}", account_id, peer_id);
    }
    
    instance.updated_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    
    repo.save_instance(&instance)
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

/// 获取账号的所有话术流程
#[tauri::command]
pub async fn get_account_flows(
    account_id: String,
    repo: State<'_, Arc<dyn ScriptRepositoryPort>>,
) -> Result<Vec<ScriptFlow>, String> {
    tracing::info!("[Command] get_account_flows: account={}", account_id);
    
    repo.get_flows_by_account(&account_id)
        .await
        .map_err(|e| e.to_string())
}

/// 窗口焦点变化通知（由前端调用）
#[tauri::command]
pub async fn notify_window_focus(
    account_id: String,
    hub: State<'_, Arc<ContextHub>>,
) -> Result<(), String> {
    tracing::info!("[Command] notify_window_focus: account={}", account_id);
    
    hub.update_active_account(account_id).await;
    Ok(())
}

/// 会话焦点变化通知（由JS注入脚本调用）
#[tauri::command]
pub async fn notify_peer_focus(
    peer_id: String,
    hub: State<'_, Arc<ContextHub>>,
) -> Result<(), String> {
    tracing::info!("[Command] notify_peer_focus: peer={}", peer_id);
    
    hub.update_active_peer(peer_id).await;
    Ok(())
}
