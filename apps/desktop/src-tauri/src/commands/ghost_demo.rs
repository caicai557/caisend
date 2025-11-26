// 幽灵座舱测试命令
// 用于验证系统工作并演示功能

use tauri::State;
use std::sync::Arc;
use crate::infrastructure::ContextHub;
use crate::domain::ports::ScriptRepositoryPort;

/// 测试命令：模拟完整流程
/// 1. 设置活跃账号
/// 2. 设置活跃会话
/// 3. 触发HUD更新
#[tauri::command]
pub async fn ghost_cockpit_demo(
    context_hub: State<'_, Arc<ContextHub>>,
) -> Result<String, String> {
    tracing::info!("[Demo] Starting Ghost Cockpit demonstration");
    
    // 1. 模拟窗口焦点切换到demo_account
    context_hub
        .update_active_account("demo_account".to_string())
        .await;
    
    // 2. 模拟会话焦点切换到user_12345
    context_hub
        .update_active_peer("user_12345".to_string())
        .await;
    
    // 3. 手动触发广播更新
    context_hub.notify_config_changed().await;
    
    tracing::info!("[Demo] Demonstration complete");
    Ok("Ghost Cockpit demo triggered! Check HUD for updates.".to_string())
}

/// 测试命令：查询所有流程
#[tauri::command]
pub async fn list_all_flows(
    script_repo: State<'_, Arc<dyn ScriptRepositoryPort>>,
) -> Result<String, String> {
    let flows = script_repo
        .get_flows_by_account("demo_account")
        .await
        .map_err(|e| e.to_string())?;
    
    let summary = flows
        .iter()
        .map(|f| format!("- {} ({} steps)", f.category_name, f.steps.len()))
        .collect::<Vec<_>>()
        .join("\n");
    
    Ok(format!("Found {} flows:\n{}", flows.len(), summary))
}

/// 测试命令：重置演示数据
#[tauri::command]
pub async fn reset_demo_instance(
    script_repo: State<'_, Arc<dyn ScriptRepositoryPort>>,
) -> Result<String, String> {
    use crate::domain::workflow::script::{ScriptInstance, InstanceStatus};
    
    // 重置demo实例到第一步
    let instance = ScriptInstance {
        id: "inst_demo1".to_string(),
        flow_id: "flow_welcome".to_string(),
        account_id: "demo_account".to_string(),
        peer_id: "user_12345".to_string(),
        current_step_index: 0,
        status: InstanceStatus::Running,
        created_at: chrono::Utc::now().timestamp(),
        updated_at: chrono::Utc::now().timestamp(),
    };
    
    script_repo
        .save_instance(&instance)
        .await
        .map_err(|e| e.to_string())?;
    
    Ok("Demo instance reset to step 0".to_string())
}
