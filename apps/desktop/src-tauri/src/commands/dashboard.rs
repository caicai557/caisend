use tauri::State;
use ractor::ActorRef;
use crate::actors::supervisor::SupervisorMessage;
use crate::domain::dashboard::SystemStatus;

#[tauri::command]
pub async fn get_system_status(
    supervisor: State<'_, ActorRef<SupervisorMessage>>,
) -> Result<SystemStatus, String> {
    let status = ractor::call!(supervisor, SupervisorMessage::GetSystemStatus)
        .map_err(|e| format!("Failed to get system status: {}", e))?;
    Ok(status)
}
