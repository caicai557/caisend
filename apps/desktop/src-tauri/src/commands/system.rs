use crate::domain::models::SystemInfo;
use crate::error::CoreError;

#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, CoreError> {
    Ok(SystemInfo {
        core_version: env!("CARGO_PKG_VERSION").to_string(),
        initialized: true,
    })
}
